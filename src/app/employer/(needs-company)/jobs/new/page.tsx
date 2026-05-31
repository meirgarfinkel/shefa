"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { z } from "zod";
import { trpc } from "@/lib/trpc/provider";
import { CreateJobPostingSchema, type CreateJobPostingInput } from "@/lib/schemas/jobPosting";

type FormValues = z.input<typeof CreateJobPostingSchema>;
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
import { LocationPicker } from "@/components/ui/location-picker";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";

const DAYS = [
  { value: "SUN", label: "Sun" },
  { value: "MON", label: "Mon" },
  { value: "TUE", label: "Tue" },
  { value: "WED", label: "Wed" },
  { value: "THU", label: "Thu" },
  { value: "FRI", label: "Fri" },
  { value: "SAT", label: "Sat" },
] as const;

export default function PostJobPage() {
  const router = useRouter();

  const { data: companies } = trpc.company.listMine.useQuery();
  const { data: languages } = trpc.taxonomy.languages.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateJobPostingSchema),
    defaultValues: {
      companyId: "",
      title: "",
      description: "",
      jobType: undefined,
      workArrangement: undefined,
      city: "",
      state: "",
      payNotes: "",
      workDays: [],
      scheduleNotes: "",
      workAuthRequired: false,
      whatWereLookingFor: "",
      requiredLanguageIds: [],
    },
  });

  // Auto-select the company when there's only one
  useEffect(() => {
    if (companies?.length === 1 && !form.getValues("companyId")) {
      form.setValue("companyId", companies[0]!.id);
    }
  }, [companies, form]);

  const createPosting = trpc.jobPosting.create.useMutation({
    onSuccess: () => router.push("/employer/jobs"),
  });

  function onSubmit(data: FormValues) {
    createPosting.mutate(data as CreateJobPostingInput);
  }

  const hasNoCompanies = companies !== undefined && companies.length === 0;
  const showCompanySelector = (companies?.length ?? 0) > 1;

  return (
    <div className="p-5">
      <div className="bg-card/30 mx-auto max-w-2xl rounded-md bg-linear-to-b from-white/10 via-transparent to-transparent">
        <div className="p-5">
          <PageHeader title="Create new job" />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* No companies yet — prompt to create one */}
              {hasNoCompanies && (
                <div className="bg-blue-dark-2 my-8 rounded-md p-4">
                  <p className="text-sm font-medium">You need a company to post jobs.</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Create your company profile first, then come back to post a job.
                  </p>
                  <Button asChild className="mt-3">
                    <Link href="/employer/company/new">Create company</Link>
                  </Button>
                </div>
              )}

              {/* Company selector — shown when employer has multiple companies */}
              {showCompanySelector && (
                <div className="my-8">
                  <FormField
                    control={form.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Company <span className="text-danger">*</span>
                        </FormLabel>
                        <div className="flex items-center gap-2">
                          <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent align="start">
                              {companies?.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.companyName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button asChild type="button" variant="ghost">
                            <Link href="/employer/company/new">+ Company</Link>
                          </Button>
                        </div>
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
                        <Input {...field} placeholder="Kitchen Assistant" maxLength={255} />
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
                        <Textarea {...field} rows={6} maxLength={5000} />
                      </FormControl>
                      <FormMessage />
                      <FormDescription className="text-muted/50 text-end">
                        (max 1000 characters)
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="jobType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Job type <span className="text-danger">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent align="start">
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
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
                      <FormDescription>
                        The minimum pay rate you offer for this role.
                      </FormDescription>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="25"
                          {...form.register("minHourlyRate", {
                            setValueAs: (v) => (v === "" ? undefined : parseFloat(v)),
                          })}
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
                      <FormLabel>Additional payment details</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={2}
                          maxLength={500}
                          placeholder="Bonus eligibility, overtime pay, or salary review details"
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription className="text-muted/50 text-end">
                        (max 500 characters)
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
                      <FormLabel>Work schedule</FormLabel>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {DAYS.map((day) => (
                          <label
                            key={day.value}
                            className={`bg-muted/10 flex cursor-pointer items-center justify-center rounded-full px-3 py-1.5 text-sm transition-colors duration-100 ${
                              field.value?.includes(day.value)
                                ? "bg-popover text-white"
                                : "hover:bg-popover/30"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
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
                      <FormLabel>Additional schedule details</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={2}
                          maxLength={500}
                          placeholder="Vacation days, or optional remote days"
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription className="text-muted/50 text-end">
                        (max 500 characters)
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
                    <FormItem className="flex flex-row items-center space-y-0 space-x-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(!!checked)}
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

              <div className="my-4">
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
                          placeholder="e.g. Someone reliable, eager to learn, and comfortable on their feet. No experience needed."
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription className="text-muted/50 text-end">
                        (max 1000 characters)
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              {createPosting.isError && (
                <p className="text-danger text-sm">
                  {createPosting.error.message ?? "Something went wrong. Please try again."}
                </p>
              )}

              <Button type="submit" disabled={createPosting.isPending || hasNoCompanies}>
                {createPosting.isPending ? "Posting job…" : "Post job"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
