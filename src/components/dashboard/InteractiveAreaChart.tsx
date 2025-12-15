import { Area, AreaChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface ChartData {
  date: string;
  sales: number;
  profit: number;
}

interface InteractiveAreaChartProps {
  data: ChartData[];
  title: string;
  dateRangeLabel: string;
  valuesHidden: boolean;
}

const CustomTooltip = ({ active, payload, label, valuesHidden }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-lg">
        <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
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

const InteractiveAreaChart = ({ data, title, dateRangeLabel, valuesHidden }: InteractiveAreaChartProps) => {
  return (
    <Card className="hover:shadow-xl transition-all duration-300 border-border/50 overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground font-medium">{dateRangeLabel}</p>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={data}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4}/>
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                strokeOpacity={0.3}
                vertical={false}
              />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={5}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dx={-5}
                tickFormatter={(value) => valuesHidden ? "•••" : `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip valuesHidden={valuesHidden} />} />
              <Area 
                type="monotone" 
                dataKey="sales" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2.5}
                fill="url(#salesGradient)"
                animationDuration={1200}
                animationBegin={0}
                dot={false}
                activeDot={{ 
                  r: 6, 
                  stroke: "hsl(var(--card))", 
                  strokeWidth: 2,
                  fill: "hsl(var(--primary))"
                }}
              />
              <Area 
                type="monotone" 
                dataKey="profit" 
                stroke="hsl(var(--success))" 
                strokeWidth={2.5}
                fill="url(#profitGradient)"
                animationDuration={1200}
                animationBegin={300}
                dot={false}
                activeDot={{ 
                  r: 6, 
                  stroke: "hsl(var(--card))", 
                  strokeWidth: 2,
                  fill: "hsl(var(--success))"
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Sales</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-sm text-muted-foreground">Profit</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InteractiveAreaChart;
