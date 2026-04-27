import { useState, useEffect } from "react";
import { Syringe, Activity, Package, TrendingUp, LogOut, Sun, Moon } from "lucide-react";
import { supabase, Peptide, Dose } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import LogTab from "./components/LogTab";
import PeptidesTab from "./components/PeptidesTab";
import ReportTab from "./components/ReportTab";
import AuthScreen from "./components/AuthScreen";
import { useTheme } from "./lib/theme";

type Tab = "log" | "peptides" | "report";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("log");
  const [peptides, setPeptides] = useState<Peptide[]>([]);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  // Auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load data on login
  useEffect(() => {
    if (!session) {
      setPeptides([]);
      setDoses([]);
      return;
    }
    loadData();
  }, [session?.user?.id]);

  const loadData = async () => {
    setDataLoading(true);
    const [{ data: pData }, { data: dData }] = await Promise.all([
      supabase.from("pep_peptides").select("*").order("created_at", { ascending: true }),
      supabase.from("pep_doses").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    setPeptides(pData || []);
    setDoses(dData || []);
    setDataLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setTab("log");
  };

  const ThemeButton = () => (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 font-mono text-sm tracking-wider">LOADING...</div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen themeButton={<ThemeButton />} />;
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <div className="border-b-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-lime-400 flex items-center justify-center">
              <Syringe className="w-5 h-5 text-zinc-950" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-mono text-[10px] text-zinc-500 tracking-widest uppercase">Stack</div>
              <div className="font-bold text-base leading-tight">Peptide Tracker</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="font-mono text-[10px] text-zinc-500 hidden sm:block mr-1">
              {peptides.length} PEP · {doses.length} DOSES
            </div>
            <ThemeButton />
            <button
              onClick={signOut}
              className="p-2 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-5 flex gap-1">
          {([
            { id: "log", label: "Log", icon: Activity },
            { id: "peptides", label: "Peptides", icon: Package },
            { id: "report", label: "Report", icon: TrendingUp },
          ] as const).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
                  active
                    ? "border-lime-500 text-lime-600 dark:border-lime-400 dark:text-lime-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-5 py-6 pb-24">
        {dataLoading ? (
          <div className="text-center py-12 text-zinc-500 font-mono text-sm tracking-wider">LOADING DATA...</div>
        ) : (
          <>
            {tab === "log" && (
              <LogTab
                peptides={peptides}
                doses={doses}
                userId={session.user.id}
                onChange={loadData}
                goToPeptides={() => setTab("peptides")}
              />
            )}
            {tab === "peptides" && (
              <PeptidesTab
                peptides={peptides}
                doses={doses}
                userId={session.user.id}
                onChange={loadData}
              />
            )}
            {tab === "report" && <ReportTab peptides={peptides} doses={doses} />}
          </>
        )}
      </div>
    </div>
  );
}
