"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/provider";
import { UpdateJobPostingSchema } from "@/lib/schemas/jobPosting";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { LocationPicker } from "@/components/ui/location-picker";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

type EditFormValues = z.input<typeof UpdateJobPostingSchema>;

const DAYS = [
  { value: "SUN", label: "Sun" },
  { value: "MON", label: "Mon" },
  { value: "TUE", label: "Tue" },
  { value: "WED", label: "Wed" },
  { value: "THU", label: "Thu" },
  { value: "FRI", label: "Fri" },
  { value: "SAT", label: "Sat" },
] as const;

const USER_SETTABLE_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
] as const;

type JobRecord = {
  id: string;
  title: string;
  description: string;
  jobType: string;
  workArrangement: string;
  city: string;
  state: string;
  minHourlyRate: string | number;
  payNotes: string | null;
  workDays: string[];
  scheduleNotes: string | null;
  workAuthRequired: boolean;
  whatWeTeach: string | null;
  whatWereLookingFor: string | null;
  status: string;
  requiredLanguages: { languageId: string }[];
};

function JobEditForm({
  job,
  languages,
}: {
  job: JobRecord;
  languages: { id: string; name: string }[] | undefined;
}) {
  const [saved, setSaved] = useState(false);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(UpdateJobPostingSchema),
    defaultValues: {
      id: job.id,
      title: job.title,
      description: job.description,
      jobType: job.jobType as EditFormValues["jobType"],
      workArrangement: job.workArrangement as EditFormValues["workArrangement"],
      city: job.city,
      state: job.state,
      minHourlyRate: Number(job.minHourlyRate),
      payNotes: job.payNotes ?? "",
      workDays: job.workDays as EditFormValues["workDays"],
      scheduleNotes: job.scheduleNotes ?? "",
      workAuthRequired: job.workAuthRequired,
      whatWeTeach: job.whatWeTeach ?? "",
      whatWereLookingFor: job.whatWereLookingFor ?? "",
      status: job.status as EditFormValues["status"],
      requiredLanguageIds: job.requiredLanguages.map((l) => l.languageId),
    },
  });

  const updatePosting = trpc.jobPosting.update.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  function onSubmit(data: EditFormValues) {
    setSaved(false);
    updatePosting.mutate(data as Parameters<typeof updatePosting.mutate>[0]);
  }

  const isClosed = job.status === "CLOSED";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/employer/jobs"
        className="text-muted-foreground hover:text-popover-foreground mb-6 inline-flex items-center gap-1 text-sm transition-colors duration-100"
      >
        <ArrowLeftIcon className="size-3.5" />
        My jobs
      </Link>

      <PageHeader
        title="Edit job posting"
        description={job.title}
        actions={<StatusBadge status={job.status as "ACTIVE" | "PAUSED" | "CLOSED"} />}
      />

      {isClosed && (
        <div className="border-danger/30 bg-danger/10 text-danger mb-6 rounded-md p-4 text-sm">
          This posting is {job.status.toLowerCase()} and cannot be edited.
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Status control */}
          {!isClosed && (
            <div className="space-y-2">
              <h2 className="font-medium">Status</h2>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Status…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {USER_SETTABLE_STATUSES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <Separator />

          {/* Basic info */}
          <div className="space-y-4">
            <h2 className="font-medium">Job details</h2>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job title *</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={255} disabled={isClosed} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job description *</FormLabel>
                  <FormDescription>max 5000 characters</FormDescription>
                  <FormControl>
                    <Textarea {...field} rows={6} maxLength={5000} disabled={isClosed} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="jobType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job type *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      disabled={isClosed}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FULL_TIME">Full-time</SelectItem>
                        <SelectItem value="PART_TIME">Part-time</SelectItem>
                        <SelectItem value="EITHER">Either</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="workArrangement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work arrangement *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      disabled={isClosed}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ON_SITE">On-site</SelectItem>
                        <SelectItem value="REMOTE">Remote</SelectItem>
                        <SelectItem value="HYBRID">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div className="space-y-4">
            <h2 className="font-medium">Location</h2>
            <LocationPicker />
          </div>

          <Separator />

          {/* Pay */}
          <div className="space-y-4">
            <h2 className="font-medium">Pay</h2>

            <FormField
              control={form.control}
              name="minHourlyRate"
              render={() => (
                <FormItem>
                  <FormLabel>Minimum hourly rate ($) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="15.00"
                      disabled={isClosed}
                      {...form.register("minHourlyRate", { valueAsNumber: true })}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pay notes</FormLabel>
                  <FormDescription>max 500 characters</FormDescription>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={2}
                      maxLength={500}
                      disabled={isClosed}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Schedule */}
          <div className="space-y-4">
            <h2 className="font-medium">Schedule</h2>

            <FormField
              control={form.control}
              name="workDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work days</FormLabel>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {DAYS.map((day) => (
                      <label
                        key={day.value}
                        className={`flex cursor-pointer items-center justify-center rounded-md px-3 py-1.5 text-sm transition-colors duration-100 ${
                          isClosed
                            ? "text-muted-foreground cursor-not-allowed opacity-50"
                            : field.value?.includes(day.value)
                              ? "bg-primary/20 text-primary"
                              : "hover:bg-blue-dark-3"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          disabled={isClosed}
                          checked={field.value?.includes(day.value) ?? false}
                          onChange={(e) => {
                            const current = field.value ?? [];
                            field.onChange(
                              e.target.checked
                                ? [...current, day.value]
                                : current.filter((d) => d !== day.value),
                            );
                          }}
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scheduleNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule notes</FormLabel>
                  <FormDescription>max 500 characters</FormDescription>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={2}
                      maxLength={500}
                      disabled={isClosed}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Requirements */}
          <div className="space-y-4">
            <h2 className="font-medium">Requirements</h2>

            <FormField
              control={form.control}
              name="workAuthRequired"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-y-0 space-x-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(!!checked)}
                      disabled={isClosed}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">US work authorization required *</FormLabel>
                </FormItem>
              )}
            />

            {languages && languages.length > 0 && (
              <FormField
                control={form.control}
                name="requiredLanguageIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required languages</FormLabel>
                    <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {languages.map((lang) => (
                        <label key={lang.id} className="flex cursor-pointer items-center space-x-2">
                          <Checkbox
                            checked={field.value?.includes(lang.id) ?? false}
                            disabled={isClosed}
                            onCheckedChange={(checked) => {
                              const current = field.value ?? [];
                              field.onChange(
                                checked
                                  ? [...current, lang.id]
                                  : current.filter((id) => id !== lang.id),
                              );
                            }}
                          />
                          <span className="text-sm">{lang.name}</span>
                        </label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <Separator />

          {/* Opportunity */}
          <div className="space-y-6">
            <h2 className="font-medium">The opportunity</h2>

            <FormField
              control={form.control}
              name="whatWeTeach"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What we&apos;ll teach you</FormLabel>
                  <FormDescription>max 1000 characters</FormDescription>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={3}
                      maxLength={1000}
                      disabled={isClosed}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whatWereLookingFor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What we&apos;re looking for</FormLabel>
                  <FormDescription>max 1000 characters</FormDescription>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={3}
                      maxLength={1000}
                      disabled={isClosed}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {updatePosting.isError && (
            <p className="text-danger text-sm">
              {updatePosting.error.message ?? "Something went wrong. Please try again."}
            </p>
          )}

          {!isClosed && (
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={updatePosting.isPending}>
                {updatePosting.isPending ? "Saving…" : "Save changes"}
              </Button>
              {saved && <p className="text-success text-sm">Saved.</p>}
              <Button asChild variant="ghost">
                <Link href="/employer/jobs">Cancel</Link>
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}

export default function JobEditPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const { data: job, isLoading } = trpc.jobPosting.getById.useQuery({ id: jobId });
  const { data: languages } = trpc.taxonomy.languages.useQuery();

  if (isLoading) {
    return <div className="text-muted-foreground px-4 py-16 text-center text-sm">Loading…</div>;
  }

  if (!job) {
    return (
      <div className="text-muted-foreground px-4 py-16 text-center text-sm">Job not found.</div>
    );
  }

  return <JobEditForm job={job} languages={languages} />;
}
