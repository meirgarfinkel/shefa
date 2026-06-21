"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Surface } from "@/components/ui/surface";
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
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center">You&apos;ve got this.</div>;
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p>This profile was not found.</p>
        <Button asChild>
          <Link href="/jobs">Browse jobs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-5">
      <Panel className="mx-auto max-w-2xl">
        <div className="flex justify-between gap-4">
          <CardTitle>
            {profile.firstName} {profile.lastName}
          </CardTitle>
          {profile.status === "PAUSED" && (
            <span className="border-warning/25 bg-warning/15 text-orange rounded-full px-3 py-1 text-xs">
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
          <Surface prose>{profile.jobSeekText}</Surface>
        </div>

        {/* About */}
        {profile.about && (
          <div className="my-6 space-y-1">
            <h2 className="font-medium">About me</h2>
            <Surface prose>{profile.about}</Surface>
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
      </Panel>
    </div>
  );
}
