"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/provider";
import { UpdateSeekerProfileSchema, type UpdateSeekerProfileInput } from "@/lib/schemas/seeker";
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
import { LocationPicker } from "@/components/ui/location-picker";

const DAYS = [
  { value: "SUN", label: "Sun" },
  { value: "MON", label: "Mon" },
  { value: "TUE", label: "Tue" },
  { value: "WED", label: "Wed" },
  { value: "THU", label: "Thu" },
  { value: "FRI", label: "Fri" },
  { value: "SAT", label: "Sat" },
] as const;

const EDUCATION_OPTIONS = [
  { value: "NONE", label: "No formal education" },
  { value: "SOME_HIGH_SCHOOL", label: "Some high school" },
  { value: "HIGH_SCHOOL", label: "High school diploma / GED" },
  { value: "SOME_COLLEGE", label: "Some college" },
  { value: "ASSOCIATE", label: "Associate degree" },
  { value: "BACHELOR", label: "Bachelor's degree" },
  { value: "GRADUATE", label: "Graduate degree" },
] as const;

export default function SeekerProfileEditPage() {
  const { data: session } = useSession();
  const { data: profile, isLoading } = trpc.seeker.getMyFullProfile.useQuery();
  const { data: skillGroups } = trpc.taxonomy.skills.useQuery();
  const { data: languages } = trpc.taxonomy.languages.useQuery();

  const [saved, setSaved] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<UpdateSeekerProfileInput>({
    resolver: zodResolver(UpdateSeekerProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      city: "",
      state: "",
      workAuthorization: false,
      availableDays: [],
      jobSeekText: "",
      skillIds: [],
      languageIds: [],
    },
  });

  useEffect(() => {
    if (!profile) return;
    form.reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      city: profile.city,
      state: profile.state,
      workAuthorization: profile.workAuthorization,
      availableDays: profile.availableDays as UpdateSeekerProfileInput["availableDays"],
      jobSeekText: profile.jobSeekText,
      educationLevel: profile.educationLevel ?? undefined,
      otherSkills: profile.otherSkills ?? undefined,
      otherLanguages: profile.otherLanguages ?? undefined,
      about: profile.about ?? undefined,
      skillIds: profile.skillIds,
      languageIds: profile.languageIds,
    });
  }, [profile, form]);

  const updateProfile = trpc.seeker.updateProfile.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const requestEmailChange = trpc.user.requestEmailChange.useMutation({
    onSuccess: () => {
      setEmailSent(true);
      setShowEmailForm(false);
      setEmailInput("");
    },
  });

  function onSubmit(data: UpdateSeekerProfileInput) {
    setSaved(false);
    updateProfile.mutate(data);
  }

  if (isLoading) {
    return <div className="text-text-muted px-4 py-16 text-center text-sm">Loading…</div>;
  }

  if (!profile) {
    return (
      <div className="text-text-muted px-4 py-16 text-center text-sm">
        No profile found. Please complete your profile first.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader title="Edit profile" description="Keep your profile up to date." />

      {/* Email section */}
      <div className="border-transprent bg-surface-1 mb-8 rounded-lg border p-5">
        <p className="text-text-muted mb-1 text-xs font-medium">Email address</p>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm">{session?.user?.email}</p>
          {!showEmailForm && !emailSent && (
            <Button
              type="button"
              variant="ghost"
              className="border-transprent hover:bg-surface-3 h-8 border text-sm transition-colors duration-150"
              onClick={() => setShowEmailForm(true)}
            >
              Change email
            </Button>
          )}
        </div>

        {showEmailForm && (
          <div className="mt-4 space-y-3">
            <p className="text-text-muted text-xs">
              Enter your new email. We&apos;ll send a confirmation link — your address only changes
              when you click it.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="new@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="h-8 text-sm"
              />
              <Button
                type="button"
                className="border-primary/40 bg-primary/15 text-primary hover:bg-primary/25 h-8 border text-sm transition-colors duration-150"
                disabled={!emailInput || requestEmailChange.isPending}
                onClick={() => requestEmailChange.mutate({ newEmail: emailInput })}
              >
                {requestEmailChange.isPending ? "Sending…" : "Send link"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-8 text-sm"
                onClick={() => {
                  setShowEmailForm(false);
                  setEmailInput("");
                }}
              >
                Cancel
              </Button>
            </div>
            {requestEmailChange.isError && (
              <p className="text-danger text-xs">
                {requestEmailChange.error.message ?? "Something went wrong."}
              </p>
            )}
          </div>
        )}

        {emailSent && (
          <p className="text-success mt-3 text-xs">
            Confirmation link sent. Check your new inbox and click the link to confirm.
          </p>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Name */}
          <div className="space-y-4">
            <h2 className="font-medium">About you</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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

          {/* Work preferences */}
          <div className="space-y-4">
            <h2 className="font-medium">Work preferences</h2>

            <FormField
              control={form.control}
              name="workAuthorization"
              render={({ field }) => (
                <FormItem className="bg-surface-1 flex flex-row items-center space-y-0 space-x-3 rounded-md p-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(!!checked)}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    I am authorized to work in the United States *
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="availableDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Available days *</FormLabel>
                  <FormDescription>Select all days you can work.</FormDescription>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {DAYS.map((day) => (
                      <label
                        key={day.value}
                        className={`flex cursor-pointer items-center justify-center rounded-md px-3 py-1.5 text-sm transition-colors duration-150 ${
                          field.value?.includes(day.value)
                            ? "bg-primary/20 text-primary border-primary/40 border"
                            : "border-transprent hover:bg-surface-3 border"
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

          <Separator />

          {/* Job seek text */}
          <FormField
            control={form.control}
            name="jobSeekText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What kind of job are you seeking? *</FormLabel>
                <FormDescription>max 1000 characters</FormDescription>
                <FormControl>
                  <Textarea {...field} rows={4} maxLength={1000} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          {/* Skills */}
          {skillGroups && Object.keys(skillGroups).length > 0 && (
            <FormField
              control={form.control}
              name="skillIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skills</FormLabel>
                  <FormDescription>Select the skills you have or are developing.</FormDescription>
                  <div className="mt-2 space-y-4">
                    {Object.entries(skillGroups).map(([category, skills]) => (
                      <div key={category}>
                        <p className="text-text-muted mb-2 text-xs font-medium tracking-wide uppercase">
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

          {/* Optional fields */}
          <div className="space-y-6">
            <h2 className="font-medium">Optional details</h2>

            <FormField
              control={form.control}
              name="educationLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Highest education level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EDUCATION_OPTIONS.map((opt) => (
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

            {languages && languages.length > 0 && (
              <FormField
                control={form.control}
                name="languageIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Languages spoken</FormLabel>
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

            <FormField
              control={form.control}
              name="otherLanguages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Other languages</FormLabel>
                  <FormDescription>Languages not listed above.</FormDescription>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="e.g. Tigrinya, Wolof"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="otherSkills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Other skills</FormLabel>
                  <FormDescription>Skills not listed above, comma-separated.</FormDescription>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="e.g. Knitting, Beekeeping"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="about"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>About yourself</FormLabel>
                  <FormDescription>max 1000 characters</FormDescription>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={3} maxLength={1000} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {updateProfile.isError && (
            <p className="text-danger text-sm">
              {updateProfile.error.message ?? "Something went wrong. Please try again."}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              className="border-primary/40 bg-primary/15 text-primary hover:bg-primary/25 border transition-colors duration-150"
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? "Saving…" : "Save changes"}
            </Button>
            {saved && <p className="text-success text-sm">Saved.</p>}
          </div>
        </form>
      </Form>
    </div>
  );
}
