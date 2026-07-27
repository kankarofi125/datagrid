import { RouteTransition } from "@/components/motion/RouteTransition";

/**
 * Auth route enter — soft motion only (no opacity flash).
 * template.tsx remounts on login ↔ signup so the enter re-runs once.
 */
export default function AuthRouteTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RouteTransition variant="soft">{children}</RouteTransition>;
}
