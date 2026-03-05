import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();

  // Redirect logged-in users
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-black via-gray-900 to-gray-800 text-white flex items-center justify-center">
      <div className="max-w-4xl text-center px-6">

        {/* Heading */}
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Build Smarter with <span className="text-blue-500">AI</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-gray-300 mb-10">
          Analyze repositories, generate insights, and collaborate with your team
          using powerful AI tools.
        </p>

        {/* Buttons */}
        <div className="flex gap-6 justify-center">
          <Link
            href="/sign-up"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition"
          >
            Get Started
          </Link>

          <Link
            href="/sign-in"
            className="px-8 py-3 border border-gray-400 hover:bg-gray-700 rounded-xl font-semibold transition"
          >
            Sign In
          </Link>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-20">

          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
            <h3 className="text-xl font-semibold mb-2">AI Code Analysis</h3>
            <p className="text-gray-400 text-sm">
              Automatically understand and summarize repositories using AI.
            </p>
          </div>

          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
            <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
            <p className="text-gray-400 text-sm">
              Work together with teammates and track project insights.
            </p>
          </div>

          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
            <h3 className="text-xl font-semibold mb-2">Fast Search</h3>
            <p className="text-gray-400 text-sm">
              Ask questions about your codebase and get instant answers.
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}
