"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/provider";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type Role = "SEEKER" | "EMPLOYER";

export default function RoleSelectClient() {
  const router = useRouter();
  const { update } = useSession();
  const [loadingRole, setLoadingRole] = useState<Role | null>(null);

  const setRole = trpc.user.setRole.useMutation({
    onSuccess: async (_data, variables) => {
      await update({ role: variables.role });
      router.push(variables.role === "SEEKER" ? "/seeker/profile/new" : "/employer/profile/new");
      // <Nav> is a server component in the shared root layout; a push alone keeps its
      // stale (role-less) render, so refresh to re-run auth() server-side.
      router.refresh();
    },
    onSettled: () => setLoadingRole(null),
  });

  async function handleSelect(role: Role) {
    setLoadingRole(role);
    setRole.mutate({ role });
  }

  function RoleCard({
    role,
    title,
    description,
  }: {
    role: Role;
    title: string;
    description: string;
  }) {
    const isLoading = loadingRole === role;

    return (
      <button
        type="button"
        onClick={() => handleSelect(role)}
        disabled={!!loadingRole}
        className="w-full text-left"
      >
        <Card
          className={[
            "cursor-pointer transition-colors duration-100",
            "hover:bg-dark/70",
            loadingRole && !isLoading ? "opacity-50" : "",
            isLoading ? "border-primary/60" : "",
          ].join(" ")}
        >
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="text-popover">{description}</CardDescription>
          </CardHeader>
        </Card>
      </button>
    );
  }

  return (
    <div className="mt-30 flex min-h-screen justify-center p-5">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-medium">Welcome to Shefa!</h1>
          <p className="mt-1">Are you looking for work or looking to hire?</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <RoleCard
            role="SEEKER"
            title="I'm looking for work"
            description="Find jobs that you can excel at and grow."
          />

          <RoleCard
            role="EMPLOYER"
            title="I'm hiring"
            description="Give someone a chance to prove themselves."
          />
        </div>
      </div>
    </div>
  );
}
