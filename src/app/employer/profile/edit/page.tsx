"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc/provider";
import {
  UpdateEmployerProfileSchema,
  type UpdateEmployerProfileInput,
} from "@/lib/schemas/employer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Panel } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { signOut } from "next-auth/react";

export default function EmployerProfileEditPage() {
  const router = useRouter();
  const { data: profile, isLoading } = trpc.employer.getProfile.useQuery();

  const [saved, setSaved] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const form = useForm<UpdateEmployerProfileInput>({
    resolver: zodResolver(UpdateEmployerProfileSchema),
    defaultValues: { firstName: "", lastName: "", roleAtBusiness: "" },
  });

  useEffect(() => {
    if (!profile) return;
    form.reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      roleAtBusiness: profile.roleAtBusiness ?? "",
    });
  }, [profile, form]);

  const updateProfile = trpc.employer.updateProfile.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const deleteAccount = trpc.user.deleteAccount.useMutation({
    onSuccess: async () => {
      await signOut({ redirect: false });
      router.replace("/");
    },
  });

  function onSubmit(data: UpdateEmployerProfileInput) {
    setSaved(false);
    updateProfile.mutate(data);
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground px-4 py-16 text-center text-sm">Jobs change lives.</div>
    );
  }

  if (!profile) {
    return (
      <div className="text-muted-foreground px-4 py-16 text-center text-sm">
        <p>Profile not found.</p>
        <Button asChild className="mt-4">
          <Link href="/employer/profile/new">Create profile</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-5">
      <Panel className="mx-auto max-w-2xl">
        <PageHeader title="Edit your profile" />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
              name="roleAtBusiness"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your role</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Hiring Manager, CEO, Owner"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                This will permanently delete your account, profile, businesses, job postings and all
                your data (this cannot be undone!)
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
      </Panel>
    </div>
  );
}
