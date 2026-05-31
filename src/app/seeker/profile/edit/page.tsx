"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signOut } from "next-auth/react";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

type SeekerProfileData = {
  firstName: string;
  lastName: string;
  city: string;
  state: string;
  workAuthorization: boolean;
  availableDays: string[];
  jobSeekText: string;
  educationLevel: string | null;
  about: string | null;
  languageIds: string[];
};

function SeekerProfileEditForm({ profile }: { profile: SeekerProfileData }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: languages } = trpc.taxonomy.languages.useQuery();

  const [saved, setSaved] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const form = useForm<UpdateSeekerProfileInput>({
    resolver: zodResolver(UpdateSeekerProfileSchema),
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      city: profile.city,
      state: profile.state,
      workAuthorization: profile.workAuthorization,
      availableDays: profile.availableDays as UpdateSeekerProfileInput["availableDays"],
      jobSeekText: profile.jobSeekText,
      educationLevel: (profile.educationLevel ??
        undefined) as UpdateSeekerProfileInput["educationLevel"],
      about: profile.about ?? undefined,
      languageIds: profile.languageIds,
    },
  });

  const updateProfile = trpc.seeker.updateProfile.useMutation({
    onSuccess: () => {
      void utils.seeker.getMyFullProfile.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const deleteAccount = trpc.user.deleteAccount.useMutation({
    onSuccess: async () => {
      await signOut({ redirect: false });
      router.replace("/sign-in");
    },
  });

  function onSubmit(data: UpdateSeekerProfileInput) {
    setSaved(false);
    updateProfile.mutate(data);
  }

  return (
    <div className="p-5">
      <div className="bg-card/30 mx-auto max-w-2xl rounded-md bg-linear-to-b from-white/10 via-transparent to-transparent">
        <div className="p-5">
          <PageHeader title="Edit Profile" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        First name <span className="text-danger">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input variant="secondary" {...field} />
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
                      <FormLabel>
                        Last name <span className="text-danger">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input variant="secondary" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Location */}
              <div className="my-8">
                <LocationPicker />
              </div>

              {/* Work authorization */}
              <div>
                <FormField
                  control={form.control}
                  name="workAuthorization"
                  render={({ field }) => (
                    <FormItem className="flex flex-row space-y-0 space-x-3 rounded-md bg-white/40 p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(!!checked)}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        I am authorized to work in the United States
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {/* Days available */}
              <div className="my-8">
                <FormField
                  control={form.control}
                  name="availableDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select all days you can work.</FormLabel>
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

              {/* Job seek text */}
              <FormField
                control={form.control}
                name="jobSeekText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      What kind of job are you seeking? <span className="text-danger">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} maxLength={1000} />
                    </FormControl>
                    <FormMessage />
                    <FormDescription className="text-muted/50 text-end">
                      (max 1000 characters)
                    </FormDescription>
                  </FormItem>
                )}
              />

              {/* Education */}
              <div className="mt-4 mb-8">
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
              </div>

              <div>
                {languages && languages.length > 0 && (
                  <FormField
                    control={form.control}
                    name="languageIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Languages spoken</FormLabel>
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

              <div className="mt-8 mb-4">
                <FormField
                  control={form.control}
                  name="about"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>About yourself</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ""} rows={3} maxLength={1000} />
                      </FormControl>
                      <FormMessage />
                      <FormDescription className="text-muted/50 text-end">
                        (max 1000 characters)
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              {updateProfile.isError && (
                <p className="text-danger text-sm">
                  {updateProfile.error.message ?? "Something went wrong. Please try again."}
                </p>
              )}

              <div className="flex justify-between">
                <span className="flex items-center gap-3">
                  <Button type="submit" disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? "Saving…" : "Save changes"}
                  </Button>
                  {saved && <p className="text-success text-sm">Saved.</p>}
                </span>
                <Button variant="destructive" onClick={() => setDeleteAccountOpen(true)}>
                  Delete account
                </Button>
              </div>
            </form>
          </Form>

          <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete account?</DialogTitle>
                <DialogDescription>
                  This will permanently delete your profile and all your applications. (This cannot
                  be undone!)
                </DialogDescription>
              </DialogHeader>
              {deleteAccount.isError && (
                <p className="text-danger text-sm">
                  {deleteAccount.error.message ?? "Something went wrong."}
                </p>
              )}
              <DialogFooter>
                <Button
                  onClick={() => setDeleteAccountOpen(false)}
                  disabled={deleteAccount.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteAccount.mutate()}
                  disabled={deleteAccount.isPending}
                >
                  {deleteAccount.isPending ? "Deleting…" : "Yes, delete everything"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

export default function SeekerProfileEditPage() {
  const { data: profile, isLoading } = trpc.seeker.getMyFullProfile.useQuery();

  if (isLoading) {
    return <div className="text-muted-foreground px-4 py-16 text-center text-sm">Loading…</div>;
  }

  if (!profile) {
    return (
      <div className="text-muted-foreground px-4 py-16 text-center text-sm">
        No profile found. Please complete your profile first.
      </div>
    );
  }

  return <SeekerProfileEditForm profile={profile} />;
}
