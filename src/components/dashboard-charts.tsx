'use client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
const colors = ['#9281dc', '#b2c4e9', '#a7cdbd', '#edcf9f', '#d6b5d8', '#98cbd2'];
export function AttendanceChart({
  data,
}: {
  data: { name: string; present: number; absent: number; excused: number }[];
}) {
  return (
    <div
      className="chart-container"
      role="img"
      aria-label="Daily attendance counts for the last seven days"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={3} margin={{ top: 10, right: 20, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 9, fill: 'var(--muted)' }}
            dy={8}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 9, fill: 'var(--muted)' }}
          />
          <Tooltip
            cursor={{ fill: 'var(--soft)' }}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              fontSize: 11,
            }}
          />
          <Bar
            isAnimationActive={false}
            name="Present / late"
            dataKey="present"
            fill="#9581da"
            radius={[4, 4, 0, 0]}
            maxBarSize={19}
          />
          <Bar
            isAnimationActive={false}
            name="Absent"
            dataKey="absent"
            fill="#ddd5f4"
            radius={[4, 4, 0, 0]}
            maxBarSize={19}
          />
          <Bar
            isAnimationActive={false}
            name="Excused"
            dataKey="excused"
            fill="#a7cdbd"
            radius={[4, 4, 0, 0]}
            maxBarSize={19}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function DepartmentChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <>
      <div
        className="donut-container"
        role="img"
        aria-label={data.map((d) => `${d.name}: ${d.value}`).join(', ')}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={total ? data : [{ name: 'No students', value: 1 }]}
              innerRadius={51}
              outerRadius={68}
              dataKey="value"
              paddingAngle={3}
              stroke="var(--surface)"
              strokeWidth={2}
            >
              {(total ? data : [{ name: 'No students', value: 1 }]).map((d, i) => (
                <Cell key={d.name} fill={total ? colors[i % colors.length] : 'var(--line)'} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                fontSize: 11,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <strong>{total}</strong>
          <span>Students</span>
        </div>
      </div>
      <div className="department-legend">
        {data.map((d, i) => (
          <div key={d.name}>
            <span className="legend-dot" style={{ background: colors[i % colors.length] }} />
            <span>{d.name}</span>
            <strong>{d.value}</strong>
          </div>
        ))}
      </div>
    </>
  );
}
