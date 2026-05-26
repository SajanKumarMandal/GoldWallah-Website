import { RefreshCw } from "lucide-react";

import heroImage from "@/assets/heroImage.jpg";

export default function HeroImageCard() {
  return (
    <div className="space-y-6 lg:col-span-5 lg:pl-6">
      <div className="relative h-80 overflow-hidden rounded-3xl sm:h-90">
        <img
          src={heroImage}
          alt="Elegant gold jewellery"
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-linear-to-t from-[#1A362D]/60 to-transparent" />

        <div className="absolute bottom-6 left-6 right-6">
          <div className="text-xs uppercase tracking-[0.2em] text-[#FDFCF9]/80">
            From heirloom
          </div>
          <div className="text-3xl font-medium text-[#FDFCF9]">
            to fair offer
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-(--gw-color-border) bg-(--gw-color-cream) p-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#D19C4C]/10 blur-3xl" />

        <div className="relative z-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="text-xs uppercase tracking-[0.2em] text-(--gw-color-muted)">
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

          <div className="text-5xl font-semibold text-(--gw-color-green) lg:text-6xl">
            &#8377;7,850
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
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
