import { getApplicationNotifyQueue, APPLICATION_NOTIFY_JOB_NAME } from "./queue";

export async function scheduleApplicationNotify(jobId: string, employerId: string): Promise<void> {
  const queue = getApplicationNotifyQueue();
  const bullJobId = `app-notify:${jobId}`;

  const existing = await queue.getJob(bullJobId);
  if (existing) {
    await existing.remove();
  }

  await queue.add(
    APPLICATION_NOTIFY_JOB_NAME,
    { jobId, employerId },
    { delay: 12 * 60 * 1000, jobId: bullJobId },
  );
}
