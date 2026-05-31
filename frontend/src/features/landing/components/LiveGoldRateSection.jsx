import { useEffect, useMemo, useState } from "react";
import { RefreshCw, TrendingUp } from "lucide-react";

import { getLiveGoldPrice } from "@/features/market/services/goldPriceService";
import { sectionEyebrows } from "@/features/landing/constants/landingContent";
import { formatInr } from "@/utils/formatCurrency";

import SectionHeader from "./SectionHeader";

const fallbackRate = {
  pricePerGram24k: 7850,
  source: "Indicative fallback",
  updatedAt: null,
};

function normalizeRate(payload) {
  if (!payload || typeof payload !== "object") {
    return fallbackRate;
  }

  const price =
    payload.pricePerGram24k ||
    payload.pricePerGram ||
    payload.rate ||
    payload.price ||
    fallbackRate.pricePerGram24k;

  return {
    pricePerGram24k: Number(price) || fallbackRate.pricePerGram24k,
    source: payload.source || "Market reference",
    updatedAt: payload.updatedAt || null,
  };
}

export default function LiveGoldRateSection() {
  const [rate, setRate] = useState(fallbackRate);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let isActive = true;

    async function loadRate() {
      try {
        const payload = await getLiveGoldPrice();
        if (isActive) {
          setRate(normalizeRate(payload));
          setStatus("ready");
        }
      } catch {
        if (isActive) {
          setRate(fallbackRate);
          setStatus("fallback");
        }
      }
    }

    loadRate();

    return () => {
      isActive = false;
    };
  }, []);

  const purityRates = useMemo(() => {
    const base = rate.pricePerGram24k;

    return [
      ["22K", base * (22 / 24)],
      ["20K", base * (20 / 24)],
      ["18K", base * (18 / 24)],
    ];
  }, [rate.pricePerGram24k]);

  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-6">
          <SectionHeader
            eyebrow={sectionEyebrows.market}
            title="Market-rate context before marketplace bidding."
            description="Live or fallback gold-rate context helps sellers and jewellers understand the market before verified private offers begin."
          />
        </div>

        <div className="lg:col-span-6">
          <article className="relative overflow-hidden rounded-3xl border border-(--gw-color-border) bg-white p-5 shadow-[0_24px_80px_rgba(26,54,45,0.08)] sm:p-8">
            <div className="relative">
              <div className="flex flex-col gap-4 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-(--gw-color-muted) sm:tracking-[0.22em]">
                    24K reference · INR / gram
                  </p>
                  <div className="gw-break-text mt-4 font-semibold text-(--gw-color-green) [font-size:clamp(1.875rem,4vw,3.75rem)]">
                    {status === "loading" ? "Loading" : formatInr(rate.pricePerGram24k)}
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-(--gw-color-green) text-(--gw-color-cream)">
                  {status === "loading" ? (
                    <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <TrendingUp className="h-5 w-5" aria-hidden="true" />
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-3 min-[520px]:grid-cols-3">
                {purityRates.map(([purity, value]) => (
                  <div
                    key={purity}
                    className="rounded-2xl border border-(--gw-color-border) bg-(--gw-color-cream) p-4"
                  >
                    <p className="text-[10px] uppercase tracking-widest text-(--gw-color-muted)">
                      {purity}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-(--gw-color-green)">
                      {formatInr(value)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl bg-[#f7f5f1] p-4 text-sm leading-relaxed text-(--gw-color-muted)">
                {status === "fallback"
                  ? "Live pricing is not connected yet, so this section is using a safe indicative fallback."
                  : "Gold-rate data is a reference point. Seller-selected bids still depend on item details and verified jeweller offers."}
              </div>

              <p className="gw-break-text mt-4 text-xs uppercase tracking-[0.14em] text-(--gw-color-muted) sm:tracking-[0.18em]">
                {rate.source}
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
