import { RouteTransition } from "@/components/motion/RouteTransition";

export default function AdminRouteTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RouteTransition>{children}</RouteTransition>;
}
