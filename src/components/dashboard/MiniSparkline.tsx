import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { useMemo } from "react";

interface MiniSparklineProps {
  data: { value: number }[];
  color: string;
}

const MiniSparkline = ({ data, color }: MiniSparklineProps) => {
  const chartData = useMemo(() => {
    // If no data, return flat line
    if (!data || data.length === 0) {
      return Array.from({ length: 7 }, () => ({ value: 0 }));
    }

    // If single data point, duplicate to allow proper line rendering
    if (data.length === 1) {
      return [{ value: data[0].value }, { value: data[0].value }];
    }

    return data;
  }, [data]);

  // Normalize values to 0-100 range for consistent rendering
  const normalizedData = useMemo(() => {
    const values = chartData.map(d => d.value);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    
    // All values are the same (including all zeros) - return flat line at middle
    if (maxVal === minVal) {
      return chartData.map(() => ({ value: 50 }));
    }
    
    // Normalize to 0-100 range
    return chartData.map(d => ({
      value: ((d.value - minVal) / (maxVal - minVal)) * 100
    }));
  }, [chartData]);

  // Generate unique gradient ID to prevent conflicts
  const gradientId = useMemo(() => 
    `spark-${color.replace('#', '')}-${Math.random().toString(36).substr(2, 9)}`,
  [color]);

  return (
    <div className="h-10 w-24 overflow-hidden flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={normalizedData} 
          margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <YAxis 
            hide 
            domain={[0, 100]} 
            allowDataOverflow={false}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            animationDuration={1500}
            isAnimationActive={true}
            baseValue={0}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MiniSparkline;
