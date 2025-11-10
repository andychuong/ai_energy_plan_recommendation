import {
  LineChart,
  Line,
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
import { format } from 'date-fns';

interface UsageChartProps {
  data: UsageDataPoint[];
  title?: string;
  description?: string;
}

export function UsageChart({
  data,
  title = 'Energy Usage Over Time',
  description,
}: UsageChartProps) {
  const chartData = data.map(point => ({
    date: format(new Date(point.timestamp), 'MMM yyyy'),
    kwh: point.kwh,
    cost: point.cost || 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
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
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="kwh"
              stroke="#8884d8"
              name="Usage (kWh)"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cost"
              stroke="#82ca9d"
              name="Cost ($)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
