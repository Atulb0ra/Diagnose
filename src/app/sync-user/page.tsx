import { db } from "@/server/db";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

const SyncUser = async () => {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("user not found");
  }

  const client = await clerkClient();

  let user: Awaited<ReturnType<(typeof client)["users"]["getUser"]>>;
  try {
    user = await client.users.getUser(userId);
  } catch (err) {
    const anyErr = err as any;
    const status = anyErr?.status ?? anyErr?.response?.status;

    if (status === 404) {
      return notFound();
    }

    const clerkMsg =
      anyErr?.errors?.[0]?.longMessage ??
      anyErr?.errors?.[0]?.message ??
      anyErr?.message ??
      String(err);

    throw new Error(`Failed to fetch Clerk user (${userId}): ${clerkMsg}`);
  }

  const emailAddress = user.emailAddresses?.[0]?.emailAddress;
  if (!emailAddress) {
    return notFound();
  }

  await db.user.upsert({
    where: {
      emailAddress,
    },
    update: {
      imgUrl: user.imageUrl,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    create: {
      id: userId,
      emailAddress,
      imgUrl: user.imageUrl,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });

  return redirect("/dashboard");
};

export default SyncUser;