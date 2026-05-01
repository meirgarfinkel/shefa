"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ResponsiveBadge } from "@/components/ui/responsive-badge";

const INDUSTRY_LABELS: Record<string, string> = {
  FOOD_SERVICE: "Food Service",
  RETAIL: "Retail",
  HOSPITALITY: "Hospitality",
  HEALTHCARE: "Healthcare",
  TRADES: "Trades",
  MANUFACTURING: "Manufacturing",
  OFFICE_ADMIN: "Office & Admin",
  TRANSPORTATION: "Transportation",
  EDUCATION: "Education",
  PERSONAL_SERVICES: "Personal Services",
  TECHNOLOGY: "Technology",
  BUSINESS: "Business",
  FINANCE: "Finance",
  MARKETING: "Marketing",
  MEDIA: "Media",
  REAL_ESTATE: "Real Estate",
  OTHER: "Other",
};

export default function EmployerProfilePage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = use(params);
  const router = useRouter();

  const {
    data: profile,
    isLoading,
    error,
  } = trpc.employer.getPublicProfile.useQuery({ id: profileId });

  if (isLoading) {
    return (
      <div className="text-muted-foreground mx-auto max-w-3xl px-4 py-16 text-center">Loading…</div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted-foreground">This employer profile was not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/jobs")}>
          Browse jobs
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Back link */}
      <Link
        href="/jobs"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1 text-sm"
      >
        ← Browse jobs
      </Link>

      {/* Header */}
      <div className="mt-4 mb-6">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-medium">{profile.companyName}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {profile.city}, {profile.state}
              {profile.industry && ` · ${INDUSTRY_LABELS[profile.industry] ?? profile.industry}`}
            </p>
          </div>
          <ResponsiveBadge isResponsive={profile.isResponsive} isNew={profile.isNew} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="bg-muted rounded-full px-3 py-1 text-sm">
            {profile._count.jobPostings === 1
              ? "1 active job"
              : `${profile._count.jobPostings} jobs`}
          </span>
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-muted hover:bg-muted/70 rounded-full px-3 py-1 text-sm transition-colors"
            >
              Website ↗
            </a>
          )}
        </div>
      </div>

      <Separator />

      {/* About */}
      {profile.aboutCompany && (
        <div className="my-6">
          <h2 className="mb-3 text-base font-medium">About {profile.companyName}</h2>
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">
            {profile.aboutCompany}
          </p>
        </div>
      )}

      {/* Mission */}
      {profile.missionText && (
        <>
          {profile.aboutCompany && <Separator />}
          <div className="my-6">
            <h2 className="mb-3 text-base font-medium">Why we give people a chance</h2>
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
              {profile.missionText}
            </p>
          </div>
        </>
      )}

      {/* CTA to job listings filtered to this employer */}
      <Separator />
      <div className="mt-8">
        <Link href="/jobs">
          <Button variant="outline">Browse all open jobs</Button>
        </Link>
      </div>
    </div>
  );
}
