import { ArrowRight, Store, UserRoundCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { sectionEyebrows } from "@/features/landing/constants/landingContent";

import SectionHeader from "./SectionHeader";

export default function FinalCtaSection() {
  return (
    <section className="px-6 pb-20 pt-8 lg:px-12">
      <div className="mx-auto max-w-7xl rounded-3xl border border-(--gw-color-border) bg-white p-6 shadow-[0_24px_80px_rgba(26,54,45,0.08)] sm:p-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <SectionHeader
              eyebrow={sectionEyebrows.cta}
              title="Choose your GoldWallah path."
              description="Start with the right account type. Verification comes before listing or bidding."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5">
            <Link
              to={ROUTES.registerSeller}
              className="group rounded-3xl bg-(--gw-color-green) p-6 text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold)"
            >
              <UserRoundCheck className="h-7 w-7 text-(--gw-color-gold)" aria-hidden="true" />
              <h3 className="mt-5 text-xl font-semibold">Seller</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                Complete KYC and prepare your first gold listing.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium">
                Sell your gold
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>

            <Link
              to={ROUTES.registerJeweller}
              className="group rounded-3xl border border-(--gw-color-green) bg-(--gw-color-cream) p-6 text-(--gw-color-green) transition hover:bg-[#f7f5f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold)"
            >
              <Store className="h-7 w-7 text-(--gw-color-copper)" aria-hidden="true" />
              <h3 className="mt-5 text-xl font-semibold">Jeweller</h3>
              <p className="mt-3 text-sm leading-relaxed text-(--gw-color-muted)">
                Complete business verification before private bidding.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium">
                Join marketplace
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
