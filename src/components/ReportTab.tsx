import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Download } from "lucide-react";
import { Peptide, Dose } from "../lib/supabase";

type Props = { peptides: Peptide[]; doses: Dose[] };

export default function ReportTab({ doses }: Props) {
  const [weeksAgo, setWeeksAgo] = useState(0);

  const exportCSV = () => {
    const header = "date,time,peptide,units,mcg,mg\n";
    const rows = doses.map((d) => {
      const mg = (Number(d.mcg) / 1000).toFixed(4);
      return `${d.date},${d.time_of_day},"${d.peptide_name}",${d.units},${Number(d.mcg).toFixed(2)},${mg}`;
    }).join("\n");
    const csv = header + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peptide-doses-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { weekDoses, weekLabel, totals, dailyData } = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() - weeksAgo * 7);

    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const inRange = doses.filter((d) => {
      const dd = new Date(d.date + "T12:00:00");
      return dd >= start && dd <= end;
    });

    const totalsMap: Record<string, { name: string; totalMcg: number; totalUnits: number; count: number }> = {};
    inRange.forEach((d) => {
      if (!totalsMap[d.peptide_name]) {
        totalsMap[d.peptide_name] = { name: d.peptide_name, totalMcg: 0, totalUnits: 0, count: 0 };
      }
      totalsMap[d.peptide_name].totalMcg += Number(d.mcg);
      totalsMap[d.peptide_name].totalUnits += Number(d.units);
      totalsMap[d.peptide_name].count += 1;
    });
    const totals = Object.values(totalsMap).sort((a, b) => b.totalMcg - a.totalMcg);

    const days: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(end);
      day.setDate(day.getDate() - i);
      const iso = day.toISOString().split("T")[0];
      const entry: any = { date: iso, label: day.toLocaleDateString("en-US", { weekday: "short" }) };
      inRange.filter((d) => d.date === iso).forEach((d) => {
        entry[d.peptide_name] = (entry[d.peptide_name] || 0) + Number(d.mcg);
      });
      days.push(entry);
    }

    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const label = `${fmt(start)} – ${fmt(end)}`;

    return { weekDoses: inRange, weekLabel: label, totals, dailyData: days };
  }, [doses, weeksAgo]);

  const colors = ["#a3e635", "#fbbf24", "#818cf8", "#f472b6", "#22d3ee", "#fb923c"];
  const peptideNames = totals.map((t) => t.name);

  const totalMcg = totals.reduce((s, t) => s + t.totalMcg, 0);
  const totalDoses = totals.reduce((s, t) => s + t.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-1">Week</div>
          <div className="text-xl font-bold">{weekLabel}</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportCSV}
            disabled={doses.length === 0}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-800 disabled:opacity-40 flex items-center gap-1.5"
            title="Export all data as CSV"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={() => setWeeksAgo(weeksAgo + 1)}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-800"
          >
            ← Prev
          </button>
          <button
            onClick={() => setWeeksAgo(Math.max(0, weeksAgo - 1))}
            disabled={weeksAgo === 0}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-800 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Total doses</div>
          <div className="text-3xl font-bold font-mono">{totalDoses}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Total mcg</div>
          <div className="text-3xl font-bold font-mono text-lime-400">{totalMcg.toFixed(0)}</div>
        </div>
      </div>

      {weekDoses.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-4">Daily breakdown (mcg)</div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="label" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#a1a1aa" }}
                />
                {peptideNames.map((name, i) => (
                  <Bar key={name} dataKey={name} stackId="a" fill={colors[i % colors.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div>
        <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-3">By Peptide</div>
        {totals.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
            No doses logged this week
          </div>
        ) : (
          <div className="space-y-2">
            {totals.map((t, i) => (
              <div key={t.name} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                    <div className="font-semibold">{t.name}</div>
                  </div>
                  <div className="font-mono font-bold text-lg">
                    <span style={{ color: colors[i % colors.length] }}>{t.totalMcg.toFixed(0)}</span>
                    <span className="text-zinc-500 text-sm ml-1">mcg</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs font-mono text-zinc-500">
                  <div>
                    <div className="text-zinc-600 uppercase tracking-wider text-[10px]">Doses</div>
                    <div className="text-zinc-300 mt-0.5">{t.count}</div>
                  </div>
                  <div>
                    <div className="text-zinc-600 uppercase tracking-wider text-[10px]">Avg/dose</div>
                    <div className="text-zinc-300 mt-0.5">{(t.totalMcg / t.count).toFixed(1)} mcg</div>
                  </div>
                  <div>
                    <div className="text-zinc-600 uppercase tracking-wider text-[10px]">Total units</div>
                    <div className="text-zinc-300 mt-0.5">{t.totalUnits.toFixed(1)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
