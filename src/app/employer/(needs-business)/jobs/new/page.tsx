"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { z } from "zod";
import { trpc } from "@/lib/trpc/provider";
import { CreateJobPostingSchema, type CreateJobPostingInput } from "@/lib/schemas/jobPosting";
import { DEFAULT_COUNTRY, countryConfig } from "@/lib/constants/countries";

type FormValues = z.input<typeof CreateJobPostingSchema>;
import {
  Form,
  FormControl,
  CheckboxFormItem,
  FormCharCount,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Panel } from "@/components/ui/panel";
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

  const { data: businesses } = trpc.business.listMine.useQuery();
  const { data: languages } = trpc.taxonomy.languages.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateJobPostingSchema),
    defaultValues: {
      businessId: "",
      title: "",
      description: "",
      jobType: undefined,
      workArrangement: undefined,
      country: DEFAULT_COUNTRY,
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

  // Auto-select the business when there's only one
  useEffect(() => {
    if (businesses?.length === 1 && !form.getValues("businessId")) {
      form.setValue("businessId", businesses[0]!.id);
    }
  }, [businesses, form]);

  const createPosting = trpc.jobPosting.create.useMutation({
    onSuccess: () => router.push("/employer/jobs"),
  });

  function onSubmit(data: FormValues) {
    createPosting.mutate(data as CreateJobPostingInput);
  }

  const hasNoBusinesses = businesses !== undefined && businesses.length === 0;
  const showBusinessSelector = (businesses?.length ?? 0) > 1;

  return (
    <div className="p-5">
      <Panel className="mx-auto max-w-2xl">
        <PageHeader title="Create a new job" />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* No businesses yet — prompt to create one */}
            {hasNoBusinesses && (
              <div className="bg-blue-dark-2 my-8 rounded-md p-4">
                <p className="text-sm font-medium">You need a business to post jobs.</p>
                <p className="mt-1 text-sm">
                  Create your business profile first, then come back to post a job.
                </p>
                <Button asChild className="mt-3">
                  <Link href="/employer/business/new">Create business</Link>
                </Button>
              </div>
            )}

            {/* Business selector — shown when employer has multiple businesses */}
            {showBusinessSelector && (
              <div className="mt-8">
                <FormField
                  control={form.control}
                  name="businessId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Business <span className="text-danger">*</span>
                      </FormLabel>
                      <div className="flex items-center gap-2">
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {businesses?.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.businessName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button asChild type="button">
                          <Link href="/employer/business/new">+ Business</Link>
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="mt-8">
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

            <div className="mt-8">
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
                    <FormCharCount value={field.value} max={5000} />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
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
                          <SelectValue placeholder="Select" />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
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

            <div className="mt-8">
              <LocationPicker />
            </div>

            <div className="mt-8">
              <FormField
                control={form.control}
                name="minHourlyRate"
                render={() => (
                  <FormItem>
                    <FormLabel>
                      Minimum hourly rate ({countryConfig(form.watch("country")).currencySymbol}){" "}
                      <span className="text-danger">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        min="10"
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

            <div className="mt-8">
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
                    <FormCharCount value={field.value} max={500} />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-5">
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
                          className={`glass bg-message-green/15 flex cursor-pointer rounded-full px-3 py-1.5 text-sm ${
                            field.value?.includes(day.value)
                              ? "bg-popover/90 border-none text-white shadow-[inset_1px_-1px_4px_rgba(255,255,255,0.5),inset_-1px_1px_4px_rgb(255,255,255)]"
                              : "hover:bg-orange/15 transition-all duration-100 hover:scale-105"
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

            <div className="mt-8">
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
                    <FormCharCount value={field.value} max={500} />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-5">
              <FormField
                control={form.control}
                name="workAuthRequired"
                render={({ field }) => (
                  <CheckboxFormItem>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(!!checked)}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      {countryConfig(form.watch("country")).name} work authorization required
                    </FormLabel>
                  </CheckboxFormItem>
                )}
              />
            </div>

            <div className="mt-8">
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

            <div className="mt-8">
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
                    <FormCharCount value={field.value} max={1000} />
                  </FormItem>
                )}
              />
            </div>

            {createPosting.isError && (
              <p className="text-danger text-sm">
                {createPosting.error.message ?? "Something went wrong. Please try again."}
              </p>
            )}

            <Button
              type="submit"
              variant="success"
              className="mt-5 px-10 text-nowrap"
              disabled={createPosting.isPending || hasNoBusinesses}
            >
              {createPosting.isPending ? "Posting job…" : "Post job"}
            </Button>
          </form>
        </Form>
      </Panel>
    </div>
  );
}
