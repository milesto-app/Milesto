import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  return {
    title: "Privacy Policy - Momentum",
    description:
      "Learn how Momentum collects, uses, and protects your personal information.",
    openGraph: {
      title: "Privacy Policy - Momentum",
      description:
        "Learn how Momentum collects, uses, and protects your personal information.",
      type: "website",
    },
  };
}

export default function PrivacyPage() {
  return (
    <div className="prose-momentum">
      <h1 className="font-(family-name:--font-fraunces) text-4xl font-semibold text-[#2D5016]">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-[#6b6b6b]">Last updated: April 2026</p>

      <section className="mt-12">
        <h2>Introduction</h2>
        <p>
          Momentum is an AI-powered personal coaching app that helps you set a
          meaningful goal and build a clear path to achieve it. This policy
          explains how we collect, use, and protect your information when you
          use Momentum.
        </p>
      </section>

      <section>
        <h2>Information We Collect</h2>
        <p>We collect the following types of information:</p>
        <ul>
          <li>
            <strong>Account information</strong> — your email address and name,
            provided through Apple Sign-In.
          </li>
          <li>
            <strong>Goal data</strong> — goal titles, descriptions, and target
            dates you set within the app.
          </li>
          <li>
            <strong>Coaching conversations</strong> — messages exchanged with
            your AI coach to provide personalized guidance.
          </li>
          <li>
            <strong>Daily task progress</strong> — task completions, check-ins,
            and debrief reflections.
          </li>
          <li>
            <strong>Usage data</strong> — feature usage patterns and generation
            counts to help us improve the service.
          </li>
        </ul>
      </section>

      <section>
        <h2>How We Use Your Information</h2>
        <ul>
          <li>Provide personalized AI coaching tailored to your goal.</li>
          <li>Generate roadmaps, milestones, weekly plans, and daily tasks.</li>
          <li>Improve service quality and develop new features.</li>
          <li>Manage your subscription and account.</li>
        </ul>
      </section>

      <section>
        <h2>Third-Party Services</h2>
        <p>
          Momentum relies on trusted third-party services to deliver its core
          functionality:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> — database hosting and authentication.
          </li>
          <li>
            <strong>OpenRouter</strong> — AI language model processing for
            coaching and plan generation.
          </li>
          <li>
            <strong>ElevenLabs</strong> — voice synthesis and transcription for
            audio features.
          </li>
          <li>
            <strong>Apple</strong> — in-app subscriptions managed through
            StoreKit.
          </li>
        </ul>
      </section>

      <section>
        <h2>Data Storage and Security</h2>
        <p>
          Your data is encrypted both in transit and at rest. Our database is
          hosted on Supabase infrastructure (AWS), and we enforce Row Level
          Security on all database tables to ensure your data is only accessible
          to you.
        </p>
      </section>

      <section>
        <h2>Data Retention</h2>
        <p>
          We retain your data for as long as your account is active. If you
          request account deletion, we will remove your data within 30 days of
          your request.
        </p>
      </section>

      <section>
        <h2>Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access the data we hold about you.</li>
          <li>Request correction of inaccurate information.</li>
          <li>Request deletion of your account and data.</li>
          <li>Export your data in a portable format.</li>
        </ul>
        <p>
          To exercise any of these rights, contact us at{" "}
          <a
            href="mailto:support@momentum-ai.app"
            className="text-[#2D5016] underline underline-offset-2"
          >
            support@momentum-ai.app
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Children&apos;s Privacy</h2>
        <p>
          Momentum is not intended for users under the age of 13. We do not
          knowingly collect personal information from children. If you believe a
          child has provided us with their data, please contact us so we can
          remove it.
        </p>
      </section>

      <section>
        <h2>Changes to This Policy</h2>
        <p>
          We may update this privacy policy from time to time. Changes will be
          communicated through the app. Your continued use of Momentum after
          changes are posted constitutes your acceptance of the updated policy.
        </p>
      </section>

      <section>
        <h2>Contact Us</h2>
        <p>
          If you have questions about this privacy policy or how we handle your
          data, reach out to us at{" "}
          <a
            href="mailto:support@momentum-ai.app"
            className="text-[#2D5016] underline underline-offset-2"
          >
            support@momentum-ai.app
          </a>
          .
        </p>
      </section>
    </div>
  );
}
