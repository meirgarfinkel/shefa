"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SignInForm() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    const params = new URLSearchParams(window.location.search);
    const callbackUrl = params.get("callbackUrl") ?? "/role-select";
    await signIn("google", { callbackUrl });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to Shefa</CardTitle>
          <CardDescription>Continue with your Google account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" type="button" onClick={handleGoogleSignIn} disabled={loading}>
            {loading ? "Redirecting…" : "Continue with Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
