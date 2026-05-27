function GoogleMark() {
  return (
    <span
      className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-bold text-(--gw-color-green)"
      aria-hidden="true"
    >
      G
    </span>
  );
}

function FacebookMark() {
  return (
    <span
      className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2] text-xs font-bold text-white"
      aria-hidden="true"
    >
      f
    </span>
  );
}

export default function SocialAuthButtons({
  disabled,
  onGoogle,
  onFacebook,
  submitLabel = "Continue",
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-(--gw-color-border)" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-(--gw-color-muted)">
          Or
        </span>
        <span className="h-px flex-1 bg-(--gw-color-border)" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onGoogle}
          className="inline-flex h-11 items-center justify-center gap-3 rounded-full border border-(--gw-color-border) bg-white px-4 text-sm font-semibold text-(--gw-color-green) transition hover:border-(--gw-color-gold) hover:bg-(--gw-color-gold)/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold) disabled:cursor-not-allowed disabled:opacity-70"
        >
          <GoogleMark />
          {submitLabel} with Google
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={onFacebook}
          className="inline-flex h-11 items-center justify-center gap-3 rounded-full border border-(--gw-color-border) bg-white px-4 text-sm font-semibold text-(--gw-color-green) transition hover:border-(--gw-color-gold) hover:bg-(--gw-color-gold)/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--gw-color-gold) disabled:cursor-not-allowed disabled:opacity-70"
        >
          <FacebookMark />
          {submitLabel} with Facebook
        </button>
      </div>
    </div>
  );
}
