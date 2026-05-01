"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ResponsiveBadge } from "@/components/ui/responsive-badge";

const DAY_LABELS: Record<string, string> = {
  SUN: "Sun",
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
};

const EDUCATION_LABELS: Record<string, string> = {
  NONE: "No formal education",
  SOME_HIGH_SCHOOL: "Some high school",
  HIGH_SCHOOL: "High school diploma / GED",
  SOME_COLLEGE: "Some college",
  ASSOCIATE: "Associate degree",
  BACHELOR: "Bachelor's degree",
  GRADUATE: "Graduate degree",
};

export default function SeekerProfilePage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const isEmployer = session?.user?.role === "EMPLOYER";

  const {
    data: profile,
    isLoading,
    error,
  } = trpc.seeker.getPublicProfile.useQuery({ id: profileId });

  const createConversation = trpc.conversation.create.useMutation({
    onSuccess: (conv) => {
      router.push(`/messages/${conv.id}`);
    },
  });

  if (isLoading) {
    return (
      <div className="text-muted-foreground mx-auto max-w-3xl px-4 py-16 text-center">Loading…</div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted-foreground">This profile was not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/jobs")}>
          Browse jobs
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-medium">
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {profile.city}, {profile.state}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ResponsiveBadge isResponsive={profile.isResponsive} isNew={profile.isNew} />
            {profile.status === "PAUSED" && (
              <span className="border-warning/25 bg-warning/15 text-warning rounded-full border px-3 py-1 text-xs">
                Not currently active
              </span>
            )}
          </div>
        </div>

        {isEmployer && profile.status === "ACTIVE" && (
          <div className="mt-4">
            <Button
              disabled={createConversation.isPending}
              onClick={() => createConversation.mutate({ targetProfileId: profileId })}
            >
              {createConversation.isPending ? "Opening…" : "Message"}
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* What they're looking for */}
      <div className="my-6">
        <h2 className="mb-2 text-base font-medium">What they&apos;re looking for</h2>
        <p className="text-muted-foreground text-sm whitespace-pre-wrap">{profile.jobSeekText}</p>
      </div>

      {/* About */}
      {profile.about && (
        <>
          <Separator />
          <div className="my-6">
            <h2 className="mb-2 text-base font-medium">About</h2>
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">{profile.about}</p>
          </div>
        </>
      )}

      <Separator />

      {/* Details grid */}
      <div className="my-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {profile.availableDays.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium">Available days</p>
            <p className="text-muted-foreground text-sm">
              {profile.availableDays.map((d) => DAY_LABELS[d] ?? d).join(", ")}
            </p>
          </div>
        )}

        <div>
          <p className="mb-1 text-sm font-medium">Work authorization</p>
          <p className="text-muted-foreground text-sm">
            {profile.workAuthorization ? "Authorized to work" : "Not authorized"}
          </p>
        </div>

        {profile.educationLevel && (
          <div>
            <p className="mb-1 text-sm font-medium">Education</p>
            <p className="text-muted-foreground text-sm">
              {EDUCATION_LABELS[profile.educationLevel] ?? profile.educationLevel}
            </p>
          </div>
        )}
      </div>

      {/* Skills */}
      {profile.skills.length > 0 && (
        <>
          <Separator />
          <div className="my-6">
            <h2 className="mb-3 text-base font-medium">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span key={skill} className="bg-muted rounded-full px-3 py-1 text-sm">
                  {skill}
                </span>
              ))}
            </div>
            {profile.otherSkills && (
              <p className="text-muted-foreground mt-2 text-sm">Also: {profile.otherSkills}</p>
            )}
          </div>
        </>
      )}

      {/* Languages */}
      {profile.languages.length > 0 && (
        <>
          <Separator />
          <div className="my-6">
            <h2 className="mb-3 text-base font-medium">Languages</h2>
            <div className="flex flex-wrap gap-2">
              {profile.languages.map((lang) => (
                <span key={lang} className="bg-muted rounded-full px-3 py-1 text-sm">
                  {lang}
                </span>
              ))}
            </div>
            {profile.otherLanguages && (
              <p className="text-muted-foreground mt-2 text-sm">Also: {profile.otherLanguages}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
