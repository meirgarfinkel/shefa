"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { DAY_LABELS } from "@/lib/constants/labels";

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
        <Button asChild>
          <Link href="/jobs">Browse jobs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="bg-card/30 mx-auto max-w-2xl rounded-md bg-linear-to-b from-white/10 via-transparent to-transparent">
        <div className="p-5">
          <div className="flex justify-between gap-4">
            <CardTitle>
              {profile.firstName} {profile.lastName}
            </CardTitle>
            {profile.status === "PAUSED" && (
              <span className="border-warning/25 bg-warning/15 text-warning rounded-full px-3 py-1 text-xs">
                Not currently active
              </span>
            )}
            {isEmployer && profile.status === "ACTIVE" && (
              <Button
                disabled={createConversation.isPending}
                onClick={() => createConversation.mutate({ targetId: profileId })}
              >
                {createConversation.isPending ? "Opening…" : "Message"}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="text-message-green size-4" strokeWidth={2.5} /> {profile.city},{" "}
            {profile.state}
          </div>

          <div className="my-6 space-y-1">
            <h2 className="font-medium">What I&apos;m looking for</h2>
            <p className="rounded-md bg-white/80 px-3 py-2 text-sm whitespace-pre-wrap">
              {profile.jobSeekText}
            </p>
          </div>

          {/* About */}
          {profile.about && (
            <div className="my-6 space-y-1">
              <h2 className="font-medium">About me</h2>
              <p className="rounded-md bg-white/80 px-3 py-2 text-sm whitespace-pre-wrap">
                {profile.about}
              </p>
            </div>
          )}

          {/* Details grid */}
          <div className="my-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {profile.availableDays.length > 0 && (
              <div className="space-y-1">
                <h2 className="font-medium">Available days</h2>
                <p className="text-sm">
                  {profile.availableDays.map((d) => DAY_LABELS[d] ?? d).join(", ")}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <h2 className="font-medium">Work authorization</h2>
              <p className="text-sm">
                {profile.workAuthorization ? "Authorized to work" : "Not authorized"}
              </p>
            </div>

            {profile.educationLevel && (
              <div className="flex items-center gap-2 space-y-1">
                <h2 className="font-medium">Education:</h2>
                <p className="text-sm">
                  {EDUCATION_LABELS[profile.educationLevel] ?? profile.educationLevel}
                </p>
              </div>
            )}
          </div>

          {/* Languages */}
          {profile.languages.length > 0 && (
            <div className="flex items-center gap-2 space-y-1">
              <h2 className="font-medium">Languages:</h2>
              <div className="flex flex-wrap gap-2">
                {profile.languages.map((lang) => (
                  <Pill key={lang} variant="light">
                    {lang}
                  </Pill>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
