import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface MiniSparklineProps {
  data: { value: number }[];
  color: string;
}

const MiniSparkline = ({ data, color }: MiniSparklineProps) => {
  // Generate sample data if empty
  const chartData = data.length > 0 ? data : Array.from({ length: 7 }, () => ({
    value: Math.random() * 100 + 20,
  }));

  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#gradient-${color.replace('#', '')})`}
            animationDuration={1500}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MiniSparkline;
