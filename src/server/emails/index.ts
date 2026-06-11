interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[EMAIL] To: ${payload.to} | Subject: ${payload.subject}\n${payload.html}\n`);
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY!);

  const from = process.env.RESEND_FROM_EMAIL
    ? `Shefa <${process.env.RESEND_FROM_EMAIL}>`
    : "Shefa <noreply@shefa.jobs>";

  await resend.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
}
