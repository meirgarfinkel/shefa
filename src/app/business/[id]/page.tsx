"use client";

import { use } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Surface } from "@/components/ui/surface";
import { ResponsiveBadge } from "@/components/ui/responsive-badge";
import { CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { pluralize } from "@/lib/utils";

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

export default function BusinessPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: business, isLoading, error } = trpc.business.getPublic.useQuery({ id });

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center">Good things await.</div>;
  }

  if (error || !business) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p>This business was not found.</p>
        <Button asChild>
          <Link href="/jobs">Browse jobs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-5">
      <Panel className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1">
            <CardTitle>{business.businessName}</CardTitle>
            <p className="mt-1 text-sm">
              {business.city}, {business.state}
              {business.industry && ` · ${INDUSTRY_LABELS[business.industry] ?? business.industry}`}
            </p>
          </div>
          <ResponsiveBadge
            isResponsive={business.employer.isResponsive}
            isNew={business.employer.isNew}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Pill>{pluralize(business._count.jobs, "active job", "jobs")}</Pill>

          {business.website && (
            <Button asChild>
              <Link href={business.website} target="_blank" rel="noopener noreferrer">
                Website ↗
              </Link>
            </Button>
          )}
        </div>

        {business.aboutBusiness && (
          <div className="mt-8">
            <h2 className="mb-1 font-medium">About {business.businessName}</h2>
            <Surface prose variant="muted">
              {business.aboutBusiness}
            </Surface>
          </div>
        )}

        {business.missionText && (
          <div className="mt-8">
            <h2 className="mb-1 font-medium">Business values</h2>
            <Surface prose>{business.missionText}</Surface>
          </div>
        )}
      </Panel>
    </div>
  );
}
