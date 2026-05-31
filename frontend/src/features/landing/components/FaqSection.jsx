import { faqs, sectionEyebrows } from "@/features/landing/constants/landingContent";

import SectionHeader from "./SectionHeader";

export default function FaqSection() {
  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow={sectionEyebrows.faq}
          title="Clear answers for a high-trust transaction."
          description="GoldWallah should make verification, bid privacy, and location matching easy to understand before users register."
          align="center"
        />

        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          {faqs.map(({ question, answer }) => (
            <details
              key={question}
              className="group rounded-3xl border border-(--gw-color-border) bg-white p-5 shadow-[0_18px_60px_rgba(26,54,45,0.05)] sm:p-6"
            >
              <summary className="gw-break-text cursor-pointer list-none text-base font-semibold text-(--gw-color-green) outline-none transition group-open:text-(--gw-color-copper) focus-visible:ring-2 focus-visible:ring-(--gw-color-gold) sm:text-lg">
                {question}
              </summary>
              <p className="mt-4 text-sm leading-relaxed text-(--gw-color-muted)">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
