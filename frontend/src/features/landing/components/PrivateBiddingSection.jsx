import { EyeOff, ShieldCheck } from "lucide-react";

import {
  privacyPoints,
  sectionEyebrows,
} from "@/features/landing/constants/landingContent";

import SectionHeader from "./SectionHeader";

export default function PrivateBiddingSection() {
  return (
    <section className="px-6 py-20 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-6">
          <SectionHeader
            eyebrow={sectionEyebrows.privateBidding}
            title="Seller transparency without jeweller bid leakage."
            description="GoldWallah's bidding model is designed so sellers can compare offers while jewellers keep their bids private from competitors."
          />

          <ul className="mt-8 space-y-4">
            {privacyPoints.map((point) => (
              <li key={point} className="flex gap-3 text-(--gw-color-muted)">
                <ShieldCheck
                  className="mt-0.5 h-5 w-5 shrink-0 text-(--gw-color-gold)"
                  aria-hidden="true"
                />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-6">
          <div className="relative overflow-hidden rounded-3xl bg-(--gw-color-green) p-6 text-(--gw-color-cream) shadow-[0_30px_100px_rgba(26,54,45,0.22)] sm:p-8">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#D19C4C]/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/60">
                    Seller view
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold">All offers visible</h3>
                </div>
                <EyeOff className="h-7 w-7 text-(--gw-color-gold)" aria-hidden="true" />
              </div>

              <div className="mt-6 space-y-3">
                {["Jeweller A", "Jeweller B", "Jeweller C"].map((name, index) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/8 px-4 py-4 backdrop-blur"
                  >
                    <div>
                      <p className="font-medium">{name}</p>
                      <p className="text-sm text-white/60">
                        Verified bid submitted privately
                      </p>
                    </div>
                    <span className="rounded-full bg-(--gw-color-gold) px-3 py-1 text-xs font-semibold text-(--gw-color-green)">
                      Offer {index + 1}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-sm leading-relaxed text-white/65">
                Bid values are intentionally not shown in public marketing UI.
                The product should only expose them to the authorized seller and
                relevant jeweller in authenticated views.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
