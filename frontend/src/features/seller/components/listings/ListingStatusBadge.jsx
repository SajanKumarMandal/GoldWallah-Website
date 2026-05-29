const statusStyles = {
  ACTIVE: "bg-(--gw-color-green) text-(--gw-color-cream)",
  BID_ACCEPTED: "bg-(--gw-color-gold)/20 text-(--gw-color-green)",
  SOLD: "bg-(--gw-color-green-soft)/15 text-(--gw-color-green)",
  CANCELLED: "bg-(--gw-color-copper)/12 text-(--gw-color-copper)",
};

const statusLabels = {
  ACTIVE: "Active",
  BID_ACCEPTED: "Bid accepted",
  SOLD: "Sold",
  CANCELLED: "Cancelled",
};

export default function ListingStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold ${
        statusStyles[status] || "bg-(--gw-color-border) text-(--gw-color-muted)"
      }`}
    >
      {statusLabels[status] || status || "Unknown"}
    </span>
  );
}
