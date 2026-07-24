import { RouteTransition } from "@/components/motion/RouteTransition";

export default function AppRouteTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RouteTransition>{children}</RouteTransition>;
}
