import HeroImageCard from "@/components/heroSection/HeroImageCard";
import HeroLeftContent from "@/components/heroSection/HeroLeftContent";

export default function HeroSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 pt-16 lg:px-12">
      <div className="grid items-center gap-12 lg:grid-cols-12">
        <HeroLeftContent />
        <HeroImageCard />
      </div>
    </section>
  );
}
