interface StatusBadgeProps {
  status: "operational" | "degraded" | "outage" | "inactive" | string;
  size?: "sm" | "md";
}

const statusConfig = {
  operational: {
    bg: "bg-success bg-opacity-10",
    text: "text-success",
    label: "Operational",
  },
  degraded: {
    bg: "bg-warning bg-opacity-10",
    text: "text-warning",
    label: "Degraded",
  },
  outage: {
    bg: "bg-error bg-opacity-10",
    text: "text-error",
    label: "Outage",
  },
  inactive: {
    bg: "bg-neutral-200",
    text: "text-neutral-500",
    label: "Inactive",
  },
  default: {
    bg: "bg-neutral-200",
    text: "text-neutral-500",
    label: "Unknown",
  },
};

const StatusBadge = ({ status, size = "sm" }: StatusBadgeProps) => {
  const normalizedStatus = status?.toLowerCase() || "default";
  const config = statusConfig[normalizedStatus as keyof typeof statusConfig] || statusConfig.default;

  return (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
        config.bg
      } ${config.text} ${size === "md" ? "text-sm py-1 px-3" : ""}`}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;
