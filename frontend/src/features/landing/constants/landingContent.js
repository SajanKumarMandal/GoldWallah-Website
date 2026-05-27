import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  ClipboardCheck,
  EyeOff,
  FileCheck2,
  Fingerprint,
  Gavel,
  Landmark,
  LocateFixed,
  LockKeyhole,
  MapPinned,
  RadioTower,
  Scale,
  ShieldCheck,
  Sparkles,
  Store,
  UserCheck,
} from "lucide-react";

export const trustSignals = [
  {
    title: "Verified jewellers",
    description: "Jewellers are expected to clear platform checks before bidding.",
    icon: Store,
  },
  {
    title: "Seller KYC",
    description: "Sellers complete identity checks before a listing can go live.",
    icon: UserCheck,
  },
  {
    title: "Business verification",
    description: "Jeweller accounts require business review before marketplace access.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Secure bidding",
    description: "Bid visibility is designed around seller control and jeweller privacy.",
    icon: LockKeyhole,
  },
  {
    title: "Fraud prevention",
    description: "Sensitive marketplace actions are built for review and audit trails.",
    icon: ShieldCheck,
  },
];

export const sellerSteps = [
  {
    title: "List your gold",
    description: "Add item details, purity, weight, photos, and location after KYC approval.",
    icon: FileCheck2,
  },
  {
    title: "Receive private bids",
    description: "Verified nearby jewellers can bid without seeing competing bid amounts.",
    icon: Gavel,
  },
  {
    title: "Choose best jeweller",
    description: "Compare offers as the seller and move ahead with the bid that works best.",
    icon: BadgeCheck,
  },
];

export const jewellerSteps = [
  {
    title: "Complete verification",
    description: "Finish KYC and business verification before bidding permissions unlock.",
    icon: ClipboardCheck,
  },
  {
    title: "Get nearby listings",
    description: "Discover seller listings matched by geography, with nearest fallback logic.",
    icon: LocateFixed,
  },
  {
    title: "Place private bids",
    description: "Submit your offer privately while sellers retain full bid comparison visibility.",
    icon: EyeOff,
  },
];

export const privacyPoints = [
  "Jewellers do not see other jewellers' bid amounts.",
  "Sellers can review all offers on their own listing.",
  "Notifications avoid exposing bid values or sensitive deal information.",
];

export const locationPoints = [
  {
    title: "Nearby jeweller discovery",
    description: "Listings are intended to prioritize verified jewellers close to the seller.",
    icon: MapPinned,
  },
  {
    title: "Nearest fallback",
    description: "When no local match exists, the product should surface the nearest available option.",
    icon: RadioTower,
  },
  {
    title: "Geo-aware trust",
    description: "Location matching keeps offers practical while preserving marketplace privacy.",
    icon: LocateFixed,
  },
];

export const complianceItems = [
  {
    title: "KYC required",
    description: "Marketplace actions are gated by identity verification.",
    icon: Fingerprint,
  },
  {
    title: "Business review",
    description: "Jewellers need approved business verification before bidding.",
    icon: Landmark,
  },
  {
    title: "Sensitive data protection",
    description: "Private documents and identity data should use restricted access patterns.",
    icon: LockKeyhole,
  },
  {
    title: "Audit logs",
    description: "Admin, KYC, listing, and bid events are treated as auditable actions.",
    icon: Scale,
  },
];

export const marketplaceStats = [
  {
    value: "24K",
    label: "market-rate reference",
  },
  {
    value: "2",
    label: "verified sides",
  },
  {
    value: "Private",
    label: "jeweller bid visibility",
  },
  {
    value: "Geo",
    label: "matching first",
  },
];

export const faqs = [
  {
    question: "Can I list gold before KYC is approved?",
    answer:
      "No. Sellers should complete approved KYC before creating active gold or jewellery listings.",
  },
  {
    question: "Can jewellers see each other's bid amounts?",
    answer:
      "No. Bid amounts are private between the seller and each individual jeweller.",
  },
  {
    question: "Why do jewellers need business verification?",
    answer:
      "GoldWallah is designed for verified trade, so jewellers need both KYC and business verification before bidding.",
  },
  {
    question: "How does location matching work?",
    answer:
      "The marketplace should prioritize nearby verified jewellers and show the nearest fallback when no nearby option exists.",
  },
  {
    question: "Are notifications allowed to show bid amounts?",
    answer:
      "No. Notification content should avoid leaking bid values or sensitive deal information.",
  },
  {
    question: "Is the live gold rate final pricing?",
    answer:
      "No. It is a market trust reference. Actual offers depend on purity, weight, item condition, and jeweller bids.",
  },
];

export const footerGroups = [
  {
    title: "Company",
    links: ["About", "Trust", "Security", "Contact"],
  },
  {
    title: "Sellers",
    links: ["Create listing", "KYC", "Private bids", "Seller safety"],
  },
  {
    title: "Jewellers",
    links: ["Business verification", "Nearby listings", "Bid privacy", "Partner support"],
  },
  {
    title: "Legal",
    links: ["Terms", "Privacy", "Compliance", "Audit policy"],
  },
];

export const sectionEyebrows = {
  trust: "Verified marketplace",
  howItWorks: "How GoldWallah works",
  privateBidding: "Private bidding",
  matching: "Location intelligence",
  market: "Market trust",
  compliance: "Security and compliance",
  stats: "Marketplace model",
  faq: "Questions",
  cta: "Start with verification",
};

export const subtleHighlights = [
  {
    title: "Listing events",
    description: "Seller actions should be traceable from draft to accepted bid.",
    icon: Sparkles,
  },
  {
    title: "Bid events",
    description: "Bid creation and seller selection are sensitive auditable moments.",
    icon: Gavel,
  },
  {
    title: "Notification events",
    description: "Alerts are useful only when they protect private bid details.",
    icon: Bell,
  },
];
