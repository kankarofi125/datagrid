import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-3 px-3.5 py-4 lg:px-8 lg:py-8" aria-busy="true" aria-label="Loading profile">
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-28 rounded-[20px] bg-green-deep/20 lg:h-32" />
      <div className="-mx-3.5 flex gap-2 overflow-hidden px-3.5 lg:mx-0 lg:grid lg:grid-cols-5 lg:px-0">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonCard key={index} className="h-[58px] w-[116px] shrink-0 lg:h-auto lg:w-auto" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl lg:h-72" />
        <Skeleton className="hidden h-72 rounded-2xl lg:block" />
      </div>
    </div>
  );
}
