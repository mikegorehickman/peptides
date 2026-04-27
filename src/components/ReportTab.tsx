import { useMemo, useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Download } from "lucide-react";
import { Peptide, Dose } from "../lib/supabase";

type Props = { peptides: Peptide[]; doses: Dose[] };
type View = "week" | "month";

function useIsDark() {
  const [isDark, setIsDark] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtShort = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtMonth = (d: Date) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

// Monday-as-week-start
function startOfWeek(d: Date) {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // 0=Mon..6=Sun
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function ReportTab({ doses }: Props) {
  const [view, setView] = useState<View>("week");
  const [offset, setOffset] = useState(0); // 0 = current period, 1 = previous, etc.
  const isDark = useIsDark();

  const exportCSV = () => {
    const header = "date,time,peptide,units,mcg,mg\n";
    const rows = doses
      .map((d) => {
        const mg = (Number(d.mcg) / 1000).toFixed(4);
        return `${d.date},${d.time_of_day},"${d.peptide_name}",${d.units},${Number(d.mcg).toFixed(2)},${mg}`;
      })
      .join("\n");
    const csv = header + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const now = new Date();
    a.download = `peptide-doses-${localIso(now)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Selected period (Week or Month) ----
  const { start, end, periodLabel, dailyData, totals } = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date, periodLabel: string;

    if (view === "week") {
      end = new Date(now);
      end.setDate(end.getDate() - offset * 7);
      end.setHours(23, 59, 59, 999);
      start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      periodLabel = `${fmtShort(start)} – ${fmtShort(end)}`;
    } else {
      const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
      periodLabel = fmtMonth(ref);
    }

    const inRange = doses.filter((d) => {
      const dd = new Date(d.date + "T12:00:00");
      return dd >= start && dd <= end;
    });

    // Per-peptide totals for the period
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

    // Daily breakdown
    const days: any[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const iso = localIso(cursor);
      const entry: any = {
        date: iso,
        label:
          view === "week"
            ? cursor.toLocaleDateString("en-US", { weekday: "short" })
            : String(cursor.getDate()),
      };
      inRange
        .filter((d) => d.date === iso)
        .forEach((d) => {
          entry[d.peptide_name] = (entry[d.peptide_name] || 0) + Number(d.mcg);
        });
      days.push(entry);
      cursor.setDate(cursor.getDate() + 1);
    }

    return { start, end, periodLabel, dailyData: days, totals };
  }, [doses, view, offset]);

  // ---- Last 8 weeks: mg per peptide ----
  const weeklyData = useMemo(() => {
    const allPeptides = Array.from(new Set(doses.map((d) => d.peptide_name)));
    const now = new Date();
    const thisWeekStart = startOfWeek(now);

    const weeks: any[] = [];
    for (let i = 7; i >= 0; i--) {
      const ws = new Date(thisWeekStart);
      ws.setDate(ws.getDate() - i * 7);
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      we.setHours(23, 59, 59, 999);

      const entry: any = { label: fmtShort(ws) };
      allPeptides.forEach((p) => {
        entry[p] = 0;
      });

      doses
        .filter((d) => {
          const dd = new Date(d.date + "T12:00:00");
          return dd >= ws && dd <= we;
        })
        .forEach((d) => {
          // mg = mcg / 1000
          entry[d.peptide_name] = (entry[d.peptide_name] || 0) + Number(d.mcg) / 1000;
        });

      // round mg values to 3 decimals for cleaner tooltip
      allPeptides.forEach((p) => {
        entry[p] = Number(entry[p].toFixed(3));
      });

      weeks.push(entry);
    }
    return { weeks, peptides: allPeptides };
  }, [doses]);

  const colors = isDark
    ? ["#a3e635", "#fbbf24", "#818cf8", "#f472b6", "#22d3ee", "#fb923c"]
    : ["#65a30d", "#d97706", "#4f46e5", "#db2777", "#0891b2", "#ea580c"];
  const peptideNames = totals.map((t) => t.name);

  const totalMcg = totals.reduce((s, t) => s + t.totalMcg, 0);
  const totalDoses = totals.reduce((s, t) => s + t.count, 0);
  const totalMg = totalMcg / 1000;

  const buttonClass =
    "px-3 py-1.5 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-300 rounded-lg text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors";

  const tooltipStyle = {
    backgroundColor: isDark ? "#18181b" : "#ffffff",
    border: `2px solid ${isDark ? "#3f3f46" : "#e4e4e7"}`,
    borderRadius: 8,
    fontSize: 12,
  };
  const axisColor = isDark ? "#71717a" : "#52525b";
  const gridColor = isDark ? "#27272a" : "#e4e4e7";

  return (
    <div className="space-y-6">
      {/* View toggle */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 max-w-xs">
        <button
          onClick={() => {
            setView("week");
            setOffset(0);
          }}
          className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
            view === "week"
              ? "bg-lime-400 text-zinc-950"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Weekly
        </button>
        <button
          onClick={() => {
            setView("month");
            setOffset(0);
          }}
          className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
            view === "month"
              ? "bg-lime-400 text-zinc-950"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Monthly
        </button>
      </div>

      {/* Period header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-1">
            {view === "week" ? "Week" : "Month"}
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{periodLabel}</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportCSV}
            disabled={doses.length === 0}
            className={`${buttonClass} flex items-center gap-1.5`}
            title="Export all data as CSV"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={() => setOffset(offset + 1)} className={buttonClass}>
            ← Prev
          </button>
          <button onClick={() => setOffset(Math.max(0, offset - 1))} disabled={offset === 0} className={buttonClass}>
            Next →
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 shadow-sm dark:shadow-none">
          <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Doses</div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{totalDoses}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 shadow-sm dark:shadow-none">
          <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Total mcg</div>
          <div className="text-2xl font-bold font-mono text-lime-600 dark:text-lime-400">{totalMcg.toFixed(0)}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 shadow-sm dark:shadow-none">
          <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Total mg</div>
          <div className="text-2xl font-bold font-mono text-lime-600 dark:text-lime-400">{totalMg.toFixed(2)}</div>
        </div>
      </div>

      {/* Daily breakdown */}
      {totals.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 shadow-sm dark:shadow-none">
          <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-4">
            {view === "week" ? "Daily breakdown (mcg)" : "Daily breakdown — by day of month (mcg)"}
          </div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke={axisColor}
                  fontSize={11}
                  interval={view === "month" ? 2 : 0}
                />
                <YAxis stroke={axisColor} fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: axisColor }} />
                {peptideNames.map((name, i) => (
                  <Bar key={name} dataKey={name} stackId="a" fill={colors[i % colors.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Weekly mg per peptide — last 8 weeks */}
      {weeklyData.peptides.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 shadow-sm dark:shadow-none">
          <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-1">
            Weekly mg per peptide
          </div>
          <div className="text-xs text-zinc-500 mb-4">Last 8 weeks · Mon–Sun</div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={weeklyData.weeks} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="label" stroke={axisColor} fontSize={11} />
                <YAxis stroke={axisColor} fontSize={11} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: axisColor }}
                  formatter={(value: any) => [`${Number(value).toFixed(2)} mg`, ""]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: axisColor, paddingTop: 8 }}
                  iconType="square"
                />
                {weeklyData.peptides.map((name, i) => (
                  <Bar key={name} dataKey={name} stackId="w" fill={colors[i % colors.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-peptide totals (in selected period) */}
      <div>
        <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-3">
          By peptide — this {view === "week" ? "week" : "month"}
        </div>
        {totals.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl p-8 text-center text-zinc-500 text-sm shadow-sm dark:shadow-none">
            No doses logged this {view}
          </div>
        ) : (
          <div className="space-y-2">
            {totals.map((t, i) => (
              <div
                key={t.name}
                className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl p-4 shadow-sm dark:shadow-none"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{t.name}</div>
                  </div>
                  <div className="font-mono font-bold text-lg">
                    <span style={{ color: colors[i % colors.length] }}>{(t.totalMcg / 1000).toFixed(2)}</span>
                    <span className="text-zinc-500 text-sm ml-1">mg</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs font-mono text-zinc-600 dark:text-zinc-500">
                  <div>
                    <div className="text-zinc-500 dark:text-zinc-600 uppercase tracking-wider text-[10px]">Doses</div>
                    <div className="text-zinc-800 dark:text-zinc-300 mt-0.5">{t.count}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500 dark:text-zinc-600 uppercase tracking-wider text-[10px]">Avg/dose</div>
                    <div className="text-zinc-800 dark:text-zinc-300 mt-0.5">{(t.totalMcg / t.count).toFixed(1)} mcg</div>
                  </div>
                  <div>
                    <div className="text-zinc-500 dark:text-zinc-600 uppercase tracking-wider text-[10px]">Total mcg</div>
                    <div className="text-zinc-800 dark:text-zinc-300 mt-0.5">{t.totalMcg.toFixed(0)}</div>
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
