import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase, Peptide, Dose } from "../lib/supabase";

type Props = {
  peptides: Peptide[];
  doses: Dose[];
  userId: string;
  onChange: () => void;
};

export default function PeptidesTab({ peptides, doses, onChange }: Props) {
  const [showForm, setShowForm] = useState(peptides.length === 0);
  const [name, setName] = useState("");
  const [mg, setMg] = useState("");
  const [ml, setMl] = useState("");
  const [saving, setSaving] = useState(false);

  const mgN = parseFloat(mg);
  const mlN = parseFloat(ml);
  const mcgPerUnit = mgN > 0 && mlN > 0 ? (mgN * 10) / mlN : 0;
  const mcgPerMl = mgN > 0 && mlN > 0 ? (mgN * 1000) / mlN : 0;

  const submit = async () => {
    if (!name.trim() || !mgN || !mlN) return;
    setSaving(true);
    const { error } = await supabase.rpc("pep_insert_peptide", {
      p_name: name.trim(),
      p_mg: mgN,
      p_ml: mlN,
    });
    setSaving(false);
    if (error) {
      alert("Save failed: " + error.message);
      return;
    }
    setName(""); setMg(""); setMl(""); setShowForm(false);
    onChange();
  };

  const deletePep = async (id: string) => {
    const used = doses.some((d) => d.peptide_id === id);
    const msg = used
      ? "This peptide has dose history. Delete it? (Past doses will also be removed.)"
      : "Delete this peptide?";
    if (!confirm(msg)) return;
    const { error } = await supabase.rpc("pep_delete_peptide", { p_peptide_id: id });
    if (error) alert("Delete failed: " + error.message);
    else onChange();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">Your Stack</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 bg-lime-400 text-zinc-950 rounded-lg font-semibold text-sm hover:bg-lime-300 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New peptide
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-4">Set Up Peptide</div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Name</label>
              <input
                type="text"
                placeholder="e.g. BPC-157, Semaglutide, TB-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:border-lime-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Vial amount (mg)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 10"
                  value={mg}
                  onChange={(e) => setMg(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-white font-mono focus:border-lime-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Water added (ml)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 2"
                  value={ml}
                  onChange={(e) => setMl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-white font-mono focus:border-lime-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2">
              <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-1">Auto-calc</div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-zinc-400">Per unit</span>
                <span className="font-mono font-bold text-lime-400 text-lg">{mcgPerUnit.toFixed(2)} mcg</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-zinc-400">Concentration</span>
                <span className="font-mono text-zinc-300">{mcgPerMl.toFixed(0)} mcg/ml</span>
              </div>
              <div className="text-[10px] text-zinc-600 pt-1 leading-relaxed">
                Based on standard U-100 insulin syringe: 100 units = 1 ml
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={submit}
                disabled={!name.trim() || !mgN || !mlN || saving}
                className="flex-1 py-3 bg-lime-400 text-zinc-950 rounded-lg font-bold hover:bg-lime-300 disabled:opacity-40"
              >
                {saving ? "Saving..." : "Save peptide"}
              </button>
              {peptides.length > 0 && (
                <button
                  onClick={() => { setShowForm(false); setName(""); setMg(""); setMl(""); }}
                  className="px-4 py-3 bg-zinc-800 text-zinc-300 rounded-lg font-semibold hover:bg-zinc-700"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {peptides.length > 0 && (
        <div className="space-y-2">
          {peptides.map((p) => {
            const count = doses.filter((d) => d.peptide_id === p.id).length;
            return (
              <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{p.name}</div>
                  <div className="text-xs text-zinc-500 font-mono mt-0.5">
                    {Number(p.mg)}mg / {Number(p.ml)}ml · {Number(p.mcg_per_unit).toFixed(1)} mcg/unit · {count} doses
                  </div>
                </div>
                <button onClick={() => deletePep(p.id)} className="text-zinc-600 hover:text-red-400 p-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
