import { describe, it, expect, vi, beforeEach } from "vitest";
import { scheduleApplicationNotify } from "../schedule-application-notify";

vi.mock("@/server/jobs/queue", () => ({
  getApplicationNotifyQueue: vi.fn(),
  APPLICATION_NOTIFY_JOB_NAME: "application-notify",
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

const JOB_ID = "job-1";
const EMPLOYER_ID = "employer-1";
const TWELVE_MINUTES_MS = 12 * 60 * 1000;

// ── scheduleApplicationNotify ─────────────────────────────────────────────────

describe("scheduleApplicationNotify", () => {
  let mockQueue: ReturnType<typeof makeMockQueue>;

  beforeEach(async () => {
    const { getApplicationNotifyQueue } = await import("@/server/jobs/queue");
    mockQueue = makeMockQueue();
    vi.mocked(getApplicationNotifyQueue).mockReturnValue(mockQueue as never);
  });

  it("happy path: adds a delayed job with correct jobId", async () => {
    await scheduleApplicationNotify(JOB_ID, EMPLOYER_ID);

    expect(mockQueue.add).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ jobId: JOB_ID, employerId: EMPLOYER_ID }),
      expect.objectContaining({ jobId: `app-notify:${JOB_ID}` }),
    );
  });

  it("delay is exactly 12 minutes (720000ms)", async () => {
    await scheduleApplicationNotify(JOB_ID, EMPLOYER_ID);

    expect(mockQueue.add).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.objectContaining({ delay: TWELVE_MINUTES_MS }),
    );
  });

  it("no existing job → getJob called with correct key, add called once", async () => {
    await scheduleApplicationNotify(JOB_ID, EMPLOYER_ID);

    expect(mockQueue.getJob).toHaveBeenCalledWith(`app-notify:${JOB_ID}`);
    expect(mockQueue.add).toHaveBeenCalledOnce();
  });

  it("existing delayed job found → removes it before adding new one", async () => {
    const existingJob = makeMockJob();
    const { getApplicationNotifyQueue } = await import("@/server/jobs/queue");
    const queueWithJob = makeMockQueue(existingJob);
    vi.mocked(getApplicationNotifyQueue).mockReturnValue(queueWithJob as never);

    await scheduleApplicationNotify(JOB_ID, EMPLOYER_ID);

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
    const { getApplicationNotifyQueue } = await import("@/server/jobs/queue");
    const queueWithJob = {
      getJob: vi.fn().mockResolvedValue(existingJob),
      add: vi.fn().mockImplementation(async () => {
        callOrder.push("add");
        return { id: "new-job-id" };
      }),
    };
    vi.mocked(getApplicationNotifyQueue).mockReturnValue(queueWithJob as never);

    await scheduleApplicationNotify(JOB_ID, EMPLOYER_ID);

    expect(callOrder).toEqual(["remove", "add"]);
  });

  it("different jobIds produce different BullMQ job keys", async () => {
    await scheduleApplicationNotify("job-A", EMPLOYER_ID);
    await scheduleApplicationNotify("job-B", EMPLOYER_ID);

    const calls = mockQueue.add.mock.calls;
    const keyA = (calls[0]![2] as Record<string, unknown>).jobId;
    const keyB = (calls[1]![2] as Record<string, unknown>).jobId;
    expect(keyA).toBe("app-notify:job-A");
    expect(keyB).toBe("app-notify:job-B");
    expect(keyA).not.toBe(keyB);
  });
});
