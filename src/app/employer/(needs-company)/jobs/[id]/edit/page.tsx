"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/provider";
import { UpdateJobPostingSchema, JobClosureReasonEnum } from "@/lib/schemas/jobPosting";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { LocationPicker } from "@/components/ui/location-picker";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

type EditFormValues = z.input<typeof UpdateJobPostingSchema>;
type JobClosureReason = z.infer<typeof JobClosureReasonEnum>;

const CLOSURE_OPTIONS: { value: JobClosureReason; label: string }[] = [
  { value: "FILLED_ON_SHEFA", label: "Position filled from Shefa" },
  { value: "FILLED_ELSEWHERE", label: "Position filled from somewhere else" },
  { value: "HIRING_FROZEN", label: "Hiring paused/frozen" },
  { value: "CANCELLED", label: "Role cancelled" },
  { value: "OTHER", label: "Other" },
];

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
  const utils = trpc.useUtils();
  const [saved, setSaved] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeReason, setCloseReason] = useState<JobClosureReason | null>(null);

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
      whatWereLookingFor: job.whatWereLookingFor ?? "",
      status: job.status as EditFormValues["status"],
      requiredLanguageIds: job.requiredLanguages.map((l) => l.languageId),
    },
  });

  const updatePosting = trpc.jobPosting.update.useMutation({
    onSuccess: () => {
      void utils.jobPosting.getById.invalidate({ id: job.id });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const closePosting = trpc.jobPosting.close.useMutation({
    onSuccess: () => {
      void utils.jobPosting.getById.invalidate({ id: job.id });
      setCloseDialogOpen(false);
      setCloseReason(null);
    },
  });

  function onSubmit(data: EditFormValues) {
    setSaved(false);
    updatePosting.mutate(data as Parameters<typeof updatePosting.mutate>[0]);
  }

  const isClosed = job.status === "CLOSED";

  return (
    <div className="p-5">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/employer/jobs"
          className="text-muted-foreground hover:text-orange mb-2 inline-flex items-center gap-1 transition-colors duration-100"
        >
          <ArrowLeftIcon className="size-3.5" />
          My jobs
        </Link>
        <div className="bg-card/30 rounded-md bg-linear-to-b from-white/10 via-transparent to-transparent p-5">
          <PageHeader title="Edit job posting" />

          {isClosed && (
            <div className="border-danger/30 bg-danger/10 text-danger mb-6 rounded-md p-4 text-sm">
              This posting is closed and cannot be edited.
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {!isClosed && (
                <div className="my-8 space-y-2">
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

              <div>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Job title <span className="text-danger">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={255} disabled={isClosed} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-8 mb-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Job description <span className="text-danger">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={6} maxLength={5000} disabled={isClosed} />
                      </FormControl>
                      <FormMessage />
                      <FormDescription className="text-muted/80 text-end">
                        {field.value?.length ?? 0}/500
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="jobType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Job type <span className="text-danger">*</span>
                        </FormLabel>
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
                        <FormLabel>
                          Work arrangement <span className="text-danger">*</span>
                        </FormLabel>
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

              <div className="my-8">
                <LocationPicker />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="minHourlyRate"
                  render={() => (
                    <FormItem>
                      <FormLabel>
                        Minimum hourly rate ($) <span className="text-danger">*</span>
                      </FormLabel>
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
              </div>

              <div className="mt-8 mb-4">
                <FormField
                  control={form.control}
                  name="payNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pay notes</FormLabel>
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
                      <FormDescription className="text-muted/80 text-end">
                        {field.value?.length ?? 0}/500
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              <div>
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
                            className={`bg-muted/10 flex cursor-pointer rounded-full px-3 py-1.5 text-sm transition-colors duration-100 ${
                              field.value?.includes(day.value)
                                ? "bg-popover bg-linear-to-b from-white/20 via-transparent to-transparent text-white"
                                : "from-popover/20 hover:bg-popover/30 bg-linear-to-t via-transparent to-transparent"
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
              </div>

              <div className="mt-8 mb-4">
                <FormField
                  control={form.control}
                  name="scheduleNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule notes</FormLabel>
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
                      <FormDescription className="text-muted/80 text-end">
                        {field.value?.length ?? 0}/500
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="workAuthRequired"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-y-0 space-x-3 rounded-md bg-white/60 p-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(!!checked)}
                          disabled={isClosed}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">US work authorization required</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <div className="my-8">
                {languages && languages.length > 0 && (
                  <FormField
                    control={form.control}
                    name="requiredLanguageIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required languages</FormLabel>
                        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {languages.map((lang) => (
                            <label
                              key={lang.id}
                              className="flex cursor-pointer items-center space-x-2"
                            >
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

              <div>
                <FormField
                  control={form.control}
                  name="whatWereLookingFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What we&apos;re looking for</FormLabel>
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
                      <FormDescription className="text-muted/80 text-end">
                        {field.value?.length ?? 0}/1000
                      </FormDescription>
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
                <div className="mt-4 flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <Button type="submit" disabled={updatePosting.isPending}>
                      {updatePosting.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                    {saved && <p className="text-success text-sm">Saved.</p>}
                    <Button asChild variant="ghost">
                      <Link href="/employer/jobs">Cancel</Link>
                    </Button>
                  </span>
                  <Button variant="destructive" onClick={() => setCloseDialogOpen(true)}>
                    Close listing
                  </Button>
                </div>
              )}
            </form>
          </Form>

          <Dialog
            open={closeDialogOpen}
            onOpenChange={(v) => {
              if (!v) {
                setCloseDialogOpen(false);
                setCloseReason(null);
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Close &ldquo;{job.title}&rdquo;?</DialogTitle>
              </DialogHeader>

              <p className="text-muted-foreground text-sm">Why are you closing this listing?</p>

              <div className="space-y-2">
                {CLOSURE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-100 ${
                      closeReason === opt.value ? "bg-blue-dark-2" : "hover:bg-blue-dark-3"
                    }`}
                  >
                    <input
                      type="radio"
                      name="closureReason"
                      value={opt.value}
                      checked={closeReason === opt.value}
                      onChange={() => setCloseReason(opt.value)}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>

              {closePosting.isError && (
                <p className="text-danger text-sm">
                  {closePosting.error.message ?? "Something went wrong."}
                </p>
              )}

              <DialogFooter className="gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCloseDialogOpen(false);
                    setCloseReason(null);
                  }}
                  disabled={closePosting.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-danger/15 text-danger hover:bg-danger/25 transition-colors duration-100"
                  disabled={!closeReason || closePosting.isPending}
                  onClick={() =>
                    closeReason && closePosting.mutate({ id: job.id, reason: closeReason })
                  }
                >
                  {closePosting.isPending ? "Closing…" : "Close listing"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
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
