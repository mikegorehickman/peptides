import { useState, ReactNode } from "react";
import { Syringe, ArrowRight, Mail } from "lucide-react";
import { supabase } from "../lib/supabase";

type Mode = "signin" | "signup";

type Props = {
  themeButton?: ReactNode;
};

export default function AuthScreen({ themeButton }: Props) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  const submit = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    setInfo(null);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoading(false);
      if (error) setError(error.message);
    } else {
      if (password.length < 6) {
        setLoading(false);
        setError("Password must be at least 6 characters.");
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else if (!data.session) {
        setInfo("Account created. Check your email for a confirmation link.");
      }
    }
  };

  const inputClass =
    "w-full bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-3 text-zinc-900 dark:text-white focus:border-lime-500 dark:focus:border-lime-400 focus:outline-none";

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center px-5 py-10 relative">
      {themeButton && <div className="absolute top-5 right-5">{themeButton}</div>}
      <div className="max-w-sm w-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-lime-400 flex items-center justify-center">
            <Syringe className="w-6 h-6 text-zinc-950" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-mono text-[10px] text-zinc-500 tracking-widest uppercase">Stack</div>
            <div className="font-bold text-xl leading-tight text-zinc-900 dark:text-zinc-100">Peptide Tracker</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 shadow-sm dark:shadow-none">
          <div className="flex gap-1 mb-5 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-lg border-2 border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => switchMode("signin")}
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
                mode === "signin"
                  ? "bg-lime-400 text-zinc-950"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => switchMode("signup")}
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${
                mode === "signup"
                  ? "bg-lime-400 text-zinc-950"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Create account
            </button>
          </div>

          <h2 className="font-bold text-lg mb-1 text-zinc-900 dark:text-zinc-100">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-5">
            {mode === "signin"
              ? "Sign in to track your peptides."
              : "Free. Just an email and a password."}
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium mb-1.5 block">Email</label>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                autoComplete="email"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium mb-1.5 block">Password</label>
              <input
                type="password"
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className={inputClass}
              />
            </div>

            <button
              onClick={submit}
              disabled={!email.trim() || !password || loading}
              className="w-full py-3 bg-lime-400 text-zinc-950 rounded-lg font-bold hover:bg-lime-300 disabled:opacity-40 flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                mode === "signin" ? "Signing in..." : "Creating account..."
              ) : (
                <>
                  {mode === "signin" ? "Sign in" : "Create account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {error && <div className="text-red-600 dark:text-red-400 text-xs pt-1">{error}</div>}
            {info && (
              <div className="bg-lime-100 dark:bg-lime-400/10 border-2 border-lime-400 dark:border-lime-400/30 rounded-lg p-3 mt-2 flex gap-2.5">
                <Mail className="w-4 h-4 text-lime-600 dark:text-lime-400 mt-0.5 flex-shrink-0" />
                <div className="text-zinc-800 dark:text-zinc-200 text-xs leading-relaxed">{info}</div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-zinc-600 dark:text-zinc-500 text-xs mt-5">
          {mode === "signin" ? (
            <>
              No account?{" "}
              <button onClick={() => switchMode("signup")} className="text-lime-600 dark:text-lime-400 font-semibold hover:underline">
                Create one — it's free
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => switchMode("signin")} className="text-lime-600 dark:text-lime-400 font-semibold hover:underline">
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
