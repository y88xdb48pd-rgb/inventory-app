import { useState, useEffect, useRef, useCallback } from "react";
import {
  Package, MapPin, Wrench, QrCode, Plus, Search, X, AlertCircle, Euro, Users,
  Edit3, Trash2, LayoutDashboard, Boxes, Bell, ChevronRight, TrendingUp,
  CheckCircle2, Clock, Archive, Settings, HelpCircle, Folder, FolderPlus,
  ChevronDown, Camera, ScanLine, Minus, Image as ImageIcon, ArrowLeft, Hash,
  Download, FileText, Calendar, AlertTriangle, GripVertical, Eye, EyeOff,
  BarChart2, RefreshCw, X as Close
} from "lucide-react";

// ─── tiny helpers ─────────────────────────────────────────────────────────────
const fmt = (n, dec = 0) =>
  Number(n || 0).toLocaleString("de-DE", { maximumFractionDigits: dec });
const today = () => new Date().toISOString().split("T")[0];
const daysUntil = (dateStr) =>
  Math.round((new Date(dateStr) - new Date()) / 86400000);

// ─── storage helpers ──────────────────────────────────────────────────────────
const get = async (k) => {
  try { const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
};
const set = async (k, v) => {
  try { await window.storage.set(k, JSON.stringify(v)); } catch {}
};

// ─── DEMO DATA ────────────────────────────────────────────────────────────────
const DEMO_FOLDERS = [
  { id: "fld_1", name: "Werkzeug & Maschinen", parentId: null, color: "amber" },
  { id: "fld_2", name: "IT & Büro", parentId: null, color: "blue" },
  { id: "fld_3", name: "Verbrauchsmaterial", parentId: null, color: "violet" },
];
const DEMO_ITEMS = [
  { id: "eq_001", name: "Bosch GBH Bohrhammer", category: "Werkzeug", folderId: "fld_1", location: "Lager A", serial: "BH-2024-001", value: 450, quantity: 3, unit: "Stk.", status: "verfügbar", nextMaintenance: "2026-08-15", expiryDate: "", purchaseDate: "2024-03-12", image: null, barcode: "" },
  { id: "eq_002", name: 'MacBook Pro 14"', category: "IT", folderId: "fld_2", location: "Büro München", serial: "MBP-M3-042", value: 2400, quantity: 5, unit: "Stk.", status: "verfügbar", nextMaintenance: "2027-03-01", expiryDate: "", purchaseDate: "2025-01-08", image: null, barcode: "" },
  { id: "eq_003", name: "Vape Pod Kit", category: "Verbrauchsmaterial", folderId: "fld_3", location: "Lager Hauptregal", serial: "VP-001", value: 12.5, quantity: 100, unit: "Stk.", status: "verfügbar", nextMaintenance: "", expiryDate: "2026-09-30", purchaseDate: "2025-10-01", image: null, barcode: "4260123456789" },
  { id: "eq_004", name: "Projektor Epson EB-L200", category: "AV", folderId: "fld_2", location: "Konferenzraum 3", serial: "EPS-88", value: 890, quantity: 2, unit: "Stk.", status: "verfügbar", nextMaintenance: "2026-12-01", expiryDate: "", purchaseDate: "2024-06-15", image: null, barcode: "" },
  { id: "eq_005", name: "Desinfektionsmittel 5L", category: "Verbrauchsmaterial", folderId: "fld_3", location: "Sanitärraum", serial: "", value: 18, quantity: 24, unit: "Fl.", status: "verfügbar", nextMaintenance: "", expiryDate: "2026-06-01", purchaseDate: "2025-11-01", image: null, barcode: "4005900" },
];

// ─── DEFAULT DASHBOARD WIDGETS ────────────────────────────────────────────────
const ALL_WIDGETS = [
  { id: "kpi_value",      label: "Gesamtwert",        group: "kpi",    defaultOn: true },
  { id: "kpi_articles",   label: "Artikel gesamt",    group: "kpi",    defaultOn: true },
  { id: "kpi_loans",      label: "Aktive Ausleihen",  group: "kpi",    defaultOn: true },
  { id: "kpi_maint",      label: "Wartung fällig",    group: "kpi",    defaultOn: true },
  { id: "kpi_expiry",     label: "Ablauf-Warnungen",  group: "kpi",    defaultOn: true },
  { id: "chart_category", label: "Wert-Chart",        group: "large",  defaultOn: true },
  { id: "card_quickact",  label: "Schnellaktionen",   group: "large",  defaultOn: true },
  { id: "list_recent",    label: "Zuletzt hinzugefügt", group: "large", defaultOn: true },
  { id: "list_maint",     label: "Wartungskalender",  group: "small",  defaultOn: true },
  { id: "list_expiry",    label: "Ablaufliste",        group: "small",  defaultOn: true },
  { id: "list_loans",     label: "Aktive Ausleihen (Widget)", group: "small", defaultOn: false },
];

// ─── EXPORT helpers ───────────────────────────────────────────────────────────
function exportCSV(items) {
  const header = ["ID", "Name", "Kategorie", "Standort", "Seriennr.", "Barcode", "Menge", "Einheit", "Einzelwert (€)", "Gesamtwert (€)", "Ablaufdatum", "Nächste Wartung", "Kaufdatum", "Status"];
  const rows = items.map(i => [
    i.id, i.name, i.category, i.location, i.serial, i.barcode,
    i.quantity || 1, i.unit || "Stk.",
    Number(i.value || 0).toFixed(2),
    (Number(i.value || 0) * (Number(i.quantity) || 1)).toFixed(2),
    i.expiryDate || "", i.nextMaintenance || "", i.purchaseDate || "", i.status
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `inventar_${today()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(items) {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `inventar_${today()}.json`; a.click();
  URL.revokeObjectURL(url);
}

function printInventory(items) {
  const html = `
    <html><head><style>
      body { font-family: sans-serif; font-size: 12px; }
      h1 { font-size: 18px; margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #f1f5f9; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; }
      td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
      .warn { color: #b45309; font-weight: bold; }
    </style></head><body>
    <h1>Inventarliste – ${new Date().toLocaleDateString("de-DE")}</h1>
    <table>
      <tr><th>Artikel</th><th>Kat.</th><th>Standort</th><th>Seriennr.</th><th>Menge</th><th>Einzelwert</th><th>Gesamtwert</th><th>Ablauf</th><th>Wartung</th></tr>
      ${items.map(i => {
        const exp = i.expiryDate ? daysUntil(i.expiryDate) : null;
        return `<tr>
          <td>${i.name}</td><td>${i.category}</td><td>${i.location}</td><td>${i.serial || "—"}</td>
          <td>${i.quantity || 1} ${i.unit || "Stk."}</td>
          <td>${fmt(i.value, 2)} €</td>
          <td>${fmt(Number(i.value || 0) * (Number(i.quantity) || 1), 2)} €</td>
          <td${exp !== null && exp < 60 ? ' class="warn"' : ""}>${i.expiryDate ? new Date(i.expiryDate).toLocaleDateString("de-DE") : "—"}</td>
          <td>${i.nextMaintenance ? new Date(i.nextMaintenance).toLocaleDateString("de-DE") : "—"}</td>
        </tr>`;
      }).join("")}
      <tr><td colspan="6" style="font-weight:bold;padding-top:12px">Gesamtwert</td>
        <td colspan="3" style="font-weight:bold">${fmt(items.reduce((s, i) => s + Number(i.value || 0) * (Number(i.quantity) || 1), 0), 2)} €</td></tr>
    </table>
    </body></html>`;
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.print();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [view, setView] = useState("dashboard");
  const [items, setItems] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loans, setLoans] = useState([]);
  const [widgets, setWidgets] = useState(null); // null = loading
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(null);
  const [showQR, setShowQR] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDashEditor, setShowDashEditor] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null);

  useEffect(() => {
    (async () => {
      const [fi, fo, lo, wi] = await Promise.all([
        get("eq:items"), get("eq:folders"), get("eq:loans"), get("eq:widgets")
      ]);
      setItems(fi || DEMO_ITEMS);
      setFolders(fo || DEMO_FOLDERS);
      setLoans(lo || []);
      if (!fi) await set("eq:items", DEMO_ITEMS);
      if (!fo) await set("eq:folders", DEMO_FOLDERS);
      // Widgets: map of id → visible
      if (wi) setWidgets(wi);
      else {
        const def = Object.fromEntries(ALL_WIDGETS.map(w => [w.id, w.defaultOn]));
        setWidgets(def);
        await set("eq:widgets", def);
      }
      setLoading(false);
    })();
  }, []);

  const saveItems   = async (v) => { setItems(v);   await set("eq:items",   v); };
  const saveFolders = async (v) => { setFolders(v); await set("eq:folders", v); };
  const saveLoans   = async (v) => { setLoans(v);   await set("eq:loans",   v); };
  const saveWidgets = async (v) => { setWidgets(v); await set("eq:widgets", v); };

  // ── derived stats ──────────────────────────────────────────────────────────
  const totalValue   = items.reduce((s, i) => s + Number(i.value || 0) * (Number(i.quantity) || 1), 0);
  const totalUnits   = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
  const activeLoans  = loans.filter(l => !l.returnedAt).length;
  const maintDue     = items.filter(i => i.nextMaintenance && daysUntil(i.nextMaintenance) < 60);
  const expiryWarn   = items.filter(i => i.expiryDate && daysUntil(i.expiryDate) < 60);
  const notifications = [
    ...maintDue.map(i => ({ type: "maint", item: i, days: daysUntil(i.nextMaintenance) })),
    ...expiryWarn.map(i => ({ type: "expiry", item: i, days: daysUntil(i.expiryDate) })),
  ].sort((a, b) => a.days - b.days);

  const folderItems   = (fid) => items.filter(i => i.folderId === fid);
  const currentItems  = items.filter(i =>
    (currentFolder === null ? true : i.folderId === currentFolder) &&
    (!search || [i.name, i.serial, i.barcode, i.location].some(f => f?.toLowerCase().includes(search.toLowerCase())))
  );
  const currentFolderObj = currentFolder ? folders.find(f => f.id === currentFolder) : null;
  const foldersHere      = folders.filter(f => f.parentId === currentFolder);

  // ── handlers ───────────────────────────────────────────────────────────────
  const addItem    = async (d) => { const ni = { ...d, id: `eq_${Date.now()}`, status: "verfügbar", folderId: d.folderId ?? currentFolder }; await saveItems([...items, ni]); setShowAddItem(false); };
  const editItemFn = async (d) => { await saveItems(items.map(i => i.id === d.id ? d : i)); setEditItem(null); };
  const delItem    = async (id) => { if (!confirm("Artikel löschen?")) return; await saveItems(items.filter(i => i.id !== id)); };
  const adjQty     = async (id, delta) => saveItems(items.map(i => i.id === id ? { ...i, quantity: Math.max(0, (Number(i.quantity) || 0) + delta) } : i));
  const addFolder  = async (name, color) => { const nf = { id: `fld_${Date.now()}`, name, parentId: currentFolder, color }; await saveFolders([...folders, nf]); setShowAddFolder(false); };
  const delFolder  = async (id) => { if (!confirm("Ordner löschen?")) return; await saveFolders(folders.filter(f => f.id !== id)); await saveItems(items.map(i => i.folderId === id ? { ...i, folderId: null } : i)); };
  const addLoan    = async (itemId, borrower, ret, qty) => { const ln = { id: `ln_${Date.now()}`, itemId, borrower, expectedReturn: ret, quantity: qty || 1, loanedAt: new Date().toISOString(), returnedAt: null }; await saveLoans([...loans, ln]); setShowLoanModal(null); };
  const retLoan    = async (loanId) => saveLoans(loans.map(l => l.id === loanId ? { ...l, returnedAt: new Date().toISOString() } : l));
  const onScan     = async (barcode) => {
    const ex = items.find(i => i.barcode === barcode);
    if (ex) { await saveItems(items.map(i => i.id === ex.id ? { ...i, quantity: (Number(i.quantity) || 0) + 1 } : i)); setShowScanner(false); alert(`✓ "${ex.name}" — Bestand: ${(Number(ex.quantity) || 0) + 1}`); }
    else { setShowScanner(false); setShowAddItem({ barcode }); }
  };

  const w = (id) => widgets?.[id] !== false; // widget visible?

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">Lade…</div>;

  // ── NAV ────────────────────────────────────────────────────────────────────
  const NAV = [
    { id: "dashboard", label: "Übersicht",  icon: LayoutDashboard },
    { id: "inventory", label: "Inventar",   icon: Package },
    { id: "loans",     label: "Ausleihen",  icon: Users },
    { id: "maintenance", label: "Wartung",  icon: Wrench },
    { id: "archive",   label: "Archiv",     icon: Archive },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex" style={{ fontFamily: '"Inter", -apple-system, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { -webkit-font-smoothing: antialiased; }
        .cs::-webkit-scrollbar{width:4px}.cs::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:2px}
        @keyframes scan{0%,100%{top:4px}50%{top:calc(100% - 4px)}}
      `}</style>

      {/* SIDEBAR */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen z-40">
        <div className="px-5 py-5 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm flex-shrink-0">
            <Boxes className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-bold text-[15px] text-slate-900 leading-none">inventory</div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium tracking-wider">EQUIPMENT CLOUD</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto cs">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">Hauptmenü</div>
          {NAV.map(t => {
            const Icon = t.icon; const active = view === t.id;
            return (
              <button key={t.id} onClick={() => { setView(t.id); setCurrentFolder(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={active ? 2.5 : 2} />
                <span>{t.label}</span>
                {t.id === "maintenance" && maintDue.length > 0 && <span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{maintDue.length}</span>}
                {t.id === "loans" && activeLoans > 0 && <span className="ml-auto text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{activeLoans}</span>}
              </button>
            );
          })}
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2 mt-6">Tools</div>
          <button onClick={() => setShowExport(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Download className="w-[18px] h-[18px]" strokeWidth={2} /><span>Export</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Settings className="w-[18px] h-[18px]" strokeWidth={2} /><span>Einstellungen</span>
          </button>
        </nav>
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-semibold text-xs">MM</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">Max Mustermann</div>
              <div className="text-[11px] text-slate-500 truncate">Pro Tarif</div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOPBAR */}
        <header className="bg-white border-b border-slate-200 px-8 py-3.5 flex items-center gap-3 sticky top-0 z-30">
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suche nach Name, Seriennr., Barcode…"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none transition-all" />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setShowScanner(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all">
              <ScanLine className="w-4 h-4" /> Scannen
            </button>
            {/* Notification bell */}
            <div className="relative">
              <button onClick={() => setShowNotifications(v => !v)} className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <Bell className="w-5 h-5 text-slate-600" />
                {notifications.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[7px] text-white font-bold">{notifications.length > 9 ? "9+" : notifications.length}</span>}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="font-semibold text-slate-900 text-sm">Benachrichtigungen</div>
                    <button onClick={() => setShowNotifications(false)}><X className="w-4 h-4 text-slate-400" /></button>
                  </div>
                  <div className="max-h-72 overflow-y-auto cs">
                    {notifications.length === 0 && <div className="px-4 py-8 text-center text-slate-400 text-sm">Keine Warnungen</div>}
                    {notifications.map((n, i) => (
                      <div key={i} className={`px-4 py-3 border-b border-slate-100 flex items-start gap-3 ${n.days < 0 ? "bg-red-50" : n.days < 30 ? "bg-amber-50/60" : ""}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${n.type === "expiry" ? "bg-orange-100" : "bg-amber-100"}`}>
                          {n.type === "expiry" ? <AlertTriangle className="w-4 h-4 text-orange-600" /> : <Wrench className="w-4 h-4 text-amber-600" />}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{n.item.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {n.type === "expiry" ? "Ablaufdatum" : "Wartung fällig"}: {" "}
                            <span className={`font-semibold ${n.days < 0 ? "text-red-600" : n.days < 30 ? "text-amber-600" : "text-slate-700"}`}>
                              {n.days < 0 ? `${Math.abs(n.days)}d überfällig` : `in ${n.days} Tagen`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {view === "dashboard" && (
              <button onClick={() => setShowDashEditor(true)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600" title="Dashboard anpassen">
                <LayoutDashboard className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => setShowAddItem(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm shadow-emerald-200 transition-all">
              <Plus className="w-4 h-4" strokeWidth={2.5} /> Neuer Artikel
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 p-8 overflow-auto cs">

          {/* ── DASHBOARD ── */}
          {view === "dashboard" && (
            <div className="max-w-7xl">
              <div className="mb-8 flex items-end justify-between">
                <div>
                  <div className="text-sm text-slate-500 mb-1">Guten Tag, Max 👋</div>
                  <h1 className="text-2xl font-bold text-slate-900">Deine Übersicht</h1>
                </div>
                <button onClick={() => setShowDashEditor(true)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg transition-all">
                  <Edit3 className="w-3.5 h-3.5" /> Dashboard anpassen
                </button>
              </div>

              {/* KPI row */}
              <div className="grid grid-cols-5 gap-4 mb-8">
                {w("kpi_value")   && <KPI label="Gesamtwert"       value={`${fmt(totalValue)} €`}    sub="inkl. Mengen"              icon={Euro}          accent="emerald" trend="+12,5%" />}
                {w("kpi_articles")&& <KPI label="Artikel gesamt"   value={fmt(totalUnits)}            sub={`${items.length} Positionen`} icon={Package}    accent="blue" />}
                {w("kpi_loans")   && <KPI label="Ausleihen"        value={activeLoans}                sub="aktiv"                     icon={Users}         accent="violet" />}
                {w("kpi_maint")   && <KPI label="Wartung fällig"   value={maintDue.length}            sub="in 60 Tagen"               icon={Wrench}        accent={maintDue.length > 0 ? "amber" : "slate"} />}
                {w("kpi_expiry")  && <KPI label="Ablauf-Warnungen" value={expiryWarn.length}          sub="in 60 Tagen"               icon={AlertTriangle} accent={expiryWarn.length > 0 ? "red" : "slate"} />}
              </div>

              {/* Large widgets */}
              <div className="grid grid-cols-3 gap-6 mb-6">
                {w("chart_category") && (
                  <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="font-semibold text-slate-900 mb-1">Warenwert nach Kategorie</div>
                    <div className="text-xs text-slate-500 mb-5">Gesamtwert inkl. Mengen</div>
                    <CategoryChart items={items} />
                  </div>
                )}
                {w("card_quickact") && (
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <ScanLine className="w-6 h-6 mb-3 relative" />
                    <div className="font-semibold text-lg mb-1 relative">Schnell erfassen</div>
                    <p className="text-sm text-emerald-50 mb-5 relative">Scanne Barcodes für blitzschnelle Einträge.</p>
                    <div className="space-y-2 relative">
                      <button onClick={() => setShowScanner(true)} className="w-full bg-white/15 hover:bg-white/25 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2"><Camera className="w-4 h-4" /> Barcode scannen</button>
                      <button onClick={() => setShowAddItem(true)} className="w-full bg-white/15 hover:bg-white/25 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Manuell anlegen</button>
                      <button onClick={() => setShowExport(true)} className="w-full bg-white/15 hover:bg-white/25 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Inventar exportieren</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom widgets */}
              <div className="grid grid-cols-3 gap-6">
                {w("list_recent") && (
                  <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div className="font-semibold text-slate-900">Zuletzt hinzugefügt</div>
                      <button onClick={() => setView("inventory")} className="text-xs font-medium text-emerald-600 flex items-center gap-1">Alle <ChevronRight className="w-3 h-3" /></button>
                    </div>
                    {items.slice(-4).reverse().map(i => (
                      <div key={i.id} className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
                        <Thumb item={i} s={10} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-slate-900 truncate">{i.name}</div>
                          <div className="text-xs text-slate-500">{i.location}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm">{i.quantity || 1} {i.unit || "Stk."}</div>
                          <div className="text-[11px] text-slate-500">{fmt(i.value, 2)} € / Stk.</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-4">
                  {w("list_maint") && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <div className="font-semibold text-slate-900 mb-4">Wartungskalender</div>
                      {maintDue.slice(0, 4).map(i => {
                        const d = daysUntil(i.nextMaintenance);
                        return (
                          <div key={i.id} className="flex items-start gap-3 mb-3 last:mb-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${d < 30 ? "bg-red-50" : "bg-amber-50"}`}>
                              <Clock className={`w-4 h-4 ${d < 30 ? "text-red-500" : "text-amber-500"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-900 truncate">{i.name}</div>
                              <div className="text-xs text-slate-500">{d < 0 ? `${Math.abs(d)}d überfällig` : `in ${d} Tagen`}</div>
                            </div>
                          </div>
                        );
                      })}
                      {maintDue.length === 0 && <div className="text-xs text-slate-400 text-center py-4">Keine fälligen Wartungen</div>}
                    </div>
                  )}
                  {w("list_expiry") && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <div className="font-semibold text-slate-900 mb-4">Ablaufdaten</div>
                      {expiryWarn.slice(0, 4).map(i => {
                        const d = daysUntil(i.expiryDate);
                        return (
                          <div key={i.id} className="flex items-start gap-3 mb-3 last:mb-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${d < 0 ? "bg-red-50" : d < 30 ? "bg-orange-50" : "bg-amber-50"}`}>
                              <AlertTriangle className={`w-4 h-4 ${d < 0 ? "text-red-500" : d < 30 ? "text-orange-500" : "text-amber-500"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-900 truncate">{i.name}</div>
                              <div className="text-xs text-slate-500">{d < 0 ? `Abgelaufen (${Math.abs(d)}d)` : `Ablauf in ${d} Tagen`}</div>
                            </div>
                          </div>
                        );
                      })}
                      {expiryWarn.length === 0 && <div className="text-xs text-slate-400 text-center py-4">Keine bevorstehenden Abläufe</div>}
                    </div>
                  )}
                  {w("list_loans") && activeLoans > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <div className="font-semibold text-slate-900 mb-4">Aktive Ausleihen</div>
                      {loans.filter(l => !l.returnedAt).slice(0, 4).map(l => {
                        const item = items.find(i => i.id === l.itemId);
                        return (
                          <div key={l.id} className="flex items-start gap-3 mb-3 last:mb-0">
                            <Thumb item={item || {}} s={8} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-900 truncate">{item?.name}</div>
                              <div className="text-xs text-slate-500">{l.quantity} Stk. an {l.borrower}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── INVENTORY ── */}
          {view === "inventory" && (
            <div className="max-w-7xl">
              {/* breadcrumb */}
              <div className="flex items-center gap-2 mb-3 text-sm">
                <button onClick={() => setCurrentFolder(null)} className={currentFolder ? "text-slate-500 hover:text-slate-900" : "font-semibold text-slate-900"}>Inventar</button>
                {currentFolderObj && <><ChevronRight className="w-3.5 h-3.5 text-slate-400" /><span className="font-semibold text-slate-900">{currentFolderObj.name}</span></>}
              </div>
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{currentFolderObj?.name || "Inventar"}</h1>
                  <p className="text-sm text-slate-500 mt-1">{currentItems.length} Positionen · {currentItems.reduce((s, i) => s + (Number(i.quantity) || 1), 0)} Stk. · {fmt(currentItems.reduce((s, i) => s + Number(i.value || 0) * (Number(i.quantity) || 1), 0))} €</p>
                </div>
                <div className="flex gap-2">
                  {currentFolder && <button onClick={() => setCurrentFolder(null)} className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium"><ArrowLeft className="w-4 h-4" /> Zurück</button>}
                  <button onClick={() => setShowAddFolder(true)} className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium"><FolderPlus className="w-4 h-4" /> Ordner</button>
                  <button onClick={() => setShowExport(true)} className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium"><Download className="w-4 h-4" /> Export</button>
                </div>
              </div>

              {/* Folders */}
              {foldersHere.length > 0 && (
                <div className="mb-6">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Ordner</div>
                  <div className="grid grid-cols-4 gap-3">
                    {foldersHere.map(f => {
                      const clrs = { amber: "from-amber-400 to-orange-500", blue: "from-blue-400 to-cyan-500", violet: "from-violet-400 to-purple-500", emerald: "from-emerald-400 to-teal-500", rose: "from-rose-400 to-pink-500" };
                      const cnt = folderItems(f.id).length;
                      return (
                        <div key={f.id} onClick={() => setCurrentFolder(f.id)} className="group bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-all relative">
                          <button onClick={e => { e.stopPropagation(); delFolder(f.id); }} className="absolute top-2 right-2 p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${clrs[f.color] || clrs.emerald} flex items-center justify-center mb-3 shadow-sm`}>
                            <Folder className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                          <div className="font-semibold text-sm text-slate-900 truncate">{f.name}</div>
                          <div className="text-xs text-slate-500">{cnt} Artikel</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Items table */}
              {currentItems.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Artikel</div>
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <div className="col-span-4">Artikel</div>
                      <div className="col-span-2">Standort</div>
                      <div className="col-span-2 text-center">Menge</div>
                      <div className="col-span-1 text-right">Einzelwert</div>
                      <div className="col-span-1 text-right">Gesamt</div>
                      <div className="col-span-2 text-right">Aktion</div>
                    </div>
                    {currentItems.map((i, idx) => {
                      const expDays = i.expiryDate ? daysUntil(i.expiryDate) : null;
                      const expWarn = expDays !== null && expDays < 60;
                      return (
                        <div key={i.id} className={`grid grid-cols-12 gap-3 px-5 py-4 hover:bg-slate-50 items-center text-sm transition-colors ${idx !== currentItems.length - 1 ? "border-b border-slate-100" : ""}`}>
                          <div className="col-span-4 flex items-center gap-3 min-w-0">
                            <Thumb item={i} s={11} />
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate">{i.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="bg-slate-100 text-slate-700 text-[10px] font-medium px-1.5 py-0.5 rounded">{i.category}</span>
                                {i.barcode && <span className="font-mono text-[10px] text-slate-400">{i.barcode}</span>}
                                {expWarn && (
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${expDays < 0 ? "bg-red-100 text-red-700" : expDays < 30 ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}`}>
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    {expDays < 0 ? "Abgelaufen" : `Ablauf ${expDays}d`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="col-span-2 text-slate-600 text-sm flex items-center gap-1 min-w-0">
                            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" /><span className="truncate">{i.location}</span>
                          </div>
                          <div className="col-span-2 flex items-center justify-center gap-1">
                            <button onClick={() => adjQty(i.id, -1)} className="w-6 h-6 rounded border border-slate-200 hover:bg-slate-100 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                            <div className="w-14 text-center font-semibold text-slate-900 text-sm">{i.quantity || 1}<span className="text-[10px] font-normal text-slate-400 ml-0.5">{i.unit || "Stk."}</span></div>
                            <button onClick={() => adjQty(i.id, 1)} className="w-6 h-6 rounded border border-slate-200 hover:bg-slate-100 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                          </div>
                          <div className="col-span-1 font-medium text-slate-700 text-right text-xs">{fmt(i.value, 2)} €</div>
                          <div className="col-span-1 font-bold text-slate-900 text-right">{fmt(Number(i.value || 0) * (Number(i.quantity) || 1), 0)} €</div>
                          <div className="col-span-2 flex items-center justify-end gap-0.5">
                            <IBtn onClick={() => setShowQR(i)} title="QR-Code" icon={QrCode} />
                            <IBtn onClick={() => setShowLoanModal(i)} title="Ausleihen" icon={Users} />
                            <IBtn onClick={() => setEditItem(i)} title="Bearbeiten" icon={Edit3} />
                            <IBtn onClick={() => delItem(i.id)} title="Löschen" icon={Trash2} danger />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {foldersHere.length === 0 && currentItems.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center">
                  <Package className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <div className="font-medium text-slate-900">Leer</div>
                  <div className="text-sm text-slate-500 mt-1">Lege Artikel oder Unterordner an.</div>
                </div>
              )}
            </div>
          )}

          {/* ── LOANS ── */}
          {view === "loans" && (
            <div className="max-w-7xl">
              <div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">Ausleihen</h1><p className="text-sm text-slate-500 mt-1">{activeLoans} aktiv · {loans.length - activeLoans} abgeschlossen</p></div>
              {loans.length === 0 ? <EmptyState icon={Users} msg="Noch keine Ausleihen erfasst" sub="Über das Inventar Artikel ausleihen." /> : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  {loans.slice().reverse().map((l, idx) => {
                    const item = items.find(i => i.id === l.itemId);
                    return (
                      <div key={l.id} className={`grid grid-cols-6 gap-4 px-6 py-4 items-center ${idx !== loans.length - 1 ? "border-b border-slate-100" : ""}`}>
                        <div className="col-span-2 flex items-center gap-3">{item && <Thumb item={item} s={10} />}<div><div className="font-medium text-sm">{item?.name || "Unbekannt"}</div><div className="text-xs text-slate-500 font-mono">{item?.serial}</div></div></div>
                        <div><Label>Menge</Label><div className="text-sm font-semibold">{l.quantity} {item?.unit || "Stk."}</div></div>
                        <div><Label>Von</Label><div className="text-sm">{l.borrower}</div></div>
                        <div><Label>Zeitraum</Label><div className="text-sm">{new Date(l.loanedAt).toLocaleDateString("de-DE")} → {l.expectedReturn ? new Date(l.expectedReturn).toLocaleDateString("de-DE") : "—"}</div></div>
                        <div className="text-right">{l.returnedAt
                          ? <span className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-md"><CheckCircle2 className="w-3 h-3" /> Zurück</span>
                          : <button onClick={() => retLoan(l.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Rückgabe</button>}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── MAINTENANCE ── */}
          {view === "maintenance" && (
            <div className="max-w-7xl">
              <div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">Wartung & Prüfung</h1><p className="text-sm text-slate-500 mt-1">Sortiert nach Fälligkeit</p></div>
              {items.filter(i => i.nextMaintenance || i.expiryDate).length === 0
                ? <EmptyState icon={Wrench} msg="Keine Termine hinterlegt" sub="Beim Anlegen von Artikeln Wartungs- und Ablaufdaten angeben." />
                : (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    {items.filter(i => i.nextMaintenance || i.expiryDate).map((i, idx, arr) => {
                      const md = i.nextMaintenance ? daysUntil(i.nextMaintenance) : null;
                      const ed = i.expiryDate ? daysUntil(i.expiryDate) : null;
                      return (
                        <div key={i.id} className={`grid grid-cols-7 gap-4 px-6 py-4 items-center ${idx !== arr.length - 1 ? "border-b border-slate-100" : ""}`}>
                          <div className="col-span-2 flex items-center gap-3"><Thumb item={i} s={10} /><div><div className="font-medium text-sm">{i.name}</div><div className="text-xs text-slate-500 font-mono">{i.serial}</div></div></div>
                          <div className="text-sm text-slate-600 flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{i.location}</div>
                          <div>
                            {md !== null && <DayBadge label="Wartung" days={md} />}
                          </div>
                          <div>
                            {ed !== null && <DayBadge label="Ablauf" days={ed} />}
                          </div>
                          <div className="col-span-2 flex items-center justify-end gap-2">
                            {i.nextMaintenance && <button onClick={() => { const n = new Date(); n.setFullYear(n.getFullYear()+1); saveItems(items.map(it => it.id === i.id ? { ...it, nextMaintenance: n.toISOString().split("T")[0] } : it)); }} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-md hover:bg-emerald-50">Wartung erledigt</button>}
                            <IBtn onClick={() => setEditItem(i)} title="Bearbeiten" icon={Edit3} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          )}

          {view === "archive" && <div className="max-w-7xl"><div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">Archiv</h1></div><EmptyState icon={Archive} msg="Archiv ist leer" sub="Ausgemusterte Artikel landen hier." /></div>}
        </main>
      </div>

      {/* ── MODALS ── */}
      {(showAddItem || editItem) && (
        <ItemModal
          item={editItem}
          initial={typeof showAddItem === "object" ? showAddItem : null}
          folders={folders}
          currentFolder={currentFolder}
          onClose={() => { setShowAddItem(false); setEditItem(null); }}
          onSave={editItem ? editItemFn : addItem}
        />
      )}
      {showLoanModal  && <LoanModal  item={showLoanModal} onClose={() => setShowLoanModal(null)} onLoan={addLoan} />}
      {showQR         && <QRModal    item={showQR}         onClose={() => setShowQR(null)} />}
      {showScanner    && <ScanModal  onClose={() => setShowScanner(false)} onResult={onScan} />}
      {showAddFolder  && <FolderModal onClose={() => setShowAddFolder(false)} onSave={addFolder} />}
      {showExport     && <ExportModal items={items} onClose={() => setShowExport(false)} />}
      {showDashEditor && <DashEditor widgets={widgets} onSave={async (v) => { await saveWidgets(v); setShowDashEditor(false); }} onClose={() => setShowDashEditor(false)} />}
    </div>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
function Thumb({ item, s }) {
  const cls = `w-${s} h-${s} rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden`;
  if (item?.image) return <img src={item.image} alt="" className={cls + " object-cover"} />;
  return <div className={cls}><Package className="w-4 h-4 text-slate-400" /></div>;
}
function KPI({ label, value, sub, icon: Icon, accent, trend }) {
  const a = { emerald: ["bg-emerald-50","text-emerald-600"], blue: ["bg-blue-50","text-blue-600"], violet: ["bg-violet-50","text-violet-600"], amber: ["bg-amber-50","text-amber-600"], red: ["bg-red-50","text-red-600"], slate: ["bg-slate-100","text-slate-500"] }[accent] || ["bg-slate-100","text-slate-500"];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3"><div className={`w-10 h-10 rounded-xl ${a[0]} flex items-center justify-center`}><Icon className={`w-5 h-5 ${a[1]}`} strokeWidth={2.2} /></div>{trend && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{trend}</span>}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm font-medium text-slate-700 mt-0.5">{label}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  );
}
function Label({ children }) { return <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{children}</div>; }
function IBtn({ onClick, title, icon: Icon, danger }) {
  return <button onClick={onClick} title={title} className={`p-2 rounded-lg transition-colors ${danger ? "hover:bg-red-50 text-slate-400 hover:text-red-600" : "hover:bg-slate-100 text-slate-400 hover:text-slate-900"}`}><Icon className="w-4 h-4" /></button>;
}
function EmptyState({ icon: Icon, msg, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4"><Icon className="w-7 h-7 text-slate-400" /></div>
      <div className="font-medium text-slate-900">{msg}</div>
      <div className="text-sm text-slate-500 mt-1">{sub}</div>
    </div>
  );
}
function DayBadge({ label, days }) {
  const cls = days < 0 ? "bg-red-50 text-red-700" : days < 30 ? "bg-orange-50 text-orange-700" : days < 60 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700";
  return <span className={`inline-block text-[10px] font-semibold px-2 py-1 rounded-md ${cls}`}>{label}: {days < 0 ? `${Math.abs(days)}d überfällig` : `in ${days}d`}</span>;
}
function CategoryChart({ items }) {
  const bycat = items.reduce((a, i) => { const c = i.category || "Sonstiges"; a[c] = (a[c] || 0) + Number(i.value || 0) * (Number(i.quantity) || 1); return a; }, {});
  const entries = Object.entries(bycat).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const COLORS = ["bg-emerald-500","bg-blue-500","bg-violet-500","bg-amber-500","bg-rose-500","bg-teal-500"];
  if (!entries.length) return <div className="text-sm text-slate-400 text-center py-8">Keine Daten</div>;
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 mb-5">
        {entries.map(([c, v], i) => <div key={c} className={COLORS[i % 6]} style={{ width: `${(v / total) * 100}%` }} title={`${c}: ${fmt(v)} €`} />)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {entries.map(([c, v], i) => (
          <div key={c} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50">
            <div className="flex items-center gap-2"><div className={`w-2.5 h-2.5 rounded-full ${COLORS[i % 6]}`} /><span className="text-sm font-medium text-slate-700">{c}</span></div>
            <div className="text-right"><div className="text-sm font-semibold">{fmt(v)} €</div><div className="text-[11px] text-slate-500">{Math.round((v / total) * 100)}%</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ITEM FORM MODAL ──────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = "text", placeholder, mono }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <input type={type} value={value === null || value === undefined ? "" : value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className={`w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none ${mono ? "font-mono" : ""}`} />
    </div>
  );
}
function ItemModal({ item, initial, folders, currentFolder, onClose, onSave }) {
  const [f, setF] = useState(item || {
    name: "", category: "Werkzeug", folderId: currentFolder || null,
    location: "", serial: "", value: 0, quantity: 1, unit: "Stk.",
    barcode: initial?.barcode || "", nextMaintenance: "", expiryDate: "",
    purchaseDate: today(), image: null
  });
  const fileRef = useRef(null);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));

  const handleImg = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const compress = (blob) => { const img = new Image(); img.onload = () => { const c = document.createElement("canvas"); const r = Math.min(400 / img.width, 400 / img.height, 1); c.width = img.width * r; c.height = img.height * r; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); upd("image", c.toDataURL("image/jpeg", 0.75)); }; img.src = URL.createObjectURL(blob); };
    compress(file);
  };

  const submit = () => {
    if (!f.name) return alert("Bezeichnung ist erforderlich");
    onSave({ ...f, value: Number(f.value), quantity: Number(f.quantity) || 1 });
  };

  const totalPos = (Number(f.value) || 0) * (Number(f.quantity) || 1);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div><div className="font-semibold text-slate-900">{item ? "Artikel bearbeiten" : "Neuer Artikel"}</div><div className="text-xs text-slate-500">Menge, Bild, Ablaufdatum und Barcode optional</div></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="p-6 overflow-y-auto cs">
          <div className="grid grid-cols-3 gap-6">
            {/* IMAGE */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bild (optional)</label>
              <div onClick={() => fileRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 flex items-center justify-center cursor-pointer overflow-hidden relative transition-colors">
                {f.image
                  ? <><img src={f.image} alt="" className="w-full h-full object-cover" /><button onClick={e => { e.stopPropagation(); upd("image", null); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center"><X className="w-4 h-4" /></button></>
                  : <div className="text-center text-slate-400"><ImageIcon className="w-8 h-8 mx-auto mb-2" /><div className="text-xs font-medium">Bild hinzufügen</div><div className="text-[10px]">Klicken oder Kamera</div></div>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleImg} className="hidden" />
              {/* Gesamtwert preview */}
              <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Positionswert</div>
                <div className="text-xl font-bold text-emerald-700 mt-1">{fmt(totalPos, 2)} €</div>
                <div className="text-[10px] text-emerald-600">{f.quantity || 1} × {fmt(f.value, 2)} €</div>
              </div>
            </div>
            {/* FIELDS */}
            <div className="col-span-2 space-y-4">
              <Field label="Bezeichnung *" value={f.name} onChange={v => upd("name", v)} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kategorie</label>
                  <select value={f.category} onChange={e => upd("category", e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none">
                    {["Werkzeug","IT","AV","Logistik","Möbel","Fahrzeug","Verbrauchsmaterial","Sonstiges"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ordner</label>
                  <select value={f.folderId || ""} onChange={e => upd("folderId", e.target.value || null)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none">
                    <option value="">— Hauptbereich —</option>
                    {folders.map(fo => <option key={fo.id} value={fo.id}>{fo.name}</option>)}
                  </select>
                </div>
              </div>
              <Field label="Barcode / Produktcode" value={f.barcode} onChange={v => upd("barcode", v)} placeholder="z.B. 4260123456789" mono />
              <div className="grid grid-cols-3 gap-3">
                <Field label="Menge" type="number" value={f.quantity} onChange={v => upd("quantity", v)} />
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Einheit</label>
                  <select value={f.unit || "Stk."} onChange={e => upd("unit", e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none">
                    {["Stk.","kg","l","m","Paar","Paket","Palette","Karton","Fl."].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <Field label="Einzelwert (€)" type="number" value={f.value} onChange={v => upd("value", v)} />
              </div>
              <Field label="Seriennummer" value={f.serial} onChange={v => upd("serial", v)} mono />
              <Field label="Standort" value={f.location} onChange={v => upd("location", v)} />
              <div className="grid grid-cols-3 gap-3">
                <Field label="Kaufdatum" type="date" value={f.purchaseDate} onChange={v => upd("purchaseDate", v)} />
                <Field label="Ablaufdatum ⚠️" type="date" value={f.expiryDate} onChange={v => upd("expiryDate", v)} />
                <Field label="Nächste Wartung 🔧" type="date" value={f.nextMaintenance} onChange={v => upd("nextMaintenance", v)} />
              </div>
              {f.expiryDate && (
                <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${daysUntil(f.expiryDate) < 0 ? "bg-red-50 text-red-700" : daysUntil(f.expiryDate) < 60 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {daysUntil(f.expiryDate) < 0 ? `Abgelaufen seit ${Math.abs(daysUntil(f.expiryDate))} Tagen!` : daysUntil(f.expiryDate) < 60 ? `Läuft in ${daysUntil(f.expiryDate)} Tagen ab — Warnung aktiv` : `Gültig noch ${daysUntil(f.expiryDate)} Tage`}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">Abbrechen</button>
          <button onClick={submit} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm shadow-emerald-200">Speichern</button>
        </div>
      </div>
    </div>
  );
}

// ─── LOAN MODAL ───────────────────────────────────────────────────────────────
function LoanModal({ item, onClose, onLoan }) {
  const [borrower, setBorrower] = useState(""); const [ret, setRet] = useState(""); const [qty, setQty] = useState(1);
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between"><div className="font-semibold text-slate-900">Artikel ausleihen</div><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button></div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3"><Thumb item={item} s={12} /><div><div className="font-medium text-sm">{item.name}</div><div className="text-xs text-slate-500 font-mono">{item.serial}</div><div className="text-xs text-emerald-700">Bestand: {item.quantity} {item.unit || "Stk."}</div></div></div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Menge</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
              <input type="number" value={qty} min={1} max={item.quantity || 1} onChange={e => setQty(Math.max(1, Math.min(item.quantity || 1, Number(e.target.value))))} className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-center font-semibold focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none" />
              <button onClick={() => setQty(Math.min(item.quantity || 1, qty + 1))} className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
              <span className="text-sm text-slate-500 w-10">{item.unit || "Stk."}</span>
            </div>
          </div>
          <Field label="Entleiher *" value={borrower} onChange={setBorrower} />
          <Field label="Geplante Rückgabe" type="date" value={ret} onChange={setRet} />
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">Abbrechen</button>
          <button onClick={() => borrower && onLoan(item.id, borrower, ret, qty)} disabled={!borrower} className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm shadow-emerald-200">Bestätigen</button>
        </div>
      </div>
    </div>
  );
}

// ─── QR MODAL ─────────────────────────────────────────────────────────────────
function QRModal({ item, onClose }) {
  const cells = 21, seed = item.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0), grid = [];
  for (let r = 0; r < cells; r++) { const row = []; for (let c = 0; c < cells; c++) { const inF = (r < 7 && c < 7) || (r < 7 && c >= cells - 7) || (r >= cells - 7 && c < 7); if (inF) { const rr = r < 7 ? r : r - (cells - 7), cc = c < 7 ? c : c >= cells - 7 ? c - (cells - 7) : c; row.push((rr === 0 || rr === 6 || cc === 0 || cc === 6) || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4)); } else row.push(((r * cells + c + seed) * 2654435761 % 2) === 0); } grid.push(row); }
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between"><div className="font-semibold text-slate-900">QR-Etikett</div><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button></div>
        <div className="p-6">
          <div className="bg-white p-5 border-2 border-slate-100 rounded-xl">
            <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${cells},1fr)` }}>{grid.flat().map((on, i) => <div key={i} className={`aspect-square ${on ? "bg-slate-900" : "bg-white"}`} />)}</div>
          </div>
          <div className="mt-4 text-center"><div className="font-semibold">{item.name}</div><div className="text-xs text-slate-500 font-mono mt-1">{item.id} · {item.serial}</div>{item.barcode && <div className="text-xs text-slate-500 font-mono">Barcode: {item.barcode}</div>}</div>
          <button onClick={() => window.print()} className="w-full mt-5 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold shadow-sm shadow-emerald-200">Drucken</button>
        </div>
      </div>
    </div>
  );
}

// ─── SCANNER MODAL ────────────────────────────────────────────────────────────
function ScanModal({ onClose, onResult }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("init"); // init | running | unsupported | error
  const [manualCode, setManualCode] = useState("");
  const [lastScan, setLastScan] = useState(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const stop = () => { doneRef.current = true; cancelAnimationFrame(rafRef.current); streamRef.current?.getTracks().forEach(t => t.stop()); };
    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setStatus("unsupported"); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } } });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        setStatus("running");

        // Use BarcodeDetector if available
        if ("BarcodeDetector" in window) {
          const detector = new window.BarcodeDetector({ formats: ["ean_13","ean_8","upc_a","upc_e","code_128","code_39","qr_code","data_matrix","itf"] });
          const loop = async () => {
            if (doneRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes?.length) { const code = codes[0].rawValue; setLastScan(code); doneRef.current = true; stop(); onResult(code); return; }
            } catch {}
            rafRef.current = requestAnimationFrame(loop);
          };
          rafRef.current = requestAnimationFrame(loop);
        }
        // If no BarcodeDetector, just show camera so user can read the code
      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    };
    startCamera();
    return stop;
  }, [onResult]);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2"><ScanLine className="w-4 h-4 text-emerald-600" /><div className="font-semibold text-slate-900">Barcode scannen</div></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        {/* Camera viewport */}
        <div className="bg-slate-900 aspect-[4/3] relative overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

          {status === "running" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3/4 h-1/2 relative">
                {/* Corner markers */}
                {["tl","tr","bl","br"].map(p => (
                  <div key={p} className={`absolute w-6 h-6 border-emerald-400 ${p.includes("t") ? "top-0 border-t-4" : "bottom-0 border-b-4"} ${p.includes("l") ? "left-0 border-l-4" : "right-0 border-r-4"}`} />
                ))}
                {/* Scan line */}
                <div className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" style={{ animation: "scan 2s ease-in-out infinite" }} />
              </div>
              <div className="absolute bottom-4 bg-black/60 text-white/90 text-xs px-3 py-1.5 rounded-full">
                {"BarcodeDetector" in window ? "Kamera läuft — Code in Rahmen halten" : "Kamera läuft — Code ablesen und unten eingeben"}
              </div>
            </div>
          )}

          {status === "init" && (
            <div className="absolute inset-0 flex items-center justify-center text-white/80">
              <div className="text-center"><Camera className="w-8 h-8 mx-auto mb-2 animate-pulse" /><div className="text-sm">Kamera wird gestartet…</div></div>
            </div>
          )}
          {(status === "unsupported" || status === "error") && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="text-center text-white">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 text-amber-400" />
                <div className="font-semibold mb-1">{status === "unsupported" ? "Kamerazugriff nicht möglich" : "Kamera-Berechtigung verweigert"}</div>
                <div className="text-xs text-white/70 leading-relaxed">
                  {status === "unsupported"
                    ? "Dieser Browser unterstützt keinen Kamerazugriff. Nutze Chrome/Edge auf Android oder Safari auf iOS."
                    : "Bitte erlaube den Kamerazugriff in deinen Browser-Einstellungen und lade die Seite neu."}
                </div>
                <div className="mt-3 text-xs text-amber-300">→ Barcode unten manuell eingeben</div>
              </div>
            </div>
          )}
        </div>

        {/* Manual input */}
        <div className="p-5 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-600 mb-2">Code manuell eingeben:</div>
          <div className="flex gap-2">
            <input type="text" value={manualCode} onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && manualCode && onResult(manualCode)}
              placeholder="z.B. 4260123456789" autoFocus={status !== "running"}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none" />
            <button onClick={() => manualCode && onResult(manualCode)} disabled={!manualCode} className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white px-4 py-2 rounded-lg text-sm font-semibold">OK</button>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 text-center">Bekannte Codes erhöhen automatisch den Bestand · Neue Codes öffnen das Formular</div>
        </div>
      </div>
    </div>
  );
}

// ─── FOLDER MODAL ─────────────────────────────────────────────────────────────
function FolderModal({ onClose, onSave }) {
  const [name, setName] = useState(""); const [color, setColor] = useState("emerald");
  const COLORS = [["emerald","from-emerald-400 to-teal-500"],["blue","from-blue-400 to-cyan-500"],["violet","from-violet-400 to-purple-500"],["amber","from-amber-400 to-orange-500"],["rose","from-rose-400 to-pink-500"]];
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between"><div className="font-semibold text-slate-900">Neuer Ordner</div><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button></div>
        <div className="p-6 space-y-4">
          <Field label="Ordnername" value={name} onChange={setName} />
          <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Farbe</label><div className="flex gap-2">{COLORS.map(([id, cls]) => <button key={id} onClick={() => setColor(id)} className={`w-9 h-9 rounded-lg bg-gradient-to-br ${cls} ${color === id ? "ring-2 ring-offset-2 ring-slate-900" : ""}`} />)}</div></div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">Abbrechen</button>
          <button onClick={() => name && onSave(name, color)} disabled={!name} className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm shadow-emerald-200">Erstellen</button>
        </div>
      </div>
    </div>
  );
}

// ─── EXPORT MODAL ─────────────────────────────────────────────────────────────
function ExportModal({ items, onClose }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? items : filter === "expiry" ? items.filter(i => i.expiryDate && daysUntil(i.expiryDate) < 60) : items.filter(i => i.nextMaintenance && daysUntil(i.nextMaintenance) < 60);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div><div className="font-semibold text-slate-900">Inventar exportieren</div><div className="text-xs text-slate-500 mt-0.5">{filtered.length} Artikel ausgewählt</div></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Exportbereich</label>
            <div className="grid grid-cols-3 gap-2">
              {[["all","Alles"],["expiry","Ablauf-Warnungen"],["maint","Wartung fällig"]].map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)} className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${filter === v ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{l}</button>
              ))}
            </div>
          </div>

          {/* Export options */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Format</label>
            <div className="space-y-2">
              <ExportBtn icon={FileText} label="CSV exportieren" sub="Für Excel, Google Sheets etc." color="emerald" onClick={() => { exportCSV(filtered); onClose(); }} />
              <ExportBtn icon={Download} label="JSON exportieren" sub="Rohdaten für Entwickler" color="blue" onClick={() => { exportJSON(filtered); onClose(); }} />
              <ExportBtn icon={FileText} label="Inventarliste drucken / PDF" sub="Formatierte Tabelle für den Drucker" color="violet" onClick={() => { printInventory(filtered); onClose(); }} />
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Vorschau ({filtered.length} Zeilen)</label>
            <div className="bg-slate-50 rounded-xl p-3 max-h-40 overflow-y-auto cs text-xs font-mono text-slate-600 space-y-1">
              {filtered.slice(0, 8).map(i => <div key={i.id} className="flex gap-2"><span className="text-slate-400">{i.id}</span><span className="flex-1 truncate">{i.name}</span><span className="text-emerald-700 font-semibold">{fmt(Number(i.value || 0) * (Number(i.quantity) || 1), 2)} €</span></div>)}
              {filtered.length > 8 && <div className="text-slate-400">…und {filtered.length - 8} weitere</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function ExportBtn({ icon: Icon, label, sub, color, onClick }) {
  const c = { emerald: "hover:border-emerald-300 hover:bg-emerald-50", blue: "hover:border-blue-300 hover:bg-blue-50", violet: "hover:border-violet-300 hover:bg-violet-50" }[color];
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 text-left transition-all ${c}`}>
      <div className={`w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0`}><Icon className="w-5 h-5 text-slate-600" /></div>
      <div><div className="font-semibold text-sm text-slate-900">{label}</div><div className="text-xs text-slate-500">{sub}</div></div>
      <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
    </button>
  );
}

// ─── DASHBOARD EDITOR ─────────────────────────────────────────────────────────
function DashEditor({ widgets, onSave, onClose }) {
  const [local, setLocal] = useState({ ...widgets });
  const toggle = (id) => setLocal(p => ({ ...p, [id]: !p[id] }));
  const groups = ["kpi", "large", "small"];
  const gLabel = { kpi: "Kennzahlen (oben)", large: "Große Karten", small: "Kleine Widgets" };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div><div className="font-semibold text-slate-900 flex items-center gap-2"><LayoutDashboard className="w-4 h-4 text-emerald-600" /> Dashboard anpassen</div><div className="text-xs text-slate-500 mt-0.5">Aktiviere oder deaktiviere Widgets nach Bedarf</div></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto cs">
          {groups.map(g => (
            <div key={g}>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{gLabel[g]}</div>
              <div className="space-y-1">
                {ALL_WIDGETS.filter(w => w.group === g).map(widget => {
                  const on = local[widget.id] !== false;
                  return (
                    <div key={widget.id} onClick={() => toggle(widget.id)} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${on ? "border-emerald-200 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}>
                      <div className={`w-8 h-5 rounded-full flex-shrink-0 transition-colors relative ${on ? "bg-emerald-500" : "bg-slate-300"}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-3.5" : "translate-x-0.5"}`} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">{widget.label}</div>
                        <div className="text-xs text-slate-500">{on ? "Sichtbar" : "Ausgeblendet"}</div>
                      </div>
                      {on ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <button onClick={() => { const def = Object.fromEntries(ALL_WIDGETS.map(w => [w.id, w.defaultOn])); setLocal(def); }} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Zurücksetzen</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">Abbrechen</button>
            <button onClick={() => onSave(local)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm shadow-emerald-200">Speichern</button>
          </div>
        </div>
      </div>
    </div>
  );
}
