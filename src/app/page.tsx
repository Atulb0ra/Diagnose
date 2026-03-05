import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";


export default async function Home() {
  const { userId } = await auth();

  // Redirect logged-in users
  if (userId) {
    redirect("/dashboard");
  }
}