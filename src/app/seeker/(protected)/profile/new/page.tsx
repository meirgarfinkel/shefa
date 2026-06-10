"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc/provider";
import { CreateSeekerProfileSchema, type CreateSeekerProfileInput } from "@/lib/schemas/seeker";
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

export default function SeekerProfileNewPage() {
  const router = useRouter();
  const { data: languages } = trpc.taxonomy.languages.useQuery();

  const form = useForm<CreateSeekerProfileInput>({
    resolver: zodResolver(CreateSeekerProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      city: "",
      state: "",
      workAuthorization: false,
      availableDays: [],
      jobSeekText: "",
      languageIds: [],
    },
  });

  const createProfile = trpc.seeker.createProfile.useMutation({
    onSuccess: () => {
      router.push("/jobs");
      // Refresh server components so the onboarding gate + <Nav> see the new profile.
      router.refresh();
    },
  });

  function onSubmit(data: CreateSeekerProfileInput) {
    createProfile.mutate(data);
  }

  return (
    <div className="p-5">
      <div className="bg-card/30 mx-auto max-w-2xl rounded-md bg-linear-to-b from-white/10 via-transparent to-transparent">
        <div className="p-5">
          <PageHeader title="Create your profile" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        First name <span className="text-danger">*</span>
                      </FormLabel>
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
                      <FormLabel>
                        Last name <span className="text-danger">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Location */}
              <div className="mt-8">
                <LocationPicker />
              </div>

              {/* Days available */}
              <div className="mt-8">
                <FormField
                  control={form.control}
                  name="availableDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select all days you can work</FormLabel>
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
                  name="jobSeekText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        What kind of job are you seeking? <span className="text-danger">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={4}
                          maxLength={1000}
                          placeholder="I'm looking for work in food service or retail."
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription className="text-muted/60 text-end">
                        {field.value?.length ?? 0}/1000
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-5">
                <FormField
                  control={form.control}
                  name="educationLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Highest education level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
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

              {languages && languages.length > 0 && (
                <div className="mt-8">
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
                </div>
              )}

              <div className="mt-8">
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
                      <FormDescription className="text-muted/60 text-end">
                        {field.value?.length ?? 0}/1000
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-5">
                <FormField
                  control={form.control}
                  name="isAdult"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-y-0 space-x-3 rounded-md bg-white/40 px-3 py-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={(checked) => field.onChange(checked ? true : undefined)}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I confirm I am 18+ years old <span className="text-danger">*</span>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-5">
                <FormField
                  control={form.control}
                  name="workAuthorization"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-y-0 space-x-3 rounded-md bg-white/40 px-3 py-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(!!checked)}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        I am authorized to work in the United States
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {createProfile.isError && (
                <p className="text-danger text-sm">
                  {createProfile.error.message ?? "Something went wrong. Please try again."}
                </p>
              )}

              <Button
                type="submit"
                className="mt-8 px-10 text-nowrap"
                disabled={createProfile.isPending}
              >
                {createProfile.isPending ? "Creating profile…" : "Create profile"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
