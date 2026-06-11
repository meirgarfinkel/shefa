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
  const utils = trpc.useUtils();

  const closeJob = trpc.jobPosting.close.useMutation({
    onSuccess: () => {
      void utils.jobPosting.list.invalidate();
      void utils.jobPosting.getById.invalidate({ id: jobId });
      setReason(null);
      onClose();
    },
  });

  function handleClose() {
    setReason(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close &ldquo;{jobTitle}&rdquo;?</DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">Why are you closing this listing?</p>

        <div className="space-y-2">
          {CLOSURE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-100 ${
                reason === opt.value ? "bg-blue-dark-2" : "hover:bg-blue-dark-3"
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

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleClose} disabled={closeJob.isPending}>
            Cancel
          </Button>
          <Button
            className="bg-danger/15 text-danger hover:bg-danger/25 transition-colors duration-100"
            disabled={!reason || closeJob.isPending}
            onClick={() => reason && closeJob.mutate({ id: jobId, reason })}
          >
            {closeJob.isPending ? "Closing…" : "Close listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
