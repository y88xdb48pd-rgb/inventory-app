import { useState } from "react";
import { Boxes, Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";

// Demo-Accounts (später durch echtes Backend ersetzen)
const DEMO_USERS = [
  { email: "admin@firma.de", password: "demo123", name: "Max Mustermann", role: "Admin" },
  { email: "lager@firma.de", password: "demo123", name: "Lisa Muster", role: "Lager" },
];

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise(r => setTimeout(r, 800)); // simulate network
    const user = DEMO_USERS.find(u => u.email === email && u.password === password);
    if (user) {
      onLogin(user);
    } else {
      setError("E-Mail oder Passwort falsch. Demo: admin@firma.de / demo123");
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) { setError("Bitte alle Felder ausfüllen."); return; }
    if (password.length < 6) { setError("Passwort muss mindestens 6 Zeichen haben."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    // In echter App: API-Call zum Registrieren
    onLogin({ email, name, role: "Nutzer" });
    setLoading(false);
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setForgotSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex flex-col items-center justify-center p-4"
      style={{ fontFamily: '"Inter", -apple-system, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); * { -webkit-font-smoothing: antialiased; }`}</style>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/20 mx-auto mb-4">
            <Boxes className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-2xl font-bold text-white">inventory</div>
          <div className="text-sm text-slate-400 mt-1">Equipment Cloud</div>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
          {/* Tabs */}
          {mode !== "forgot" && (
            <div className="flex bg-white/10 rounded-xl p-1 mb-6">
              <button onClick={() => { setMode("login"); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-white/70 hover:text-white"}`}>
                Anmelden
              </button>
              <button onClick={() => { setMode("register"); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-white/70 hover:text-white"}`}>
                Registrieren
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-200">{error}</div>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <AuthField label="E-Mail" type="email" value={email} onChange={setEmail} icon={Mail} placeholder="admin@firma.de" />
              <AuthField label="Passwort" type={showPw ? "text" : "password"} value={password} onChange={setPassword} icon={Lock} placeholder="••••••••"
                suffix={<button type="button" onClick={() => setShowPw(v => !v)} className="text-white/50 hover:text-white">{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>} />
              <button type="button" onClick={() => { setMode("forgot"); setError(""); }} className="text-xs text-emerald-400 hover:text-emerald-300 w-full text-right">
                Passwort vergessen?
              </button>
              <SubmitBtn loading={loading} label="Anmelden" />
              <DemoHint />
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <AuthField label="Name" type="text" value={name} onChange={setName} placeholder="Max Mustermann" />
              <AuthField label="E-Mail" type="email" value={email} onChange={setEmail} icon={Mail} placeholder="deine@email.de" />
              <AuthField label="Passwort" type={showPw ? "text" : "password"} value={password} onChange={setPassword} icon={Lock} placeholder="Mindestens 6 Zeichen"
                suffix={<button type="button" onClick={() => setShowPw(v => !v)} className="text-white/50 hover:text-white">{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>} />
              <SubmitBtn loading={loading} label="Konto erstellen" />
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {mode === "forgot" && (
            <div>
              <button onClick={() => { setMode("login"); setForgotSent(false); }} className="flex items-center gap-1 text-sm text-white/60 hover:text-white mb-4">
                ← Zurück
              </button>
              {forgotSent ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="font-semibold text-white mb-1">E-Mail gesendet!</div>
                  <div className="text-sm text-white/60">Prüfe dein Postfach für den Reset-Link.</div>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="text-sm text-white/70 mb-2">Gib deine E-Mail ein und wir senden dir einen Reset-Link.</div>
                  <AuthField label="E-Mail" type="email" value={email} onChange={setEmail} icon={Mail} placeholder="deine@email.de" />
                  <SubmitBtn loading={loading} label="Reset-Link senden" />
                </form>
              )}
            </div>
          )}
        </div>

        <div className="text-center mt-6 text-xs text-slate-500">
          © 2026 inventory Cloud · Alle Rechte vorbehalten
        </div>
      </div>
    </div>
  );
}

function AuthField({ label, type, value, onChange, icon: Icon, placeholder, suffix }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/70 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />}
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required
          className={`w-full bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm py-3 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all ${Icon ? "pl-10" : "pl-4"} ${suffix ? "pr-10" : "pr-4"}`} />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  );
}

function SubmitBtn({ loading, label }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-60 text-white font-semibold py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm">
      {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Lädt…</span> : label}
    </button>
  );
}

function DemoHint() {
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
      <div className="text-xs text-emerald-300 font-semibold mb-1">Demo-Zugang</div>
      <div className="text-xs text-white/60">admin@firma.de · demo123</div>
    </div>
  );
}
