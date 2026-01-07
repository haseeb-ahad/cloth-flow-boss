import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: CategoryData[];
  title: string;
  subtitle: string;
  valuesHidden: boolean;
  isLoading?: boolean;
}

// Blue to purple gradient colors
const COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#c084fc"];

const CustomTooltip = ({ active, payload, valuesHidden, t }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const total = payload[0].payload.total || 100;
    const percentage = ((data.value / total) * 100).toFixed(0);
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.payload.fill }}
          />
          <span className="text-sm font-semibold text-foreground">{data.name}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {valuesHidden ? "••••" : `${data.value} ${t("items_count")} (${percentage}%)`}
        </p>
      </div>
    );
  }
  return null;
};

const DonutChart = ({ data, title, subtitle, valuesHidden, isLoading = false }: DonutChartProps) => {
  const { t } = useLanguage();
  const [isHovering, setIsHovering] = useState(false);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const chartData = data.slice(0, 5).map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length],
    total,
  }));

  if (!data || data.length === 0) {
    return (
      <Card className="hover:shadow-lg transition-all duration-300 border-border/50 h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <p className="text-muted-foreground text-sm">{t("noDataAvailable")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-border/50 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <div 
          className="flex flex-col items-center"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div className="h-[160px] w-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  dataKey="value"
                  animationDuration={1000}
                  animationBegin={0}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  ))}
                </Pie>
                {!isLoading && isHovering && (
                  <Tooltip content={<CustomTooltip valuesHidden={valuesHidden} t={t} />} />
                )}
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full space-y-2 mt-4">
            {chartData.map((item, index) => {
              const percentage = ((item.value / total) * 100).toFixed(0);
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-foreground">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {valuesHidden ? "••" : `${percentage}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DonutChart;