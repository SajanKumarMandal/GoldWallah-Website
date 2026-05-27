import HeroSection from "@/components/heroSection/HeroSection";
import FaqSection from "@/features/landing/components/FaqSection";
import FinalCtaSection from "@/features/landing/components/FinalCtaSection";
import Footer from "@/features/landing/components/Footer";
import HowItWorksSection from "@/features/landing/components/HowItWorksSection";
import LiveGoldRateSection from "@/features/landing/components/LiveGoldRateSection";
import LocationMatchingSection from "@/features/landing/components/LocationMatchingSection";
import MarketplaceStatsSection from "@/features/landing/components/MarketplaceStatsSection";
import PrivateBiddingSection from "@/features/landing/components/PrivateBiddingSection";
import SecurityComplianceSection from "@/features/landing/components/SecurityComplianceSection";
import TrustSection from "@/features/landing/components/TrustSection";

function Home() {
  return (
    <>
      <HeroSection />
      <TrustSection />
      <HowItWorksSection />
      <PrivateBiddingSection />
      <LocationMatchingSection />
      <LiveGoldRateSection />
      <SecurityComplianceSection />
      <MarketplaceStatsSection />
      <FaqSection />
      <FinalCtaSection />
      <Footer />
    </>
  );
}
export default Home;
