import {
  jewellerSteps,
  sectionEyebrows,
  sellerSteps,
} from "@/features/landing/constants/landingContent";

import SectionHeader from "./SectionHeader";

function FlowCard({ title, description, steps, tone }) {
  const badgeClass =
    tone === "seller"
      ? "bg-(--gw-color-green) text-(--gw-color-cream)"
      : "bg-[#D19C4C]/18 text-(--gw-color-green)";

  return (
    <article className="rounded-3xl border border-(--gw-color-border) bg-white p-6 shadow-[0_24px_80px_rgba(26,54,45,0.07)] sm:p-8">
      <div className={`inline-flex rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] ${badgeClass}`}>
        {title}
      </div>
      <p className="mt-5 text-lg leading-relaxed text-(--gw-color-muted)">
        {description}
      </p>

      <div className="mt-8 space-y-5">
        {steps.map(({ title: stepTitle, description: stepDescription, icon: Icon }, index) => (
          <div key={stepTitle} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-(--gw-color-border) bg-(--gw-color-cream) text-(--gw-color-green)">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              {index < steps.length - 1 ? (
                <div className="mt-3 h-10 w-px bg-(--gw-color-border)" />
              ) : null}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-(--gw-color-green)">
                {stepTitle}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-(--gw-color-muted)">
                {stepDescription}
              </p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function HowItWorksSection() {
  return (
    <section className="px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow={sectionEyebrows.howItWorks}
          title="Two verified journeys. One private marketplace."
          description="The landing experience explains both sides of the transaction without exposing sensitive bid behavior."
          align="center"
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <FlowCard
            title="Seller flow"
            description="For people who want controlled, competitive offers for gold or jewellery."
            steps={sellerSteps}
            tone="seller"
          />
          <FlowCard
            title="Jeweller flow"
            description="For verified jewellers who want relevant local opportunities without public bid exposure."
            steps={jewellerSteps}
            tone="jeweller"
          />
        </div>
      </div>
    </section>
  );
}
