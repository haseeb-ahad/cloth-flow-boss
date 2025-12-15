import { useState } from "react";
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartData {
  date: string;
  sales: number;
  profit: number;
}

interface SalesAreaChartProps {
  data: ChartData[];
  title: string;
  subtitle: string;
  valuesHidden: boolean;
  isLoading?: boolean;
}

const CustomTooltip = ({ active, payload, label, valuesHidden }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground capitalize">{entry.name}:</span>
            <span className="font-medium text-foreground">
              {valuesHidden ? "••••••" : `PKR ${entry.value.toLocaleString()}`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const SalesAreaChart = ({ data, title, subtitle, valuesHidden, isLoading = false }: SalesAreaChartProps) => {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Sales</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
              <span className="text-muted-foreground">Profit</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4">
        <div 
          className="h-[280px] w-full"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="salesAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id="profitAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.18}/>
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => valuesHidden ? "•••" : `${(value / 1000).toFixed(0)}k`}
              />
              {!isLoading && (
                <Tooltip
                  content={<CustomTooltip valuesHidden={valuesHidden} />}
                  cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  wrapperStyle={{ visibility: isHovering ? "visible" : "hidden" }}
                />
              )}
              <Area
                type="monotone"
                dataKey="profit"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#profitAreaGradient)"
                animationDuration={1500}
                animationBegin={300}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="hsl(var(--success))"
                strokeWidth={2.5}
                fill="url(#salesAreaGradient)"
                animationDuration={1500}
                animationBegin={0}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesAreaChart;
