"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc/provider";
import { CreateCompanySchema, type CreateCompanyInput } from "@/lib/schemas/employer";
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
import { LocationPicker } from "@/components/ui/location-picker";
import { Card } from "@/components/ui/card";

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

export default function CompanyNewPage() {
  const router = useRouter();

  const { data: existingCompanies } = trpc.company.listMine.useQuery();
  const isFirstCompany = (existingCompanies?.length ?? 0) === 0;

  const form = useForm<CreateCompanyInput>({
    resolver: zodResolver(CreateCompanySchema),
    defaultValues: { name: "", city: "", state: "" },
  });

  const createCompany = trpc.company.create.useMutation({
    onSuccess: () => router.push("/employer/dashboard"),
  });

  function onSubmit(data: CreateCompanyInput) {
    createCompany.mutate(data);
  }

  return (
    <div className="p-3">
      <div className="mx-auto max-w-2xl">
        <Card className="hover:bg-secondary/50">
          <div className="mb-8">
            <h1 className="text-xl font-bold">
              {isFirstCompany ? "Add Your Company" : "Add A Company"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {isFirstCompany
                ? "Tell candidates about the company you're hiring for."
                : "Add another company to post jobs under."}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Company basics */}
              <div className="space-y-4">
                <h2 className="font-medium">Company details</h2>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Company name <span className="text-danger">*</span>
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
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input
                          variant="secondary"
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="companySize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company size</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
              </div>

              <Separator />

              <div className="space-y-4">
                <h2 className="font-medium">Location</h2>
                <LocationPicker />
              </div>

              <Separator />

              <div className="space-y-6">
                <div>
                  <h2 className="font-medium">About your company</h2>
                  <p className="text-muted-foreground text-sm">
                    Optional — helps candidates understand who you are.
                  </p>
                </div>

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

              {createCompany.isError && (
                <p className="text-danger text-sm">
                  {createCompany.error.message ?? "Something went wrong. Please try again."}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={createCompany.isPending}>
                {createCompany.isPending
                  ? "Creating…"
                  : isFirstCompany
                    ? "Add company"
                    : "Add another company"}
              </Button>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
