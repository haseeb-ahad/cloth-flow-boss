import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useMemo } from "react";

interface MiniSparklineProps {
  data: { value: number }[];
  color: string;
  id?: string;
}

const MiniSparkline = ({ data, color, id = "default" }: MiniSparklineProps) => {
  // Generate unique gradient ID based on color and id prop to avoid SVG conflicts
  const gradientId = useMemo(() => `spark-${id}-${color.replace('#', '')}`, [color, id]);
  
  // Generate sample data if empty
  const chartData = data.length > 0 ? data : Array.from({ length: 7 }, (_, i) => ({
    value: Math.random() * 100 + 20,
  }));

  return (
    <div className="h-12 w-20 flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
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
            isAnimationActive={true}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MiniSparkline;
