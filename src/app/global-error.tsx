"use client";

import { useEffect } from "react";
import "./globals.css";

// Replaces the root layout when an error is thrown there, so it must render its own
// <html>/<body>. Kept dependency-free for robustness.
export default function GlobalError({
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
    <html lang="en" className="dark">
      <body className="antialiased">
        <main className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-24 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="text-popover">
            An unexpected error occurred. Please reload the page to continue.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
