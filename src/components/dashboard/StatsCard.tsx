
import React from 'react';
import { Card } from "@/components/ui/card";
import { cn } from '@/lib/utils';

interface StatsCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  change?: { value: number; isPositive: boolean };
  className?: string;
  iconClassName?: string;
}

const StatsCard = ({
  icon,
  title,
  value,
  change,
  className,
  iconClassName
}: StatsCardProps) => {
  return (
    <Card className={cn("stats-card opacity-0 animate-fade-in", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <div className={cn(
          "p-2 rounded-lg",
          iconClassName || "bg-primary/10 text-primary"
        )}>
          {icon}
        </div>
      </div>
      <div className="mt-2">
        <h3 className="text-2xl font-bold">{value}</h3>
        {change && (
          <div className="flex items-center mt-1">
            <span className={`text-xs ${change.isPositive ? 'text-success' : 'text-destructive'}`}>
              {change.isPositive ? '+' : ''}{change.value}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">vs last month</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatsCard;
