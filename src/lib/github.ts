import "dotenv/config";
import { db } from "@/server/db";
import { Octokit } from 'octokit';
import axios from "axios";
import { aiSummariseCommit } from "./gemini";

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// const githubUrl = "https://github.com/Atulb0ra/sportz"

type Response = {
  commitHash: string;
  commitMessage: string;
  commitAuthorName: string;
  commitAuthorAvatar: string;
  commitDate: string;
}

export function extractOwnerRepo(githubUrl: string) {
  try {
    // Handle git@github.com:owner/repo.git
    if (githubUrl.startsWith("git@")) {
      const cleaned = githubUrl
        .replace("git@github.com:", "")
        .replace(".git", "")
        .trim();
      const [owner, repo] = cleaned.split("/");
      return { owner, repo };
    }

    // Handle https://github.com/owner/repo/ or https://github.com/owner/repo
    const url = new URL(githubUrl);
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length < 2) {
      throw new Error("Invalid GitHub URL");
    }

    return {
      owner: parts[0]!,
      repo: parts[1]!.replace(".git", "")
    };
  } catch {
    throw new Error("Invalid GitHub URL format");
  }
}

export const getCommitHashes = async (githubUrl: string): Promise<Response[]> => {
  try {
    const { owner, repo } = extractOwnerRepo(githubUrl);
    const { data } = await octokit.request(`GET /repos/${owner}/${repo}/commits`);
  //   need commit author, commit message, commit hash and commit time

    const sortedCommits = data.sort((a: any, b: any) => new Date(b.commit.author.date).getTime() - new Date(a.commit.author.date).getTime()) as any[]

    return sortedCommits.slice(0, 10).map((commit: any) => ({
      commitHash: commit.sha as string,
      commitMessage: commit.commit.message ?? "",
      commitAuthorName: commit.commit?.author?.name ?? "",
      commitAuthorAvatar: commit?.author?.avatar_url ?? "",
      commitDate: commit.commit?.author?.date ?? ""
    }))


  } catch (err) {
    console.error('Error from GitHub API:', err);
    throw err;
  }
}

export const pollCommits = async (projectId: string) => {
  try {
    console.log(`[${projectId}] Starting commit polling...`);
    const { project, githubUrl } = await fetchProjectGithubUrl(projectId)
    const commitHashes = await getCommitHashes(githubUrl)
    console.log(`[${projectId}] Found ${commitHashes.length} commits`);
    
    const unprocessedCommits = await filterUnprocessedCommits(projectId, commitHashes);
    console.log(`[${projectId}] Processing ${unprocessedCommits.length} new commits...`);
    
    const summaryResponses = await Promise.allSettled(unprocessedCommits.map(commit => {
      return summariseCommit(githubUrl, commit.commitHash)
    }))
    const summaries = summaryResponses.map((response) => {
      if (response.status === 'fulfilled') {
        return response.value
      }
      return ''
    })

    const commits = await db.commit.createMany({
      data: summaries.map((summary, index) => {
        console.log(`[${projectId}] Saving commit ${index + 1}/${unprocessedCommits.length}`);
        return {
          projectId: projectId,
          commitHash: unprocessedCommits[index]!.commitHash,
          commitMessage: unprocessedCommits[index]!.commitMessage,
          commitAuthorName: unprocessedCommits[index]!.commitAuthorName,
          commitAuthorAvatar: unprocessedCommits[index]!.commitAuthorAvatar,
          commitDate: unprocessedCommits[index]!.commitDate,
          summary
        }
      })
    })
    
    // Mark project as READY
    await db.project.update({
      where: { id: projectId },
      data: { status: 'READY' }
    });
    console.log(`[${projectId}] Commit polling complete! Project ready.`);
    return commits;
  } catch (error) {
    console.error(`[${projectId}] Commit polling failed:`, error);
    // Mark project as ERROR if it was still processing
    await db.project.update({
      where: { id: projectId },
      data: { status: 'ERROR' }
    }).catch(e => console.error(`[${projectId}] Failed to mark as ERROR:`, e));
    throw error;
  }
}

async function summariseCommit(githubUrl: string, commitHash: string) {
  // get the diff, then pass th diff into ai
  const { data } = await axios.get(`${githubUrl}/commit/${commitHash}.diff`, {
    headers: {
      Accept: 'application/vnd.github.v3.diff'
    }
  })

  return await aiSummariseCommit(data) || "";
}

async function fetchProjectGithubUrl(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      githubUrl: true
    }
  })
  if (!project) {
    throw new Error("Project has no github Url");
  }
  return { project, githubUrl: project?.githubUrl }
}

async function filterUnprocessedCommits(projectId: string, commitHashes: Response[]) {
  const processedCommits = await db.commit.findMany({
    where: { projectId }
  })
  const unprocessedCommits = commitHashes.filter((commit) => !processedCommits.some((processedCommit) => processedCommit.commitHash === commit.commitHash))
  return unprocessedCommits
}

// await pollCommits('cmltxiq4n0000vfv42edwfzqj')

