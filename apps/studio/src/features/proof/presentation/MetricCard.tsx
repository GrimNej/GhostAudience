interface MetricCardProps {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly status: "pass" | "warning" | "neutral";
}

export function MetricCard({
  label,
  value,
  detail,
  status,
}: MetricCardProps): JSX.Element {
  return (
    <article className="metric-card" data-status={status}>
      <p className="metric-card__label">{label}</p>
      <p className="metric-card__value">{value}</p>
      <p className="metric-card__detail">{detail}</p>
    </article>
  );
}
