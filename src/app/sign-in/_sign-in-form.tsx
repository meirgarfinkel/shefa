"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function GetStartedButton() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    const params = new URLSearchParams(window.location.search);
    const callbackUrl = params.get("callbackUrl") ?? "/role-select";
    await signIn("google", { callbackUrl });
  }

  return (
    <Button
      size="lg"
      className="w-full sm:w-auto"
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
    >
      {loading ? "Redirecting…" : "Get started with Google"}
    </Button>
  );
}
