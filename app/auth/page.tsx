"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!email || !password) { setError("Fill in all fields"); return; }
    setLoading(true); setError("");

    try {
      let res, data;

      if (mode === "register") {
        res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        data = await res.json();
      } else {
        const form = new URLSearchParams();
        form.append("username", email);
        form.append("password", password);
        res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
        });
        data = await res.json();
      }

      if (!res.ok) { setError(data.detail || "Something went wrong"); return; }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user_id", String(data.user_id));
      router.push("/profile");

    } catch {
      setError("Cannot connect to server — is backend running on port 8000?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: "var(--accent-soft)" }} />

      <div className="w-full max-w-sm space-y-8 relative animate-fade-in-up">
        {/* Logo */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-xl shadow-indigo-500/30">
            U
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            Up<span style={{ color: "var(--accent)" }}>Hired</span>
          </h1>
          <p className="text-sm mt-1.5" style={{ color: "var(--text-muted)" }}>AI-powered job search platform</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6 space-y-5">
          {/* Toggle */}
          <div className="flex rounded-xl p-1" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
            {(["login", "register"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === m ? "btn-primary" : ""
                }`}
                style={mode !== m ? { color: "var(--text-muted)" } : {}}>
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium mb-2 uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}>Email</label>
              <input type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="you@example.com"
                className="input w-full h-11 px-4 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-2 uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}>Password</label>
              <input type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="••••••••"
                className="input w-full h-11 px-4 rounded-xl text-sm" />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl"
              style={{ background: "var(--red-soft)", border: "1px solid var(--red)", color: "var(--red)" }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading}
            className="btn-primary w-full h-12 rounded-xl text-sm flex items-center justify-center gap-2">
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {mode === "login" ? "Signing in..." : "Creating account..."}
              </>
            ) : (
              mode === "login" ? "Sign in →" : "Create account →"
            )}
          </button>
        </div>

        <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
          Your data stays on your machine. Never shared.
        </p>
      </div>
    </main>
  );
}
