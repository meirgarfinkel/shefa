import Link from "next/link";

export default function VerifyInvalidPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="text-5xl">✗</div>
        <h1 className="text-2xl font-bold">Invalid link</h1>
        <p className="text-text-muted">
          This verification link is not valid. It may have been copied incorrectly.
        </p>
        <Link href="/" className="text-sm underline underline-offset-4">
          Back to Shefa
        </Link>
      </div>
    </main>
  );
}
