import { useSearchParams } from "react-router-dom";

const roleLabels = {
  seller: "Seller",
  jeweller: "Jeweller",
};

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role");
  const label = roleLabels[role] || "GoldWallah";

  return (
    <section className="mx-auto flex min-h-[calc(100vh-118px)] max-w-md flex-col justify-center px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-(--gw-color-copper)">
        Verified marketplace
      </p>
      <h1 className="mt-4 text-4xl font-semibold text-(--gw-color-green)">
        Create {label} account
      </h1>
      <p className="mt-4 text-(--gw-color-muted)">
        Registration will enforce role selection, KYC requirements, and
        verification gates before listing or bidding is allowed.
      </p>
    </section>
  );
}
