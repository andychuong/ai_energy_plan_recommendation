import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { UsageDataPoint } from 'shared/types';
import { format, parseISO } from 'date-fns';

interface MonthlyUsageChartProps {
  data: UsageDataPoint[];
  title?: string;
  description?: string;
}

export function MonthlyUsageChart({
  data,
  title = 'Monthly Energy Usage',
  description,
}: MonthlyUsageChartProps) {
  // Group data by month
  const monthlyData = data.reduce(
    (acc, point) => {
      const month = format(parseISO(point.timestamp), 'MMM yyyy');
      const existing = acc.find(
        (item: { month: string; kwh: number; cost: number }) =>
          item.month === month
      );
      if (existing) {
        existing.kwh += point.kwh;
        existing.cost += point.cost || 0;
      } else {
        acc.push({
          month,
          kwh: point.kwh,
          cost: point.cost || 0,
        });
      }
      return acc;
    },
    [] as Array<{ month: string; kwh: number; cost: number }>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis
              yAxisId="left"
              label={{ value: 'kWh', angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: 'Cost ($)', angle: 90, position: 'insideRight' }}
            />
            <Tooltip />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="kwh"
              fill="#8884d8"
              name="Usage (kWh)"
            />
            <Bar
              yAxisId="right"
              dataKey="cost"
              fill="#82ca9d"
              name="Cost ($)"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
