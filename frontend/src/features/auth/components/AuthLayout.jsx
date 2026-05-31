import { ShieldCheck, Sparkles, UserCheck } from "lucide-react";

import logo from "@/assets/logo.png";

const trustItems = [
  {
    title: "Verified access",
    description: "Role-aware onboarding keeps sellers and jewellers in the right flow.",
    icon: UserCheck,
  },
  {
    title: "Privacy first",
    description: "Marketplace activity is structured around controlled disclosure.",
    icon: ShieldCheck,
  },
  {
    title: "Premium gold network",
    description: "Designed for high-value jewellery and gold transactions.",
    icon: Sparkles,
  },
];

export default function AuthLayout({ eyebrow, title, description, children }) {
  return (
    <section className="min-w-0 bg-(--gw-color-green) px-4 py-6 text-(--gw-color-cream) sm:px-6 md:py-12 lg:px-12">
      <div className="mx-auto grid w-full max-w-7xl min-w-0 items-center gap-8 lg:min-h-[calc(100vh-112px)] lg:grid-cols-[0.95fr_1.05fr] xl:grid-cols-[1.02fr_0.98fr]">
        <div className="relative hidden overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/7 p-7 shadow-[0_28px_90px_rgba(0,0,0,0.22)] lg:block lg:p-9 xl:p-10">
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-(--gw-color-gold) to-transparent opacity-70" />

          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="GoldWallah"
              loading="lazy"
              decoding="async"
              className="h-11 w-11 rounded-full object-cover ring-2 ring-(--gw-color-gold)/50"
            />
            <div>
              <p className="text-xl font-semibold">GoldWallah</p>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/55">
                Verified gold marketplace
              </p>
            </div>
          </div>

          <div className="mt-12 max-w-xl xl:mt-16">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--gw-color-gold)">
              {eyebrow}
            </p>
            <h1 className="gw-break-text gw-text-section mt-5 font-semibold leading-tight text-white">
              {title}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/68">
              {description}
            </p>
          </div>

          <div className="mt-10 grid gap-3 xl:grid-cols-3">
            {trustItems.map(({ title: itemTitle, description: itemDescription, icon: Icon }) => (
              <div
                key={itemTitle}
                className="rounded-2xl border border-white/10 bg-white/8 p-4"
              >
                <Icon className="h-5 w-5 text-(--gw-color-gold)" aria-hidden="true" />
                <h2 className="mt-4 text-sm font-semibold text-white">{itemTitle}</h2>
                <p className="mt-2 text-xs leading-5 text-white/58">{itemDescription}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full min-w-0 max-w-2xl lg:max-w-none">{children}</div>
      </div>
    </section>
  );
}
