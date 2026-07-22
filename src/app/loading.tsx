import { SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-grid-paper">
      <SkeletonPage variant="dashboard" />
    </div>
  );
}
