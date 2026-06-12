"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc/provider";
import { UpdateBusinessSchema, type UpdateBusinessInput } from "@/lib/schemas/employer";
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

const BUSINESS_SIZES = [
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

type BusinessRecord = {
  id: string;
  name: string;
  city: string;
  state: string;
  website: string | null;
  industry: string | null;
  businessSize: string | null;
  aboutBusiness: string | null;
  missionText: string | null;
};

function BusinessEditForm({ business }: { business: BusinessRecord }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const form = useForm<UpdateBusinessInput>({
    resolver: zodResolver(UpdateBusinessSchema),
    defaultValues: {
      id: business.id,
      name: business.name,
      city: business.city,
      state: business.state,
      website: business.website ?? undefined,
      industry: (business.industry ?? undefined) as UpdateBusinessInput["industry"],
      businessSize: (business.businessSize ?? undefined) as UpdateBusinessInput["businessSize"],
      aboutBusiness: business.aboutBusiness ?? undefined,
      missionText: business.missionText ?? undefined,
    },
  });

  const updateBusiness = trpc.business.update.useMutation({
    onSuccess: () => {
      void utils.business.getById.invalidate({ id: business.id });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const deleteBusiness = trpc.business.delete.useMutation({
    onSuccess: () => router.replace("/employer/dashboard"),
  });

  function onSubmit(data: UpdateBusinessInput) {
    setSaved(false);
    updateBusiness.mutate(data);
  }

  return (
    <div className="p-5">
      <Panel className="mx-auto max-w-2xl">
        <PageHeader title={`Edit ${business.name}`} />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="mt-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Business name <span className="text-danger">*</span>
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
                name="businessSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business size</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger className="min-w-0">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BUSINESS_SIZES.map((opt) => (
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
                          <SelectValue placeholder="Select" />
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

            <div className="mt-8">
              <LocationPicker />
            </div>

            <div className="mt-8">
              <FormField
                control={form.control}
                name="aboutBusiness"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>About the business</FormLabel>
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
                    <FormLabel>Business values</FormLabel>
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
                    <FormCharCount value={field.value} max={1000} />
                  </FormItem>
                )}
              />
            </div>

            {updateBusiness.isError && (
              <p className="text-danger text-sm">
                {updateBusiness.error.message ?? "Something went wrong. Please try again."}
              </p>
            )}

            <div className="mt-5 flex justify-between">
              <span className="flex items-center gap-3">
                <Button type="submit" disabled={updateBusiness.isPending}>
                  {updateBusiness.isPending ? "Saving…" : "Save changes"}
                </Button>
                {saved && <p className="text-success text-sm">Saved.</p>}
              </span>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                Delete business
              </Button>
            </div>
          </form>
        </Form>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete business?</DialogTitle>
              <DialogDescription>
                This will permanently delete <span className="font-medium">{business.name}</span>{" "}
                and all its job postings. (This cannot be undone!)
              </DialogDescription>
            </DialogHeader>
            {deleteBusiness.isError && (
              <p className="text-danger text-sm">
                {deleteBusiness.error.message ?? "Something went wrong."}
              </p>
            )}
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setDeleteOpen(false)}
                disabled={deleteBusiness.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteBusiness.mutate({ id: business.id })}
                disabled={deleteBusiness.isPending}
              >
                {deleteBusiness.isPending ? "Deleting…" : "Yes, delete business"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Panel>
    </div>
  );
}

export default function BusinessEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: business, isLoading } = trpc.business.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="text-muted-foreground px-4 py-16 text-center text-sm">Keep growing.</div>
    );
  }

  if (!business) {
    return (
      <div className="text-muted-foreground px-4 py-16 text-center text-sm">
        Business not found.
      </div>
    );
  }

  return <BusinessEditForm business={business} />;
}
