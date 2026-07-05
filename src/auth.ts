import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { createTransport } from "nodemailer";
import { getDb } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";

async function sendVerificationRequest({
  identifier,
  url,
  provider,
}: {
  identifier: string;
  url: string;
  provider: { server?: unknown; from?: string };
}) {
  if (!process.env.EMAIL_SERVER) {
    console.info(`Northstar sign-in link for ${identifier}: ${url}`);
    return;
  }

  const transport = createTransport(
    (provider.server ?? process.env.EMAIL_SERVER) as string,
  );
  await transport.sendMail({
    to: identifier,
    from:
      provider.from ??
      process.env.EMAIL_FROM ??
      "Northstar <no-reply@northstar.local>",
    subject: "Sign in to Northstar",
    text: `Sign in to Northstar:\n\n${url}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Sign in to Northstar:</p><p><a href="${url}">${url}</a></p>`,
  });
}

const authSecret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  (process.env.NODE_ENV === "development" ? "northstar-dev-secret" : undefined);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: authSecret,
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Nodemailer({
      server: process.env.EMAIL_SERVER ?? "smtp://localhost:25",
      from: process.env.EMAIL_FROM ?? "Northstar <no-reply@northstar.local>",
      sendVerificationRequest,
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
