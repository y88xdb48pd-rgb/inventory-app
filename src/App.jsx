import { useState, useEffect, useRef } from "react";
import {
  Package, MapPin, Wrench, QrCode, Plus, Search, X, AlertCircle, Euro, Users,
  Edit3, Trash2, LayoutDashboard, Boxes, Bell, ChevronRight, TrendingUp,
  CheckCircle2, Clock, Archive, Settings, Folder, FolderPlus,
  Camera, ScanLine, Minus, Image as ImageIcon, ArrowLeft,
  Download, FileText, AlertTriangle, Eye, EyeOff, RefreshCw,
  Menu, LogOut
} from "lucide-react";

const fmt = (n, dec = 0) => Number(n || 0).toLocaleString("de-DE", { maximumFractionDigits: dec });
const today = () => new Date().toISOString().split("T")[0];
const daysUntil = (d) => Math.round((new Date(d) - new Date()) / 86400000);
const get = async (k) => { try { const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; } catch { return null; } };
const set = async (k, v) => { try { await window.storage.set(k, JSON.stringify(v)); } catch {} };

const DEMO_FOLDERS = [
  { id: "fld_1", name: "Werkzeug & Maschinen", parentId: null, color: "amber" },
  { id: "fld_2", name: "IT & Büro", parentId: null, color: "blue" },
  { id: "fld_3", name: "Verbrauchsmaterial", parentId: null, color: "violet" },
];
const DEMO_ITEMS = [
  { id: "eq_001", name: "Bosch GBH Bohrhammer", category: "Werkzeug", folderId: "fld_1", location: "Lager A", serial: "BH-2024-001", value: 450, quantity: 3, unit: "Stk.", status: "verfügbar", nextMaintenance: "2026-08-15", expiryDate: "", purchaseDate: "2024-03-12", image: null, barcode: "" },
  { id: "eq_002", name: 'MacBook Pro 14"', category: "IT", folderId: "fld_2", location: "Büro München", serial: "MBP-M3-042", value: 2400, quantity: 5, unit: "Stk.", status: "verfügbar", nextMaintenance: "2027-03-01", expiryDate: "", purchaseDate: "2025-01-08", image: null, barcode: "" },
  { id: "eq_003", name: "Vape Pod Kit", category: "Verbrauchsmaterial", folderId: "fld_3", location: "Hauptregal", serial: "VP-001", value: 12.5, quantity: 100, unit: "Stk.", status: "verfügbar", nextMaintenance: "", expiryDate: "2026-09-30", purchaseDate: "2025-10-01", image: null, barcode: "4260123456789" },
  { id: "eq_004", name: "Projektor Epson", category: "AV", folderId: "fld_2", location: "Konferenzraum", serial: "EPS-88", value: 890, quantity: 2, unit: "Stk.", status: "verfügbar", nextMaintenance: "2026-12-01", expiryDate: "", purchaseDate: "2024-06-15", image: null, barcode: "" },
  { id: "eq_005", name: "Desinfektionsmittel 5L", category: "Verbrauchsmaterial", folderId: "fld_3", location: "Sanitärraum", serial: "", value: 18, quantity: 24, unit: "Fl.", status: "verfügbar", nextMaintenance: "", expiryDate: "2026-06-01", purchaseDate: "2025-11-01", image: null, barcode: "4005900" },
];

const ALL_WIDGETS = [
  { id: "kpi_value",      label: "Gesamtwert",        group: "kpi",   defaultOn: true },
  { id: "kpi_articles",   label: "Artikel gesamt",    group: "kpi",   defaultOn: true },
  { id: "kpi_loans",      label: "Aktive Ausleihen",  group: "kpi",   defaultOn: true },
  { id: "kpi_maint",      label: "Wartung fällig",    group: "kpi",   defaultOn: true },
  { id: "kpi_expiry",     label: "Ablauf-Warnungen",  group: "kpi",   defaultOn: true },
  { id: "chart_category", label: "Wert-Chart",        group: "large", defaultOn: true },
  { id: "card_quickact",  label: "Schnellaktionen",   group: "large", defaultOn: true },
  { id: "list_recent",    label: "Zuletzt hinzugefügt", group: "large", defaultOn: true },
  { id: "list_maint",     label: "Wartungskalender",  group: "small", defaultOn: true },
  { id: "list_expiry",    label: "Ablaufliste",       group: "small", defaultOn: true },
  { id: "list_loans",     label: "Ausleihen-Widget",  group: "small", defaultOn: false },
];

function exportCSV(items) {
  const h = ["ID","Name","Kategorie","Standort","Seriennr.","Barcode","Menge","Einheit","Einzelwert","Gesamtwert","Ablaufdatum","Wartung","Kaufdatum"];
  const rows = items.map(i => [i.id,i.name,i.category,i.location,i.serial,i.barcode,i.quantity||1,i.unit||"Stk.",Number(i.value||0).toFixed(2),(Number(i.value||0)*(Number(i.quantity)||1)).toFixed(2),i.expiryDate||"",i.nextMaintenance||"",i.purchaseDate||""]);
  const csv = [h,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(";")).join("\n");
  const a = document.createElement("a"); a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"})); a.download=`inventar_${today()}.csv`; a.click();
}
function exportJSON(items) {
  const a = document.createElement("a"); a.href=URL.createObjectURL(new Blob([JSON.stringify(items,null,2)],{type:"application/json"})); a.download=`inventar_${today()}.json`; a.click();
}
function printInventory(items) {
  const w = window.open("","_blank");
  w.document.write(`<html><head><style>body{font-family:sans-serif;font-size:11px}table{width:100%;border-collapse:collapse}th{background:#f1f5f9;padding:5px 8px;text-align:left;font-size:9px;text-transform:uppercase}td{padding:5px 8px;border-bottom:1px solid #e2e8f0}</style></head><body><h2>Inventarliste – ${new Date().toLocaleDateString("de-DE")}</h2><table><tr><th>Artikel</th><th>Kat.</th><th>Standort</th><th>Menge</th><th>Einzelwert</th><th>Gesamtwert</th><th>Ablauf</th><th>Wartung</th></tr>${items.map(i=>`<tr><td>${i.name}</td><td>${i.category}</td><td>${i.location}</td><td>${i.quantity||1} ${i.unit||"Stk."}</td><td>${fmt(i.value,2)} €</td><td>${fmt(Number(i.value||0)*(Number(i.quantity)||1),2)} €</td><td>${i.expiryDate?new Date(i.expiryDate).toLocaleDateString("de-DE"):"—"}</td><td>${i.nextMaintenance?new Date(i.nextMaintenance).toLocaleDateString("de-DE"):"—"}</td></tr>`).join("")}</table></body></html>`);
  w.document.close(); w.print();
}

