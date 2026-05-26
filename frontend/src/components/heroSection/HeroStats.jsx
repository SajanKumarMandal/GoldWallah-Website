export default function HeroStats() {
  return (
    <div className="mt-12 flex flex-wrap items-center gap-8 text-sm text-(--gw-color-muted)">
      <div>
        <span className="text-xl font-semibold text-(--gw-color-green)">
          500+
        </span>{" "}
        jewellers
      </div>

      <div className="h-8 w-px bg-(--gw-color-border)" />

      <div>
        <span className="text-xl font-semibold text-(--gw-color-green)">
          &#8377;2.4Cr
        </span>{" "}
        gold transacted
      </div>

      <div className="h-8 w-px bg-(--gw-color-border)" />

      <div>
        <span className="text-xl font-semibold text-(--gw-color-green)">
          100%
        </span>{" "}
        KYC verified
      </div>
    </div>
  );
}
