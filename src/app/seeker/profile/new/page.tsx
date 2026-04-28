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
  const { data: skillGroups } = trpc.taxonomy.skills.useQuery();
  const { data: languages } = trpc.taxonomy.languages.useQuery();

  const form = useForm<CreateSeekerProfileInput>({
    resolver: zodResolver(CreateSeekerProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      city: "",
      state: "",
      zip: "",
      workAuthorization: false,
      availableDays: [],
      jobSeekText: "",
      skillIds: [],
      languageIds: [],
    },
  });

  const createProfile = trpc.seeker.createProfile.useMutation({
    onSuccess: () => router.push("/jobs"),
  });

  function onSubmit(data: CreateSeekerProfileInput) {
    createProfile.mutate(data);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Create your profile</h1>
        <p className="text-muted-foreground mt-1">
          This is how employers will find you. Required fields are marked with *.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Age confirmation */}
          <FormField
            control={form.control}
            name="isAdult"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked ? true : undefined)}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>I confirm I am 18 years of age or older *</FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <Separator />

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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          {/* Work preferences */}
          <div className="space-y-4">
            <h2 className="font-medium">Work preferences</h2>

            <FormField
              control={form.control}
              name="workAuthorization"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-y-0 space-x-3">
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
                        className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-1.5 text-sm transition-colors ${
                          field.value?.includes(day.value)
                            ? "bg-primary text-primary-foreground border-primary"
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
          </div>

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

          {/* Job seek text */}
          <FormField
            control={form.control}
            name="jobSeekText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What kind of job are you seeking? *</FormLabel>
                <FormDescription>
                  Describe the type of work you&apos;re looking for and what you want to learn on
                  the job. (max 1000 characters)
                </FormDescription>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={4}
                    maxLength={1000}
                    placeholder="e.g. I'm looking for entry-level work in food service or retail. I want to learn customer service and build a stable work history."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          {/* Optional section */}
          <div className="space-y-6">
            <div>
              <h2 className="font-medium">Optional — add later if you like</h2>
              <p className="text-muted-foreground text-sm">
                These fields help employers find you but aren&apos;t required to get started.
              </p>
            </div>

            <FormField
              control={form.control}
              name="educationLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Highest education level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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
                  <FormDescription>
                    Anything else you&apos;d like employers to know. (max 1000 characters)
                  </FormDescription>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={3} maxLength={1000} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {createProfile.isError && (
            <p className="text-destructive text-sm">
              {createProfile.error.message ?? "Something went wrong. Please try again."}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={createProfile.isPending}>
            {createProfile.isPending ? "Creating profile…" : "Create profile"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
