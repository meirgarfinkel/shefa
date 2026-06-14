"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "@/components/feedback-dialog";

export function UserMenu({ email }: { email: string }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="max-w-48 truncate bg-transparent text-sm shadow-none">
            {email}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-blue-dark-3 w-40 text-white">
          <DropdownMenuItem className="cursor-pointer" onSelect={() => setFeedbackOpen(true)}>
            Send feedback
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/privacy">Privacy Policy</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/terms">Terms of Service</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}
