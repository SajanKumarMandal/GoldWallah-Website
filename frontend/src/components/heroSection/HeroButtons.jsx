import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { ROUTES } from "@/constants/routes";

export default function HeroButtons() {
  return (
    <div className="mt-10 flex flex-wrap gap-4">
      <Link
        to={ROUTES.registerSeller}
        className="flex items-center gap-2 rounded-full bg-(--gw-color-green) px-7 py-4 text-sm font-medium text-(--gw-color-cream) transition hover:bg-(--gw-color-green-soft)"
      >
        Sell your gold
        <ArrowRight className="h-4 w-4" />
      </Link>

      <Link
        to={ROUTES.registerJeweller}
        className="rounded-full border border-(--gw-color-green) px-7 py-4 text-sm font-medium text-(--gw-color-green) transition hover:bg-[#f5f5f2]"
      >
        Join as a jeweller
      </Link>
    </div>
  );
}
