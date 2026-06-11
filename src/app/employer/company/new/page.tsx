"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc/provider";
import { CreateCompanySchema, type CreateCompanyInput } from "@/lib/schemas/employer";
import {
  Form,
  FormControl,
  FormCharCount,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Panel } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="p-5">
      <Panel className="mx-auto max-w-2xl">
        <PageHeader
          title={isFirstCompany ? "Add your company" : "Add a company"}
          description={
            isFirstCompany
              ? "Tell candidates about the company you're hiring for."
              : "Add another company to post jobs under."
          }
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="mt-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Company name <span className="text-danger">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-8">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input
                        variant="light"
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

            <div className="mt-8 grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companySize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company size</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
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
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent align="start">
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

            <div className="mt-8">
              <LocationPicker />
            </div>

            <div className="mt-8">
              <FormField
                control={form.control}
                name="aboutCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>About the company</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        rows={4}
                        maxLength={2000}
                        placeholder="e.g. We provide custom software solutions for any need."
                      />
                    </FormControl>
                    <FormMessage />
                    <FormCharCount value={field.value} max={2000} />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-5">
              <FormField
                control={form.control}
                name="missionText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company values</FormLabel>
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
                    <FormCharCount value={field.value} max={1000} />
                  </FormItem>
                )}
              />
            </div>

            {createCompany.isError && (
              <p className="text-danger text-sm">
                {createCompany.error.message ?? "Something went wrong. Please try again."}
              </p>
            )}

            <Button
              type="submit"
              className="mt-5 px-10 text-nowrap"
              disabled={createCompany.isPending}
            >
              {createCompany.isPending
                ? "Creating…"
                : isFirstCompany
                  ? "Add company"
                  : "Add another company"}
            </Button>
          </form>
        </Form>
      </Panel>
    </div>
  );
}
