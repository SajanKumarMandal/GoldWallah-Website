import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { ROUTES } from "@/constants/routes";

export default function HeroButtons() {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-4">
      <Link
        to={ROUTES.registerSeller}
        className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-(--gw-color-green) px-6 py-3 text-center text-sm font-medium text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold) sm:w-auto sm:px-7 sm:py-4"
      >
        Sell your gold
        <ArrowRight className="h-4 w-4" />
      </Link>

      <Link
        to={ROUTES.registerJeweller}
        className="flex min-h-12 items-center justify-center rounded-full border border-(--gw-color-green) px-6 py-3 text-center text-sm font-medium text-(--gw-color-green) transition hover:bg-[#f5f5f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold) sm:w-auto sm:px-7 sm:py-4"
      >
        Join as a jeweller
      </Link>
    </div>
  );
}
