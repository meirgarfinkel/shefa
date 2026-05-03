export function ResponsivenessBadge({
  isResponsive,
  isNew,
}: {
  isResponsive: boolean;
  isNew?: boolean;
}) {
  if (isNew) {
    return (
      <span className="border-transprent bg-surface-3 text-text-muted inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium">
        New
      </span>
    );
  }

  if (!isResponsive) return null;

  return (
    <span className="border-primary/25 bg-primary/15 text-primary inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium">
      <span className="size-1.5 rounded-full bg-current" />
      Responsive Employer
    </span>
  );
}
