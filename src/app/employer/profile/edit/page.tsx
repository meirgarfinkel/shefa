"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signOut, useSession } from "next-auth/react";
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

export default function EmployerProfileEditPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { data: profile, isLoading } = trpc.employer.getProfile.useQuery();

  const [saved, setSaved] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const form = useForm<UpdateEmployerProfileInput>({
    resolver: zodResolver(UpdateEmployerProfileSchema),
    defaultValues: { firstName: "", lastName: "", roleAtCompany: "" },
  });

  useEffect(() => {
    if (!profile) return;
    form.reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      roleAtCompany: profile.roleAtCompany ?? "",
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

  const deleteAccount = trpc.user.deleteAccount.useMutation({
    onSuccess: async () => {
      await signOut({ redirect: false });
      router.replace("/sign-in");
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
        <p>Profile not found.</p>
        <Button asChild className="mt-4">
          <Link href="/employer/profile/new">Create Profile</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="px-3">
      <div className="bg-card/30 mx-auto mt-8 max-w-2xl rounded-md bg-linear-to-b from-white/10 via-transparent to-transparent">
        <div className="p-5">
          <PageHeader title="Edit Profile" description="Update your personal information." />

          {/* Email section */}
          <div className="bg-popover text-popover-foreground mb-8 space-y-4 rounded-md px-3 py-5">
            <div className="flex flex-wrap items-center gap-2 md:flex">
              <p className="text-sm font-medium">Email:</p>

              <p className="bg-secondary/20 rounded px-2 py-1 text-sm">{session?.user?.email}</p>

              {!showEmailForm && !emailSent && (
                <Button
                  className="ml-auto"
                  type="button"
                  variant="destructive"
                  onClick={() => setShowEmailForm(true)}
                >
                  Change email
                </Button>
              )}
            </div>

            {showEmailForm && (
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs">
                  Enter your new email. We&apos;ll send a confirmation link — your address only
                  changes when you click it.
                </p>
                <div className="flex gap-2">
                  <Input
                    variant="secondary"
                    type="email"
                    placeholder="new@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={!emailInput || requestEmailChange.isPending}
                    onClick={() => requestEmailChange.mutate({ newEmail: emailInput })}
                  >
                    {requestEmailChange.isPending ? "Sending…" : "Send link"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowEmailForm(false);
                      setEmailInput("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {requestEmailChange.isError && (
                  <p className="text-danger text-xs">
                    {requestEmailChange.error.message ?? "Something went wrong."}
                  </p>
                )}
              </div>
            )}

            {emailSent && (
              <p className="text-success text-xs">
                Confirmation link sent. Check your new inbox and click the link to confirm.
              </p>
            )}
          </div>

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

              {updateProfile.isError && (
                <p className="text-danger text-sm">
                  {updateProfile.error.message ?? "Something went wrong. Please try again."}
                </p>
              )}

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? "Saving…" : "Save changes"}
                </Button>
                {saved && <p className="text-success text-sm">Saved.</p>}
              </div>
            </form>
          </Form>
        </div>
        <div className="bg-secondary space-y-4 rounded-b-md p-5">
          <div className="text-sm font-medium">Delete account</div>
          <div className="text-muted-foreground text-sm">
            Permanently deletes your account, profile, companies, and all job postings.
          </div>
          <Button variant="destructive" onClick={() => setDeleteAccountOpen(true)}>
            Delete account
          </Button>
        </div>

        <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete account?</DialogTitle>
              <DialogDescription>
                This will permanently delete your account, all companies, and all job postings. This
                cannot be undone.
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
      </div>
    </div>
  );
}
