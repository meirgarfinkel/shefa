"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/provider";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RoleSelectPage() {
  const router = useRouter();
  const { update } = useSession();
  const [selected, setSelected] = useState<"SEEKER" | "EMPLOYER" | null>(null);

  const setRole = trpc.user.setRole.useMutation({
    onSuccess: async (_data, variables) => {
      await update({ role: variables.role });
      router.push(variables.role === "SEEKER" ? "/seeker/profile/new" : "/employer/profile/new");
    },
  });

  function handleSubmit() {
    if (!selected) return;
    setRole.mutate({ role: selected });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-medium">Welcome to Shefa</h1>
          <p className="text-muted-foreground mt-1">Are you looking for work or looking to hire?</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={() => setSelected("SEEKER")} className="text-left">
            <Card
              className={`cursor-pointer transition-colors duration-150 ${
                selected === "SEEKER" ? "border-primary/60" : ""
              }`}
            >
              <CardHeader>
                <CardTitle>I&apos;m looking for work</CardTitle>
                <CardDescription>Find employers willing to teach you on the job.</CardDescription>
              </CardHeader>
            </Card>
          </button>

          <button type="button" onClick={() => setSelected("EMPLOYER")} className="text-left">
            <Card
              className={`cursor-pointer transition-colors duration-150 ${
                selected === "EMPLOYER" ? "border-primary/60" : ""
              }`}
            >
              <CardHeader>
                <CardTitle>I&apos;m hiring</CardTitle>
                <CardDescription>Post jobs and give candidates a chance to grow.</CardDescription>
              </CardHeader>
            </Card>
          </button>
        </div>

        <Button className="w-full" disabled={!selected || setRole.isPending} onClick={handleSubmit}>
          {setRole.isPending ? "Saving…" : "Continue"}
        </Button>

        {setRole.isError && (
          <p className="text-destructive text-center text-sm">
            Something went wrong. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
