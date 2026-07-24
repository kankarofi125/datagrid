import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

export default function ServicesLoading() {
  return (
    <div aria-busy="true" aria-label="Loading services">
      <div className="border-b border-line bg-white/75 px-3.5 py-3 lg:px-8 lg:py-5 xl:px-10">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="mt-2 h-6 w-32" />
        <div className="mt-3 flex gap-2 overflow-hidden lg:grid lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-[54px] min-w-[108px] rounded-xl lg:min-w-0" />
          ))}
        </div>
      </div>
      <SkeletonPage variant="form" />
    </div>
  );
}
