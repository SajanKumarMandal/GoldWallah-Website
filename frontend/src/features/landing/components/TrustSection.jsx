import { trustSignals, sectionEyebrows } from "@/features/landing/constants/landingContent";

import SectionHeader from "./SectionHeader";

export default function TrustSection() {
  return (
    <section className="border-y border-(--gw-color-border) bg-white/55 px-6 py-16 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow={sectionEyebrows.trust}
          title="Built for high-trust gold transactions."
          description="GoldWallah's marketplace model puts verification, privacy, and controlled access at the center of every seller and jeweller interaction."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {trustSignals.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="rounded-3xl border border-(--gw-color-border) bg-(--gw-color-cream) p-5 shadow-[0_20px_60px_rgba(26,54,45,0.06)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D19C4C]/14 text-(--gw-color-green)">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-(--gw-color-green)">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-(--gw-color-muted)">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
