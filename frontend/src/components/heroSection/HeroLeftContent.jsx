import HeroButtons from "@/components/heroSection/HeroButtons";
import HeroStats from "@/components/heroSection/HeroStats";

export default function HeroLeftContent() {
  return (
    <div className="min-w-0 lg:col-span-7">
      <div className="mb-5 text-xs uppercase tracking-[0.18em] text-(--gw-color-copper) sm:tracking-[0.25em]">
        Old gold, new value
      </div>

      <h1 className="gw-break-text gw-text-hero font-semibold leading-tight text-(--gw-color-green)">
        Sell your{" "}
        <em className="not-italic font-medium text-(--gw-color-copper)">
          old gold
        </em>
        <br className="hidden sm:block" />
        to verified jewellers,
        <br className="hidden sm:inline" /> at the{" "}
        <span className="text-(--gw-color-gold)">fairest price</span>.
      </h1>

      <p className="gw-text-body mt-6 max-w-2xl leading-relaxed text-(--gw-color-muted) sm:mt-8">
        List your jewellery in minutes. Nearby verified jewellers place
        competing offers based on the live 24K market rate. Both sides complete
        KYC. We handle the paperwork.
      </p>

      <HeroButtons />
      <HeroStats />
    </div>
  );
}
