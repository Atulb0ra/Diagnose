import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import type { Document } from "@langchain/core/documents";
import Groq from "groq-sdk";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

const PROMPT = `You are an expert programmer, and you are trying to summarize a git diff.
Reminders about the git diff format:
For every file, there are a few metadata lines, like (for example):

\`\`\`
diff --git a/lib/index.js b/lib/index.js
index aadf691..bfef603 100644
--- a/lib/index.js
+++ b/lib/index.js
\`\`\`

This means that \`lib/index.js\` was modified in this commit. Note that this is only an example.
Then there is a specifier of the lines that were modified.
A line starting with \`+\` means that line was added.
A line starting with \`-\` means that line was deleted.
A line that starts with neither \`+\` nor \`-\` is code given for context and better understanding.
It is not part of the diff.

[...]

EXAMPLE SUMMARY COMMENTS:

\`\`\`
* Raised the amount of returned recordings from \`10\` to \`100\` [packages/server/recordings_api.ts], [packages/server/constants.ts]
* Fixed a typo in the github action name [.github/workflows/gpt-commit-summarizer.yml]
* Moved the \`octokit\` initialization to a separate file [src/octokit.ts], [src/index.ts]
* Added an OpenAI API for completions [packages/utils/apis/openai.ts]
* Lowered numeric tolerance for test files
\`\`\`

Most commits will have less comments than this examples list.
The last comment does not include the file names,
because there were more than two relevant files in the hypothetical commit.
Do not include parts of the example in your summary.
It is given only as an example of appropriate comments.

Please summarise the following diff file:`;

export const aiSummariseCommit = async (diff: string) => {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: diff },
      ],
      temperature: 0.2,
    });

    return response.choices[0]?.message?.content ?? "";
};


export async function summariseCode(doc : Document){
    console.log("getting summary for", doc.metadata.source);
    try {
        const code = doc.pageContent.slice(0, 10000);

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a senior software engineer explaining files to junior developers.",
        },
        {
          role: "user",
          content: `
Explain the purpose of the file: ${doc.metadata.source}

Code:
---
${code}
---

Give a summary under 100 words.
          `,
        },
      ],
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content ?? "";

    } catch (error) {
        console.log("Error in summariseCode:", error);
        return "";
    }
}


// (async () => {
//   console.log("Starting test...");
//   const result = await summariseCode({
//     pageContent: `import Stripe from "stripe";

// export const stripe = new Stripe(process.env.STRIPE_API_KEY as string, {
//   apiVersion: "2023-08-16",
//   typescript: true,
// });`,
//     metadata: {
//       source: "src/lib/stripe.ts",
//       repository: "https://github.com/elliott-chong/chatpdf-yt",
//       branch: "main",
//     },
//     id: undefined,
//   } as any);

//   console.log("Final result:", result);
// })();

export async function generateEmbedding(summary: string) {
    const response = await genAI.models.embedContent({
        model: "gemini-embedding-001",
        contents: summary,
    });
    return response.embeddings?.[0]?.values ?? [];
}

// Simple manual test (you can remove or comment this out in production)
// console.log(await generateEmbedding("Hello World"));

// console.log(await aiSummariseCommit(`diff --git a/.env b/.env
// deleted file mode 100644
// index ec33646..0000000
// --- a/.env
// +++ /dev/null
// @@ -1,6 +0,0 @@
// -DATABASE_URL="postgresql://neondb_owner:npg_vd8pVxPNRgi1@ep-billowing-resonance-aiihq4m4-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
// -PORT=8080
// -HOST=0.0.0.0
// -
// -
// -# wscat -c "ws://0.0.0.0:8080/ws"
// \ No newline at end of file
// diff --git a/src/ws/server.js b/src/ws/server.js
// index de0cd68..89afda1 100644
// --- a/src/ws/server.js
// +++ b/src/ws/server.js
// @@ -7,7 +7,7 @@ function sendJson(socket, payload){
 
//  function broadcast(wss, payload){
//      for(const client of wss.clients){
// -        if(client.readyState !== WebSocket.OPEN) return;
// +        if(client.readyState !== WebSocket.OPEN) continue;
//          client.send(JSON.stringify(payload));
//      }
//  }
// @@ -20,10 +20,23 @@ export function attachWebSocketServer(server){
//      });
 
//      wss.on('connection', (socket) => {
// +        socket.isAlive = true;
// +        socket.on('pong', () => {socket.isAlive = true});
// +
//          sendJson(socket, {type : 'welcome'});
//          socket.on('error', console.error);
//      });
 
// +    const interval = setInterval(() => {
// +        wss.clients.forEach((ws) => {
// +            if(ws.isAlive === false) return ws.terminate();
// +            ws.isAlive = false;
// +            ws.ping();
// +        })
// +    }, 30000);
// +
// +    wss.on('close', () => clearInterval(interval));
// +
//      function broadcastMatchCreated(match){
//          broadcast(wss, {type : 'match_created', data : match});
//      }`))
