import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, action, className }: PageHeaderProps) {
  const actionContent = action || children;
  
  return (
    <div className={cn('flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6', className)}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && (
          <p className="text-gray-500 mt-1">{description}</p>
        )}
      </div>
      {actionContent && (
        <div className="flex items-center gap-3">
          {actionContent}
        </div>
      )}
    </div>
  );
}
