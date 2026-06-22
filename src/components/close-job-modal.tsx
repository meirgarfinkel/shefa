"use client";

import { useState } from "react";
import type { z } from "zod";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { JobClosureReasonEnum } from "@/lib/schemas/jobPosting";

type JobClosureReason = z.infer<typeof JobClosureReasonEnum>;

const CLOSURE_OPTIONS: { value: JobClosureReason; label: string }[] = [
  { value: "FILLED_ON_SHEFA", label: "Position filled from Shefa" },
  { value: "FILLED_ELSEWHERE", label: "Position filled from somewhere else" },
  { value: "HIRING_FROZEN", label: "Hiring paused/frozen" },
  { value: "CANCELLED", label: "Role cancelled" },
  { value: "OTHER", label: "Other" },
];

export function CloseJobModal({
  jobId,
  jobTitle,
  open,
  onClose,
}: {
  jobId: string;
  jobTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<JobClosureReason | null>(null);
  // "" = "Prefer not to say"; an application id = the named hire.
  const [hiredApplicationId, setHiredApplicationId] = useState<string>("");
  const utils = trpc.useUtils();

  // Only fetch applicants once the employer says the role was filled from Shefa.
  const applicants = trpc.application.listForJob.useQuery(
    { jobId },
    { enabled: open && reason === "FILLED_ON_SHEFA" },
  );
  const hireable = (applicants.data ?? []).filter(
    (a) => a.status === "SUBMITTED" || a.status === "VIEWED",
  );

  const closeJob = trpc.jobPosting.close.useMutation({
    onSuccess: () => {
      void utils.jobPosting.list.invalidate();
      void utils.jobPosting.getById.invalidate({ id: jobId });
      reset();
      onClose();
    },
  });

  function reset() {
    setReason(null);
    setHiredApplicationId("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit() {
    if (!reason) return;
    closeJob.mutate({
      id: jobId,
      reason,
      ...(reason === "FILLED_ON_SHEFA" && hiredApplicationId ? { hiredApplicationId } : {}),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close &ldquo;{jobTitle}&rdquo;?</DialogTitle>
        </DialogHeader>

        <p className="text-sm">Why are you closing this listing?</p>

        <div className="space-y-2">
          {CLOSURE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-100 ${
                reason === opt.value
                  ? "bg-blue-dark-2 text-white"
                  : "hover:bg-blue-dark-3/90 hover:text-white"
              }`}
            >
              <input
                type="radio"
                name="closureReason"
                value={opt.value}
                checked={reason === opt.value}
                onChange={() => setReason(opt.value)}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>

        {reason === "FILLED_ON_SHEFA" && (
          <div className="space-y-2">
            <p className="text-sm">Who did you hire? This helps us measure our impact.</p>
            {applicants.isLoading ? (
              <p className="text-sm">Loading applicants…</p>
            ) : (
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {hireable.map((a) => {
                  const name = a.seeker.seekerProfile
                    ? `${a.seeker.seekerProfile.firstName} ${a.seeker.seekerProfile.lastName}`
                    : "Applicant";
                  return (
                    <label
                      key={a.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-100 ${
                        hiredApplicationId === a.id
                          ? "bg-blue-dark-2 text-white"
                          : "hover:bg-blue-dark-3/90 hover:text-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="hiredApplicant"
                        value={a.id}
                        checked={hiredApplicationId === a.id}
                        onChange={() => setHiredApplicationId(a.id)}
                      />
                      <span className="text-sm">{name}</span>
                    </label>
                  );
                })}
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-100 ${
                    hiredApplicationId === ""
                      ? "bg-blue-dark-2 text-white"
                      : "hover:bg-blue-dark-3/90 hover:text-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="hiredApplicant"
                    value=""
                    checked={hiredApplicationId === ""}
                    onChange={() => setHiredApplicationId("")}
                  />
                  <span className="text-sm">Prefer not to say</span>
                </label>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button onClick={handleClose} disabled={closeJob.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason || closeJob.isPending}
            onClick={handleSubmit}
          >
            {closeJob.isPending ? "Closing…" : "Close listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
