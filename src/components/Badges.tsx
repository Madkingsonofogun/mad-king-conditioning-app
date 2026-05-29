export function PlanLevelBadge({ level }: { level: string }) {
  return <span className={`label ${level.toLowerCase()}`}>{level}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`label ${status.toLowerCase()}`}>{status}</span>;
}

export function AdjustmentBadge({ adjustment }: { adjustment: string }) {
  const cls = adjustment === "Make Easier" ? "easier" : adjustment === "Make Harder" ? "harder" : "baseline";
  return <span className={`label ${cls}`}>{adjustment}</span>;
}
