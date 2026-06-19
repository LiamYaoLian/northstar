import { Card } from "@/components/ui/card";

export default function CheckEmailPage() {
  return (
    <main className="mx-auto max-w-md">
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="text-sm text-muted">
          We sent a magic sign-in link. If SMTP is not configured locally, check
          the dev server logs for the Northstar sign-in link.
        </p>
      </Card>
    </main>
  );
}
