export default function HeroStats() {
  return (
    <div className="mt-10 grid gap-4 text-sm text-(--gw-color-muted) sm:mt-12 sm:flex sm:flex-wrap sm:items-center sm:gap-8">
      <div>
        <span className="text-xl font-semibold text-(--gw-color-green)">
          500+
        </span>{" "}
        jewellers
      </div>

      <div className="hidden h-8 w-px bg-(--gw-color-border) sm:block" />

      <div>
        <span className="text-xl font-semibold text-(--gw-color-green)">
          &#8377;2.4Cr
        </span>{" "}
        gold transacted
      </div>

      <div className="hidden h-8 w-px bg-(--gw-color-border) sm:block" />

      <div>
        <span className="text-xl font-semibold text-(--gw-color-green)">
          100%
        </span>{" "}
        KYC verified
      </div>
    </div>
  );
}
