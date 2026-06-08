import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Privacy Policy — Shefa",
  description: "How Shefa collects, uses, and protects your personal information.",
};

const LAST_UPDATED = "June 8, 2026";

export default function PrivacyPage() {
  return (
    <div className="p-5">
      <article className="mx-auto max-w-2xl space-y-8">
        <PageHeader title="Privacy Policy" description={`Last updated ${LAST_UPDATED}`} />

        <section className="space-y-3">
          <p className="text-md">
            Shefa is a nonprofit, charity-based job board that connects employers with candidates
            who are eager to learn on the job. We are committed to protecting your privacy and
            handling your personal information responsibly. This policy explains what we collect,
            why, and the choices you have.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Information We Collect</h2>
          <ul className="text-md list-disc space-y-2 pl-6">
            <li>
              <strong>Account information.</strong> When you sign in with Google, we receive your
              name, email address, and profile image to create and identify your account.
            </li>
            <li>
              <strong>Profile information.</strong> Details you provide as a job seeker or employer,
              such as your contact details, company information, job postings, and applications.
            </li>
            <li>
              <strong>Communications.</strong> Messages you exchange with other users through the
              platform, which are stored to deliver and display your conversations.
            </li>
            <li>
              <strong>Usage information.</strong> Basic technical data, such as log and device
              information, that helps us operate and secure the service.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">How We Use Your Information</h2>
          <ul className="text-md list-disc space-y-2 pl-6">
            <li>To provide, maintain, and improve the Shefa platform.</li>
            <li>
              To match job seekers with employers and to display profiles, jobs, and applications.
            </li>
            <li>
              To send service-related emails, including verification, notifications, and an optional
              daily digest you can control in your settings.
            </li>
            <li>To protect the safety and integrity of the platform and our community.</li>
          </ul>
          <p className="text-md">
            We do not sell your personal information. We do not use protected-class status or
            educational background to filter candidates — doing so would violate our mission.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">How We Share Information</h2>
          <p className="text-md">
            Information you choose to make part of your public profile, job postings, or
            applications is visible to other users as needed for the platform to function. We share
            data with service providers who help us operate Shefa — including Google (sign-in), Neon
            (database hosting), Vercel (application hosting), and Resend (email delivery) — solely
            to provide the service. We may disclose information when required by law or to protect
            our users.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Data Retention</h2>
          <p className="text-md">
            We retain your information for as long as your account is active. We never automatically
            delete user data. You may request deletion of your account and associated personal
            information by contacting us, subject to obligations that require us to retain certain
            records.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Your Choices</h2>
          <ul className="text-md list-disc space-y-2 pl-6">
            <li>You can review and update your profile information at any time.</li>
            <li>You can adjust your email notification preferences in your settings.</li>
            <li>You can request access to, correction of, or deletion of your data.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Changes to This Policy</h2>
          <p className="text-md">
            We may update this Privacy Policy from time to time. When we do, we will revise the
            &ldquo;last updated&rdquo; date above. Significant changes will be communicated through
            the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Contact Us</h2>
          <p className="text-md">
            If you have questions about this Privacy Policy or how we handle your information,
            please reach out to the Shefa team.
          </p>
        </section>
      </article>
    </div>
  );
}
