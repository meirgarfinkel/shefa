"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc/provider";
import { UpdateCompanySchema, type UpdateCompanyInput } from "@/lib/schemas/employer";
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

type CompanyRecord = {
  id: string;
  name: string;
  city: string;
  state: string;
  website: string | null;
  industry: string | null;
  companySize: string | null;
  aboutCompany: string | null;
  missionText: string | null;
};

function CompanyEditForm({ company }: { company: CompanyRecord }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const form = useForm<UpdateCompanyInput>({
    resolver: zodResolver(UpdateCompanySchema),
    defaultValues: {
      id: company.id,
      name: company.name,
      city: company.city,
      state: company.state,
      website: company.website ?? undefined,
      industry: (company.industry ?? undefined) as UpdateCompanyInput["industry"],
      companySize: (company.companySize ?? undefined) as UpdateCompanyInput["companySize"],
      aboutCompany: company.aboutCompany ?? undefined,
      missionText: company.missionText ?? undefined,
    },
  });

  const updateCompany = trpc.company.update.useMutation({
    onSuccess: () => {
      void utils.company.getById.invalidate({ id: company.id });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const deleteCompany = trpc.company.delete.useMutation({
    onSuccess: () => router.replace("/employer/dashboard"),
  });

  function onSubmit(data: UpdateCompanyInput) {
    setSaved(false);
    updateCompany.mutate(data);
  }

  return (
    <div className="p-5">
      <div className="bg-card/30 mx-auto max-w-2xl rounded-md bg-linear-to-b from-white/10 via-transparent to-transparent">
        <div className="p-5">
          <PageHeader title={`Edit ${company.name}`} />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="my-8">
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

              <div>
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

              <div className="my-8 grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="companySize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company size</FormLabel>
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

              <LocationPicker />

              <div className="mt-8 mb-4">
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
                          placeholder="We provide custom software solutions for any need."
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription className="text-muted/50 text-end">
                        (max 2000 characters)
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              <div>
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
                          placeholder="We believe everyone deserves a shot."
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

              {updateCompany.isError && (
                <p className="text-danger text-sm">
                  {updateCompany.error.message ?? "Something went wrong. Please try again."}
                </p>
              )}

              <div className="mt-4 flex justify-between">
                <span className="flex items-center gap-3">
                  <Button type="submit" disabled={updateCompany.isPending}>
                    {updateCompany.isPending ? "Saving…" : "Save changes"}
                  </Button>
                  {saved && <p className="text-success text-sm">Saved.</p>}
                </span>
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  Delete company
                </Button>
              </div>
            </form>
          </Form>

          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete company?</DialogTitle>
                <DialogDescription>
                  This will permanently delete <span className="font-medium">{company.name}</span>{" "}
                  and all its job postings. (This cannot be undone!)
                </DialogDescription>
              </DialogHeader>
              {deleteCompany.isError && (
                <p className="text-danger text-sm">
                  {deleteCompany.error.message ?? "Something went wrong."}
                </p>
              )}
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleteCompany.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteCompany.mutate({ id: company.id })}
                  disabled={deleteCompany.isPending}
                >
                  {deleteCompany.isPending ? "Deleting…" : "Yes, delete company"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

export default function CompanyEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: company, isLoading } = trpc.company.getById.useQuery({ id });

  if (isLoading) {
    return <div className="text-muted-foreground px-4 py-16 text-center text-sm">Loading…</div>;
  }

  if (!company) {
    return (
      <div className="text-muted-foreground px-4 py-16 text-center text-sm">Company not found.</div>
    );
  }

  return <CompanyEditForm company={company} />;
}
