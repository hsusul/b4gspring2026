interface MetricPillProps {
  label: string;
  value: string;
  accent?: boolean;
}

export function MetricPill({ label, value, accent = false }: MetricPillProps) {
  const classes = ["metric-pill", accent ? "metric-pill-accent" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
    </div>
  );
}
