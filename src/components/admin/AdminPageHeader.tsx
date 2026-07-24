import { MotionPageHeader } from "@/components/motion/PageChrome";

/**
 * Admin compatibility wrapper. The actual header and motion language are
 * shared with customer pages so future refinements happen in one component.
 */
export function AdminPageHeader({
  kicker,
  title,
  description,
  actions,
  className,
}: {
  kicker: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <MotionPageHeader
      kicker={kicker}
      title={title}
      description={description}
      actions={actions}
      className={className}
    />
  );
}
