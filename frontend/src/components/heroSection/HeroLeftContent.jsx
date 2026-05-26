import HeroButtons from "@/components/heroSection/HeroButtons";
import HeroStats from "@/components/heroSection/HeroStats";

export default function HeroLeftContent() {
  return (
    <div className="lg:col-span-7">
      <div className="mb-6 text-xs uppercase tracking-[0.25em] text-(--gw-color-copper)">
        Old gold, new value
      </div>

      <h1 className="text-5xl font-semibold leading-[0.95] text-(--gw-color-green) sm:text-6xl lg:text-7xl">
        Sell your{" "}
        <em className="not-italic font-medium text-(--gw-color-copper)">
          old gold
        </em>
        <br />
        to verified jewellers,
        <br className="hidden sm:inline" /> at the{" "}
        <span className="text-(--gw-color-gold)">fairest price</span>.
      </h1>

      <p className="mt-8 max-w-2xl text-lg leading-relaxed text-(--gw-color-muted)">
        List your jewellery in minutes. Nearby verified jewellers place
        competing offers based on the live 24K market rate. Both sides complete
        KYC. We handle the paperwork.
      </p>

      <HeroButtons />
      <HeroStats />
    </div>
  );
}
