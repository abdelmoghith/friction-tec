import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface EarningsChartProps {
  data: { name: string; earnings: number; referrals?: number }[];
  loading?: boolean;
  period: 'monthly' | 'weekly';
  onPeriodChange?: (period: 'monthly' | 'weekly') => void;
}

const EarningsChart = ({ data, loading, period, onPeriodChange }: EarningsChartProps) => {
  const isMobile = useIsMobile();

  // For mobile, abbreviate labels
  const mobileData = data.map(item => ({
    ...item,
    name: period === 'monthly'
      ? item.name.substring(0, 3)
      : item.name.replace('Week ', 'W'),
  }));

  // Choose appropriate chart margins based on screen size
  const chartMargins = isMobile
    ? { top: 20, right: 10, left: 0, bottom: 5 }
    : { top: 20, right: 30, left: 20, bottom: 5 };

  return (
    <Card className="opacity-0 animate-fade-in">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2">
        <div>
          <CardTitle className="text-lg sm:text-xl">Earnings Overview</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Your commission earnings over time</CardDescription>
        </div>
        <Select
          value={period}
          onValueChange={val => onPeriodChange?.(val as 'monthly' | 'weekly')}
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Last 4 Weeks</SelectItem>
            <SelectItem value="monthly">Last 6 Months</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="h-[250px] sm:h-[300px]">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-pulse w-full h-32 bg-gray-200 rounded" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={isMobile ? mobileData : data}
              margin={chartMargins}
              barGap={isMobile ? 0 : 4}
              barSize={isMobile ? 12 : 20}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: isMobile ? 10 : 12 }}
                interval={isMobile ? 0 : 'preserveStartEnd'}
              />
              <YAxis
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => isMobile ? `${value} da` : `${value} da`}
                tick={{ fontSize: isMobile ? 10 : 12 }}
                width={isMobile ? 30 : 40}
              />
              {!isMobile && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
              )}
              <RechartsTooltip
                formatter={(value, name) => {
                  return name === "earnings"
                    ? formatCurrency(value as number)
                    : value;
                }}
                wrapperStyle={{ fontSize: isMobile ? '10px' : '12px' }}
              />
              <Legend
                wrapperStyle={{ fontSize: isMobile ? '10px' : '12px' }}
                iconSize={isMobile ? 8 : 10}
              />
              <Bar
                yAxisId="left"
                dataKey="earnings"
                name="Earnings"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
              {data.some(d => d.referrals !== undefined) && (
                <Bar
                  yAxisId={isMobile ? "left" : "right"}
                  dataKey="referrals"
                  name="Referrals"
                  fill="hsl(var(--accent))"
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default EarningsChart;
