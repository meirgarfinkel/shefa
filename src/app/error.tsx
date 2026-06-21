"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-24 text-center">
      <p className="text-orange text-sm font-semibold tracking-wide uppercase">
        Something went wrong
      </p>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        We hit an unexpected error
      </h1>
      <p className="text-popover">
        Please try again. If the problem continues, head back and start over.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild>
          <Link href="/jobs">Browse jobs</Link>
        </Button>
      </div>
    </main>
  );
}
