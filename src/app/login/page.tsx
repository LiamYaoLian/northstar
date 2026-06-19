import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/tasks");
  }
  const params = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim();
    if (!email) return;
    await signIn("nodemailer", { email, redirectTo: "/tasks" });
  }

  return (
    <main className="mx-auto max-w-md">
      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Sign in to Northstar</h2>
          <p className="text-sm text-muted">
            Enter your email and we will send a magic link. In local development,
            the link is printed in the server console if SMTP is not configured.
          </p>
        </div>
        {params?.error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            Sign-in failed. Try again or check your email configuration.
          </p>
        ) : null}
        <form action={login} className="space-y-3">
          <label className="block text-sm">
            Email
            <input
              className="mt-1 w-full rounded-md border border-border px-3 py-2"
              name="email"
              required
              type="email"
              placeholder="you@example.com"
            />
          </label>
          <button
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
            type="submit"
          >
            Send sign-in link
          </button>
        </form>
      </Card>
    </main>
  );
}
