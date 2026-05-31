import {
  marketplaceStats,
  sectionEyebrows,
} from "@/features/landing/constants/landingContent";

import SectionHeader from "./SectionHeader";

export default function MarketplaceStatsSection() {
  return (
    <section className="border-y border-(--gw-color-border) bg-white/55 px-4 py-14 sm:px-6 sm:py-16 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-5">
          <SectionHeader
            eyebrow={sectionEyebrows.stats}
            title="MVP-safe numbers focused on trust."
            description="These are product-model indicators, not inflated growth claims."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-4">
          {marketplaceStats.map(({ value, label }) => (
            <article
              key={label}
              className="rounded-3xl border border-(--gw-color-border) bg-(--gw-color-cream) p-5 sm:p-6"
            >
              <p className="gw-break-text text-2xl font-semibold text-(--gw-color-green) sm:text-3xl">
                {value}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-(--gw-color-muted)">
                {label}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
