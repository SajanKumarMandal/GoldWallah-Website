import {
  complianceItems,
  sectionEyebrows,
  subtleHighlights,
} from "@/features/landing/constants/landingContent";

import SectionHeader from "./SectionHeader";

export default function SecurityComplianceSection() {
  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-12">
      <div className="mx-auto max-w-7xl rounded-3xl bg-(--gw-color-green) p-5 text-(--gw-color-cream) shadow-[0_30px_100px_rgba(26,54,45,0.2)] sm:p-10">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeader
              eyebrow={sectionEyebrows.compliance}
            title="A compliance-first marketplace foundation."
            description="The product direction treats verification, encryption, and auditability as core platform requirements, not optional add-ons."
            variant="inverse"
          />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {complianceItems.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-2xl border border-white/12 bg-white/8 p-5 backdrop-blur"
              >
                <Icon className="h-6 w-6 text-(--gw-color-gold)" aria-hidden="true" />
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/65">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4 border-t border-white/10 pt-8 md:grid-cols-3">
          {subtleHighlights.map(({ title, description, icon: Icon }) => (
            <div key={title} className="flex min-w-0 gap-4">
              <Icon className="h-5 w-5 shrink-0 text-(--gw-color-gold)" aria-hidden="true" />
              <div className="min-w-0">
                <h3 className="gw-break-text font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
