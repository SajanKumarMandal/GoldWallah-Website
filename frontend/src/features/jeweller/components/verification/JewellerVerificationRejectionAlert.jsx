export default function JewellerVerificationRejectionAlert({ reason }) {
  return (
    <div className="rounded-3xl border border-(--gw-color-copper)/35 bg-(--gw-color-copper)/10 p-5 text-(--gw-color-copper)">
      <p className="text-sm font-semibold uppercase tracking-[0.18em]">
        Rejection reason
      </p>
      <p className="mt-2 text-sm leading-6">
        {reason || "Your verification was rejected. Please review and resubmit."}
      </p>
    </div>
  );
}
