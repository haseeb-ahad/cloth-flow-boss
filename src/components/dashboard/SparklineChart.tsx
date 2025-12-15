import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface SparklineChartProps {
  data: { value: number }[];
  color: string;
  gradientId: string;
}

const SparklineChart = ({ data, color, gradientId }: SparklineChartProps) => {
  if (!data || data.length === 0) {
    // Generate sample data for empty state
    const sampleData = Array.from({ length: 7 }, (_, i) => ({
      value: Math.random() * 100 + 50,
    }));
    data = sampleData;
  }

  return (
    <div className="h-12 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            animationDuration={1500}
            animationBegin={0}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SparklineChart;
