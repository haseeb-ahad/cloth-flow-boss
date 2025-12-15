import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChartIcon } from "lucide-react";

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface CategoryPieChartProps {
  data: CategoryData[];
  title: string;
  valuesHidden: boolean;
}

const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, valuesHidden }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor="middle" 
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {valuesHidden ? "••" : `${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload, valuesHidden }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-lg">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.payload.color }}
          />
          <span className="text-sm font-semibold text-foreground">{data.name}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {valuesHidden ? "••••" : data.value} products
        </p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-4">
      {payload?.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs font-medium text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const CategoryPieChart = ({ data, title, valuesHidden }: CategoryPieChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card className="hover:shadow-xl transition-all duration-300 border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
              <PieChartIcon className="h-5 w-5 text-accent" />
            </div>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <p className="text-muted-foreground text-sm">No category data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-xl transition-all duration-300 border-border/50 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
            <PieChartIcon className="h-5 w-5 text-accent" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props) => renderCustomizedLabel({ ...props, valuesHidden })}
                outerRadius={100}
                innerRadius={50}
                dataKey="value"
                animationDuration={1000}
                animationBegin={0}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip valuesHidden={valuesHidden} />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryPieChart;
