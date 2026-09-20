"use client";

/**
 * First-paint skeletons.
 *
 * Every screen's content comes from localStorage, so the server has no data to
 * render. What it *can* render is the layout, which is what these are for: the
 * first paint shows an app-shaped screen instead of a spinner on a blank page,
 * and because the blocks match the real element sizes there is no layout shift
 * when the data arrives.
 *
 * These deliberately carry no test ids — they are placeholders, not content.
 */
export function SkeletonBlock({
  className = "",
  radius = 14,
}: {
  className?: string;
  radius?: number;
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ borderRadius: radius }}
      aria-hidden
    />
  );
}

function HeaderSkeleton({ withLabel = true }: { withLabel?: boolean }) {
  return (
    <div className="px-5 pt-7 pb-4">
      {withLabel ? <SkeletonBlock className="h-3 w-14" radius={6} /> : null}
      <SkeletonBlock className={`h-6 w-40 ${withLabel ? "mt-2.5" : ""}`} radius={9} />
      <SkeletonBlock className="mt-2.5 h-3.5 w-32" radius={7} />
    </div>
  );
}

/** A tappable row: leading circle, two lines, trailing chevron. */
function RowSkeleton({ height = 78 }: { height?: number }) {
  return (
    <div className="card flex items-center gap-3.5 px-4" style={{ height }}>
      <SkeletonBlock className="h-[42px] w-[42px]" radius={999} />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-3/5" radius={7} />
        <SkeletonBlock className="h-3 w-2/5" radius={6} />
      </div>
      <SkeletonBlock className="h-4 w-4" radius={6} />
    </div>
  );
}

/* --------------------------------------------------------------- per route */

function WorldSkeleton() {
  return (
    <>
      <div className="flex items-start justify-between px-5 pt-6 pb-1">
        <SkeletonBlock className="h-[52px] w-[118px]" radius={16} />
        <SkeletonBlock className="mt-1 h-8 w-8" radius={999} />
      </div>
      {/* matches WorldScene's 390x340 viewBox so the scene does not jump */}
      <div className="aspect-[390/340] w-full">
        <SkeletonBlock className="h-full w-full" radius={0} />
      </div>
      <div className="px-5 pt-4">
        <div className="flex items-center gap-2 pb-4">
          <SkeletonBlock className="h-7 w-7" radius={999} />
          <SkeletonBlock className="h-6 w-32" radius={9} />
        </div>
        <SkeletonBlock className="h-5 w-24" radius={8} />
        <SkeletonBlock className="mt-3 h-2.5 w-full" radius={999} />
        <SkeletonBlock className="mt-5 h-[148px] w-full" radius={26} />
        <div className="mt-5 flex gap-2.5">
          <SkeletonBlock className="h-[46px] flex-1" radius={16} />
          <SkeletonBlock className="h-[46px] flex-1" radius={16} />
        </div>
      </div>
    </>
  );
}

function GoalsSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <div className="space-y-3 px-5">
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
      <div className="mt-auto px-5 pt-7 pb-9">
        <SkeletonBlock className="h-[112px] w-full" radius={22} />
      </div>
    </>
  );
}

function PetSkeleton() {
  return (
    <>
      <div className="px-5 pt-7">
        <SkeletonBlock className="h-6 w-28" radius={9} />
      </div>
      <div className="px-5 pt-4">
        <SkeletonBlock className="h-[268px] w-full" radius={26} />
      </div>
      <div className="mt-4 px-5">
        <SkeletonBlock className="h-[132px] w-full" radius={22} />
      </div>
      <div className="mt-6 px-5">
        <SkeletonBlock className="mb-2.5 h-3 w-16" radius={6} />
        <div className="space-y-2.5">
          <RowSkeleton height={72} />
          <RowSkeleton height={72} />
        </div>
      </div>
    </>
  );
}

function PlantSkeleton() {
  return (
    <>
      <div className="px-5 pt-7">
        <SkeletonBlock className="h-6 w-28" radius={9} />
      </div>
      <div className="px-5 pt-4">
        <SkeletonBlock className="h-[286px] w-full" radius={26} />
      </div>
      <div className="mt-5 px-5">
        <SkeletonBlock className="mb-2.5 h-3 w-16" radius={6} />
        <SkeletonBlock className="h-[168px] w-full" radius={22} />
      </div>
      <div className="mt-6 px-5">
        <SkeletonBlock className="mb-2.5 h-3 w-24" radius={6} />
        <div className="space-y-2.5">
          <RowSkeleton height={64} />
          <RowSkeleton height={64} />
        </div>
      </div>
    </>
  );
}

function HistorySkeleton() {
  return (
    <>
      <div className="px-5 pt-7">
        <SkeletonBlock className="h-6 w-36" radius={9} />
      </div>
      <div className="px-5 pt-4">
        <SkeletonBlock className="h-[156px] w-full" radius={26} />
      </div>
      <div className="mt-6 space-y-3 px-5">
        <RowSkeleton height={112} />
        <RowSkeleton height={112} />
        <RowSkeleton height={112} />
      </div>
    </>
  );
}

function ExportSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <div className="px-5">
        <SkeletonBlock className="h-[120px] w-full" radius={22} />
        <SkeletonBlock className="mt-4 h-[52px] w-full" radius={16} />
        <SkeletonBlock className="mt-5 h-[240px] w-full" radius={22} />
      </div>
    </>
  );
}

/** Pick the skeleton matching the current route, so the shape is right. */
export function RouteSkeleton({ pathname }: { pathname: string }) {
  if (pathname.startsWith("/goals")) return <GoalsSkeleton />;
  if (pathname.startsWith("/pet")) return <PetSkeleton />;
  if (pathname.startsWith("/plant")) return <PlantSkeleton />;
  if (pathname.startsWith("/history")) return <HistorySkeleton />;
  if (pathname.startsWith("/debug")) return <ExportSkeleton />;
  return <WorldSkeleton />;
}
