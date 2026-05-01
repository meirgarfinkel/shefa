"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const { data: skillGroups } = trpc.taxonomy.skills.useQuery();
  const { data: languages } = trpc.taxonomy.languages.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateJobPostingSchema),
    defaultValues: {
      title: "",
      description: "",
      jobType: undefined,
      workArrangement: undefined,
      city: "",
      state: "",
      zip: "",
      payNotes: "",
      workDays: [],
      scheduleNotes: "",
      workAuthRequired: false,
      whatWeTeach: "",
      whatWereLookingFor: "",
      preferredSkillIds: [],
      requiredLanguageIds: [],
    },
  });

  const createPosting = trpc.jobPosting.create.useMutation({
    onSuccess: () => router.push("/employer/jobs"),
  });

  function onSubmit(data: FormValues) {
    createPosting.mutate(data as CreateJobPostingInput);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-medium">Post a job</h1>
        <p className="text-muted-foreground mt-1">
          Create a listing for your open position. Required fields are marked with *.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                    <Input {...field} placeholder="e.g. Kitchen Assistant" maxLength={255} />
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
                  <FormDescription>
                    Describe the role, responsibilities, and day-to-day work. (max 5000 characters)
                  </FormDescription>
                  <FormControl>
                    <Textarea {...field} rows={6} maxLength={5000} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>City *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="NY" maxLength={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zip *</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={10} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
                  <FormDescription>The minimum pay rate you offer for this role.</FormDescription>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="15.00"
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
                  <FormDescription>
                    Optional. E.g. &ldquo;rate increases after 90 days&rdquo;, &ldquo;tips
                    included&rdquo;. (max 500 characters)
                  </FormDescription>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={2} maxLength={500} />
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
                  <FormDescription>Select all days this role typically works.</FormDescription>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {DAYS.map((day) => (
                      <label
                        key={day.value}
                        className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-1.5 text-sm transition-colors ${
                          field.value?.includes(day.value)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "hover:bg-muted"
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

            <FormField
              control={form.control}
              name="scheduleNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule notes</FormLabel>
                  <FormDescription>
                    Optional. E.g. &ldquo;evenings and weekends required&rdquo;, &ldquo;flexible
                    hours&rdquo;. (max 500 characters)
                  </FormDescription>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={2} maxLength={500} />
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
                    <FormDescription>
                      Languages candidates must speak for this role.
                    </FormDescription>
                    <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {languages.map((lang) => (
                        <label key={lang.id} className="flex cursor-pointer items-center space-x-2">
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

          <Separator />

          {/* Skills */}
          {skillGroups && Object.keys(skillGroups).length > 0 && (
            <FormField
              control={form.control}
              name="preferredSkillIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred skills</FormLabel>
                  <FormDescription>
                    Skills that would be helpful but aren&apos;t required — remember, we&apos;re
                    giving people a chance to learn.
                  </FormDescription>
                  <div className="mt-2 space-y-4">
                    {Object.entries(skillGroups).map(([category, skills]) => (
                      <div key={category}>
                        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                          {category}
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {skills.map((skill) => (
                            <label
                              key={skill.id}
                              className="flex cursor-pointer items-center space-x-2"
                            >
                              <Checkbox
                                checked={field.value?.includes(skill.id) ?? false}
                                onCheckedChange={(checked) => {
                                  const current = field.value ?? [];
                                  field.onChange(
                                    checked
                                      ? [...current, skill.id]
                                      : current.filter((id) => id !== skill.id),
                                  );
                                }}
                              />
                              <span className="text-sm">{skill.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Separator />

          {/* Opportunity */}
          <div className="space-y-6">
            <div>
              <h2 className="font-medium">The opportunity</h2>
              <p className="text-muted-foreground text-sm">
                Help candidates understand why your posting is different.
              </p>
            </div>

            <FormField
              control={form.control}
              name="whatWeTeach"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What we&apos;ll teach you</FormLabel>
                  <FormDescription>
                    What skills or experience will the candidate gain on the job? (max 1000
                    characters)
                  </FormDescription>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={3}
                      maxLength={1000}
                      placeholder="e.g. We'll train you on our POS system, food safety certification, and customer service fundamentals."
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
                  <FormDescription>
                    What qualities or attitude matters most? (max 1000 characters)
                  </FormDescription>
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
                </FormItem>
              )}
            />
          </div>

          {createPosting.isError && (
            <p className="text-destructive text-sm">
              {createPosting.error.message ?? "Something went wrong. Please try again."}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={createPosting.isPending}>
            {createPosting.isPending ? "Posting job…" : "Post job"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
