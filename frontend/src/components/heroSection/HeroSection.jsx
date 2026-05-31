import HeroImageCard from "@/components/heroSection/HeroImageCard";
import HeroLeftContent from "@/components/heroSection/HeroLeftContent";

export default function HeroSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-12 lg:pb-24">
      <div className="grid min-w-0 items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <HeroLeftContent />
        <HeroImageCard />
      </div>
    </section>
  );
}
