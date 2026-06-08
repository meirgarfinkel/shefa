import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Terms of Service — Shefa",
  description: "The terms that govern your use of the Shefa platform.",
};

const LAST_UPDATED = "June 8, 2026";

export default function TermsPage() {
  return (
    <div className="p-5">
      <article className="mx-auto max-w-2xl space-y-8">
        <PageHeader title="Terms of Service" description={`Last updated ${LAST_UPDATED}`} />

        <section className="space-y-3">
          <p className="text-md">
            Welcome to Shefa, a nonprofit, charity-based job board with a mission to give candidates
            eager to learn a chance to grow on the job. By accessing or using Shefa, you agree to
            these Terms of Service. If you do not agree, please do not use the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Eligibility &amp; Accounts</h2>
          <p className="text-md">
            You must be able to form a binding agreement to use Shefa. Accounts are created through
            Google sign-in. You are responsible for the activity under your account and for keeping
            your sign-in credentials secure. Provide accurate information and keep it up to date.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Acceptable Use</h2>
          <p className="text-md">By using Shefa, you agree not to:</p>
          <ul className="text-md list-disc space-y-2 pl-6">
            <li>Post false, misleading, fraudulent, or discriminatory content.</li>
            <li>
              Filter, screen, or reject candidates based on protected-class status or educational
              background — this is contrary to our mission.
            </li>
            <li>Harass, abuse, or harm other users.</li>
            <li>Use the platform for any unlawful purpose or in violation of these terms.</li>
            <li>
              Attempt to disrupt, reverse-engineer, or gain unauthorized access to the platform.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Employers &amp; Job Seekers</h2>
          <p className="text-md">
            Employers are responsible for the accuracy and lawfulness of the jobs and company
            information they post. Job seekers are responsible for the accuracy of their profiles
            and applications. Shefa facilitates connections but is not a party to any employment
            relationship and does not guarantee any hiring outcome.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">No Payments</h2>
          <p className="text-md">
            Shefa is a charity-based service. We do not process payments, charge fees, or facilitate
            financial transactions between users on the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Content &amp; Conduct</h2>
          <p className="text-md">
            You retain ownership of the content you submit, and you grant Shefa permission to host
            and display it as needed to operate the service. We may remove content or suspend
            accounts that violate these terms or harm the community. Reports submitted by users are
            treated as evidence and reviewed by our moderation team.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Disclaimers</h2>
          <p className="text-md">
            Shefa is provided &ldquo;as is&rdquo; without warranties of any kind. We do not
            guarantee the accuracy of user-provided content, the suitability of any job or
            candidate, or uninterrupted availability of the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Limitation of Liability</h2>
          <p className="text-md">
            To the fullest extent permitted by law, Shefa and its operators are not liable for any
            indirect, incidental, or consequential damages arising from your use of the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Changes to These Terms</h2>
          <p className="text-md">
            We may update these Terms of Service from time to time. When we do, we will revise the
            &ldquo;last updated&rdquo; date above. Continued use of Shefa after changes take effect
            constitutes acceptance of the revised terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Contact Us</h2>
          <p className="text-md">
            If you have questions about these Terms of Service, please reach out to the Shefa team.
          </p>
        </section>
      </article>
    </div>
  );
}
