import { HelpButton } from "@/components/help-button";

export function PageHeader({
  title,
  subtitle,
  actions,
  helpPage,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** When set, shows a "?" that opens this page's relevant help answers. */
  helpPage?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {(actions || helpPage) && (
        <div className="flex items-center gap-2">
          {actions}
          {helpPage && <HelpButton page={helpPage} />}
        </div>
      )}
    </div>
  );
}
