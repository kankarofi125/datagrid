import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas" aria-busy="true" aria-label="Loading staff sign in">
      <div className="flex min-h-16 items-center justify-between border-b border-line bg-paper px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl bg-amber/30" />
          <div>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-1.5 h-2 w-16" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-65px)] max-w-[1600px] lg:grid-cols-[minmax(420px,0.92fr)_minmax(520px,1.08fr)]">
        <div className="hidden bg-green-deep p-12 lg:flex lg:flex-col lg:justify-center xl:p-16">
          <Skeleton className="h-3 w-28 bg-amber/20" />
          <Skeleton className="mt-6 h-14 w-4/5 bg-white/10" />
          <Skeleton className="mt-3 h-14 w-3/5 bg-white/10" />
          <Skeleton className="mt-6 h-4 w-4/5 bg-white/10" />
          <div className="mt-10 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl bg-white/10" />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-[440px]">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-4 h-10 w-64" />
            <Skeleton className="mt-3 h-4 w-full max-w-sm" />
            <div className="mt-7 rounded-[22px] border border-line bg-white p-5 sm:p-6">
              <Skeleton className="h-10 w-52" />
              <Skeleton className="mt-6 h-12 w-full rounded-[14px]" />
              <Skeleton className="mt-4 h-12 w-full rounded-[14px]" />
              <Skeleton className="mt-10 h-12 w-full rounded-[14px] bg-green/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
