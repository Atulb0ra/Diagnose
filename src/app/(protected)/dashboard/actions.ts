'use server'
import "dotenv/config";

import { streamText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { generateEmbedding } from "@/lib/gemini";
import { db } from "@/server/db";


const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
})

export async function askQuestion(question: string, projectId: string) {
    const queryVector = await generateEmbedding(question)
    const vectorQuery = `[${queryVector.join(',')}]`

    const result = await db.$queryRaw<
        { filename: string; sourceCode: string; summary: string; similarity: number }[]
    >`
SELECT "filename", "sourceCode", "summary",
1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) AS similarity
FROM "SourceCodeEmbedding"
WHERE 1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) > 0.5
AND "projectId" = ${projectId}
ORDER BY similarity DESC
LIMIT 10;
`
    let context = ''
    for (const doc of result) {
        context += `source : ${doc.filename}\ncode content: ${doc.sourceCode}\nsummary: ${doc.summary}\n\n`
    }
        const response = await streamText({
            model: groq('llama-3.3-70b-versatile'),
            prompt: `You are an AI code assistant who answers questions about the codebase.
Your target audience is a technical intern who is new to the project.

AI assistant is a brand new, powerful, human-like artificial intelligence.
The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
AI is a well-behaved and well-mannered individual.
AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in the codebase.
If the question is asking about code or a specific file, AI will provide the detailed answer, giving step by step instructions when necessary.

START CONTEXT BLOCK
${context}
END OF CONTEXT BLOCK

START QUESTION
${question}
END OF QUESTION

AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.
If the context does not provide the answer to question, the AI assistant will say, "I'm sorry, but I don't know the answer to that based on the provided context."
AI assistant will not apologize for previous responses, but instead will indicate new information was gained.
AI assistant will not invent anything that is not drawn directly from the context.

Answer in markdown syntax, with code snippets if needed.
Be as detailed as possible when answering, especially when explaining code-related questions.`,
        });


        console.log(response.textStream)

        return {
            output: response.textStream,
            fileReferences: result.map(r => ({ filename: r.filename, sourceCode: r.sourceCode, summary: r.summary }))
        }
}