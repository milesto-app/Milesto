import type { Metadata } from "next";
import Link from "next/link";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export function generateMetadata(): Metadata {
  return {
    title: "Support - Milesto",
    description:
      "Get help with the Milesto app. Find answers to common questions or reach out to our support team.",
    openGraph: {
      title: "Support - Milesto",
      description:
        "Get help with the Milesto app. Find answers to common questions or reach out to our support team.",
      type: "website",
    },
  };
}

const faqs = [
  {
    question: "What is Milesto?",
    answer:
      "Milesto is an AI-powered personal coaching app that helps you turn one big goal into a clear, actionable plan. It creates a personalized roadmap with milestones, weekly plans, and daily tasks — so you always know what to do next.",
  },
  {
    question: "How does the AI coach work?",
    answer:
      "When you set your goal, Milesto generates a personalized roadmap broken into milestones. Each week, your AI coach creates a focused weekly plan with daily tasks tailored to your progress. The coach adapts as you move forward, keeping you on track with structure and support.",
  },
  {
    question: "What coaches are available?",
    answer:
      "Milesto offers four distinct coaching personalities. The Motivator brings high energy and encouragement. Zen focuses on mindfulness and sustainable progress. Strict holds you accountable with direct, no-nonsense guidance. Buddy is your friendly, approachable companion who makes the journey feel lighter.",
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "You can manage or cancel your subscription through your iPhone's Settings app. Go to Settings > your name > Subscriptions, find Milesto, and select Cancel Subscription.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. Your data is encrypted both in transit and at rest. We use Row Level Security on all database tables, so your information is only accessible to you. For full details, see our privacy policy.",
  },
  {
    question: "How do I contact support?",
    answer:
      "You can reach us anytime at support@milesto.app. We typically respond within 24 hours.",
  },
];

export default function SupportPage() {
  return (
    <div className="space-y-16">
      <section className="text-center">
        <h1 className="font-[family-name:var(--font-fraunces)] text-4xl font-semibold text-[#2D5016] sm:text-5xl">
          How can we help?
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[#4a4a4a]">
          Whether you have a question about your account, need help with a
          feature, or just want to say hello — we&apos;re here for you.
        </p>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1C1C1C]">
          Reach out to us
        </h2>
        <p className="mt-3 text-[#4a4a4a]">
          Our support team is happy to help with anything you need.
        </p>
        <a
          href="mailto:support@milesto.app"
          className="mt-4 inline-block rounded-lg bg-[#2D5016] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3a6a1e]"
        >
          support@milesto.app
        </a>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-fraunces)] mb-6 text-2xl font-semibold text-[#1C1C1C]">
          Frequently asked questions
        </h2>
        <Accordion>
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`faq-${index}`}>
              <AccordionTrigger className="text-[#1C1C1C]">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-[#4a4a4a]">
                  {faq.question === "Is my data secure?" ? (
                    <>
                      Yes. Your data is encrypted both in transit and at rest.
                      We use Row Level Security on all database tables, so your
                      information is only accessible to you. For full details,
                      see our{" "}
                      <Link
                        href="/privacy"
                        className="text-[#2D5016] underline underline-offset-2"
                      >
                        privacy policy
                      </Link>
                      .
                    </>
                  ) : (
                    faq.answer
                  )}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="text-center">
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#1C1C1C]">
          Download Milesto
        </h2>
        <p className="mt-3 text-[#4a4a4a]">
          Ready to turn your ambition into a clear path? Get Milesto on the App
          Store.
        </p>
        <p className="mt-4 text-sm text-[#6b6b6b]">
          Available on the App Store for iPhone.
        </p>
      </section>
    </div>
  );
}
