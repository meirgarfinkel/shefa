"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

export function GuestMenu() {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label={open ? "Close menu" : "Open menu"}
        className="cursor-pointer"
      >
        {open ? <X className="h-6 w-6 text-white" /> : <Menu className="h-6 w-6 text-white" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href="/privacy">Privacy Policy</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/terms">Terms of Service</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">Sign in</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
