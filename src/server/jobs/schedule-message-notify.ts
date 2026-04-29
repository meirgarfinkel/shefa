import { getMessageNotifyQueue, MESSAGE_NOTIFY_JOB_NAME } from "./queue";

export async function scheduleMessageNotify(
  conversationId: string,
  recipientId: string,
): Promise<void> {
  const queue = getMessageNotifyQueue();
  const jobId = `msg-notify:${conversationId}`;

  const existing = await queue.getJob(jobId);
  if (existing) {
    await existing.remove();
  }

  await queue.add(
    MESSAGE_NOTIFY_JOB_NAME,
    { conversationId, recipientId },
    { delay: 12 * 60 * 1000, jobId },
  );
}
