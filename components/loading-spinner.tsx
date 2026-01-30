import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <Loader2 className={cn('h-6 w-6 animate-spin text-blue-600', className)} />
  );
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner className="h-10 w-10" />
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="h-10 bg-gray-200 rounded animate-pulse" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3" />
        <div className="h-8 bg-gray-200 rounded animate-pulse w-2/3" />
      </div>
    </div>
  );
}
