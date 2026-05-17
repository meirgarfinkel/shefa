"use client";

import { use, useEffect, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
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

export default function CompanyEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: company, isLoading } = trpc.company.getById.useQuery({ id });

  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const form = useForm<UpdateCompanyInput>({
    resolver: zodResolver(UpdateCompanySchema),
    defaultValues: { id: "", name: "", city: "", state: "" },
  });

  useEffect(() => {
    if (!company) return;
    form.reset({
      id: company.id,
      name: company.name,
      city: company.city,
      state: company.state,
      website: company.website ?? undefined,
      industry: company.industry ?? undefined,
      companySize: company.companySize ?? undefined,
      aboutCompany: company.aboutCompany ?? undefined,
      missionText: company.missionText ?? undefined,
    });
  }, [company, form]);

  const updateCompany = trpc.company.update.useMutation({
    onSuccess: () => {
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

  if (isLoading) {
    return <div className="text-muted-foreground px-4 py-16 text-center text-sm">Loading…</div>;
  }

  if (!company) {
    return (
      <div className="text-muted-foreground px-4 py-16 text-center text-sm">Company not found.</div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader
        title={`Edit ${company.name}`}
        description="Keep your company profile up to date."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-4">
            <h2 className="font-medium">Company details</h2>

            <FormField
              control={form.control}
              name="name"
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

            <div className="grid grid-cols-2 gap-4">
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
          </div>

          <Separator />

          <div className="space-y-4">
            <h2 className="font-medium">Location</h2>
            <LocationPicker />
          </div>

          <Separator />

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

          {updateCompany.isError && (
            <p className="text-danger text-sm">
              {updateCompany.error.message ?? "Something went wrong. Please try again."}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={updateCompany.isPending}>
              {updateCompany.isPending ? "Saving…" : "Save changes"}
            </Button>
            {saved && <p className="text-success text-sm">Saved.</p>}
          </div>
        </form>
      </Form>

      <Separator className="my-10" />

      <div className="space-y-4">
        <h2 className="font-medium">Danger zone</h2>

        <div className="space-y-2">
          <p className="text-sm font-medium">Delete this company</p>
          <p className="text-muted-foreground text-sm">
            Removes the company and all its job postings. You must close all active jobs first.
          </p>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete company
          </Button>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete company?</DialogTitle>
            <DialogDescription>
              This will permanently delete <span className="font-medium">{company.name}</span> and
              all its job postings. This cannot be undone.
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
  );
}
