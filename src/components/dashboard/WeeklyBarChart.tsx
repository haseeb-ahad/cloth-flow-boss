import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

interface WeeklyData {
  day: string;
  value: number;
}

interface WeeklyBarChartProps {
  data: WeeklyData[];
  title: string;
  subtitle: string;
  valuesHidden: boolean;
}

const CustomTooltip = ({ active, payload, label, valuesHidden, t }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {t("salesLabel")}: <span className="font-medium text-foreground">
            {valuesHidden ? "••••••" : `PKR ${payload[0].value.toLocaleString()}`}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

const WeeklyBarChart = ({ data, title, subtitle, valuesHidden }: WeeklyBarChartProps) => {
  const { t } = useLanguage();
  const maxValue = Math.max(...data.map(d => d.value));

  // Translate day names
  const dayMap: Record<string, string> = {
    "Mon": t("monday"),
    "Tue": t("tuesday"),
    "Wed": t("wednesday"),
    "Thu": t("thursday"),
    "Fri": t("friday"),
    "Sat": t("saturday"),
    "Sun": t("sunday"),
  };

  const translatedData = data.map(d => ({
    ...d,
    day: dayMap[d.day] || d.day
  }));

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4">
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={translatedData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <XAxis 
                dataKey="day" 
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
              <Tooltip
                content={<CustomTooltip valuesHidden={valuesHidden} t={t} />}
                cursor={{ fill: "transparent" }}
                wrapperStyle={{ visibility: "hidden" }}
              />
              <Bar 
                dataKey="value" 
                radius={[6, 6, 0, 0]}
                animationDuration={1000}
                animationBegin={0}
              >
                {translatedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={data[index]?.value === maxValue ? "#8b5cf6" : "#3b82f6"}
                    opacity={data[index]?.value === maxValue ? 1 : 0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyBarChart;