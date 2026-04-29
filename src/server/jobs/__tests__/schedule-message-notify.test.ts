import { describe, it, expect, vi, beforeEach } from "vitest";
import { scheduleMessageNotify } from "../schedule-message-notify";

// Mock the queue module so no real Redis connection is made
vi.mock("@/server/jobs/queue", () => ({
  getMessageNotifyQueue: vi.fn(),
  MESSAGE_NOTIFY_JOB_NAME: "message-notify",
}));

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeMockJob() {
  return { remove: vi.fn().mockResolvedValue(undefined) };
}

function makeMockQueue(existingJob: ReturnType<typeof makeMockJob> | null = null) {
  return {
    getJob: vi.fn().mockResolvedValue(existingJob),
    add: vi.fn().mockResolvedValue({ id: "new-job-id" }),
  };
}

const CONV_ID = "conv-1";
const RECIPIENT_ID = "user-recipient";
const TWELVE_MINUTES_MS = 12 * 60 * 1000;

// ── scheduleMessageNotify ─────────────────────────────────────────────────────

describe("scheduleMessageNotify", () => {
  let mockQueue: ReturnType<typeof makeMockQueue>;

  beforeEach(async () => {
    const { getMessageNotifyQueue } = await import("@/server/jobs/queue");
    mockQueue = makeMockQueue();
    vi.mocked(getMessageNotifyQueue).mockReturnValue(mockQueue as never);
  });

  it("happy path: adds a delayed job with correct jobId", async () => {
    await scheduleMessageNotify(CONV_ID, RECIPIENT_ID);

    expect(mockQueue.add).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ conversationId: CONV_ID, recipientId: RECIPIENT_ID }),
      expect.objectContaining({ jobId: `msg-notify:${CONV_ID}` }),
    );
  });

  it("delay is exactly 12 minutes (720000ms)", async () => {
    await scheduleMessageNotify(CONV_ID, RECIPIENT_ID);

    expect(mockQueue.add).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.objectContaining({ delay: TWELVE_MINUTES_MS }),
    );
  });

  it("no existing job → getJob called with correct key, add called once", async () => {
    await scheduleMessageNotify(CONV_ID, RECIPIENT_ID);

    expect(mockQueue.getJob).toHaveBeenCalledWith(`msg-notify:${CONV_ID}`);
    expect(mockQueue.add).toHaveBeenCalledOnce();
  });

  it("existing delayed job found → removes it before adding new one", async () => {
    const existingJob = makeMockJob();
    const { getMessageNotifyQueue } = await import("@/server/jobs/queue");
    const queueWithJob = makeMockQueue(existingJob);
    vi.mocked(getMessageNotifyQueue).mockReturnValue(queueWithJob as never);

    await scheduleMessageNotify(CONV_ID, RECIPIENT_ID);

    expect(existingJob.remove).toHaveBeenCalledOnce();
    expect(queueWithJob.add).toHaveBeenCalledOnce();
  });

  it("existing job removed before new one is added (order)", async () => {
    const callOrder: string[] = [];
    const existingJob = {
      remove: vi.fn().mockImplementation(async () => {
        callOrder.push("remove");
      }),
    };
    const { getMessageNotifyQueue } = await import("@/server/jobs/queue");
    const queueWithJob = {
      getJob: vi.fn().mockResolvedValue(existingJob),
      add: vi.fn().mockImplementation(async () => {
        callOrder.push("add");
        return { id: "new-job-id" };
      }),
    };
    vi.mocked(getMessageNotifyQueue).mockReturnValue(queueWithJob as never);

    await scheduleMessageNotify(CONV_ID, RECIPIENT_ID);

    expect(callOrder).toEqual(["remove", "add"]);
  });

  it("different conversationIds produce different jobId keys", async () => {
    await scheduleMessageNotify("conv-A", RECIPIENT_ID);
    await scheduleMessageNotify("conv-B", RECIPIENT_ID);

    const calls = mockQueue.add.mock.calls;
    const jobIdA = (calls[0]![2] as Record<string, unknown>).jobId;
    const jobIdB = (calls[1]![2] as Record<string, unknown>).jobId;
    expect(jobIdA).toBe("msg-notify:conv-A");
    expect(jobIdB).toBe("msg-notify:conv-B");
    expect(jobIdA).not.toBe(jobIdB);
  });
});
