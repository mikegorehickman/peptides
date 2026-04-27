import { useState } from "react";
import { Syringe, Mail, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim()) return;
    setSending(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-5">
      <div className="max-w-sm w-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-lime-400 flex items-center justify-center">
            <Syringe className="w-6 h-6 text-zinc-950" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-mono text-[10px] text-zinc-500 tracking-widest uppercase">Stack</div>
            <div className="font-bold text-xl leading-tight">Peptide Tracker</div>
          </div>
        </div>

        {sent ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="w-11 h-11 rounded-full bg-lime-400/10 flex items-center justify-center mb-3">
              <Mail className="w-5 h-5 text-lime-400" />
            </div>
            <h2 className="font-bold text-lg mb-1">Check your email</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              We sent a login link to <span className="text-zinc-200">{email}</span>. Click it to sign in.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="mt-4 text-xs text-zinc-500 hover:text-zinc-300"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="font-bold text-lg mb-1">Sign in</h2>
            <p className="text-zinc-400 text-sm mb-5">Enter your email for a magic login link.</p>

            <div className="space-y-3">
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                autoComplete="email"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-3 text-white focus:border-lime-400 focus:outline-none"
              />
              <button
                onClick={submit}
                disabled={!email.trim() || sending}
                className="w-full py-3 bg-lime-400 text-zinc-950 rounded-lg font-bold hover:bg-lime-300 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {sending ? "Sending..." : (<>Send magic link <ArrowRight className="w-4 h-4" /></>)}
              </button>
              {error && <div className="text-red-400 text-xs">{error}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
