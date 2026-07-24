import { MotionCascade } from "@/components/motion/MotionCascade";
import { RouteTransition } from "@/components/motion/RouteTransition";

export default function AppRouteTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteTransition>
      <MotionCascade>{children}</MotionCascade>
    </RouteTransition>
  );
}
