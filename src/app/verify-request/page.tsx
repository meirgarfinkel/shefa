import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            A magic link has been sent. Click the link to sign in — it expires in 24 hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-text-muted text-sm">
            Didn&apos;t get it? Check your spam folder or go back and try again.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
