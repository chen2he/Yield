"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/asc/format";

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** 订单趋势：订单数（线，右轴）+ 订单金额（面积，左轴，FX 折算）。无 FX 时退化为仅订单数。 */
export function OrdersTrendChart({
  data,
  countLabel,
  amountLabel,
  baseCurrency,
  showAmount,
}: {
  data: { date: string; count: number; amount: number }[];
  countLabel: string;
  amountLabel: string;
  baseCurrency: string;
  showAmount: boolean;
}) {
  const xAxis = (
    <XAxis
      dataKey="date"
      tickLine={false}
      axisLine={false}
      tickMargin={8}
      minTickGap={24}
      tickFormatter={(v: string) => v.slice(5)}
    />
  );

  if (!showAmount) {
    const config = { count: { label: countLabel, color: "var(--chart-1)" } } satisfies ChartConfig;
    return (
      <ChartContainer config={config} className="aspect-auto h-56 w-full">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          {xAxis}
          <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
          <defs>
            <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.6} />
              <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area dataKey="count" type="monotone" stroke="var(--color-count)" strokeWidth={2} fill="url(#fillCount)" />
        </AreaChart>
      </ChartContainer>
    );
  }

  const config = {
    amount: { label: amountLabel, color: "var(--chart-1)" },
    count: { label: countLabel, color: "var(--chart-2)" },
  } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <ComposedChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        {xAxis}
        <YAxis
          yAxisId="amount"
          orientation="left"
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(v: number) => formatCurrency(v, baseCurrency, 0)}
        />
        <YAxis
          yAxisId="count"
          orientation="right"
          tickLine={false}
          axisLine={false}
          width={28}
          allowDecimals={false}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <defs>
          <linearGradient id="fillAmount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-amount)" stopOpacity={0.6} />
            <stop offset="95%" stopColor="var(--color-amount)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <Area
          yAxisId="amount"
          dataKey="amount"
          type="monotone"
          stroke="var(--color-amount)"
          strokeWidth={2}
          fill="url(#fillAmount)"
        />
        <Line yAxisId="count" dataKey="count" type="monotone" stroke="var(--color-count)" strokeWidth={2} dot={false} />
        <ChartLegend content={<ChartLegendContent />} />
      </ComposedChart>
    </ChartContainer>
  );
}

/** 分类占比环形图（商品 / 订阅状态通用）。 */
export function CategoryDonut({ data }: { data: { label: string; value: number }[] }) {
  const chartData = data.map((d, i) => ({ key: `k${i}`, value: d.value, fill: `var(--color-k${i})` }));
  const config = Object.fromEntries(
    data.map((d, i) => [`k${i}`, { label: d.label, color: PALETTE[i % PALETTE.length] }]),
  ) as ChartConfig;
  return (
    <ChartContainer config={config} className="mx-auto aspect-square h-60">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
        <Pie data={chartData} dataKey="value" nameKey="key" innerRadius={55} strokeWidth={2} />
        <ChartLegend content={<ChartLegendContent nameKey="key" />} className="flex-wrap gap-x-3 gap-y-1" />
      </PieChart>
    </ChartContainer>
  );
}

/** 各币种订单数（柱状图）。 */
export function CurrencyBar({
  data,
  label,
}: {
  data: { currency: string; orders: number }[];
  label: string;
}) {
  const config = { orders: { label, color: "var(--chart-2)" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="currency" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="orders" fill="var(--color-orders)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
