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
    <div className={`min-w-0 max-w-3xl ${alignment}`}>
      <p className={`text-xs font-medium uppercase tracking-[0.18em] sm:tracking-[0.25em] ${eyebrowClass}`}>
        {eyebrow}
      </p>
      <h2 className={`gw-break-text gw-text-section mt-4 font-semibold leading-tight ${titleClass}`}>
        {title}
      </h2>
      {description ? (
        <p className={`gw-text-body mt-4 leading-relaxed sm:mt-5 ${descriptionClass}`}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
