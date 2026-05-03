import Link from "next/link";

export default function VerifyExpiredPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="text-5xl">⏱</div>
        <h1 className="text-2xl font-bold">This link has expired</h1>
        <p className="text-text-muted">
          Verification links are valid for 30 days. Sign in to reactivate your listing or profile
          directly.
        </p>
        <Link
          href="/sign-in"
          className="bg-primary text-text inline-block rounded-md px-6 py-2 text-sm font-medium"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
