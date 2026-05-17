"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("resend", { email, redirect: false });
    setSubmitted(true);
    setLoading(false);
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    const params = new URLSearchParams(window.location.search);
    const callbackUrl = params.get("callbackUrl") ?? "/";
    await signIn("google", { callbackUrl });
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a magic link to <strong>{email}</strong>. Click it to sign in.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to Shefa</CardTitle>
          <CardDescription>Use Google or a magic link to sign in.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button type="button" onClick={handleGoogleSignIn} disabled={googleLoading}>
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </Button>

          <p className="text-muted-foreground text-center text-xs">or continue with email</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              variant="secondary"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Sending…" : "Send Email"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
