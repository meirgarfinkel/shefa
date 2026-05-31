"use client";

import { use } from "react";
import Link from "next/link";
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

export default function CompanyPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: company, isLoading, error } = trpc.company.getPublic.useQuery({ id });

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center">Loading…</div>;
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
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/jobs" className="mb-6 inline-flex items-center gap-1 text-sm">
        ← Browse jobs
      </Link>

      <div className="mt-4 mb-6">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-medium">{company.companyName}</h1>
            <p className="mt-1 text-sm">
              {company.city}, {company.state}
              {company.industry && ` · ${INDUSTRY_LABELS[company.industry] ?? company.industry}`}
            </p>
          </div>
          <ResponsiveBadge isResponsive={company.isResponsive} isNew={company.isNew} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="bg-blue-dark-3 rounded-full px-3 py-1 text-sm">
            {company._count.jobs === 1 ? "1 active job" : `${company._count.jobs} jobs`}
          </span>
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-dark-3 hover:bg-blue-dark-3/70 rounded-full px-3 py-1 text-sm transition-colors"
            >
              Website ↗
            </a>
          )}
        </div>
      </div>

      <Separator />

      {company.aboutCompany && (
        <div className="my-6">
          <h2 className="mb-3 font-medium">About {company.companyName}</h2>
          <p className="text-sm whitespace-pre-wrap">{company.aboutCompany}</p>
        </div>
      )}

      {company.missionText && (
        <>
          {company.aboutCompany && <Separator />}
          <div className="my-6">
            <h2 className="mb-3 font-medium">Why we give people a chance</h2>
            <p className="text-sm whitespace-pre-wrap">{company.missionText}</p>
          </div>
        </>
      )}

      <Separator />
      <div className="mt-8">
        <Link href="/jobs">
          <Button variant="ghost">Browse all open jobs</Button>
        </Link>
      </div>
    </div>
  );
}
