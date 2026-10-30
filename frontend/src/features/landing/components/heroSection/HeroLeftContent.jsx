import HeroButtons from "@/features/landing/components/heroSection/HeroButtons";
import HeroStats from "@/features/landing/components/heroSection/HeroStats";

export default function HeroLeftContent() {
  return (
    <div className="min-w-0 lg:col-span-7">
      <div className="mb-4 text-[0.7rem] uppercase tracking-[0.18em] text-(--gw-color-copper) sm:mb-5 sm:text-xs sm:tracking-[0.25em]">
        Old gold, new value
      </div>

      <h1 className="gw-break-text gw-text-hero text-balance font-semibold leading-[1.1] text-(--gw-color-green) sm:leading-tight">
        Sell your{" "}
        <em className="not-italic font-medium text-(--gw-color-copper)">
          old gold
        </em>
        <br className="hidden sm:block" /> to verified jewellers,
        <br className="hidden sm:block" /> at the{" "}
        <span className="text-(--gw-color-gold)">fairest price</span>.
      </h1>

      <p className="gw-text-body mt-5 max-w-2xl leading-relaxed text-(--gw-color-muted) sm:mt-8">
        List your jewellery in minutes. Nearby verified jewellers place
        competing offers based on the live 24K market rate. Both sides complete
        KYC. We handle the paperwork.
      </p>

      <HeroButtons />
      <HeroStats />
    </div>
  );
}
