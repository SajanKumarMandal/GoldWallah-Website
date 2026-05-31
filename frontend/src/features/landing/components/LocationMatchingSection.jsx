import {
  locationPoints,
  sectionEyebrows,
} from "@/features/landing/constants/landingContent";

import SectionHeader from "./SectionHeader";

export default function LocationMatchingSection() {
  return (
    <section className="bg-[#f7f5f1] px-4 py-14 sm:px-6 sm:py-20 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <SectionHeader
            eyebrow={sectionEyebrows.matching}
            title="Nearby first, nearest fallback always."
            description="The marketplace should avoid dead ends. When nearby supply or demand is limited, the experience can guide users toward the nearest available verified opportunity."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
          {locationPoints.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="rounded-3xl border border-(--gw-color-border) bg-(--gw-color-cream) p-5 sm:p-6"
            >
              <Icon className="h-7 w-7 text-(--gw-color-copper)" aria-hidden="true" />
              <h3 className="mt-6 text-lg font-semibold text-(--gw-color-green)">
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
