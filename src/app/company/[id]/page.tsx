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

export default function CompanyPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: company, isLoading, error } = trpc.company.getPublic.useQuery({ id });

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center">Good things await.</div>;
  }

  if (error || !company) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p>This company was not found.</p>
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
            <CardTitle>{company.companyName}</CardTitle>
            <p className="mt-1 text-sm">
              {company.city}, {company.state}
              {company.industry && ` · ${INDUSTRY_LABELS[company.industry] ?? company.industry}`}
            </p>
          </div>
          <ResponsiveBadge
            isResponsive={company.employer.isResponsive}
            isNew={company.employer.isNew}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Pill>{pluralize(company._count.jobs, "active job", "jobs")}</Pill>

          {company.website && (
            <Button asChild variant="light">
              <Link href={company.website} target="_blank" rel="noopener noreferrer">
                Website ↗
              </Link>
            </Button>
          )}
        </div>

        {company.aboutCompany && (
          <div className="mt-8">
            <h2 className="mb-1 font-medium">About {company.companyName}</h2>
            <Surface prose variant="muted">
              {company.aboutCompany}
            </Surface>
          </div>
        )}

        {company.missionText && (
          <div className="mt-8">
            <h2 className="mb-1 font-medium">Company values</h2>
            <Surface prose>{company.missionText}</Surface>
          </div>
        )}
      </Panel>
    </div>
  );
}
