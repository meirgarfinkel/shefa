import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-24 text-center">
      <p className="text-orange text-sm font-semibold tracking-wide uppercase">404</p>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Page not found</h1>
      <p className="text-popover">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Button asChild>
        <Link href="/jobs">Browse jobs</Link>
      </Button>
    </main>
  );
}
