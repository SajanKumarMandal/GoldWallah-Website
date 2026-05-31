import { RefreshCw } from "lucide-react";

import heroImage from "@/assets/heroImage.jpg";

export default function HeroImageCard() {
  return (
    <div className="min-w-0 space-y-5 sm:space-y-6 lg:col-span-5 lg:pl-6">
      <div className="relative h-72 overflow-hidden rounded-3xl sm:h-80 md:h-90">
        <img
          src={heroImage}
          alt="Elegant gold jewellery"
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-linear-to-t from-[#1A362D]/60 to-transparent" />

        <div className="absolute bottom-5 left-5 right-5 sm:bottom-6 sm:left-6 sm:right-6">
          <div className="text-xs uppercase tracking-[0.16em] text-[#FDFCF9]/80 sm:tracking-[0.2em]">
            From heirloom
          </div>
          <div className="mt-1 text-2xl font-medium text-[#FDFCF9] sm:text-3xl">
            to fair offer
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-(--gw-color-border) bg-(--gw-color-cream) p-5 sm:p-8">
        <div className="relative z-10">
          <div className="mb-5 flex items-center justify-between gap-4 sm:mb-6">
            <div className="text-xs uppercase tracking-[0.16em] text-(--gw-color-muted) sm:tracking-[0.2em]">
              Live 24K Rate &middot; INR / gram
            </div>

            <button
              type="button"
              aria-label="Refresh live gold rate"
              className="text-(--gw-color-muted) transition hover:text-(--gw-color-green)"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="gw-break-text font-semibold text-(--gw-color-green) [font-size:clamp(2rem,4vw,3.75rem)]">
            &#8377;7,850
          </div>

          <div className="mt-5 grid gap-3 text-sm min-[420px]:grid-cols-3 sm:mt-6">
            {[
              ["22K", "7,191"],
              ["20K", "6,539"],
              ["18K", "5,888"],
            ].map(([purity, price]) => (
              <div
                key={purity}
                className="rounded-xl border border-(--gw-color-border) bg-white p-3"
              >
                <div className="text-[10px] uppercase tracking-widest text-(--gw-color-muted)">
                  {purity}
                </div>
                <div className="mt-1 text-(--gw-color-green)">
                  &#8377;{price}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
