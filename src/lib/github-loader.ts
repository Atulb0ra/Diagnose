import "dotenv/config";
import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github"
import type { Document } from "@langchain/core/documents";
import { summariseCode, generateEmbedding } from "./gemini";
import { db } from "@/server/db";
import { Octokit } from "octokit";
import { octokit as authenticatedOctokit, extractOwnerRepo } from "./github";

const getFileCount = async (path:string, octokit : Octokit, githubOwner: string, githubRepo: string, acc: number = 0, attempt: number = 0) => {
  const maxAttempts = 3;
  try {
    const {data} = await octokit.rest.repos.getContent({
      owner : githubOwner,
      repo : githubRepo,
      path
    })
    if(!Array.isArray(data) && data.type === 'file'){
      return acc+1
    }
    if(Array.isArray(data)){
      let fileCount = 0
      const directories: string[] = []

      for(const item of data){
        if(item.type === 'dir'){
          directories.push(item.path)
        }
        else{
          fileCount++;
        }
      } 

      if(directories.length > 0){
        const directoryCounts = await Promise.all(directories.map(dir => getFileCount(dir, octokit, githubOwner, githubRepo, 0)))
        fileCount += directoryCounts.reduce((acc, count) => (acc ?? 0) + (count ?? 0), 0)  
      }

      return acc + fileCount
    }
    return acc
  } catch (error: any) {
    const isRateLimit = error?.status === 403 || error?.message?.includes('API rate limit');
    if (isRateLimit && attempt < maxAttempts) {
      const waitTime = Math.pow(2, attempt) * 1000; // exponential backoff
      console.log(`Rate limited, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxAttempts})`);
      await new Promise(res => setTimeout(res, waitTime));
      return getFileCount(path, octokit, githubOwner, githubRepo, acc, attempt + 1);
    }
    throw error;
  }
}
export const checkCredits = async (githubUrl: string, githubToken?: string) => {
  try {
    // Use robust URL parsing
    const { owner, repo } = extractOwnerRepo(githubUrl);
    
    if (!owner || !repo) {
      console.error('Invalid GitHub URL:', githubUrl);
      return 0;
    }

    // Use authenticated octokit from github.ts (has GITHUB_TOKEN)
    // Fallback to custom token if provided
    const octokit = githubToken ? new Octokit({auth: githubToken}) : authenticatedOctokit;
    
    const fileCount = await getFileCount('', octokit, owner, repo, 0);
    return fileCount;
  } catch (error) {
    console.error('checkCredits failed:', error);
    return 0; // Return 0 credits instead of throwing, so UI doesn't break
  }
}


export const loadGithubRepo = async (githubUrl: string, githubToken?: string) => {
  const loader = new GithubRepoLoader(githubUrl, {
    accessToken: githubToken || process.env.GITHUB_TOKEN,
    branch: "main",
    ignoreFiles: [
      "package-lock.json",
      "yarn-lock",
      "pnpm-lock.yaml",
      "bun.lockb",
      "node_modules/**",
      "**/*.map",
      "**/*.d.ts",
      "**/*.d.cts"
    ],
    recursive: true,
    unknown: 'warn',
    maxConcurrency: 5
  })
  const docs = await loader.load()
  return docs
}
// console.log(await loadGithubRepo('https://github.com/elliott-chong/chatpdf-yt'))


// Document {
//     pageContent: 'import Stripe from "stripe";\n' +
//       '\n' +
//       'export const stripe = new Stripe(process.env.STRIPE_API_KEY as string, {\n' +
//       '  apiVersion: "2023-08-16",\n' + 
//       '  typescript: true,\n' +
//       '});\n',
//     metadata: {
//       source: 'src/lib/stripe.ts',      
//       repository: 'https://github.com/elliott-chong/chatpdf-yt',
//       branch: 'main'
//     },
//     id: undefined
//   }

export const indexGithubRepo = async (
  projectId: string,
  githubUrl: string,
  githubToken?: string
) => {
  try {
    console.log(`[${projectId}] Starting indexing...`);
    const docs = await loadGithubRepo(githubUrl, githubToken);

    const filteredDocs = docs.filter((doc) => {
      const path = doc.metadata.source;

      return (
        !path.includes("node_modules") &&
        !path.endsWith(".map") &&
        !path.endsWith(".d.ts") &&
        !path.endsWith(".d.cts")
      );
    });

    console.log(`[${projectId}] Found ${filteredDocs.length} files, generating embeddings...`);
    const allEmbeddings = await generateEmbeddings(filteredDocs);

    for (let i = 0; i < allEmbeddings.length; i++) {
      const embedding = allEmbeddings[i];
      if (!embedding) continue;

      try {
        console.log(`[${projectId}] Processing ${i + 1} of ${allEmbeddings.length}`);

        const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
          data: {
            summary: embedding.summary,
            sourceCode: embedding.sourceCode,
            filename: embedding.filename,
            projectId,
          },
        });

        await db.$executeRaw`
      UPDATE "SourceCodeEmbedding"
      SET "summaryEmbedding" = ${embedding.embedding}::vector
      WHERE "id" = ${sourceCodeEmbedding.id}
    `;
      } catch (error) {
        console.error(`[${projectId}] Failed to save ${embedding.filename}:`, error);
        // Continue to next file instead of failing the entire indexing
        continue;
      }
    }
    
    // Mark project as INDEXED
    await db.project.update({
      where: { id: projectId },
      data: { status: 'INDEXED' }
    });
    console.log(`[${projectId}] Indexing complete!`);
  } catch (error) {
    console.error(`[${projectId}] Indexing failed:`, error);
    // Mark project as ERROR
    await db.project.update({
      where: { id: projectId },
      data: { status: 'ERROR' }
    });
  }
};

const generateEmbeddings = async (docs: Document[]) => {
  const results = [];

  for (const doc of docs) {
    // Skip if source code contains binary data (null bytes or suspicious patterns)
    if (doc.pageContent.includes('\x00') || doc.pageContent.length > 1000000) {
      console.log(`Skipping binary/large file: ${doc.metadata.source}`);
      continue;
    }

    const summary = await summariseCode(doc);
    if (!summary.trim()) continue;

    const embedding = await generateEmbedding(summary);

    // Sanitize source code: remove null bytes and control characters
    const cleanedSourceCode = doc.pageContent
      .replace(/\x00/g, '') // remove null bytes
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, ' '); // replace other control chars with space

    results.push({
      summary,
      embedding,
      sourceCode: cleanedSourceCode,
      filename: doc.metadata.source,
    });

    await new Promise(res => setTimeout(res, 2000)); // 2 sec delay
  }

  return results;
}