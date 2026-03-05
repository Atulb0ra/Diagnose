# 🧠 Diagnose

![Next.js](https://img.shields.io/badge/Next.js-Framework-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-Language-blue?logo=typescript)
![tRPC](https://img.shields.io/badge/tRPC-API-blue)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)
![AssemblyAI](https://img.shields.io/badge/AssemblyAI-Transcription-orange)
![Groq](https://img.shields.io/badge/Groq-AI-green)
![Gemini](https://img.shields.io/badge/Gemini-Embeddings-purple)

Diagnose is an AI-powered platform designed to help developers understand their projects and meetings more efficiently.

The application analyzes GitHub repositories, summarizes commit history, and allows developers to ask questions about their codebase. It also processes meeting recordings by generating transcripts, extracting key discussion points, and making them searchable.

The goal is to reduce the time spent reading long commit histories or reviewing meeting recordings by automatically generating insights that can be quickly explored.

---

# Inspiration

Understanding a new codebase or catching up on project discussions can take a lot of time. Reading through commits, reviewing documentation, or watching long meeting recordings often slows down development.

Diagnose was built to simplify that process by using AI to extract the most important information from repositories and meetings and present it in a structured way.

---

# What it does

Diagnose provides several features that help developers navigate projects more easily.

### GitHub Repository Analysis
A GitHub repository can be connected to the platform where commits are analyzed and summarized. This makes it easier to understand recent changes without reading every commit manually.

### Commit Summaries
Commit messages and related information are processed using AI models to generate concise summaries of repository activity.

### Codebase Q&A
Questions about the repository can be asked directly inside the platform. The system retrieves relevant information from the repository context and generates answers.

### Meeting Transcription
Meeting recordings can be processed and converted into transcripts using speech-to-text models.

### Meeting Summaries
Key discussion points from meetings are automatically extracted and summarized.

### Contextual Meeting Search
Transcripts and summaries are searchable so specific topics discussed during meetings can be quickly located.

---

# Tech Stack

Diagnose is built using a modern full-stack setup focused on developer productivity.

### Frontend
- Next.js
- TypeScript
- tRPC
- Tailwind CSS
- Create T3 App

### Backend
- TypeScript
- Prisma ORM

### AI Services
- AssemblyAI – meeting transcription
- Groq API – summarization and text generation
- Gemini API – embeddings for semantic search

---

# How it works

1. A GitHub repository or meeting recording is provided to the platform.
2. Repository commits are analyzed and summarized using AI models.
3. Meeting audio is transcribed using AssemblyAI.
4. Summaries and structured insights are generated using Groq models.
5. Gemini embeddings are created to enable semantic search and question answering.
6. All processed information becomes searchable through the dashboard.

---

# Challenges

Building Diagnose required solving several technical challenges:

- handling large amounts of repository and transcript data
- generating accurate summaries from commits and meetings
- implementing semantic search using embeddings
- designing a UI that keeps complex information easy to navigate

---

# Future Improvements

Planned improvements include:

- deeper codebase understanding
- improved semantic search accuracy
- support for additional repository platforms
- enhanced visualization of repository insights

---
