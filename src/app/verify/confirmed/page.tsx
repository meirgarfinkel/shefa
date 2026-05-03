import Link from "next/link";

export default function VerifyConfirmedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="text-5xl">✓</div>
        <h1 className="text-2xl font-bold">Got it — you&rsquo;re all set</h1>
        <p className="text-text-muted">
          Your response has been recorded. We&rsquo;ll check in again in a few weeks.
        </p>
        <Link href="/" className="text-sm underline underline-offset-4">
          Back to Shefa
        </Link>
      </div>
    </main>
  );
}
