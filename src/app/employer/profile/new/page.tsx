"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc/provider";
import {
  CreateEmployerProfileSchema,
  type CreateEmployerProfileInput,
} from "@/lib/schemas/employer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default function EmployerProfileNewPage() {
  const router = useRouter();

  const form = useForm<CreateEmployerProfileInput>({
    resolver: zodResolver(CreateEmployerProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      roleAtCompany: "",
    },
  });

  const createProfile = trpc.employer.createProfile.useMutation({
    onSuccess: () => router.push("/employer/company/new"),
  });

  function onSubmit(data: CreateEmployerProfileInput) {
    createProfile.mutate(data);
  }

  return (
    <div className="p-5">
      <div className="bg-card/30 mx-auto max-w-2xl rounded-md bg-linear-to-b from-white/10 via-transparent to-transparent">
        <div className="p-5">
          <PageHeader title="Create your employer profile" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

              <FormField
                control={form.control}
                name="roleAtCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your role</FormLabel>
                    <FormControl>
                      <Input
                        variant="secondary"
                        {...field}
                        value={field.value ?? ""}
                        placeholder="e.g. Hiring Manager, CEO, Owner"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isAdult"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-sm bg-white/40 p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value === true}
                        onCheckedChange={(checked) => field.onChange(checked ? true : undefined)}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I confirm I am 18 years of age or older{" "}
                        <span className="text-danger">*</span>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {createProfile.isError && (
                <p className="text-danger text-sm">
                  {createProfile.error.message ?? "Something went wrong. Please try again."}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={createProfile.isPending}>
                {createProfile.isPending ? "Saving…" : "Continue"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
