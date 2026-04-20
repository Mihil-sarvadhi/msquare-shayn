interface AnalyticsHeaderProps {
  title: string;
  subtitle: string;
}

export function AnalyticsHeader({ title, subtitle }: AnalyticsHeaderProps) {
  return (
    <div className="px-4 sm:px-6 py-4 border-b border-parch bg-white sticky top-0 z-10">
      <h1 className="text-lg font-bold text-ink">{title}</h1>
      <p className="text-xs text-muted mt-0.5">{subtitle}</p>
    </div>
  );
}
