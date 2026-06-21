"use client";

import { useState } from "react";
import type { z } from "zod";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackCategoryEnum } from "@/lib/schemas/feedback";
import { FEEDBACK_CATEGORY_LABELS } from "@/lib/constants/labels";

type FeedbackCategory = z.infer<typeof FeedbackCategoryEnum>;

const CATEGORY_OPTIONS: FeedbackCategory[] = ["BUG", "IMPROVEMENT", "THANKS", "OTHER"];
const MAX_LENGTH = 2000;

export function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [category, setCategory] = useState<FeedbackCategory>("BUG");
  const [message, setMessage] = useState("");

  const submit = trpc.feedback.submit.useMutation();

  function reset() {
    setCategory("BUG");
    setMessage("");
    submit.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  const trimmed = message.trim();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
        </DialogHeader>

        {submit.isSuccess ? (
          <div className="space-y-4">
            <p className="text-sm">
              Thanks for reaching out — we&rsquo;ve passed this along to the team.
            </p>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <p className="text-sm">Report a bug, suggest an improvement, or just say thanks.</p>

            <div className="space-y-2">
              {CATEGORY_OPTIONS.map((value) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-100 ${
                    category === value
                      ? "bg-blue-dark-2 text-white"
                      : "hover:bg-blue-dark-3/90 hover:text-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="feedbackCategory"
                    value={value}
                    checked={category === value}
                    onChange={() => setCategory(value)}
                  />
                  <span className="text-sm">{FEEDBACK_CATEGORY_LABELS[value]}</span>
                </label>
              ))}
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
              placeholder="Tell us what's on your mind…"
              rows={5}
            />

            {submit.isError && (
              <p className="text-destructive text-sm">
                {submit.error.message || "Something went wrong. Please try again."}
              </p>
            )}

            <DialogFooter className="gap-2">
              <Button variant="light" onClick={handleClose} disabled={submit.isPending}>
                Cancel
              </Button>
              <Button
                disabled={trimmed.length === 0 || submit.isPending}
                onClick={() => submit.mutate({ category, message: trimmed })}
              >
                {submit.isPending ? "Sending…" : "Send"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
