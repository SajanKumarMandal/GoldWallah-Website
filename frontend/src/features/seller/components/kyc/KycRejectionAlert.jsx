export default function KycRejectionAlert({ reason }) {
  if (!reason) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-(--gw-color-copper)/10 px-4 py-3 text-sm font-medium text-(--gw-color-copper)">
      <p className="text-xs font-semibold uppercase tracking-[0.16em]">
        Rejection reason
      </p>
      <p className="mt-2 leading-6">{reason}</p>
    </div>
  );
}
