import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import GetStartedButton from "./_sign-in-form";

const FEATURES = [
  {
    title: "Always free for everyone",
    description:
      "Looking for work is hard enough. You'll never pay a thing to use Shefa, on either side of the table.",
  },
  {
    title: "Hired on potential",
    description:
      "Employers here care more about where you're headed than what's already on your résumé.",
  },
  {
    title: "Human first",
    description:
      "No résumés, no cover letters. Just start a conversation and let people get to know the real you.",
  },
  {
    title: "Fresh listings",
    description:
      "No ghost jobs, no stale posts. Roles are re-checked and paused when they go quiet, so what you see is active and open.",
  },
] as const;

const AUDIENCES = [
  {
    label: "Looking for a job?",
    title: "Build a profile and start applying",
    description:
      "Create a profile and apply to roles where the goal is to learn on the job. Start with an entry-level spot and grow into something bigger, no perfect history required.",
  },
  {
    label: "Looking for a dedicated worker?",
    title: "Hire for potential, post for free",
    description:
      "Post jobs under your business and reach motivated candidates eager to learn. Find people for who they can become, not just what's on paper.",
  },
] as const;

export default async function SignInPage() {
  const session = await auth();
  if (session?.user?.role === "ADMIN") redirect("/admin");
  if (session?.user?.role === "EMPLOYER") redirect("/employer/dashboard");
  if (session?.user?.role === "SEEKER") redirect("/jobs");
  if (session?.user && !session.user.role) redirect("/role-select");

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-20">
      {/* Hero */}
      <section className="mx-auto flex max-w-2xl flex-col items-center gap-7 text-center">
        <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-6xl">
          Get hired on potential, not credentials
        </h1>
        <p className="text-popover max-w-xl text-lg text-pretty sm:text-xl">
          Shefa is a completely free job board on a mission to give candidates a chance to learn on
          the job, by connecting people eager to grow with employers willing to bet on them.
        </p>
        <GetStartedButton />
      </section>

      {/* Features */}
      <section className="mt-24">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-orange text-sm font-semibold tracking-wide uppercase">Why Shefa</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            A job board built around a mission
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="h-full bg-transparent">
              <CardHeader>
                <CardTitle className="text-base whitespace-normal normal-case">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-popover">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Pill variant="light">Absolutely free forever</Pill>
        </div>
      </section>

      {/* Audiences */}
      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        {AUDIENCES.map((audience) => (
          <Card key={audience.label} className="bg-primary/30 hover:bg-primary/30 h-full">
            <CardHeader>
              <p className="text-orange text-sm font-semibold tracking-wide uppercase">
                {audience.label}
              </p>
              <CardTitle className="text-xl whitespace-normal normal-case">
                {audience.title}
              </CardTitle>
              <CardDescription className="text-popover">{audience.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      {/* Closing CTA */}
      <section className="mt-20">
        <Card className="bg-card/20 hover:bg-card/20 items-center py-12 text-center">
          <CardHeader className="items-center gap-4">
            <CardTitle className="text-2xl whitespace-normal normal-case sm:text-3xl">
              Ready to get started?
            </CardTitle>
            <CardDescription className="max-w-md text-base">
              Whether you&apos;re looking to hire or looking for work, Shefa is here, come have a
              look.
            </CardDescription>
          </CardHeader>
          <GetStartedButton />
        </Card>
      </section>
    </main>
  );
}
