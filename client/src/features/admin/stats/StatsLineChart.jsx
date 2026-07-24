import React from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import '../Statistics.css';

/**
 * @param {string} value YYYY-MM-DD
 */
function formatAxisDate(value) {
  if (!value || value.length < 10) return value || '';
  const [, m, d] = value.slice(0, 10).split('-');
  return `${d}.${m}`;
}

/**
 * @param {string} value YYYY-MM-DD
 */
function formatTooltipDate(value) {
  if (!value || value.length < 10) return value || '';
  const [y, m, d] = value.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

/**
 * Combo-график прироста: столбцы = за день, линия = накопительно.
 *
 * @param {{
 *   points: Array<{ date: string, count: number, cumulative: number }>,
 *   height?: number,
 *   countLabel?: string,
 *   cumulativeLabel?: string,
 *   onBarClick?: (date: string, count: number) => void
 * }} props
 */
export default function StatsLineChart({
  points,
  height = 240,
  countLabel = 'За день',
  cumulativeLabel = 'Накопительно',
  onBarClick
}) {
  const data = (points || []).map((p) => ({
    date: p.date,
    count: Number(p.count) || 0,
    cumulative: Number(p.cumulative) || 0
  }));

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="stats-line-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.08)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatAxisDate}
            tick={{ fontSize: 11, fill: '#868e96' }}
            axisLine={{ stroke: 'rgba(0, 0, 0, 0.12)' }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            yAxisId="count"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#868e96' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <YAxis
            yAxisId="cumulative"
            orientation="right"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#868e96' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            labelFormatter={formatTooltipDate}
            formatter={(value, name) => [value, name]}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid rgba(0, 0, 0, 0.1)',
              fontSize: 13
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
            iconType="circle"
            iconSize={8}
          />
          <Bar
            yAxisId="count"
            dataKey="count"
            name={countLabel}
            fill="#007aff"
            fillOpacity={0.55}
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
            activeBar={false}
            cursor={onBarClick ? 'pointer' : undefined}
            onClick={(item) => {
              if (!onBarClick) return;
              const payload = item?.payload;
              const date = payload?.date;
              const count = Number(payload?.count) || 0;
              if (!date || count <= 0) return;
              onBarClick(date, count);
            }}
          />
          <Line
            yAxisId="cumulative"
            type="monotone"
            dataKey="cumulative"
            name={cumulativeLabel}
            stroke="#1f2937"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
