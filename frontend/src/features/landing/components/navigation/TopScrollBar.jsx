const features = [
  "SELLERS",
  "LIVE 24K PRICE",
  "BOTH-SIDE KYC",
  "TRANSPARENT COMMISSIONS",
  "VERIFIED JEWELLERS",
  "PRIVATE BIDDING",
];

export default function TopScrollBar() {
  return (
    <div className="w-full overflow-hidden border-y border-(--gw-color-border) bg-[#f7f5f1]">
      <div className="relative flex whitespace-nowrap">
        {[0, 1].map((row) => (
          <div key={row} className="animate-marquee flex items-center py-4">
            {features.map((item) => (
              <div key={`${row}-${item}`} className="flex items-center">
                <span className="mx-6 text-sm font-medium tracking-[0.18em] text-(--gw-color-muted) sm:mx-12 sm:tracking-[0.28em]">
                  {item}
                </span>
                <span className="text-(--gw-color-muted) opacity-60">
                  &bull;
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