export default function App({ user, onLogout }) {
  const [view, setView] = useState("dashboard");
  const [items, setItems] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loans, setLoans] = useState([]);
  const [widgets, setWidgets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(null);
  const [showQR, setShowQR] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDashEditor, setShowDashEditor] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null);

  useEffect(() => {
    (async () => {
      const [fi,fo,lo,wi] = await Promise.all([get("eq:items"),get("eq:folders"),get("eq:loans"),get("eq:widgets")]);
      setItems(fi||DEMO_ITEMS); setFolders(fo||DEMO_FOLDERS); setLoans(lo||[]);
      if(!fi) await set("eq:items",DEMO_ITEMS);
      if(!fo) await set("eq:folders",DEMO_FOLDERS);
      if(wi) setWidgets(wi);
      else { const def=Object.fromEntries(ALL_WIDGETS.map(w=>[w.id,w.defaultOn])); setWidgets(def); await set("eq:widgets",def); }
      setLoading(false);
    })();
  }, []);

  const saveItems   = async v => { setItems(v);   await set("eq:items",v); };
  const saveFolders = async v => { setFolders(v); await set("eq:folders",v); };
  const saveLoans   = async v => { setLoans(v);   await set("eq:loans",v); };
  const saveWidgets = async v => { setWidgets(v); await set("eq:widgets",v); };

  const totalValue  = items.reduce((s,i)=>s+Number(i.value||0)*(Number(i.quantity)||1),0);
  const totalUnits  = items.reduce((s,i)=>s+(Number(i.quantity)||1),0);
  const activeLoans = loans.filter(l=>!l.returnedAt).length;
  const maintDue    = items.filter(i=>i.nextMaintenance&&daysUntil(i.nextMaintenance)<60);
  const expiryWarn  = items.filter(i=>i.expiryDate&&daysUntil(i.expiryDate)<60);
  const notifs = [...maintDue.map(i=>({type:"maint",item:i,days:daysUntil(i.nextMaintenance)})),...expiryWarn.map(i=>({type:"expiry",item:i,days:daysUntil(i.expiryDate)}))].sort((a,b)=>a.days-b.days);

  const currentItems = items.filter(i=>(currentFolder===null?true:i.folderId===currentFolder)&&(!search||[i.name,i.serial,i.barcode,i.location].some(f=>f?.toLowerCase().includes(search.toLowerCase()))));
  const currentFolderObj = currentFolder?folders.find(f=>f.id===currentFolder):null;
  const foldersHere = folders.filter(f=>f.parentId===currentFolder);

  const addItem    = async d => { await saveItems([...items,{...d,id:`eq_${Date.now()}`,status:"verfügbar",folderId:d.folderId??currentFolder}]); setShowAddItem(false); };
  const editItemFn = async d => { await saveItems(items.map(i=>i.id===d.id?d:i)); setEditItem(null); };
  const delItem    = async id => { if(!confirm("Artikel löschen?"))return; await saveItems(items.filter(i=>i.id!==id)); };
  const adjQty     = async (id,delta) => saveItems(items.map(i=>i.id===id?{...i,quantity:Math.max(0,(Number(i.quantity)||0)+delta)}:i));
  const addFolder  = async (name,color) => { await saveFolders([...folders,{id:`fld_${Date.now()}`,name,parentId:currentFolder,color}]); setShowAddFolder(false); };
  const delFolder  = async id => { if(!confirm("Ordner löschen?"))return; await saveFolders(folders.filter(f=>f.id!==id)); await saveItems(items.map(i=>i.folderId===id?{...i,folderId:null}:i)); };
  const addLoan    = async (itemId,borrower,ret,qty) => { await saveLoans([...loans,{id:`ln_${Date.now()}`,itemId,borrower,expectedReturn:ret,quantity:qty||1,loanedAt:new Date().toISOString(),returnedAt:null}]); setShowLoanModal(null); };
  const retLoan    = async loanId => saveLoans(loans.map(l=>l.id===loanId?{...l,returnedAt:new Date().toISOString()}:l));
  const onScan     = async barcode => { const ex=items.find(i=>i.barcode===barcode); if(ex){await saveItems(items.map(i=>i.id===ex.id?{...i,quantity:(Number(i.quantity)||0)+1}:i));setShowScanner(false);alert(`✓ "${ex.name}" — Bestand: ${(Number(ex.quantity)||0)+1}`);}else{setShowScanner(false);setShowAddItem({barcode});} };

  const w = id => widgets?.[id] !== false;
  const nav = id => { setView(id); setCurrentFolder(null); setShowMobileMenu(false); };

  const NAV = [
    {id:"dashboard",label:"Übersicht",icon:LayoutDashboard},
    {id:"inventory",label:"Inventar",icon:Package},
    {id:"loans",label:"Ausleihen",icon:Users},
    {id:"maintenance",label:"Wartung",icon:Wrench},
    {id:"archive",label:"Archiv",icon:Archive},
  ];

  if(loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">Lade…</div>;

  const FOLDER_COLORS = {amber:"from-amber-400 to-orange-500",blue:"from-blue-400 to-cyan-500",violet:"from-violet-400 to-purple-500",emerald:"from-emerald-400 to-teal-500",rose:"from-rose-400 to-pink-500"};

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row" style={{fontFamily:'"Inter",-apple-system,sans-serif'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{-webkit-font-smoothing:antialiased}
        .cs::-webkit-scrollbar{width:4px}.cs::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:2px}
        @keyframes scan{0%,100%{top:4px}50%{top:calc(100% - 4px)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
        .slide-up{animation:slideUp 0.22s ease-out}
        .slide-in{animation:slideIn 0.22s ease-out}
      `}</style>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-slate-200 flex-col sticky top-0 h-screen z-40">
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
          {NAV.map(t => { const Icon=t.icon; const active=view===t.id; return (
            <button key={t.id} onClick={()=>nav(t.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active?"bg-emerald-50 text-emerald-700":"text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
              <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={active?2.5:2} /><span>{t.label}</span>
              {t.id==="maintenance"&&maintDue.length>0&&<span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{maintDue.length}</span>}
              {t.id==="loans"&&activeLoans>0&&<span className="ml-auto text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{activeLoans}</span>}
            </button>
          );})}
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2 mt-6">Tools</div>
          <button onClick={()=>setShowExport(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"><Download className="w-[18px] h-[18px]" /><span>Export</span></button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"><Settings className="w-[18px] h-[18px]" /><span>Einstellungen</span></button>
        </nav>
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{user?.name?.charAt(0)||"U"}</div>
            <div className="flex-1 min-w-0"><div className="text-sm font-medium text-slate-900 truncate">{user?.name}</div><div className="text-[11px] text-slate-500">{user?.role}</div></div>
            <button onClick={onLogout} title="Abmelden" className="p-1 rounded hover:bg-slate-200"><LogOut className="w-4 h-4 text-slate-400" /></button>
          </div>
        </div>
      </aside>

      {/* ── MOBILE TOPBAR ── */}
      <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-2 sticky top-0 z-40">
        <button onClick={()=>setShowMobileMenu(true)} className="p-2 rounded-lg hover:bg-slate-100 flex-shrink-0"><Menu className="w-5 h-5 text-slate-700" /></button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0"><Boxes className="w-4 h-4 text-white" strokeWidth={2.5} /></div>
          <span className="font-bold text-slate-900 text-sm">inventory</span>
        </div>
        <button onClick={()=>setShowScanner(true)} className="p-2 rounded-lg bg-slate-800 text-white flex-shrink-0"><ScanLine className="w-4 h-4" /></button>
        <div className="relative flex-shrink-0">
          <button onClick={()=>setShowNotifications(v=>!v)} className="p-2 rounded-lg hover:bg-slate-100 relative">
            <Bell className="w-5 h-5 text-slate-600" />
            {notifs.length>0&&<span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />}
          </button>
          {showNotifications&&<div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl z-50"><NotifPanel notifs={notifs} onClose={()=>setShowNotifications(false)} /></div>}
        </div>
        <button onClick={()=>setShowAddItem(true)} className="p-2 rounded-lg bg-emerald-500 text-white flex-shrink-0"><Plus className="w-4 h-4" strokeWidth={2.5} /></button>
      </header>

      {/* ── MOBILE DRAWER ── */}
      {showMobileMenu&&(
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={()=>setShowMobileMenu(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white slide-in flex flex-col shadow-xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center"><Boxes className="w-4 h-4 text-white" strokeWidth={2.5} /></div>
                <div><div className="font-bold text-slate-900">inventory</div><div className="text-[10px] text-slate-400">EQUIPMENT CLOUD</div></div>
              </div>
              <button onClick={()=>setShowMobileMenu(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
              {NAV.map(t=>{const Icon=t.icon;const active=view===t.id;return(
                <button key={t.id} onClick={()=>nav(t.id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${active?"bg-emerald-50 text-emerald-700":"text-slate-600"}`}>
                  <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={active?2.5:2} /><span>{t.label}</span>
                  {t.id==="maintenance"&&maintDue.length>0&&<span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{maintDue.length}</span>}
                  {t.id==="loans"&&activeLoans>0&&<span className="ml-auto text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{activeLoans}</span>}
                </button>
              );})}
              <div className="mt-2 pt-2 border-t border-slate-100">
                <button onClick={()=>{setShowExport(true);setShowMobileMenu(false);}} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-600">
                  <Download className="w-5 h-5" /><span>Export</span>
                </button>
                {view==="dashboard"&&<button onClick={()=>{setShowDashEditor(true);setShowMobileMenu(false);}} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-600"><LayoutDashboard className="w-5 h-5" /><span>Dashboard anpassen</span></button>}
              </div>
            </nav>
            <div className="p-4 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-3 px-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold">{user?.name?.charAt(0)||"U"}</div>
                <div><div className="font-medium text-slate-900">{user?.name}</div><div className="text-xs text-slate-500">{user?.role}</div></div>
              </div>
              <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50">
                <LogOut className="w-4 h-4" /> Abmelden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop topbar */}
        <header className="hidden lg:flex bg-white border-b border-slate-200 px-8 py-3.5 items-center gap-3 sticky top-0 z-30">
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Suche nach Name, Seriennr., Barcode…" className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none transition-all" />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={()=>setShowScanner(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold"><ScanLine className="w-4 h-4" /> Scannen</button>
            <div className="relative">
              <button onClick={()=>setShowNotifications(v=>!v)} className="relative p-2 rounded-lg hover:bg-slate-100">
                <Bell className="w-5 h-5 text-slate-600" />
                {notifs.length>0&&<span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />}
              </button>
              {showNotifications&&<div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50"><NotifPanel notifs={notifs} onClose={()=>setShowNotifications(false)} /></div>}
            </div>
            {view==="dashboard"&&<button onClick={()=>setShowDashEditor(true)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600" title="Dashboard anpassen"><LayoutDashboard className="w-5 h-5" /></button>}
            <button onClick={()=>setShowAddItem(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm shadow-emerald-200"><Plus className="w-4 h-4" strokeWidth={2.5} /> Neuer Artikel</button>
          </div>
        </header>

        {/* Mobile search */}
        <div className="lg:hidden px-4 py-2 bg-white border-b border-slate-100 sticky top-[57px] z-30">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Suchen…" className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-emerald-400 focus:outline-none" />
          </div>
        </div>

        <main className="flex-1 p-4 lg:p-8 overflow-auto cs pb-24 lg:pb-8">

          {/* ──── DASHBOARD ──── */}
          {view==="dashboard"&&(
            <div className="max-w-7xl">
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <div className="text-sm text-slate-500 mb-0.5">Guten Tag, {user?.name?.split(" ")[0]} 👋</div>
                  <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Deine Übersicht</h1>
                </div>
                <button onClick={()=>setShowDashEditor(true)} className="flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200 px-2.5 py-1.5 rounded-lg lg:hidden">
                  <Edit3 className="w-3 h-3" /> Anpassen
                </button>
              </div>

              {/* KPIs: 2 cols mobile → 5 cols desktop */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
                {w("kpi_value")&&<KPI label="Gesamtwert" value={`${fmt(totalValue)} €`} sub="inkl. Mengen" icon={Euro} accent="emerald" trend="+12%" />}
                {w("kpi_articles")&&<KPI label="Artikel" value={fmt(totalUnits)} sub={`${items.length} Pos.`} icon={Package} accent="blue" />}
                {w("kpi_loans")&&<KPI label="Ausleihen" value={activeLoans} sub="aktiv" icon={Users} accent="violet" />}
                {w("kpi_maint")&&<KPI label="Wartung" value={maintDue.length} sub="fällig" icon={Wrench} accent={maintDue.length>0?"amber":"slate"} />}
                {w("kpi_expiry")&&<KPI label="Ablauf" value={expiryWarn.length} sub="Warnungen" icon={AlertTriangle} accent={expiryWarn.length>0?"red":"slate"} />}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                {w("chart_category")&&(
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
                    <div className="font-semibold text-slate-900 mb-1">Warenwert nach Kategorie</div>
                    <div className="text-xs text-slate-500 mb-4">Gesamtwert inkl. Mengen</div>
                    <CategoryChart items={items} />
                  </div>
                )}
                {w("card_quickact")&&(
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
                    <ScanLine className="w-6 h-6 mb-2 relative" />
                    <div className="font-semibold text-lg mb-1 relative">Schnell erfassen</div>
                    <p className="text-sm text-emerald-50 mb-4 relative">Barcode scannen für blitzschnelle Einträge.</p>
                    <div className="space-y-2 relative">
                      <button onClick={()=>setShowScanner(true)} className="w-full bg-white/15 hover:bg-white/25 text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors"><Camera className="w-4 h-4" /> Barcode scannen</button>
                      <button onClick={()=>setShowAddItem(true)} className="w-full bg-white/15 hover:bg-white/25 text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors"><Plus className="w-4 h-4" /> Manuell anlegen</button>
                      <button onClick={()=>setShowExport(true)} className="w-full bg-white/15 hover:bg-white/25 text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors"><Download className="w-4 h-4" /> Exportieren</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {w("list_recent")&&(
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-semibold text-slate-900">Zuletzt hinzugefügt</div>
                      <button onClick={()=>setView("inventory")} className="text-xs font-medium text-emerald-600 flex items-center gap-1">Alle <ChevronRight className="w-3 h-3" /></button>
                    </div>
                    {items.slice(-4).reverse().map(i=>(
                      <div key={i.id} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
                        <Thumb item={i} s={10} />
                        <div className="flex-1 min-w-0"><div className="font-medium text-sm text-slate-900 truncate">{i.name}</div><div className="text-xs text-slate-500 truncate">{i.location}</div></div>
                        <div className="text-right flex-shrink-0"><div className="font-semibold text-sm">{i.quantity||1} {i.unit||"Stk."}</div><div className="text-[11px] text-slate-500">{fmt(i.value,2)} €</div></div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-4">
                  {w("list_maint")&&(
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <div className="font-semibold text-slate-900 mb-3">Wartung</div>
                      {maintDue.slice(0,3).map(i=>{const d=daysUntil(i.nextMaintenance);return(
                        <div key={i.id} className="flex items-start gap-3 mb-3 last:mb-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${d<30?"bg-red-50":"bg-amber-50"}`}><Clock className={`w-4 h-4 ${d<30?"text-red-500":"text-amber-500"}`} /></div>
                          <div className="flex-1 min-w-0"><div className="text-sm font-medium text-slate-900 truncate">{i.name}</div><div className="text-xs text-slate-500">{d<0?`${Math.abs(d)}d überfällig`:`in ${d} Tagen`}</div></div>
                        </div>
                      );})}
                      {maintDue.length===0&&<div className="text-xs text-slate-400 text-center py-3">Keine fälligen Wartungen ✓</div>}
                    </div>
                  )}
                  {w("list_expiry")&&(
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <div className="font-semibold text-slate-900 mb-3">Ablaufdaten</div>
                      {expiryWarn.slice(0,3).map(i=>{const d=daysUntil(i.expiryDate);return(
                        <div key={i.id} className="flex items-start gap-3 mb-3 last:mb-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${d<0?"bg-red-50":d<30?"bg-orange-50":"bg-amber-50"}`}><AlertTriangle className={`w-4 h-4 ${d<0?"text-red-500":d<30?"text-orange-500":"text-amber-500"}`} /></div>
                          <div className="flex-1 min-w-0"><div className="text-sm font-medium text-slate-900 truncate">{i.name}</div><div className="text-xs text-slate-500">{d<0?`Abgelaufen (${Math.abs(d)}d)`:`in ${d} Tagen`}</div></div>
                        </div>
                      );})}
                      {expiryWarn.length===0&&<div className="text-xs text-slate-400 text-center py-3">Keine bevorstehenden Abläufe ✓</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ──── INVENTORY ──── */}
          {view==="inventory"&&(
            <div className="max-w-7xl">
              <div className="flex items-center gap-2 mb-1 text-sm">
                <button onClick={()=>setCurrentFolder(null)} className={currentFolder?"text-slate-500":"font-semibold text-slate-900"}>Inventar</button>
                {currentFolderObj&&<><ChevronRight className="w-3 h-3 text-slate-400" /><span className="font-semibold text-slate-900 truncate">{currentFolderObj.name}</span></>}
              </div>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-slate-900">{currentFolderObj?.name||"Inventar"}</h1>
                  <p className="text-xs text-slate-500 mt-0.5">{currentItems.length} Pos. · {currentItems.reduce((s,i)=>s+(Number(i.quantity)||1),0)} Stk. · {fmt(currentItems.reduce((s,i)=>s+Number(i.value||0)*(Number(i.quantity)||1),0))} €</p>
                </div>
                <div className="flex gap-2">
                  {currentFolder&&<button onClick={()=>setCurrentFolder(null)} className="p-2 bg-white border border-slate-200 rounded-xl"><ArrowLeft className="w-4 h-4 text-slate-600" /></button>}
                  <button onClick={()=>setShowAddFolder(true)} className="p-2 bg-white border border-slate-200 rounded-xl"><FolderPlus className="w-4 h-4 text-slate-600" /></button>
                  <button onClick={()=>setShowExport(true)} className="p-2 bg-white border border-slate-200 rounded-xl"><Download className="w-4 h-4 text-slate-600" /></button>
                </div>
              </div>

              {/* Folders: 2 cols mobile, 4 cols desktop */}
              {foldersHere.length>0&&(
                <div className="mb-5">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Ordner</div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {foldersHere.map(f=>{const cnt=items.filter(i=>i.folderId===f.id).length;return(
                      <div key={f.id} onClick={()=>setCurrentFolder(f.id)} className="group bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-all relative active:scale-[0.98]">
                        <button onClick={e=>{e.stopPropagation();delFolder(f.id);}} className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${FOLDER_COLORS[f.color]||FOLDER_COLORS.emerald} flex items-center justify-center mb-2.5 shadow-sm`}><Folder className="w-5 h-5 text-white" strokeWidth={2.5} /></div>
                        <div className="font-semibold text-sm text-slate-900 truncate">{f.name}</div>
                        <div className="text-xs text-slate-500">{cnt} Artikel</div>
                      </div>
                    );})}
                  </div>
                </div>
              )}

              {/* Items */}
              {currentItems.length>0&&(
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Artikel</div>
                  {/* Mobile: cards */}
                  <div className="lg:hidden space-y-3">
                    {currentItems.map(i=>{
                      const ed=i.expiryDate?daysUntil(i.expiryDate):null;const ew=ed!==null&&ed<60;
                      return(
                        <div key={i.id} className="bg-white rounded-xl border border-slate-200 p-4">
                          <div className="flex items-start gap-3">
                            <Thumb item={i} s={12} />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-900 truncate">{i.name}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /><span className="truncate">{i.location}</span></div>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <span className="bg-slate-100 text-slate-700 text-[10px] font-medium px-1.5 py-0.5 rounded">{i.category}</span>
                                {i.barcode&&<span className="font-mono text-[10px] text-slate-400">{i.barcode}</span>}
                                {ew&&<span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ed<0?"bg-red-100 text-red-700":ed<30?"bg-orange-100 text-orange-700":"bg-amber-100 text-amber-700"}`}>{ed<0?"Abgelaufen":`Ablauf ${ed}d`}</span>}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <div className="font-bold text-slate-900 text-sm">{fmt(Number(i.value||0)*(Number(i.quantity)||1),0)} €</div>
                              <div className="text-[11px] text-slate-500">{fmt(i.value,2)} €/Stk.</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                              <button onClick={()=>adjQty(i.id,-1)} className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center active:scale-95"><Minus className="w-3.5 h-3.5" /></button>
                              <div className="font-semibold text-slate-900 min-w-[48px] text-center">{i.quantity||1}<span className="text-[10px] font-normal text-slate-400 ml-0.5">{i.unit||"Stk."}</span></div>
                              <button onClick={()=>adjQty(i.id,1)} className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center active:scale-95"><Plus className="w-3.5 h-3.5" /></button>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <IBtn onClick={()=>setShowQR(i)} icon={QrCode} /><IBtn onClick={()=>setShowLoanModal(i)} icon={Users} /><IBtn onClick={()=>setEditItem(i)} icon={Edit3} /><IBtn onClick={()=>delItem(i.id)} icon={Trash2} danger />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Desktop: table */}
                  <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <div className="col-span-4">Artikel</div><div className="col-span-2">Standort</div><div className="col-span-2 text-center">Menge</div><div className="col-span-1 text-right">Einzelwert</div><div className="col-span-1 text-right">Gesamt</div><div className="col-span-2 text-right">Aktion</div>
                    </div>
                    {currentItems.map((i,idx)=>{const ed=i.expiryDate?daysUntil(i.expiryDate):null;const ew=ed!==null&&ed<60;return(
                      <div key={i.id} className={`grid grid-cols-12 gap-3 px-5 py-4 hover:bg-slate-50 items-center text-sm transition-colors ${idx!==currentItems.length-1?"border-b border-slate-100":""}`}>
                        <div className="col-span-4 flex items-center gap-3 min-w-0">
                          <Thumb item={i} s={11} />
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 truncate">{i.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.5 rounded">{i.category}</span>
                              {i.barcode&&<span className="font-mono text-[10px] text-slate-400">{i.barcode}</span>}
                              {ew&&<span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ed<0?"bg-red-100 text-red-700":ed<30?"bg-orange-100 text-orange-700":"bg-amber-100 text-amber-700"}`}>{ed<0?"Abgelaufen":`Ablauf ${ed}d`}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="col-span-2 text-slate-600 flex items-center gap-1 min-w-0"><MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" /><span className="truncate">{i.location}</span></div>
                        <div className="col-span-2 flex items-center justify-center gap-1">
                          <button onClick={()=>adjQty(i.id,-1)} className="w-6 h-6 rounded border border-slate-200 hover:bg-slate-100 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                          <div className="w-14 text-center font-semibold">{i.quantity||1}<span className="text-[10px] font-normal text-slate-400 ml-0.5">{i.unit||"Stk."}</span></div>
                          <button onClick={()=>adjQty(i.id,1)} className="w-6 h-6 rounded border border-slate-200 hover:bg-slate-100 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                        </div>
                        <div className="col-span-1 text-right text-xs text-slate-600">{fmt(i.value,2)} €</div>
                        <div className="col-span-1 text-right font-bold text-slate-900">{fmt(Number(i.value||0)*(Number(i.quantity)||1),0)} €</div>
                        <div className="col-span-2 flex items-center justify-end gap-0.5"><IBtn onClick={()=>setShowQR(i)} icon={QrCode} /><IBtn onClick={()=>setShowLoanModal(i)} icon={Users} /><IBtn onClick={()=>setEditItem(i)} icon={Edit3} /><IBtn onClick={()=>delItem(i.id)} icon={Trash2} danger /></div>
                      </div>
                    );})}
                  </div>
                </div>
              )}
              {foldersHere.length===0&&currentItems.length===0&&<EmptyState icon={Package} msg="Leer" sub="Lege Artikel oder Unterordner an." />}
            </div>
          )}

          {/* ──── LOANS ──── */}
          {view==="loans"&&(
            <div className="max-w-7xl">
              <div className="mb-4"><h1 className="text-xl lg:text-2xl font-bold text-slate-900">Ausleihen</h1><p className="text-sm text-slate-500">{activeLoans} aktiv · {loans.length-activeLoans} abgeschlossen</p></div>
              {loans.length===0?<EmptyState icon={Users} msg="Keine Ausleihen" sub="Über das Inventar Artikel ausleihen." />:(
                <div className="space-y-3 lg:space-y-0 lg:bg-white lg:rounded-2xl lg:border lg:border-slate-200 lg:overflow-hidden">
                  {loans.slice().reverse().map((l,idx)=>{const item=items.find(i=>i.id===l.itemId);return(
                    <div key={l.id} className="bg-white rounded-xl border border-slate-200 p-4 lg:rounded-none lg:border-0 lg:border-b lg:last:border-b-0 lg:px-6 lg:py-4 lg:grid lg:grid-cols-6 lg:gap-4 lg:items-center">
                      <div className="flex items-center gap-3 lg:col-span-2 mb-3 lg:mb-0">
                        {item&&<Thumb item={item} s={10} />}
                        <div><div className="font-medium text-sm">{item?.name||"Unbekannt"}</div><div className="text-xs text-slate-500 font-mono">{item?.serial}</div></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-3 lg:mb-0 lg:contents">
                        <div><div className="text-xs text-slate-500">Menge</div><div className="font-semibold text-sm">{l.quantity} {item?.unit||"Stk."}</div></div>
                        <div><div className="text-xs text-slate-500">Von</div><div className="text-sm">{l.borrower}</div></div>
                        <div className="col-span-2 lg:col-span-1"><div className="text-xs text-slate-500">Zeitraum</div><div className="text-sm">{new Date(l.loanedAt).toLocaleDateString("de-DE")} → {l.expectedReturn?new Date(l.expectedReturn).toLocaleDateString("de-DE"):"—"}</div></div>
                      </div>
                      <div className="lg:text-right">
                        {l.returnedAt?<span className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg"><CheckCircle2 className="w-3 h-3" /> Zurück</span>
                          :<button onClick={()=>retLoan(l.id)} className="w-full lg:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-transform">Rückgabe</button>}
                      </div>
                    </div>
                  );})}
                </div>
              )}
            </div>
          )}

          {/* ──── MAINTENANCE ──── */}
          {view==="maintenance"&&(
            <div className="max-w-7xl">
              <div className="mb-4"><h1 className="text-xl lg:text-2xl font-bold text-slate-900">Wartung & Prüfung</h1><p className="text-sm text-slate-500">Sortiert nach Fälligkeit</p></div>
              {items.filter(i=>i.nextMaintenance||i.expiryDate).length===0?<EmptyState icon={Wrench} msg="Keine Termine" sub="Wartungs- und Ablaufdaten beim Anlegen angeben." />:(
                <div className="space-y-3">
                  {items.filter(i=>i.nextMaintenance||i.expiryDate).map(i=>{const md=i.nextMaintenance?daysUntil(i.nextMaintenance):null;const ed=i.expiryDate?daysUntil(i.expiryDate):null;return(
                    <div key={i.id} className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start gap-3">
                        <Thumb item={i} s={10} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-slate-900 truncate">{i.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{i.location}</div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {md!==null&&<DayBadge label="Wartung" days={md} />}
                            {ed!==null&&<DayBadge label="Ablauf" days={ed} />}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          {i.nextMaintenance&&<button onClick={()=>{const n=new Date();n.setFullYear(n.getFullYear()+1);saveItems(items.map(it=>it.id===i.id?{...it,nextMaintenance:n.toISOString().split("T")[0]}:it));}} className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg whitespace-nowrap">Wartung ✓</button>}
                          <button onClick={()=>setEditItem(i)} className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg">Bearbeiten</button>
                        </div>
                      </div>
                    </div>
                  );})}
                </div>
              )}
            </div>
          )}

          {view==="archive"&&<div className="max-w-7xl"><div className="mb-4"><h1 className="text-xl lg:text-2xl font-bold text-slate-900">Archiv</h1></div><EmptyState icon={Archive} msg="Archiv ist leer" sub="Ausgemusterte Artikel landen hier." /></div>}
        </main>

        {/* ── MOBILE BOTTOM NAV ── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center z-30 safe-bottom">
          {NAV.slice(0,4).map(t=>{const Icon=t.icon;const active=view===t.id;return(
            <button key={t.id} onClick={()=>nav(t.id)} className={`flex-1 flex flex-col items-center gap-1 py-3 relative transition-colors ${active?"text-emerald-600":"text-slate-500"}`}>
              {((t.id==="maintenance"&&maintDue.length>0)||(t.id==="loans"&&activeLoans>0))&&<span className="absolute top-2 right-[22%] w-2 h-2 bg-red-500 rounded-full" />}
              <Icon className="w-5 h-5" strokeWidth={active?2.5:2} />
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          );})}
        </nav>
      </div>

      {/* ── MODALS ── */}
      {(showAddItem||editItem)&&<ItemModal item={editItem} initial={typeof showAddItem==="object"?showAddItem:null} folders={folders} currentFolder={currentFolder} onClose={()=>{setShowAddItem(false);setEditItem(null);}} onSave={editItem?editItemFn:addItem} />}
      {showLoanModal&&<LoanModal item={showLoanModal} onClose={()=>setShowLoanModal(null)} onLoan={addLoan} />}
      {showQR&&<QRModal item={showQR} onClose={()=>setShowQR(null)} />}
      {showScanner&&<ScanModal onClose={()=>setShowScanner(false)} onResult={onScan} />}
      {showAddFolder&&<FolderModal onClose={()=>setShowAddFolder(false)} onSave={addFolder} />}
      {showExport&&<ExportModal items={items} onClose={()=>setShowExport(false)} />}
      {showDashEditor&&<DashEditor widgets={widgets} onSave={async v=>{await saveWidgets(v);setShowDashEditor(false);}} onClose={()=>setShowDashEditor(false)} />}
    </div>
  );
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function Thumb({item,s}){const cls=`w-${s} h-${s} rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden`;if(item?.image)return<img src={item.image} alt="" className={cls+" object-cover"} />;return<div className={cls}><Package className="w-4 h-4 text-slate-400" /></div>;}
function KPI({label,value,sub,icon:Icon,accent,trend}){const a={emerald:["bg-emerald-50","text-emerald-600"],blue:["bg-blue-50","text-blue-600"],violet:["bg-violet-50","text-violet-600"],amber:["bg-amber-50","text-amber-600"],red:["bg-red-50","text-red-600"],slate:["bg-slate-100","text-slate-500"]}[accent]||["bg-slate-100","text-slate-500"];return(<div className="bg-white rounded-xl lg:rounded-2xl border border-slate-200 p-3.5 lg:p-5 hover:shadow-md transition-all"><div className="flex items-start justify-between mb-2 lg:mb-3"><div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl ${a[0]} flex items-center justify-center`}><Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${a[1]}`} strokeWidth={2.2} /></div>{trend&&<span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{trend}</span>}</div><div className="text-lg lg:text-2xl font-bold text-slate-900">{value}</div><div className="text-xs lg:text-sm font-medium text-slate-700 mt-0.5">{label}</div><div className="text-[11px] text-slate-500">{sub}</div></div>);}
function IBtn({onClick,icon:Icon,danger}){return<button onClick={onClick} className={`p-1.5 lg:p-2 rounded-lg transition-colors active:scale-95 ${danger?"hover:bg-red-50 text-slate-400 hover:text-red-600":"hover:bg-slate-100 text-slate-400 hover:text-slate-900"}`}><Icon className="w-4 h-4" /></button>;}
function EmptyState({icon:Icon,msg,sub}){return<div className="bg-white rounded-2xl border border-slate-200 py-16 text-center"><div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3"><Icon className="w-6 h-6 text-slate-400" /></div><div className="font-medium text-slate-900">{msg}</div><div className="text-sm text-slate-500 mt-1">{sub}</div></div>;}
function DayBadge({label,days}){const cls=days<0?"bg-red-50 text-red-700":days<30?"bg-orange-50 text-orange-700":days<60?"bg-amber-50 text-amber-700":"bg-emerald-50 text-emerald-700";return<span className={`inline-block text-[10px] font-semibold px-2 py-1 rounded-md ${cls}`}>{label}: {days<0?`${Math.abs(days)}d überfällig`:`in ${days}d`}</span>;}
function NotifPanel({notifs,onClose}){return(<><div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between"><div className="font-semibold text-sm">Benachrichtigungen</div><button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button></div><div className="max-h-72 overflow-y-auto cs">{notifs.length===0&&<div className="px-4 py-8 text-center text-slate-400 text-sm">Keine Warnungen ✓</div>}{notifs.map((n,i)=><div key={i} className={`px-4 py-3 border-b border-slate-100 flex items-start gap-3 ${n.days<0?"bg-red-50":n.days<30?"bg-amber-50/60":""}`}><div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${n.type==="expiry"?"bg-orange-100":"bg-amber-100"}`}>{n.type==="expiry"?<AlertTriangle className="w-4 h-4 text-orange-600" />:<Wrench className="w-4 h-4 text-amber-600" />}</div><div><div className="text-sm font-medium">{n.item.name}</div><div className="text-xs text-slate-500 mt-0.5">{n.type==="expiry"?"Ablaufdatum":"Wartung"}: <span className={`font-semibold ${n.days<0?"text-red-600":n.days<30?"text-amber-600":"text-slate-700"}`}>{n.days<0?`${Math.abs(n.days)}d überfällig`:`in ${n.days}d`}</span></div></div></div>)}</div></>);}
function CategoryChart({items}){const bc=items.reduce((a,i)=>{const c=i.category||"Sonstiges";a[c]=(a[c]||0)+Number(i.value||0)*(Number(i.quantity)||1);return a;},{});const e=Object.entries(bc).sort((a,b)=>b[1]-a[1]);const t=e.reduce((s,[,v])=>s+v,0);const C=["bg-emerald-500","bg-blue-500","bg-violet-500","bg-amber-500","bg-rose-500","bg-teal-500"];if(!e.length)return<div className="text-sm text-slate-400 text-center py-6">Keine Daten</div>;return<div><div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 mb-4">{e.map(([c,v],i)=><div key={c} className={C[i%6]} style={{width:`${(v/t)*100}%`}} />)}</div><div className="space-y-1.5">{e.map(([c,v],i)=><div key={c} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${C[i%6]}`} /><span className="text-sm text-slate-700">{c}</span></div><div className="text-right"><div className="text-sm font-semibold">{fmt(v)} €</div><div className="text-[11px] text-slate-500">{Math.round((v/t)*100)}%</div></div></div>)}</div></div>;}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function Field({label,value,onChange,type="text",placeholder,mono}){return<div><label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label><input type={type} value={value===null||value===undefined?"":value} placeholder={placeholder} onChange={e=>onChange(e.target.value)} className={`w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none ${mono?"font-mono":""}`} /></div>;}

function ItemModal({item,initial,folders,currentFolder,onClose,onSave}){
  const[f,setF]=useState(item||{name:"",category:"Werkzeug",folderId:currentFolder||null,location:"",serial:"",value:0,quantity:1,unit:"Stk.",barcode:initial?.barcode||"",nextMaintenance:"",expiryDate:"",purchaseDate:today(),image:null});
  const fileRef=useRef(null);
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const handleImg=e=>{const file=e.target.files?.[0];if(!file)return;const img=new Image();img.onload=()=>{const c=document.createElement("canvas");const r=Math.min(400/img.width,400/img.height,1);c.width=img.width*r;c.height=img.height*r;c.getContext("2d").drawImage(img,0,0,c.width,c.height);upd("image",c.toDataURL("image/jpeg",0.75));};img.src=URL.createObjectURL(file);};
  const submit=()=>{if(!f.name)return alert("Bezeichnung erforderlich");onSave({...f,value:Number(f.value),quantity:Number(f.quantity)||1});};
  const totalPos=(Number(f.value)||0)*(Number(f.quantity)||1);
  return(
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl lg:rounded-2xl w-full lg:max-w-2xl shadow-2xl max-h-[92vh] flex flex-col slide-up" onClick={e=>e.stopPropagation()}>
        {/* Handle bar for mobile */}
        <div className="lg:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-slate-300 rounded-full" /></div>
        <div className="px-5 py-3 lg:py-4 border-b border-slate-100 flex items-center justify-between">
          <div><div className="font-semibold text-slate-900">{item?"Bearbeiten":"Neuer Artikel"}</div><div className="text-xs text-slate-500">Bild & Ablaufdatum optional</div></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="p-5 overflow-y-auto cs space-y-4">
          <div className="flex gap-4">
            <div className="w-24 flex-shrink-0">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bild</label>
              <div onClick={()=>fileRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-400 flex items-center justify-center cursor-pointer overflow-hidden relative transition-colors active:scale-95">
                {f.image?<><img src={f.image} alt="" className="w-full h-full object-cover" /><button onClick={e=>{e.stopPropagation();upd("image",null);}} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/90 shadow flex items-center justify-center"><X className="w-3 h-3" /></button></>:<div className="text-center text-slate-400"><ImageIcon className="w-5 h-5 mx-auto mb-1" /><div className="text-[10px]">Bild</div></div>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleImg} className="hidden" />
            </div>
            <div className="flex-1 space-y-3 min-w-0">
              <Field label="Bezeichnung *" value={f.name} onChange={v=>upd("name",v)} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Menge" type="number" value={f.quantity} onChange={v=>upd("quantity",v)} />
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Einheit</label><select value={f.unit||"Stk."} onChange={e=>upd("unit",e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none">{["Stk.","kg","l","m","Paar","Paket","Palette","Karton","Fl."].map(u=><option key={u}>{u}</option>)}</select></div>
              </div>
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <div className="text-xs text-emerald-700 font-semibold">Positionswert</div>
            <div className="text-lg font-bold text-emerald-700">{fmt(totalPos,2)} €</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Kategorie</label><select value={f.category} onChange={e=>upd("category",e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none">{["Werkzeug","IT","AV","Logistik","Möbel","Fahrzeug","Verbrauchsmaterial","Sonstiges"].map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Ordner</label><select value={f.folderId||""} onChange={e=>upd("folderId",e.target.value||null)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none"><option value="">— Hauptbereich —</option>{folders.map(fo=><option key={fo.id} value={fo.id}>{fo.name}</option>)}</select></div>
          </div>
          <Field label="Barcode / Produktcode" value={f.barcode} onChange={v=>upd("barcode",v)} placeholder="z.B. 4260123456789" mono />
          <Field label="Einzelwert (€)" type="number" value={f.value} onChange={v=>upd("value",v)} />
          <Field label="Seriennummer" value={f.serial} onChange={v=>upd("serial",v)} mono />
          <Field label="Standort" value={f.location} onChange={v=>upd("location",v)} />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Kaufdatum" type="date" value={f.purchaseDate} onChange={v=>upd("purchaseDate",v)} />
            <Field label="Ablaufdatum ⚠️" type="date" value={f.expiryDate} onChange={v=>upd("expiryDate",v)} />
            <Field label="Nächste Wartung 🔧" type="date" value={f.nextMaintenance} onChange={v=>upd("nextMaintenance",v)} />
          </div>
          {f.expiryDate&&<div className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl ${daysUntil(f.expiryDate)<0?"bg-red-50 text-red-700":daysUntil(f.expiryDate)<60?"bg-amber-50 text-amber-700":"bg-emerald-50 text-emerald-700"}`}><AlertTriangle className="w-4 h-4 flex-shrink-0" />{daysUntil(f.expiryDate)<0?`Abgelaufen seit ${Math.abs(daysUntil(f.expiryDate))} Tagen!`:daysUntil(f.expiryDate)<60?`Läuft in ${daysUntil(f.expiryDate)} Tagen ab`:`Gültig noch ${daysUntil(f.expiryDate)} Tage`}</div>}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="flex-1 lg:flex-none px-4 py-3 rounded-xl text-sm font-medium text-slate-700 border border-slate-200 active:scale-95 transition-transform">Abbrechen</button>
          <button onClick={submit} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-sm shadow-emerald-200 active:scale-95 transition-transform">Speichern</button>
        </div>
      </div>
    </div>
  );
}

function LoanModal({item,onClose,onLoan}){const[b,setB]=useState("");const[r,setR]=useState("");const[q,setQ]=useState(1);const mx=item.quantity||1;return(<div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center" onClick={onClose}><div className="bg-white rounded-t-3xl lg:rounded-2xl w-full lg:max-w-md shadow-2xl slide-up" onClick={e=>e.stopPropagation()}><div className="lg:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-slate-300 rounded-full" /></div><div className="px-5 py-3 lg:py-4 border-b border-slate-100 flex items-center justify-between"><div className="font-semibold">Artikel ausleihen</div><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button></div><div className="p-5 space-y-4"><div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3"><Thumb item={item} s={12} /><div><div className="font-medium text-sm">{item.name}</div><div className="text-xs text-emerald-700">Bestand: {mx} {item.unit||"Stk."}</div></div></div><div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Menge</label><div className="flex items-center gap-2"><button onClick={()=>setQ(Math.max(1,q-1))} className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center active:scale-95"><Minus className="w-4 h-4" /></button><input type="number" value={q} min={1} max={mx} onChange={e=>setQ(Math.max(1,Math.min(mx,Number(e.target.value))))} className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-center font-semibold focus:border-emerald-400 focus:outline-none" /><button onClick={()=>setQ(Math.min(mx,q+1))} className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center active:scale-95"><Plus className="w-4 h-4" /></button><span className="text-sm text-slate-500 w-10">{item.unit||"Stk."}</span></div></div><Field label="Entleiher *" value={b} onChange={setB} /><Field label="Geplante Rückgabe" type="date" value={r} onChange={setR} /></div><div className="px-5 py-4 border-t border-slate-100 flex gap-2"><button onClick={onClose} className="flex-1 lg:flex-none px-4 py-3 rounded-xl text-sm font-medium border border-slate-200 active:scale-95 transition-transform">Abbrechen</button><button onClick={()=>b&&onLoan(item.id,b,r,q)} disabled={!b} className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-sm shadow-emerald-200 active:scale-95 transition-transform">Bestätigen</button></div></div></div>);}

function QRModal({item,onClose}){const cells=21,seed=item.id.split("").reduce((a,c)=>a+c.charCodeAt(0),0),grid=[];for(let r=0;r<cells;r++){const row=[];for(let c=0;c<cells;c++){const inF=(r<7&&c<7)||(r<7&&c>=cells-7)||(r>=cells-7&&c<7);if(inF){const rr=r<7?r:r-(cells-7),cc=c<7?c:c>=cells-7?c-(cells-7):c;row.push((rr===0||rr===6||cc===0||cc===6)||(rr>=2&&rr<=4&&cc>=2&&cc<=4));}else row.push(((r*cells+c+seed)*2654435761%2)===0);}grid.push(row);}return(<div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center" onClick={onClose}><div className="bg-white rounded-t-3xl lg:rounded-2xl w-full lg:max-w-sm shadow-2xl slide-up" onClick={e=>e.stopPropagation()}><div className="lg:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-slate-300 rounded-full" /></div><div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between"><div className="font-semibold">QR-Etikett</div><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button></div><div className="p-5"><div className="bg-white p-4 border-2 border-slate-100 rounded-xl max-w-[180px] mx-auto"><div className="grid gap-0" style={{gridTemplateColumns:`repeat(${cells},1fr)`}}>{grid.flat().map((on,i)=><div key={i} className={`aspect-square ${on?"bg-slate-900":"bg-white"}`} />)}</div></div><div className="mt-4 text-center"><div className="font-semibold">{item.name}</div><div className="text-xs text-slate-500 font-mono mt-1">{item.id}</div>{item.barcode&&<div className="text-xs text-slate-500 font-mono">Barcode: {item.barcode}</div>}</div><button onClick={()=>window.print()} className="w-full mt-4 bg-emerald-500 text-white py-3 rounded-xl text-sm font-semibold active:scale-95 transition-transform">Drucken</button></div></div></div>);}

function ScanModal({onClose,onResult}){const vr=useRef(null);const[status,setStatus]=useState("init");const[code,setCode]=useState("");const sr=useRef(null);const done=useRef(false);useEffect(()=>{const stop=()=>{done.current=true;sr.current?.getTracks().forEach(t=>t.stop());};const start=async()=>{if(!navigator.mediaDevices?.getUserMedia){setStatus("unsupported");return;}try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}}});sr.current=stream;if(vr.current){vr.current.srcObject=stream;await vr.current.play();}setStatus("running");if("BarcodeDetector"in window){const det=new window.BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e","code_128","code_39","qr_code","data_matrix"]});const loop=async()=>{if(done.current)return;try{const codes=await det.detect(vr.current);if(codes?.length){stop();onResult(codes[0].rawValue);return;}}catch{}requestAnimationFrame(loop);};requestAnimationFrame(loop);}}catch{setStatus("error");}};start();return stop;},[onResult]);
return(<div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center" onClick={onClose}><div className="bg-white rounded-t-3xl lg:rounded-2xl w-full lg:max-w-md shadow-2xl overflow-hidden slide-up" onClick={e=>e.stopPropagation()}><div className="lg:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-slate-300 rounded-full" /></div><div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between"><div className="flex items-center gap-2"><ScanLine className="w-4 h-4 text-emerald-600" /><div className="font-semibold">Barcode scannen</div></div><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button></div><div className="bg-slate-900 aspect-video relative overflow-hidden"><video ref={vr} className="w-full h-full object-cover" playsInline muted />{status==="running"&&<div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-3/4 h-3/4 relative">{["tl","tr","bl","br"].map(p=><div key={p} className={`absolute w-6 h-6 border-emerald-400 ${p.includes("t")?"top-0 border-t-4":"bottom-0 border-b-4"} ${p.includes("l")?"left-0 border-l-4":"right-0 border-r-4"}`} />)}<div className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" style={{animation:"scan 2s ease-in-out infinite"}} /></div><div className="absolute bottom-3 bg-black/60 text-white/90 text-xs px-3 py-1.5 rounded-full">{"BarcodeDetector"in window?"Code in Rahmen halten":"Code unten eingeben"}</div></div>}{status==="init"&&<div className="absolute inset-0 flex items-center justify-center text-white/80"><div className="text-center"><Camera className="w-8 h-8 mx-auto mb-2 animate-pulse" /><div className="text-sm">Kamera startet…</div></div></div>}{(status==="error"||status==="unsupported")&&<div className="absolute inset-0 flex items-center justify-center p-6"><div className="text-center text-white"><AlertCircle className="w-10 h-10 mx-auto mb-3 text-amber-400" /><div className="font-semibold mb-1">{status==="unsupported"?"Kein Kamerazugriff":"Berechtigung verweigert"}</div><div className="text-xs text-white/70">Code unten manuell eingeben.</div></div></div>}</div><div className="p-4"><div className="text-xs font-semibold text-slate-600 mb-2">Code manuell eingeben:</div><div className="flex gap-2"><input type="text" value={code} onChange={e=>setCode(e.target.value)} onKeyDown={e=>e.key==="Enter"&&code&&onResult(code)} placeholder="z.B. 4260123456789" autoFocus={status!=="running"} inputMode="numeric" className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:border-emerald-400 focus:outline-none" /><button onClick={()=>code&&onResult(code)} disabled={!code} className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 text-white px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-transform">OK</button></div></div></div></div>);}

function FolderModal({onClose,onSave}){const[n,setN]=useState("");const[c,setC]=useState("emerald");const COLORS=[["emerald","from-emerald-400 to-teal-500"],["blue","from-blue-400 to-cyan-500"],["violet","from-violet-400 to-purple-500"],["amber","from-amber-400 to-orange-500"],["rose","from-rose-400 to-pink-500"]];return(<div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center" onClick={onClose}><div className="bg-white rounded-t-3xl lg:rounded-2xl w-full lg:max-w-sm shadow-2xl slide-up" onClick={e=>e.stopPropagation()}><div className="lg:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-slate-300 rounded-full" /></div><div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between"><div className="font-semibold">Neuer Ordner</div><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button></div><div className="p-5 space-y-4"><Field label="Ordnername" value={n} onChange={setN} /><div><label className="block text-xs font-semibold text-slate-600 mb-2">Farbe</label><div className="flex gap-2">{COLORS.map(([id,cls])=><button key={id} onClick={()=>setC(id)} className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cls} ${c===id?"ring-2 ring-offset-2 ring-slate-900":""} active:scale-95 transition-transform`} />)}</div></div></div><div className="px-5 py-4 border-t border-slate-100 flex gap-2"><button onClick={onClose} className="flex-1 lg:flex-none px-4 py-3 rounded-xl text-sm font-medium border border-slate-200">Abbrechen</button><button onClick={()=>n&&onSave(n,c)} disabled={!n} className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-sm shadow-emerald-200 active:scale-95 transition-transform">Erstellen</button></div></div></div>);}

function ExportModal({items,onClose}){const[f,setF]=useState("all");const fi=f==="all"?items:f==="expiry"?items.filter(i=>i.expiryDate&&daysUntil(i.expiryDate)<60):items.filter(i=>i.nextMaintenance&&daysUntil(i.nextMaintenance)<60);return(<div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center" onClick={onClose}><div className="bg-white rounded-t-3xl lg:rounded-2xl w-full lg:max-w-lg shadow-2xl slide-up" onClick={e=>e.stopPropagation()}><div className="lg:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-slate-300 rounded-full" /></div><div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between"><div><div className="font-semibold">Export</div><div className="text-xs text-slate-500">{fi.length} Artikel</div></div><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button></div><div className="p-5 space-y-4"><div className="grid grid-cols-3 gap-2">{[["all","Alles"],["expiry","Ablauf"],["maint","Wartung"]].map(([v,l])=><button key={v} onClick={()=>setF(v)} className={`py-2 rounded-xl text-xs font-medium border transition-all active:scale-95 ${f===v?"border-emerald-500 bg-emerald-50 text-emerald-700":"border-slate-200 text-slate-600"}`}>{l}</button>)}</div><div className="space-y-2"><button onClick={()=>{exportCSV(fi);onClose();}} className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-left transition-all active:scale-[0.99]"><FileText className="w-5 h-5 text-slate-500" /><div><div className="font-semibold text-sm">CSV exportieren</div><div className="text-xs text-slate-500">Für Excel, Google Sheets</div></div><ChevronRight className="w-4 h-4 text-slate-400 ml-auto" /></button><button onClick={()=>{exportJSON(fi);onClose();}} className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-left transition-all active:scale-[0.99]"><Download className="w-5 h-5 text-slate-500" /><div><div className="font-semibold text-sm">JSON exportieren</div><div className="text-xs text-slate-500">Rohdaten</div></div><ChevronRight className="w-4 h-4 text-slate-400 ml-auto" /></button><button onClick={()=>{printInventory(fi);onClose();}} className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50 text-left transition-all active:scale-[0.99]"><FileText className="w-5 h-5 text-slate-500" /><div><div className="font-semibold text-sm">Drucken / PDF</div><div className="text-xs text-slate-500">Formatierte Tabelle</div></div><ChevronRight className="w-4 h-4 text-slate-400 ml-auto" /></button></div></div></div></div>);}

function DashEditor({widgets,onSave,onClose}){const[local,setLocal]=useState({...widgets});const toggle=id=>setLocal(p=>({...p,[id]:!p[id]}));const groups=["kpi","large","small"];const gLabel={kpi:"Kennzahlen",large:"Große Karten",small:"Kleine Widgets"};return(<div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center" onClick={onClose}><div className="bg-white rounded-t-3xl lg:rounded-2xl w-full lg:max-w-lg shadow-2xl slide-up" onClick={e=>e.stopPropagation()}><div className="lg:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-slate-300 rounded-full" /></div><div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between"><div><div className="font-semibold flex items-center gap-2"><LayoutDashboard className="w-4 h-4 text-emerald-600" /> Dashboard anpassen</div><div className="text-xs text-slate-500">Widgets ein- und ausblenden</div></div><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button></div><div className="p-5 space-y-4 max-h-[55vh] overflow-y-auto cs">{groups.map(g=><div key={g}><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{gLabel[g]}</div><div className="space-y-1">{ALL_WIDGETS.filter(wg=>wg.group===g).map(widget=>{const on=local[widget.id]!==false;return(<div key={widget.id} onClick={()=>toggle(widget.id)} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all active:scale-[0.99] ${on?"border-emerald-200 bg-emerald-50":"border-slate-200 hover:bg-slate-50"}`}><div className={`w-8 h-5 rounded-full flex-shrink-0 relative transition-colors ${on?"bg-emerald-500":"bg-slate-300"}`}><div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on?"translate-x-3.5":"translate-x-0.5"}`} /></div><div className="flex-1"><div className="text-sm font-medium">{widget.label}</div></div>{on?<Eye className="w-4 h-4 text-emerald-600" />:<EyeOff className="w-4 h-4 text-slate-400" />}</div>);})}</div></div>)}</div><div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between"><button onClick={()=>setLocal(Object.fromEntries(ALL_WIDGETS.map(w=>[w.id,w.defaultOn])))} className="text-sm text-slate-500 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Reset</button><div className="flex gap-2"><button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200">Abbrechen</button><button onClick={()=>onSave(local)} className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-emerald-200 active:scale-95 transition-transform">Speichern</button></div></div></div></div>);}
