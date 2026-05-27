export default function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  variant = "default",
}) {
  const alignment = align === "center" ? "mx-auto text-center" : "";
  const isInverse = variant === "inverse";
  const eyebrowClass = isInverse
    ? "text-(--gw-color-gold)"
    : "text-(--gw-color-copper)";
  const titleClass = isInverse ? "text-(--gw-color-cream)" : "text-(--gw-color-green)";
  const descriptionClass = isInverse ? "text-white/65" : "text-(--gw-color-muted)";

  return (
    <div className={`max-w-3xl ${alignment}`}>
      <p className={`text-xs font-medium uppercase tracking-[0.25em] ${eyebrowClass}`}>
        {eyebrow}
      </p>
      <h2 className={`mt-4 text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl ${titleClass}`}>
        {title}
      </h2>
      {description ? (
        <p className={`mt-5 text-base leading-relaxed sm:text-lg ${descriptionClass}`}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
