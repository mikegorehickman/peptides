import { useEffect, useState } from "react";
import { Plus, Trash2, Sun, Moon, AlertCircle } from "lucide-react";
import { supabase, Peptide, Dose } from "../lib/supabase";

type Props = {
  peptides: Peptide[];
  doses: Dose[];
  userId: string;
  onChange: () => void;
  goToPeptides: () => void;
};

export default function LogTab({ peptides, doses, userId, onChange, goToPeptides }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [peptideId, setPeptideId] = useState(peptides[0]?.id || "");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState<"AM" | "PM">(new Date().getHours() < 12 ? "AM" : "PM");
  const [units, setUnits] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!peptideId && peptides.length) setPeptideId(peptides[0].id);
  }, [peptides, peptideId]);

  const peptide = peptides.find((p) => p.id === peptideId);
  const mcg = peptide && units ? (parseFloat(units) * peptide.mcg_per_unit).toFixed(1) : "0";
  const mg = peptide && units ? ((parseFloat(units) * peptide.mcg_per_unit) / 1000).toFixed(3) : "0";

  const submit = async () => {
    if (!peptide || !units || parseFloat(units) <= 0) return;
    setSaving(true);
    const { error } = await supabase.rpc("pep_insert_dose", {
      p_peptide_id: peptide.id,
      p_date: date,
      p_time_of_day: time,
      p_units: parseFloat(units),
    });
    setSaving(false);
    if (error) {
      alert("Save failed: " + error.message);
      return;
    }
    setUnits("");
    onChange();
  };

  const deleteDose = async (id: string) => {
    const { error } = await supabase.rpc("pep_delete_dose", { p_dose_id: id });
    if (error) alert("Delete failed: " + error.message);
    else onChange();
  };

  const recent = doses.slice(0, 15);

  if (peptides.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-zinc-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">No peptides yet</h2>
        <p className="text-zinc-500 mb-6">Set up a peptide first to start logging doses.</p>
        <button
          onClick={goToPeptides}
          className="px-5 py-2.5 bg-lime-400 text-zinc-950 rounded-lg font-semibold hover:bg-lime-300 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add peptide
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Entry card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-4">New Dose</div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Peptide</label>
            <select
              value={peptideId}
              onChange={(e) => setPeptideId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:border-lime-400 focus:outline-none"
            >
              {peptides.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {Number(p.mcg_per_unit).toFixed(1)} mcg/unit
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:border-lime-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Time</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTime("AM")}
                  className={`py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5 border ${
                    time === "AM" ? "bg-lime-400 text-zinc-950 border-lime-400" : "bg-zinc-950 border-zinc-800 text-zinc-400"
                  }`}
                >
                  <Sun className="w-4 h-4" /> AM
                </button>
                <button
                  onClick={() => setTime("PM")}
                  className={`py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5 border ${
                    time === "PM" ? "bg-lime-400 text-zinc-950 border-lime-400" : "bg-zinc-950 border-zinc-800 text-zinc-400"
                  }`}
                >
                  <Moon className="w-4 h-4" /> PM
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Units on syringe</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 20"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-lg font-mono focus:border-lime-400 focus:outline-none"
            />
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Dose amount</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-lime-400">{mcg}</span>
              <span className="text-sm text-zinc-500 font-mono">mcg</span>
              <span className="text-zinc-700 mx-2">·</span>
              <span className="text-lg font-mono text-zinc-400">{mg}</span>
              <span className="text-sm text-zinc-500 font-mono">mg</span>
            </div>
          </div>

          <button
            onClick={submit}
            disabled={!units || parseFloat(units) <= 0 || saving}
            className="w-full py-3 bg-lime-400 text-zinc-950 rounded-lg font-bold hover:bg-lime-300 disabled:opacity-40 transition-colors"
          >
            {saving ? "Saving..." : "Log dose"}
          </button>
        </div>
      </div>

      {/* Recent */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">Recent</h2>
          <div className="text-[10px] text-zinc-600 font-mono">{doses.length} total</div>
        </div>
        {recent.length === 0 ? (
          <div className="text-center py-8 text-zinc-600 text-sm">No doses logged yet</div>
        ) : (
          <div className="space-y-2">
            {recent.map((d) => (
              <div key={d.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${d.time_of_day === "AM" ? "bg-amber-500/10 text-amber-400" : "bg-indigo-500/10 text-indigo-400"}`}>
                    {d.time_of_day === "AM" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-semibold">{d.peptide_name}</div>
                    <div className="text-xs text-zinc-500 font-mono">
                      {formatDate(d.date)} · {d.time_of_day} · {Number(d.units)} units
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-mono font-semibold text-lime-400">{Number(d.mcg).toFixed(0)} mcg</div>
                  <button onClick={() => deleteDose(d.id)} className="text-zinc-600 hover:text-red-400 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  if (dd.getTime() === today.getTime()) return "Today";
  if (dd.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
