"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/provider";
import {
  UpdateEmployerProfileSchema,
  type UpdateEmployerProfileInput,
} from "@/lib/schemas/employer";
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

const COMPANY_SIZES = [
  { value: "SIZE_1_10", label: "1–10 employees" },
  { value: "SIZE_11_50", label: "11–50 employees" },
  { value: "SIZE_51_200", label: "51–200 employees" },
  { value: "SIZE_201_PLUS", label: "201+ employees" },
] as const;

const INDUSTRIES = [
  { value: "FOOD_SERVICE", label: "Food Service" },
  { value: "RETAIL", label: "Retail" },
  { value: "HOSPITALITY", label: "Hospitality" },
  { value: "HEALTHCARE", label: "Healthcare" },
  { value: "TRADES", label: "Trades" },
  { value: "MANUFACTURING", label: "Manufacturing" },
  { value: "OFFICE_ADMIN", label: "Office & Admin" },
  { value: "TRANSPORTATION", label: "Transportation" },
  { value: "EDUCATION", label: "Education" },
  { value: "PERSONAL_SERVICES", label: "Personal Services" },
  { value: "TECHNOLOGY", label: "Technology" },
  { value: "BUSINESS", label: "Business" },
  { value: "FINANCE", label: "Finance" },
  { value: "MARKETING", label: "Marketing" },
  { value: "MEDIA", label: "Media" },
  { value: "REAL_ESTATE", label: "Real Estate" },
  { value: "OTHER", label: "Other" },
] as const;

export default function EmployerProfileEditPage() {
  const { data: session } = useSession();
  const { data: profile, isLoading } = trpc.employer.getFullProfile.useQuery();

  const [saved, setSaved] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<UpdateEmployerProfileInput>({
    resolver: zodResolver(UpdateEmployerProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      companyName: "",
      companySize: undefined,
      city: "",
      state: "",
      zip: "",
    },
  });

  useEffect(() => {
    if (!profile) return;
    form.reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      companyName: profile.companyName,
      companySize: profile.companySize,
      city: profile.city,
      state: profile.state,
      zip: profile.zip,
      roleAtCompany: profile.roleAtCompany ?? undefined,
      industry: profile.industry ?? undefined,
      website: profile.website ?? undefined,
      aboutCompany: profile.aboutCompany ?? undefined,
      missionText: profile.missionText ?? undefined,
    });
  }, [profile, form]);

  const updateProfile = trpc.employer.updateProfile.useMutation({
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

  function onSubmit(data: UpdateEmployerProfileInput) {
    setSaved(false);
    updateProfile.mutate(data);
  }

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader title="Edit profile" description="Keep your company profile up to date." />

      {/* Email section */}
      <div className="border-border bg-card mb-8 rounded-lg border p-5">
        <p className="text-muted-foreground mb-1 text-xs font-medium">Email address</p>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm">{session?.user?.email}</p>
          {!showEmailForm && !emailSent && (
            <Button
              type="button"
              variant="ghost"
              className="border-border hover:bg-muted h-8 border text-sm transition-colors duration-150"
              onClick={() => setShowEmailForm(true)}
            >
              Change email
            </Button>
          )}
        </div>

        {showEmailForm && (
          <div className="mt-4 space-y-3">
            <p className="text-muted-foreground text-xs">
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
              <p className="text-destructive text-xs">
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
          {/* Contact person */}
          <div className="space-y-4">
            <h2 className="font-medium">Your information</h2>
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
            <FormField
              control={form.control}
              name="roleAtCompany"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your role at the company</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="e.g. Owner, HR Manager"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Company */}
          <div className="space-y-4">
            <h2 className="font-medium">Company</h2>
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companySize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company size *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMPANY_SIZES.map((opt) => (
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

              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INDUSTRIES.map((opt) => (
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

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      type="url"
                      placeholder="https://example.com"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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

          {/* About */}
          <div className="space-y-6">
            <h2 className="font-medium">About your company</h2>

            <FormField
              control={form.control}
              name="aboutCompany"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>About the company</FormLabel>
                  <FormDescription>
                    What does your company do? (max 2000 characters)
                  </FormDescription>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} rows={4} maxLength={2000} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="missionText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Why do you want to give people a chance?</FormLabel>
                  <FormDescription>
                    Tell candidates what makes your company different. (max 1000 characters)
                  </FormDescription>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={3}
                      maxLength={1000}
                      placeholder="e.g. We believe everyone deserves a shot."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {updateProfile.isError && (
            <p className="text-destructive text-sm">
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
