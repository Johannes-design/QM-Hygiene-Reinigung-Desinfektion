import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc as fsDoc,
} from "firebase/firestore";

// ─── Konstanten ─────────────────────────────────────────────────────────────

const MONATE = [
  "Januar","Februar","März","April","Mai","Juni",
  "Juli","August","September","Oktober","November","Dezember",
];

const CHECKS = [
  { id: "trage_desinfiziert",    label: "Überführungstrage desinfiziert" },
  { id: "auto_gereinigt",        label: "Auto gereinigt" },
  { id: "kuehlraum_desinfiziert",label: "Kühlraum kontrolliert und desinfiziert" },
  { id: "hygieneraum_desinfiziert", label: "Hygieneraum desinfizieren" },
];

const AUTOS   = ["Mercedes", "Sprinter", "Volvo"];
const KUERZEL = ["JU", "SK", "VB", "EP", "SB", "NC", "MU"];

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

function today()   { return new Date().toISOString().slice(0, 10); }
function nowTime() {
  return new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function emptyForm() {
  return {
    datum:    today(),
    uhrzeit:  nowTime(),
    checks:   { trage_desinfiziert: false, auto_gereinigt: false, kuehlraum_desinfiziert: false, hygieneraum_desinfiziert: false },
    autos:    [],
    temperatur: "4.5",
    kuerzel:  "",
    bemerkung: "",
  };
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [view,       setView]       = useState("form");   // "form" | "history" | "print"
  const [form,       setForm]       = useState(emptyForm());
  const [eintraege,  setEintraege]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [printEntry, setPrintEntry] = useState(null);
  const [exportMonat, setExportMonat] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  });

  // Firestore laden
  useEffect(() => { loadEintraege(); }, []);

  async function loadEintraege() {
    setLoading(true);
    try {
      const q = query(collection(db, "eintraege"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEintraege(data);
    } catch (e) {
      console.error("Laden fehlgeschlagen:", e);
    }
    setLoading(false);
  }

  async function saveEintrag() {
    if (!form.temperatur || !form.kuerzel) {
      alert("Bitte Temperatur und Kürzel eintragen.");
      return;
    }
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, "eintraege"), {
        ...form,
        createdAt: serverTimestamp(),
      });
      const neuerEintrag = { id: docRef.id, ...form };
      setEintraege(prev => [neuerEintrag, ...prev]);
      setSaved(true);
      setTimeout(() => { setSaved(false); setForm(emptyForm()); }, 1500);
    } catch (e) {
      alert("Fehler beim Speichern: " + e.message);
    }
    setSaving(false);
  }

  function handleCheck(id) {
    setForm(f => ({ ...f, checks: { ...f.checks, [id]: !f.checks[id] } }));
  }

  function openPrint(entry) { setPrintEntry(entry); setView("print"); }

  async function deleteEintrag(id) {
    if (!window.confirm("Eintrag wirklich löschen?")) return;
    try {
      await deleteDoc(fsDoc(db, "eintraege", id));
      setEintraege(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      alert("Fehler beim Löschen: " + e.message);
    }
  }

  // Monatsexport
  function printMonat() {
    const [year, mon] = exportMonat.split("-");
    const filtered = eintraege
      .filter(e => e.datum && e.datum.startsWith(exportMonat))
      .sort((a, b) => a.datum.localeCompare(b.datum));
    const monatsname = MONATE[parseInt(mon, 10) - 1];

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>QM Kühlraum \${monatsname} \${year}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: Arial, Helvetica, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #000; font-size: 13px; }
  .header { border-bottom: 3px solid #1a1a2e; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
  .header-left .sub { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #888; margin-bottom: 4px; }
  .header-left h1 { font-size: 20px; margin: 0; color: #1a1a2e; }
  .header-left .monat { font-size: 14px; font-weight: bold; margin-top: 4px; }
  .header-right { font-size: 11px; color: #888; text-align: right; }
  .eintrag { border: 1px solid #ddd; border-radius: 6px; margin-bottom: 12px; overflow: hidden; page-break-inside: avoid; }
  .eintrag-header { background: #f4f5f0; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; }
  .eintrag-datum { font-weight: bold; font-size: 14px; }
  .eintrag-meta { font-size: 12px; color: #555; }
  .eintrag-temp { font-size: 13px; font-weight: bold; }
  .temp-ok { color: #2e7d32; }
  .temp-warn { color: #c62828; }
  .eintrag-body { padding: 10px 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
  .check-row { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 3px 0; }
  .check-ok   { color: #2e7d32; font-size: 16px; line-height: 1; }
  .check-warn { color: #ddd;    font-size: 16px; line-height: 1; }
  .eintrag-footer { background: #fafaf9; border-top: 1px solid #eee; padding: 6px 14px; display: flex; justify-content: space-between; font-size: 11px; color: #777; }
  .kuerzel { font-weight: bold; color: #1a1a2e; font-size: 13px; }
  .fahrzeug { display: inline-block; background: #e8eaf6; color: #3949ab; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: bold; }
  .footer { border-top: 1px solid #ccc; padding-top: 10px; margin-top: 20px; font-size: 10px; color: #aaa; display: flex; justify-content: space-between; }
  @media print { body { padding: 0; } }
</style>
</head><body>
<div class="header">
  <div class="header-left">
    <div class="sub">Bestattungshaus Kallwaß — QM-Dokumentation</div>
    <h1>Kühlraum-Kontrollbuch</h1>
    <div class="monat">\${monatsname} \${year} · \${filtered.length} Einträge</div>
  </div>
  <div class="header-right">Erstellt: \${new Date().toLocaleDateString("de-DE")}</div>
</div>

\${filtered.length === 0
  ? '<p style="color:#999;text-align:center;padding:40px 0;">Keine Einträge für diesen Monat.</p>'
  : filtered.map(e => {
      const tHigh = parseFloat(e.temperatur) > 6;
      const c = e.checks || {};
      const fahrzeug = (e.autos && e.autos.length > 0 ? e.autos.join(", ") : e.auto) || null;
      const chk = (ok, label) => \`<div class="check-row"><span class="\${ok ? 'check-ok' : 'check-warn'}">\${ok ? '✓' : '✗'}</span><span style="color:\${ok ? '#000' : '#aaa'}">\${label}</span></div>\`;
      return \`
      <div class="eintrag">
        <div class="eintrag-header">
          <div>
            <span class="eintrag-datum">\${formatDate(e.datum)}</span>
            <span class="eintrag-meta" style="margin-left:12px;">\${e.uhrzeit} Uhr</span>
            \${fahrzeug ? \`<span class="fahrzeug" style="margin-left:10px;">\${fahrzeug}</span>\` : ''}
          </div>
          <span class="eintrag-temp \${tHigh ? 'temp-warn' : 'temp-ok'}">\${e.temperatur} °C\${tHigh ? ' ⚠' : ''}</span>
        </div>
        <div class="eintrag-body">
          \${chk(c.trage_desinfiziert, 'Überführungstrage desinfiziert')}
          \${chk(c.kuehlraum_desinfiziert, 'Kühlraum kontrolliert und desinfiziert')}
          \${chk(c.auto_gereinigt, 'Auto gereinigt')}
          \${chk(c.hygieneraum_desinfiziert, 'Hygieneraum desinfizieren')}
        </div>
        <div class="eintrag-footer">
          <span>\${e.bemerkung ? '📝 ' + e.bemerkung : ''}</span>
          <span class="kuerzel">\${e.kuerzel}</span>
        </div>
      </div>\`;
    }).join("")
}
<div class="footer">
  <span>Bestattungshaus Kallwaß · Kühlraum-Kontrollbuch \${monatsname} \${year}</span>
  <span>Erstellt: \${new Date().toLocaleDateString("de-DE")}</span>
</div>
</body></html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }

  const allChecked = Object.values(form.checks).every(Boolean);
  const tempHigh   = form.temperatur !== "" && parseFloat(form.temperatur) > 6;

  // ── Styles (wiederverwendbar) ─────────────────────────────────────────────
  const s = {
    btn: (active) => ({
      padding: "10px 16px", borderRadius: 8,
      border: active ? "2px solid #1a1a2e" : "2px solid #e0e0d8",
      background: active ? "#1a1a2e" : "#fff",
      color: active ? "#fff" : "#333",
      fontFamily: "inherit", fontSize: 14, fontWeight: "bold",
      cursor: "pointer", transition: "all 0.15s",
      WebkitTapHighlightColor: "transparent",
    }),
    section: { fontSize: 10, letterSpacing: 2, color: "#888", textTransform: "uppercase", marginBottom: 10 },
    card: { background: "#fff", borderRadius: 10, border: "1px solid #e0e0d8" },
  };

  // ── PRINT VIEW ─────────────────────────────────────────────────────────────
  if (view === "print" && printEntry) {
    const pTempHigh = parseFloat(printEntry.temperatur) > 6;
    const c = printEntry.checks || {};
    return (
      <div style={{ fontFamily: "'Courier New', monospace", maxWidth: 600, margin: "0 auto", padding: 32, background: "#fff" }}>
        <style>{`@media print { button { display: none !important; } }`}</style>
        <div style={{ borderBottom: "3px solid #000", paddingBottom: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#555" }}>Bestattungshaus Kallwaß</div>
          <div style={{ fontSize: 20, fontWeight: "bold", marginTop: 4 }}>Kühlraum-Kontrollbuch</div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, fontSize: 14 }}>
          <tbody>
            <tr><td style={{ padding: "6px 0", fontWeight: "bold", width: "45%" }}>Datum</td><td>{formatDate(printEntry.datum)}</td></tr>
            <tr><td style={{ padding: "6px 0", fontWeight: "bold" }}>Uhrzeit</td><td>{printEntry.uhrzeit} Uhr</td></tr>
            <tr>
              <td style={{ padding: "6px 0", fontWeight: "bold" }}>Temperatur</td>
              <td style={{ color: pTempHigh ? "red" : "inherit", fontWeight: pTempHigh ? "bold" : "normal" }}>
                {printEntry.temperatur} °C {pTempHigh ? "⚠ ÜBER 6 °C!" : ""}
              </td>
            </tr>
            {((printEntry.autos && printEntry.autos.length > 0) || printEntry.auto) && <tr><td style={{ padding: "6px 0", fontWeight: "bold" }}>Fahrzeug</td><td>{printEntry.autos && printEntry.autos.length > 0 ? printEntry.autos.join(", ") : printEntry.auto}</td></tr>}
          </tbody>
        </table>
        <div style={{ border: "1px solid #ccc", borderRadius: 4, overflow: "hidden", marginBottom: 20 }}>
          {CHECKS.map((ch, i) => (
            <div key={ch.id} style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: i < CHECKS.length - 1 ? "1px solid #eee" : "none", background: c[ch.id] ? "#f0fff4" : "#fff9f9" }}>
              <span style={{ fontSize: 18, marginRight: 12 }}>{c[ch.id] ? "☑" : "☐"}</span>
              <span style={{ fontSize: 14 }}>{ch.label}</span>
            </div>
          ))}
        </div>
        {printEntry.bemerkung && (
          <div style={{ marginBottom: 20, padding: "10px 14px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14 }}>
            <strong>Bemerkung:</strong><br />{printEntry.bemerkung}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #000", paddingTop: 16, marginTop: 32 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 160, borderBottom: "1px solid #000", marginBottom: 4, paddingBottom: 2 }}>{printEntry.kuerzel}</div>
            <div style={{ fontSize: 11, color: "#666" }}>Kürzel / Unterschrift</div>
          </div>
          <div style={{ fontSize: 11, color: "#999", alignSelf: "flex-end" }}>Nr.: {typeof printEntry.id === "string" ? printEntry.id.slice(-6).toUpperCase() : printEntry.id}</div>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button onClick={() => window.print()} style={{ padding: "10px 20px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>🖨 Drucken / PDF</button>
          <button onClick={() => setView("history")} style={{ padding: "10px 20px", background: "#eee", color: "#333", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>← Zurück</button>
        </div>
      </div>
    );
  }

  // ── HISTORY VIEW ───────────────────────────────────────────────────────────
  if (view === "history") {
    const exportAnzahl = eintraege.filter(e => e.datum && e.datum.startsWith(exportMonat)).length;
    return (
      <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", maxWidth: 640, margin: "0 auto", padding: "24px 16px", background: "#f4f5f0", minHeight: "100vh" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');`}</style>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#888", textTransform: "uppercase" }}>Bestattungshaus Kallwaß</div>
            <div style={{ fontSize: 22, fontWeight: "bold", color: "#1a1a2e", marginTop: 2 }}>Einträge</div>
          </div>
          <button onClick={() => setView("form")} style={{ padding: "8px 16px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>+ Neuer Eintrag</button>
        </div>

        {/* Monatsexport */}
        <div style={{ ...s.card, padding: 16, marginBottom: 20 }}>
          <div style={s.section}>📁 Monatsexport QM-Ordner</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select value={exportMonat} onChange={e => setExportMonat(e.target.value)}
              style={{ flex: 1, minWidth: 160, padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontFamily: "inherit", fontSize: 13, background: "#f9f9f7", color: "#1a1a2e", outline: "none" }}>
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
                const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                return <option key={val} value={val}>{MONATE[d.getMonth()]} {d.getFullYear()}</option>;
              })}
            </select>
            <button onClick={printMonat}
              style={{ padding: "10px 18px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: "bold", whiteSpace: "nowrap" }}>
              🖨 PDF ({exportAnzahl})
            </button>
          </div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 8 }}>
            {exportAnzahl === 0 ? "Keine Einträge für diesen Monat." : `${exportAnzahl} Eintrag${exportAnzahl !== 1 ? "e" : ""} im gewählten Monat`}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#aaa", fontSize: 13 }}>Laden…</div>
        ) : eintraege.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#aaa", fontSize: 13 }}>Noch keine Einträge vorhanden.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {eintraege.map(e => {
              const tHigh = parseFloat(e.temperatur) > 6;
              const allOk = e.checks && Object.values(e.checks).every(Boolean);
              return (
                <div key={e.id} style={{ background: "#fff", borderRadius: 8, padding: "14px 16px", border: `1px solid ${tHigh ? "#ffcdd2" : "#e8e8e8"}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: "bold", color: "#1a1a2e" }}>{formatDate(e.datum)}</span>
                      <span style={{ fontSize: 12, color: "#999" }}>{e.uhrzeit} Uhr</span>
                      {(e.autos && e.autos.length > 0 ? e.autos : e.auto ? [e.auto] : []).map(a => <span key={a} style={{ fontSize: 12, padding: "1px 7px", borderRadius: 999, background: "#e8eaf6", color: "#3949ab", fontWeight: "bold" }}>{ a }</span>)}
                      <span style={{ fontSize: 12, padding: "1px 7px", borderRadius: 999, background: allOk ? "#e8f5e9" : "#fce4ec", color: allOk ? "#2e7d32" : "#c62828", fontWeight: "bold" }}>
                        {allOk ? "✓ OK" : "⚠ Unvollständig"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: tHigh ? "#c62828" : "#555" }}>
                      🌡 {e.temperatur} °C{tHigh ? " — ACHTUNG: über 6 °C!" : ""}
                      <span style={{ marginLeft: 12, color: "#888" }}>| {e.kuerzel}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}><button onClick={() => openPrint(e)} style={{ padding: "7px 14px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>🖨</button><button onClick={() => deleteEintrag(e.id)} style={{ padding: "7px 14px", background: "#fce4ec", color: "#c62828", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>🗑</button></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── FORM VIEW ──────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", maxWidth: 520, margin: "0 auto", background: "#f4f5f0", minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap'); * { box-sizing: border-box; }`}</style>

      <div style={{ background: "#1a1a2e", color: "#fff", padding: "20px 20px 16px" }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: "#8888aa", textTransform: "uppercase" }}>Bestattungshaus Kallwaß</div>
        <div style={{ fontSize: 20, fontWeight: "bold", marginTop: 2 }}>Kühlraum-Kontrolle</div>
        <div style={{ fontSize: 12, color: "#8888aa", marginTop: 6 }}>{formatDate(form.datum)} · {form.uhrzeit} Uhr</div>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Checkliste */}
        <div>
          <div style={s.section}>Checkliste</div>
          <div style={{ ...s.card, overflow: "hidden" }}>
            {CHECKS.map((c, i) => (
              <div key={c.id}>
                <label onClick={() => handleCheck(c.id)} style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: c.id !== "auto_gereinigt" && i < CHECKS.length - 1 ? "1px solid #f0f0ea" : "none", cursor: "pointer", background: form.checks[c.id] ? "#f0fff4" : "#fff", transition: "background 0.15s" }}>
                  <div style={{ width: 22, height: 22, borderRadius: 5, border: form.checks[c.id] ? "2px solid #2e7d32" : "2px solid #ccc", background: form.checks[c.id] ? "#2e7d32" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 14, flexShrink: 0, transition: "all 0.15s" }}>
                    {form.checks[c.id] && <span style={{ color: "#fff", fontSize: 14, lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 14, color: form.checks[c.id] ? "#2e7d32" : "#333", fontWeight: form.checks[c.id] ? "500" : "400" }}>{c.label}</span>
                </label>
                {c.id === "auto_gereinigt" && (
                  <div style={{ padding: "10px 16px 14px", borderBottom: "1px solid #f0f0ea", background: form.checks.auto_gereinigt ? "#f0fff4" : "#fafaf8" }}>
                    <div style={{ fontSize: 10, letterSpacing: 1, color: "#aaa", textTransform: "uppercase", marginBottom: 8 }}>Fahrzeug</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {AUTOS.map(a => (
                        <button key={a} onClick={() => setForm(f => ({ ...f, autos: f.autos.includes(a) ? f.autos.filter(x => x !== a) : [...f.autos, a] }))}
                          style={{ flex: 1, padding: "10px 4px", borderRadius: 8, border: form.autos.includes(a) ? "2px solid #1a1a2e" : "2px solid #ddd", background: form.autos.includes(a) ? "#1a1a2e" : "#fff", color: form.autos.includes(a) ? "#fff" : "#444", fontFamily: "inherit", fontSize: 13, fontWeight: "bold", cursor: "pointer", transition: "all 0.15s", WebkitTapHighlightColor: "transparent" }}>
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {allChecked && <div style={{ marginTop: 8, fontSize: 12, color: "#2e7d32", textAlign: "center" }}>✓ Alle Punkte erledigt</div>}
        </div>

        {/* Temperatur */}
        <div>
          <div style={s.section}>Temperatur Kühlraum</div>
          <div style={{ ...s.card, border: `2px solid ${tempHigh ? "#f44336" : "#e0e0d8"}`, padding: "12px 16px", transition: "border-color 0.2s" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <button
                onClick={() => setForm(f => ({ ...f, temperatur: (Math.round((parseFloat(f.temperatur) - 0.1) * 10) / 10).toFixed(1) }))}
                style={{ width: 72, height: 72, borderRadius: 12, border: "2px solid #e0e0d8", background: "#f4f5f0", color: "#1a1a2e", fontSize: 36, fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, WebkitTapHighlightColor: "transparent", userSelect: "none" }}>
                −
              </button>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 48, fontWeight: "bold", color: tempHigh ? "#c62828" : "#1a1a2e", lineHeight: 1 }}>{parseFloat(form.temperatur).toFixed(1)}</div>
                <div style={{ fontSize: 16, color: "#888", marginTop: 2 }}>°C</div>
              </div>
              <button
                onClick={() => setForm(f => ({ ...f, temperatur: (Math.round((parseFloat(f.temperatur) + 0.1) * 10) / 10).toFixed(1) }))}
                style={{ width: 72, height: 72, borderRadius: 12, border: "2px solid #e0e0d8", background: "#f4f5f0", color: "#1a1a2e", fontSize: 36, fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, WebkitTapHighlightColor: "transparent", userSelect: "none" }}>
                +
              </button>
            </div>
          </div>
          {tempHigh && <div style={{ marginTop: 6, fontSize: 12, color: "#c62828", fontWeight: "bold" }}>⚠ Achtung: Temperatur über 6 °C!</div>}
        </div>

        {/* Bemerkung */}
        <div>
          <div style={s.section}>Bemerkung (optional)</div>
          <textarea value={form.bemerkung} onChange={e => setForm(f => ({ ...f, bemerkung: e.target.value }))}
            placeholder="Besonderheiten, Mängel, Maßnahmen..." rows={2}
            style={{ width: "100%", borderRadius: 10, border: "1px solid #e0e0d8", padding: "12px 14px", fontSize: 13, fontFamily: "inherit", background: "#fff", resize: "vertical", outline: "none", color: "#333" }} />
        </div>

        {/* Kürzel */}
        <div>
          <div style={s.section}>Kürzel</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {KUERZEL.map(k => (
              <button key={k} onClick={() => setForm(f => ({ ...f, kuerzel: f.kuerzel === k ? "" : k }))} style={s.btn(form.kuerzel === k)}>{k}</button>
            ))}
          </div>
        </div>

        {/* Speichern */}
        <button onClick={saveEintrag} disabled={saving}
          style={{ padding: "16px", background: saved ? "#2e7d32" : saving ? "#555" : "#1a1a2e", color: "#fff", border: "none", borderRadius: 10, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: "bold", letterSpacing: 1, transition: "background 0.3s", marginTop: 4 }}>
          {saved ? "✓ Gespeichert!" : saving ? "Wird gespeichert…" : "Eintrag speichern"}
        </button>

        <button onClick={() => setView("history")}
          style={{ padding: "12px", background: "transparent", color: "#888", border: "1px solid #ddd", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
          Alle Einträge ansehen ({eintraege.length})
        </button>
      </div>
    </div>
  );
}
