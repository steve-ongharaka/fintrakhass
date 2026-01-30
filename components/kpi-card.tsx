'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface KPICardProps {
  title: string;
  value: number;
  unit?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  subtitle?: string;
  colorClass?: string;
  iconBgClass?: string;
  className?: string;
  delay?: number;
}

export function KPICard({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  trend, 
  subtitle,
  colorClass = 'from-blue-500 to-blue-600',
  iconBgClass,
  className,
  delay = 0
}: KPICardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!isVisible) return;
    
    const duration = 1200;
    const steps = 40;
    const stepDuration = duration / steps;
    let current = 0;
    const increment = value / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.round(current * 100) / 100);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, isVisible]);

  const formatValue = (val: number) => {
    if (val >= 1000000) {
      return (val / 1000000).toFixed(2) + 'M';
    } else if (val >= 1000) {
      return (val / 1000).toFixed(1) + 'K';
    }
    return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <div 
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-6 shadow-sm transition-all duration-500 ease-out',
        'hover:shadow-xl hover:-translate-y-1 hover:border-gray-200',
        !isVisible && 'opacity-0 translate-y-4',
        isVisible && 'opacity-100 translate-y-0',
        className
      )}
    >
      {/* Gradient background accent */}
      <div className={cn(
        'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
        'bg-gradient-to-br',
        colorClass
      )} style={{ opacity: 0.03 }} />
      
      {/* Top accent line */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-80',
        colorClass
      )} />

      <div className="relative flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-500 tracking-wide uppercase">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900 tabular-nums tracking-tight">
              {formatValue(displayValue)}
            </p>
            {unit && (
              <span className="text-sm font-medium text-gray-400">{unit}</span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-400">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
              trend.value >= 0 
                ? 'bg-green-50 text-green-700' 
                : 'bg-red-50 text-red-700'
            )}>
              <span className="text-sm">
                {trend.value >= 0 ? '↑' : '↓'}
              </span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-gray-500 font-normal">{trend.label}</span>
            </div>
          )}
        </div>
        
        <div className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110',
          'bg-gradient-to-br',
          iconBgClass || colorClass
        )}>
          <Icon className="h-7 w-7 text-white drop-shadow-sm" />
        </div>
      </div>

      {/* Decorative element */}
      <div className={cn(
        'absolute -bottom-8 -right-8 w-32 h-32 rounded-full opacity-5 group-hover:opacity-10 transition-opacity',
        'bg-gradient-to-br',
        colorClass
      )} />
    </div>
  );
}

// Large stat card for hero sections
export function HeroStatCard({
  title,
  value,
  unit,
  icon: Icon,
  description,
  colorClass = 'from-blue-600 to-cyan-500',
}: {
  title: string;
  value: number;
  unit?: string;
  icon: LucideIcon;
  description?: string;
  colorClass?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 50;
    const stepDuration = duration / steps;
    let current = 0;
    const increment = value / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.round(current * 100) / 100);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  const formatValue = (val: number) => {
    if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <div className={cn(
      'relative overflow-hidden rounded-3xl p-8 text-white shadow-2xl',
      'bg-gradient-to-br',
      colorClass
    )}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Icon className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-medium opacity-90">{title}</h3>
        </div>
        
        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-bold tracking-tight">
            {formatValue(displayValue)}
          </span>
          {unit && <span className="text-2xl opacity-80">{unit}</span>}
        </div>
        
        {description && (
          <p className="mt-4 text-sm opacity-80">{description}</p>
        )}
      </div>
    </div>
  );
}
