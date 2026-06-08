"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function GuestMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" aria-label="Menu">
          <Menu className="h-5 w-5 text-white" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-blue-dark-3 w-40 text-white">
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/privacy">Privacy Policy</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/terms">Terms of Service</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/sign-in">Sign in</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
