import { useState, useEffect, useRef } from "react";
import {
  onAuth, registerUser, loginUser, logoutUser,
  uploadProfilePhoto, getUser,
  saveVoorspelling, getVoorspellingen, getAlleVoorspellingenDivisie,
  createPoule, joinPoule, getUserPoules,
  getRanglijst, saveUitslagen, getUitslagen, savePunten,
} from "./firebase";
import { DIVISIES, getWedstrijden, getGespeeldeWedstrijden, berekenPunten, MOCK_WEDSTRIJDEN } from "./api";

const C = {
  bg: "#0a0f1a", card: "rgba(255,255,255,.06)", border: "rgba(255,255,255,.09)",
  borderGreen: "rgba(34,197,94,.35)", borderGold: "rgba(212,175,55,.35)",
  green: "#22c55e", gold: "#f59e0b", red: "#ef4444", blue: "#3b82f6",
  text: "#f0f0f0", muted: "#6b7280", faint: "#141a26",
};

const fmt = d => { try { return new Date(d).toLocaleDateString("nl-NL", { weekday:"short", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }); } catch { return d; } };

function Avatar({ src, name, size = 40 }) {
  const [err, setErr] = useState(false);
  if (src && !err) return <img src={src} alt={name} onError={() => setErr(true)} style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />;
  const initials = (name || "?").substring(0,2).toUpperCase();
  const colors = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#22c55e","#ef4444","#06b6d4"];
  const color = colors[(name?.charCodeAt(0)||0) % colors.length];
  return <div style={{ width:size, height:size, borderRadius:"50%", background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*.35, fontWeight:700, color:"#fff", flexShrink:0 }}>{initials}</div>;
}

function WedstrijdKaart({ wedstrijd, voorspelling, onSave, saving, divisieKleur }) {
  const [thuis, setThuis] = useState(voorspelling?.thuis ?? "");
  const [uit, setUit]     = useState(voorspelling?.uit   ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (voorspelling) { setThuis(voorspelling.thuis); setUit(voorspelling.uit); }
  }, [voorspelling]);

  async function opslaan() {
    if (thuis === "" || uit === "") return;
    await onSave(thuis, uit);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  const isPast = new Date(wedstrijd.datum) < new Date();
  const heeftVoorspelling = voorspelling !== undefined && voorspelling !== null;

  return (
    <div style={{ background:"rgba(255,255,255,.05)", border:`1px solid ${heeftVoorspelling ? `${divisieKleur}44` : "rgba(255,255,255,.08)"}`, borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
      <div style={{ fontSize:11, color:C.muted, marginBottom:8 }}>
        {wedstrijd.speelronde ? `Speelronde ${wedstrijd.speelronde} · ` : ""}{fmt(wedstrijd.datum)}
        {isPast && <span style={{ color:C.red, marginLeft:6 }}>⚠️ Al begonnen</span>}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <div style={{ flex:1, fontSize:15, fontWeight:600, textAlign:"right" }}>{wedstrijd.thuis}</div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <input type="number" min="0" max="20" value={thuis} onChange={e=>setThuis(e.target.value)} disabled={isPast} style={{ width:46, textAlign:"center", fontSize:17, fontWeight:700, padding:"8px 4px", background:"rgba(255,255,255,.1)", border:`1px solid ${divisieKleur}55`, borderRadius:8, color:"#fff" }} />
          <span style={{ color:C.muted, fontWeight:700, fontSize:16 }}>-</span>
          <input type="number" min="0" max="20" value={uit} onChange={e=>setUit(e.target.value)} disabled={isPast} style={{ width:46, textAlign:"center", fontSize:17, fontWeight:700, padding:"8px 4px", background:"rgba(255,255,255,.1)", border:`1px solid ${divisieKleur}55`, borderRadius:8, color:"#fff" }} />
        </div>
        <div style={{ flex:1, fontSize:15, fontWeight:600 }}>{wedstrijd.uit}</div>
      </div>
      {!isPast && (
        <button onClick={opslaan} disabled={saving || thuis==="" || uit===""} style={{ width:"100%", padding:"9px 0", borderRadius:10, background:saved?"rgba(34,197,94,.2)":`${divisieKleur}22`, border:`1px solid ${saved?"rgba(34,197,94,.4)":`${divisieKleur}55`}`, color:saved?C.green:divisieKleur, fontSize:13, fontWeight:600, cursor:"pointer", opacity:(saving||thuis===""||uit==="")?.5:1 }}>
          {saved ? "✓ Opgeslagen!" : saving ? "Opslaan..." : "Voorspelling Opslaan"}
        </button>
      )}
    </div>
  );
}

function GespeeldeKaart({ wedstrijd, voorspelling, punten }) {
  const score = wedstrijd.score;
  return (
    <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:14, padding:"12px 16px", marginBottom:8 }}>
      <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>{wedstrijd.speelronde ? `Speelronde ${wedstrijd.speelronde}` : fmt(wedstrijd.datum)}</div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ flex:1, fontSize:14, fontWeight:500, textAlign:"right" }}>{wedstrijd.thuis}</div>
        <div style={{ textAlign:"center", minWidth:80 }}>
          {score ? <div style={{ fontSize:18, fontWeight:700 }}>{score.thuis} - {score.uit}</div> : <div style={{ color:C.muted }}>- - -</div>}
          {voorspelling && <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>Jij: {voorspelling.thuis}-{voorspelling.uit}</div>}
        </div>
        <div style={{ flex:1, fontSize:14, fontWeight:500 }}>{wedstrijd.uit}</div>
        {voorspelling && (
          <div style={{ width:34, height:34, borderRadius:"50%", background:punten===3?"rgba(34,197,94,.2)":punten===1?"rgba(245,158,11,.2)":"rgba(239,68,68,.08)", border:`1px solid ${punten===3?"rgba(34,197,94,.4)":punten===1?"rgba(245,158,11,.3)":"rgba(239,68,68,.15)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:punten===3?C.green:punten===1?C.gold:C.muted, flexShrink:0 }}>
            {punten}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser]         = useState(null);
  const [userData, setUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authTab, setAuthTab]   = useState("login");
  const [authEmail, setAuthEmail]       = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authFoto, setAuthFoto]         = useState(null);
  const [authFotoPreview, setAuthFotoPreview] = useState(null);
  const [authErr, setAuthErr]   = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const fotoInputRef   = useRef(null);
  const cameraInputRef = useRef(null);

  const [tab, setTab]                   = useState("voorspel");
  const [activeDivisie, setActiveDivisie] = useState(DIVISIES[0]);
  const [wedstrijden, setWedstrijden]   = useState([]);
  const [loadingW, setLoadingW]         = useState(false);
  const [voorspellingen, setVoorspellingen] = useState({});
  const [savingVp, setSavingVp]         = useState({});
  const [uitslagen, setUitslagen]       = useState({});
  const [ranglijst, setRanglijst]       = useState([]);
  const [loadingR, setLoadingR]         = useState(false);

  const [poules, setPoules]             = useState([]);
  const [activePoule, setActivePoule]   = useState(null);
  const [pouleRanglijst, setPouleRanglijst] = useState([]);
  const [newPouleName, setNewPouleName] = useState("");
  const [newPouleDivisie, setNewPouleDivisie] = useState(DIVISIES[0].id);
  const [joinCode, setJoinCode]         = useState("");
  const [pouleErr, setPouleErr]         = useState("");
  const [pouleView, setPouleView]       = useState("list");

  const [profielFoto, setProfielFoto]   = useState(null);
  const [profielPreview, setProfielPreview] = useState(null);
  const [profielBusy, setProfielBusy]   = useState(false);
  const profielRef  = useRef(null);
  const profielCamRef = useRef(null);

  const [showAdmin, setShowAdmin]       = useState(false);
  const [adminUitslag, setAdminUitslag] = useState({});
  const [adminDivisie, setAdminDivisie] = useState(DIVISIES[0].id);
  const [adminBusy, setAdminBusy]       = useState(false);
  const [adminWedstrijden, setAdminWedstrijden] = useState([]);
  const ADMIN_UIDS = ["JOUW_ADMIN_UID"];

  // Auth
  useEffect(() => {
    return onAuth(async u => {
      setUser(u);
      if (u) { const d = await getUser(u.uid); setUserData(d); }
      else setUserData(null);
      setAuthLoading(false);
    });
  }, []);

  // Laad data bij tab/divisie wisseling
  useEffect(() => { if (user && tab==="voorspel") loadWedstrijden(); }, [activeDivisie, tab, user]); // eslint-disable-line
  useEffect(() => { if (user && tab==="ranglijst") loadRanglijst(); }, [activeDivisie, tab, user]); // eslint-disable-line
  useEffect(() => { if (user && tab==="poules") loadPoules(); }, [tab, user]); // eslint-disable-line
  useEffect(() => { if (showAdmin) loadAdminWedstrijden(); }, [adminDivisie, showAdmin]); // eslint-disable-line

  async function loadWedstrijden() {
    setLoadingW(true);
    try {
      const [gepland, gespeeld, vp, uit] = await Promise.all([
        getWedstrijden(activeDivisie.id, "SCHEDULED"),
        getGespeeldeWedstrijden(activeDivisie.id),
        getVoorspellingen(user.uid, activeDivisie.id),
        getUitslagen(activeDivisie.id),
      ]);
      const alle = [...gepland, ...gespeeld];
      setWedstrijden(alle.length > 0 ? alle : MOCK_WEDSTRIJDEN);
      setVoorspellingen(vp || {});
      setUitslagen(uit || {});
    } catch { setWedstrijden(MOCK_WEDSTRIJDEN); }
    setLoadingW(false);
  }

  async function loadRanglijst() {
    setLoadingR(true);
    setRanglijst(await getRanglijst(activeDivisie.id));
    setLoadingR(false);
  }

  async function loadPoules() {
    setPoules(await getUserPoules(user.uid));
  }

  async function loadAdminWedstrijden() {
    const w = await getWedstrijden(adminDivisie, "SCHEDULED");
    setAdminWedstrijden(w.length > 0 ? w : MOCK_WEDSTRIJDEN);
  }

  async function opslaanVoorspelling(wedstrijdId, thuis, uit) {
    setSavingVp(v => ({...v, [wedstrijdId]:true}));
    await saveVoorspelling(user.uid, activeDivisie.id, wedstrijdId, Number(thuis), Number(uit));
    setVoorspellingen(v => ({...v, [wedstrijdId]: {thuis:Number(thuis), uit:Number(uit)}}));
    setSavingVp(v => ({...v, [wedstrijdId]:false}));
  }

  async function herbereken(divisieId) {
    setAdminBusy(true);
    try {
      const [alleVp, uitData] = await Promise.all([
        getAlleVoorspellingenDivisie(divisieId),
        getUitslagen(divisieId),
      ]);
      for (const [uid, vpUser] of Object.entries(alleVp)) {
        let totaal = 0;
        for (const [wId, vp] of Object.entries(vpUser)) {
          totaal += berekenPunten(vp, uitData[wId]);
        }
        await savePunten(uid, divisieId, totaal);
      }
    } catch(e) { console.error(e); }
    setAdminBusy(false);
    alert("Punten herberekend!");
  }

  async function laadPouleRanglijst(poule) {
    const ledenIds = Object.keys(poule.leden || {});
    const lijst = await getRanglijst(poule.divisieId);
    setPouleRanglijst(lijst.filter(r => ledenIds.includes(r.uid)));
    setActivePoule(poule);
    setPouleView("detail");
  }

  function handleFotoKiezen(e, setFoto, setPreview) {
    const file = e.target.files[0];
    if (!file) return;
    setFoto(file);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleRegister() {
    if (!authEmail || !authPassword || !authUsername) return setAuthErr("Vul alle velden in");
    if (authPassword.length < 6) return setAuthErr("Wachtwoord minimaal 6 tekens");
    setAuthBusy(true); setAuthErr("");
    try {
      const newUser = await registerUser(authEmail, authPassword, authUsername);
      if (authFoto) await uploadProfilePhoto(newUser.uid, authFoto);
    } catch(e) {
      setAuthErr(e.message?.includes("email-already-in-use") ? "E-mailadres al in gebruik" : e.message?.includes("weak-password") ? "Wachtwoord te zwak" : "Registratie mislukt");
    }
    setAuthBusy(false);
  }

  async function handleLogin() {
    if (!authEmail || !authPassword) return setAuthErr("Vul alle velden in");
    setAuthBusy(true); setAuthErr("");
    try { await loginUser(authEmail, authPassword); }
    catch { setAuthErr("Onjuist e-mailadres of wachtwoord"); }
    setAuthBusy(false);
  }

  async function profielFotoUpdaten() {
    if (!profielFoto || !user) return;
    setProfielBusy(true);
    try {
      const url = await uploadProfilePhoto(user.uid, profielFoto);
      setUserData(d => ({...d, photoURL:url}));
      setProfielFoto(null); setProfielPreview(null);
    } catch(e) { console.error(e); }
    setProfielBusy(false);
  }

  async function maakPoule() {
    if (!newPouleName.trim()) return setPouleErr("Voer een naam in");
    try {
      await createPoule(newPouleName.trim(), newPouleDivisie, user.uid);
      setPouleErr(""); setNewPouleName("");
      await loadPoules(); setPouleView("list");
    } catch(e) { setPouleErr(e.message); }
  }

  async function joinPouleHandler() {
    if (!joinCode.trim()) return setPouleErr("Voer een code in");
    try {
      await joinPoule(joinCode.trim().toUpperCase(), user.uid);
      setPouleErr(""); setJoinCode("");
      await loadPoules(); setPouleView("list");
    } catch(e) { setPouleErr(e.message || "Poule niet gevonden"); }
  }

  // Styles
  const card = { background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px", marginBottom:10 };
  const btnPrimary = { background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", border:"none", borderRadius:12, color:"#fff", fontFamily:"inherit", fontWeight:700, fontSize:15, padding:"13px 0", width:"100%", cursor:"pointer" };
  const btnGreen   = { background:"linear-gradient(135deg,#15803d,#22c55e)", border:"none", borderRadius:12, color:"#fff", fontFamily:"inherit", fontWeight:700, fontSize:15, padding:"13px 0", width:"100%", cursor:"pointer" };
  const btnGhost   = { background:"rgba(255,255,255,.06)", border:`1px solid ${C.border}`, borderRadius:12, color:C.muted, fontFamily:"inherit", fontSize:14, padding:"12px 0", width:"100%", cursor:"pointer" };

  if (authLoading) return (
    <div style={{ minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center", background:C.bg }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:52, marginBottom:10 }}>⚽</div>
        <div style={{ color:C.blue, fontSize:13, letterSpacing:3 }}>VOETBALPOULES</div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", minHeight:"100dvh", maxWidth:430, margin:"0 auto", background:C.bg, color:C.text, overflowX:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{width:0}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .fa{animation:fadeIn .25s ease both}
        .btn{border:none;cursor:pointer;transition:all .15s;font-family:inherit}
        .btn:active{transform:scale(.96);opacity:.85}
        input,select{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#f0f0f0;font-family:inherit;font-size:15px;padding:11px 13px;width:100%;outline:none}
        input:focus,select:focus{border-color:rgba(59,130,246,.5)}
        input::placeholder{color:#374151}
        select option{background:#0a0f1a}
        input[type=number]::-webkit-inner-spin-button{opacity:1;width:20px}
      `}</style>

      {/* ══ AUTH ══ */}
      {!user && (
        <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 24px" }}>
          <div className="fa" style={{ textAlign:"center", marginBottom:32 }}>
            <div style={{ fontSize:60, marginBottom:8 }}>⚽</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:32, fontWeight:700, color:C.blue }}>VoetbalPoules</div>
            <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>Voorspel · Compete · Win</div>
          </div>

          <div style={{ display:"flex", width:"100%", marginBottom:24 }}>
            {[["login","Inloggen"],["register","Registreren"]].map(([s,l]) => (
              <button key={s} className="btn" onClick={() => {setAuthTab(s);setAuthErr("");}} style={{ flex:1, padding:"10px 0", background:"none", borderBottom:authTab===s?`2px solid ${C.blue}`:`2px solid ${C.faint}`, color:authTab===s?C.blue:C.muted, fontSize:14, fontWeight:600 }}>{l}</button>
            ))}
          </div>

          <div className="fa" style={{ width:"100%", display:"flex", flexDirection:"column", gap:10 }}>
            {authTab==="register" && (
              <>
                {/* Profielfoto */}
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"16px", background:"rgba(59,130,246,.06)", border:`1px solid rgba(59,130,246,.2)`, borderRadius:14 }}>
                  <div style={{ position:"relative" }}>
                    {authFotoPreview
                      ? <img src={authFotoPreview} alt="" style={{ width:80, height:80, borderRadius:"50%", objectFit:"cover", border:`3px solid ${C.blue}` }} />
                      : <div style={{ width:80, height:80, borderRadius:"50%", background:"rgba(59,130,246,.12)", border:`2px dashed ${C.blue}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>📸</div>
                    }
                  </div>
                  <div style={{ fontSize:12, color:C.muted }}>Profielfoto (optioneel)</div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button className="btn" onClick={() => fotoInputRef.current?.click()} style={{ background:"rgba(59,130,246,.15)", border:`1px solid rgba(59,130,246,.3)`, borderRadius:8, padding:"8px 16px", color:C.blue, fontSize:13, cursor:"pointer" }}>🖼️ Galerij</button>
                    <button className="btn" onClick={() => cameraInputRef.current?.click()} style={{ background:"rgba(59,130,246,.15)", border:`1px solid rgba(59,130,246,.3)`, borderRadius:8, padding:"8px 16px", color:C.blue, fontSize:13, cursor:"pointer" }}>📷 Camera</button>
                  </div>
                  <input ref={fotoInputRef}   type="file" accept="image/*"          style={{ display:"none" }} onChange={e => handleFotoKiezen(e, setAuthFoto, setAuthFotoPreview)} />
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="user" style={{ display:"none" }} onChange={e => handleFotoKiezen(e, setAuthFoto, setAuthFotoPreview)} />
                </div>
                <input value={authUsername} onChange={e=>setAuthUsername(e.target.value)} placeholder="Gebruikersnaam" maxLength={20} />
              </>
            )}
            <input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="E-mailadres" />
            <input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Wachtwoord (min. 6 tekens)" onKeyDown={e=>e.key==="Enter"&&(authTab==="login"?handleLogin():handleRegister())} />
            {authErr && <div style={{ color:C.red, fontSize:13, textAlign:"center" }}>{authErr}</div>}
            <button className="btn" onClick={authTab==="login"?handleLogin:handleRegister} disabled={authBusy} style={{ ...btnPrimary, opacity:authBusy?.6:1, fontSize:16, padding:"14px 0", marginTop:4 }}>
              {authBusy ? "⏳ Even geduld..." : authTab==="login" ? "Inloggen →" : "Account aanmaken →"}
            </button>
          </div>
        </div>
      )}

      {/* ══ MAIN APP ══ */}
      {user && (
        <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column" }}>

          {/* Header */}
          <div style={{ padding:"14px 16px 0", background:"rgba(0,0,0,.4)", borderBottom:`1px solid ${C.faint}`, flexShrink:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:18, fontWeight:700, color:C.blue }}>⚽ VoetbalPoules</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {ADMIN_UIDS.includes(user.uid) && (
                  <button className="btn" onClick={() => setShowAdmin(v=>!v)} style={{ background:"rgba(245,158,11,.15)", border:"1px solid rgba(245,158,11,.3)", borderRadius:8, padding:"5px 10px", fontSize:12, color:C.gold, cursor:"pointer" }}>⚙️ Admin</button>
                )}
                <button className="btn" onClick={() => setTab("profiel")} style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}>
                  <Avatar src={userData?.photoURL || user.photoURL} name={userData?.username || user.displayName} size={32} />
                </button>
              </div>
            </div>
            <div style={{ display:"flex" }}>
              {[["voorspel","⚽","Voorspel"],["ranglijst","🏆","Ranglijst"],["poules","👥","Poules"],["profiel","👤","Profiel"]].map(([t,ico,l]) => (
                <button key={t} className="btn" onClick={() => setTab(t)} style={{ flex:1, padding:"8px 0 10px", background:"none", border:"none", borderBottom:tab===t?`2px solid ${C.blue}`:"2px solid transparent", color:tab===t?C.blue:C.muted, fontSize:11, fontWeight:tab===t?600:400, lineHeight:1.6 }}>
                  <div style={{ fontSize:16 }}>{ico}</div>{l}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 80px" }}>

            {/* ─── VOORSPEL ─── */}
            {tab==="voorspel" && (
              <div className="fa">
                {/* Divisie scroll */}
                <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:10, marginBottom:14, scrollbarWidth:"none" }}>
                  {DIVISIES.map(d => (
                    <button key={d.id} className="btn" onClick={() => setActiveDivisie(d)} style={{ flexShrink:0, padding:"7px 13px", borderRadius:20, border:`1px solid ${activeDivisie.id===d.id?d.kleur:C.border}`, background:activeDivisie.id===d.id?`${d.kleur}22`:"rgba(255,255,255,.04)", color:activeDivisie.id===d.id?d.kleur:C.muted, fontSize:12, fontWeight:activeDivisie.id===d.id?600:400, cursor:"pointer", whiteSpace:"nowrap" }}>
                      {d.vlag} {d.naam}
                    </button>
                  ))}
                </div>

                {/* Divisie banner */}
                <div style={{ ...card, borderColor:`${activeDivisie.kleur}44`, background:`${activeDivisie.kleur}0d`, marginBottom:14 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ fontSize:26 }}>{activeDivisie.vlag}</div>
                    <div>
                      <div style={{ fontSize:16, fontWeight:700, color:activeDivisie.kleur }}>{activeDivisie.naam}</div>
                      <div style={{ fontSize:11, color:C.muted }}>Exact={" "}<span style={{ color:C.green }}>3pt</span> · Winnaar={" "}<span style={{ color:C.gold }}>1pt</span> · Fout={" "}<span style={{ color:C.muted }}>0pt</span></div>
                    </div>
                  </div>
                </div>

                {loadingW ? (
                  <div style={{ textAlign:"center", padding:"40px 0", color:C.muted }}>
                    <div style={{ fontSize:32, animation:"spin 1s linear infinite", display:"inline-block" }}>⚽</div>
                    <div style={{ marginTop:8, fontSize:13 }}>Laden...</div>
                  </div>
                ) : (
                  <>
                    {wedstrijden.filter(w=>w.status!=="FINISHED").length > 0 && (
                      <>
                        <div style={{ fontSize:11, color:C.muted, letterSpacing:2, marginBottom:10 }}>AANKOMENDE WEDSTRIJDEN</div>
                        {wedstrijden.filter(w=>w.status!=="FINISHED").map(w => (
                          <WedstrijdKaart key={w.id} wedstrijd={w} voorspelling={voorspellingen[w.id]} onSave={(t,u) => opslaanVoorspelling(w.id,t,u)} saving={savingVp[w.id]} divisieKleur={activeDivisie.kleur} />
                        ))}
                      </>
                    )}
                    {wedstrijden.filter(w=>w.status==="FINISHED").length > 0 && (
                      <>
                        <div style={{ fontSize:11, color:C.muted, letterSpacing:2, margin:"16px 0 10px" }}>GESPEELD</div>
                        {wedstrijden.filter(w=>w.status==="FINISHED").map(w => {
                          const vp = voorspellingen[w.id];
                          const pts = berekenPunten(vp, uitslagen[w.id] || w.score);
                          return <GespeeldeKaart key={w.id} wedstrijd={w} voorspelling={vp} punten={pts} />;
                        })}
                      </>
                    )}
                    {wedstrijden.length === 0 && (
                      <div style={{ textAlign:"center", padding:"40px 0", color:C.muted, fontSize:14, fontStyle:"italic" }}>Geen wedstrijden gevonden.</div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ─── RANGLIJST ─── */}
            {tab==="ranglijst" && (
              <div className="fa">
                <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:10, marginBottom:14, scrollbarWidth:"none" }}>
                  {DIVISIES.map(d => (
                    <button key={d.id} className="btn" onClick={() => setActiveDivisie(d)} style={{ flexShrink:0, padding:"7px 13px", borderRadius:20, border:`1px solid ${activeDivisie.id===d.id?d.kleur:C.border}`, background:activeDivisie.id===d.id?`${d.kleur}22`:"rgba(255,255,255,.04)", color:activeDivisie.id===d.id?d.kleur:C.muted, fontSize:12, fontWeight:activeDivisie.id===d.id?600:400, cursor:"pointer", whiteSpace:"nowrap" }}>
                      {d.vlag} {d.naam}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize:16, fontWeight:700, marginBottom:14 }}>🏆 {activeDivisie.naam} Ranglijst</div>
                {loadingR ? (
                  <div style={{ textAlign:"center", padding:"40px 0", color:C.muted }}>Laden...</div>
                ) : ranglijst.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"40px 0", color:C.muted, fontStyle:"italic" }}>Nog geen deelnemers.</div>
                ) : ranglijst.map((r,i) => (
                  <div key={r.uid} style={{ ...card, display:"flex", alignItems:"center", gap:12, borderColor:i===0?C.borderGold:i<3?C.borderGreen:C.border, background:i===0?"rgba(212,175,55,.05)":C.card }}>
                    <div style={{ width:28, textAlign:"center", fontSize:i<3?20:14, fontWeight:700, color:i===0?C.gold:i===1?"#c0c0c0":i===2?"#cd7f32":C.muted }}>
                      {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}
                    </div>
                    <Avatar src={r.photoURL} name={r.username} size={36} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, fontWeight:600, color:r.uid===user.uid?C.blue:C.text }}>{r.username}{r.uid===user.uid?" (jij)":""}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:20, fontWeight:700, color:i===0?C.gold:C.text }}>{r.punten}</div>
                      <div style={{ fontSize:10, color:C.muted }}>punten</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ─── POULES ─── */}
            {tab==="poules" && (
              <div className="fa">
                {pouleView==="list" && (
                  <>
                    <div style={{ fontSize:16, fontWeight:700, marginBottom:14 }}>👥 Mijn Poules</div>
                    {poules.length===0 && (
                      <div style={{ ...card, textAlign:"center", padding:"30px 16px" }}>
                        <div style={{ fontSize:36, marginBottom:8 }}>🏆</div>
                        <div style={{ fontSize:14, color:C.muted }}>Je zit nog in geen poule.</div>
                      </div>
                    )}
                    {poules.map(p => {
                      const div = DIVISIES.find(d=>d.id===p.divisieId)||DIVISIES[0];
                      return (
                        <button key={p.code} className="btn" onClick={() => laadPouleRanglijst(p)} style={{ ...card, display:"flex", alignItems:"center", gap:12, width:"100%", textAlign:"left", cursor:"pointer", borderColor:`${div.kleur}33` }}>
                          <div style={{ fontSize:26 }}>{div.vlag}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:15, fontWeight:600 }}>{p.naam}</div>
                            <div style={{ fontSize:12, color:C.muted }}>{div.naam} · {Object.keys(p.leden||{}).length} leden · Code: <span style={{ color:C.blue, letterSpacing:2 }}>{p.code}</span></div>
                          </div>
                          <div style={{ fontSize:18, color:C.muted }}>›</div>
                        </button>
                      );
                    })}
                    <div style={{ display:"flex", gap:10, marginTop:14 }}>
                      <button className="btn" onClick={() => {setPouleView("create");setPouleErr("");}} style={{ ...btnGreen, flex:1, fontSize:14, padding:"12px 0" }}>+ Aanmaken</button>
                      <button className="btn" onClick={() => {setPouleView("join");setPouleErr("");}} style={{ ...btnGhost, flex:1, fontSize:14 }}>Joinen</button>
                    </div>
                  </>
                )}

                {pouleView==="create" && (
                  <>
                    <button className="btn" onClick={() => setPouleView("list")} style={{ background:"none", border:"none", color:C.muted, fontSize:14, cursor:"pointer", padding:0, marginBottom:16 }}>← Terug</button>
                    <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>Poule Aanmaken</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      <input value={newPouleName} onChange={e=>setNewPouleName(e.target.value)} placeholder="Naam van de poule" />
                      <div>
                        <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>Divisie</div>
                        <select value={newPouleDivisie} onChange={e=>setNewPouleDivisie(e.target.value)}>
                          {DIVISIES.map(d => <option key={d.id} value={d.id}>{d.vlag} {d.naam}</option>)}
                        </select>
                      </div>
                      {pouleErr && <div style={{ color:C.red, fontSize:13 }}>{pouleErr}</div>}
                      <button className="btn" onClick={maakPoule} style={btnGreen}>Poule Aanmaken →</button>
                    </div>
                  </>
                )}

                {pouleView==="join" && (
                  <>
                    <button className="btn" onClick={() => setPouleView("list")} style={{ background:"none", border:"none", color:C.muted, fontSize:14, cursor:"pointer", padding:0, marginBottom:16 }}>← Terug</button>
                    <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>Poule Joinen</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="Code (bijv. XK3P2)" style={{ fontSize:22, letterSpacing:4, textAlign:"center" }} />
                      {pouleErr && <div style={{ color:C.red, fontSize:13 }}>{pouleErr}</div>}
                      <button className="btn" onClick={joinPouleHandler} style={btnPrimary}>Joinen →</button>
                    </div>
                  </>
                )}

                {pouleView==="detail" && activePoule && (
                  <>
                    <button className="btn" onClick={() => setPouleView("list")} style={{ background:"none", border:"none", color:C.muted, fontSize:14, cursor:"pointer", padding:0, marginBottom:16 }}>← Terug</button>
                    <div style={{ ...card, borderColor:`${(DIVISIES.find(d=>d.id===activePoule.divisieId)||DIVISIES[0]).kleur}44`, marginBottom:16 }}>
                      <div style={{ fontSize:18, fontWeight:700 }}>{activePoule.naam}</div>
                      <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>{(DIVISIES.find(d=>d.id===activePoule.divisieId)||DIVISIES[0]).naam} · {Object.keys(activePoule.leden||{}).length} leden</div>
                      <div style={{ marginTop:8, background:"rgba(255,255,255,.05)", borderRadius:8, padding:"6px 12px", display:"inline-block" }}>
                        <span style={{ fontSize:11, color:C.muted }}>Code: </span>
                        <span style={{ fontSize:14, fontWeight:700, letterSpacing:3, color:C.blue }}>{activePoule.code}</span>
                      </div>
                    </div>
                    <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>🏆 Ranglijst</div>
                    {pouleRanglijst.length===0
                      ? <div style={{ color:C.muted, fontSize:13, fontStyle:"italic" }}>Nog geen punten.</div>
                      : pouleRanglijst.map((r,i) => (
                        <div key={r.uid} style={{ ...card, display:"flex", alignItems:"center", gap:12, borderColor:i===0?C.borderGold:C.border }}>
                          <div style={{ width:24, textAlign:"center", fontSize:i<3?18:13, fontWeight:700, color:i===0?C.gold:C.muted }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</div>
                          <Avatar src={r.photoURL} name={r.username} size={32} />
                          <div style={{ flex:1, fontSize:14, fontWeight:500, color:r.uid===user.uid?C.blue:C.text }}>{r.username}{r.uid===user.uid?" (jij)":""}</div>
                          <div style={{ fontSize:18, fontWeight:700, color:i===0?C.gold:C.text }}>{r.punten} <span style={{ fontSize:11, color:C.muted }}>pt</span></div>
                        </div>
                      ))
                    }
                  </>
                )}
              </div>
            )}

            {/* ─── PROFIEL ─── */}
            {tab==="profiel" && (
              <div className="fa">
                <div style={{ textAlign:"center", marginBottom:24 }}>
                  <div style={{ position:"relative", display:"inline-block", marginBottom:12 }}>
                    <Avatar src={profielPreview||userData?.photoURL||user.photoURL} name={userData?.username||user.displayName} size={90} />
                    <button className="btn" onClick={() => profielRef.current?.click()} style={{ position:"absolute", bottom:0, right:0, width:28, height:28, borderRadius:"50%", background:C.blue, border:"2px solid #0a0f1a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, cursor:"pointer" }}>✏️</button>
                  </div>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:700 }}>{userData?.username||user.displayName}</div>
                  <div style={{ fontSize:13, color:C.muted, marginTop:3 }}>{user.email}</div>
                </div>

                <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                  <button className="btn" onClick={() => profielRef.current?.click()} style={{ flex:1, padding:"10px 0", borderRadius:10, background:"rgba(59,130,246,.1)", border:`1px solid rgba(59,130,246,.3)`, color:C.blue, fontSize:13, cursor:"pointer" }}>🖼️ Galerij</button>
                  <button className="btn" onClick={() => profielCamRef.current?.click()} style={{ flex:1, padding:"10px 0", borderRadius:10, background:"rgba(59,130,246,.1)", border:`1px solid rgba(59,130,246,.3)`, color:C.blue, fontSize:13, cursor:"pointer" }}>📷 Camera</button>
                </div>
                <input ref={profielRef}    type="file" accept="image/*"          style={{ display:"none" }} onChange={e=>handleFotoKiezen(e,setProfielFoto,setProfielPreview)} />
                <input ref={profielCamRef} type="file" accept="image/*" capture="user" style={{ display:"none" }} onChange={e=>handleFotoKiezen(e,setProfielFoto,setProfielPreview)} />

                {profielPreview && (
                  <button className="btn" onClick={profielFotoUpdaten} disabled={profielBusy} style={{ ...btnGreen, marginBottom:16, opacity:profielBusy?.6:1 }}>
                    {profielBusy?"⏳ Uploaden...":"✓ Foto Opslaan"}
                  </button>
                )}

                <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>📊 Mijn Punten</div>
                {DIVISIES.map(d => {
                  const pts = userData?.punten?.[d.id]||0;
                  if (!pts) return null;
                  return (
                    <div key={d.id} style={{ ...card, display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ fontSize:20 }}>{d.vlag}</div>
                      <div style={{ flex:1, fontSize:14 }}>{d.naam}</div>
                      <div style={{ fontSize:16, fontWeight:700, color:d.kleur }}>{pts} pt</div>
                    </div>
                  );
                })}
                {!Object.values(userData?.punten||{}).some(p=>p>0) && (
                  <div style={{ color:C.muted, fontSize:13, fontStyle:"italic", marginBottom:14 }}>Nog geen punten verdiend. Ga voorspellen!</div>
                )}

                <button className="btn" onClick={logoutUser} style={{ ...btnGhost, color:C.red, borderColor:"rgba(239,68,68,.3)", marginTop:8 }}>Uitloggen</button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ══ ADMIN PANEL ══ */}
      {showAdmin && user && ADMIN_UIDS.includes(user.uid) && (
        <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,.95)", overflowY:"auto", padding:"24px 20px 80px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <div style={{ fontSize:18, fontWeight:700, color:C.gold }}>⚙️ Admin Panel</div>
            <button className="btn" onClick={() => setShowAdmin(false)} style={{ background:"rgba(255,255,255,.1)", border:"none", borderRadius:8, padding:"6px 14px", color:C.muted, cursor:"pointer" }}>✕ Sluiten</button>
          </div>

          <div style={{ fontSize:12, color:C.muted, letterSpacing:2, marginBottom:8 }}>DIVISIE</div>
          <select value={adminDivisie} onChange={e=>setAdminDivisie(e.target.value)} style={{ marginBottom:18 }}>
            {DIVISIES.map(d=><option key={d.id} value={d.id}>{d.vlag} {d.naam}</option>)}
          </select>

          <div style={{ fontSize:12, color:C.muted, letterSpacing:2, marginBottom:10 }}>UITSLAGEN INVOEREN</div>
          {adminWedstrijden.slice(0,15).map(w => (
            <div key={w.id} style={{ ...{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"12px 14px", marginBottom:8 } }}>
              <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>{w.thuis} vs {w.uit} — {fmt(w.datum)}</div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input type="number" min="0" max="20" placeholder="Thuis" value={adminUitslag[w.id]?.thuis??""} onChange={e=>setAdminUitslag(u=>({...u,[w.id]:{...u[w.id],thuis:e.target.value}}))} style={{ flex:1, textAlign:"center" }} />
                <span style={{ color:C.muted }}>-</span>
                <input type="number" min="0" max="20" placeholder="Uit" value={adminUitslag[w.id]?.uit??""} onChange={e=>setAdminUitslag(u=>({...u,[w.id]:{...u[w.id],uit:e.target.value}}))} style={{ flex:1, textAlign:"center" }} />
                <button className="btn" onClick={async () => {
                  const u = adminUitslag[w.id];
                  if (u?.thuis===""||u?.thuis==null) return;
                  await saveUitslagen(adminDivisie, w.id, Number(u.thuis), Number(u.uit));
                  alert(`✓ ${w.thuis} ${u.thuis}-${u.uit} ${w.uit} opgeslagen`);
                }} style={{ background:"rgba(34,197,94,.2)", border:"1px solid rgba(34,197,94,.4)", borderRadius:8, padding:"9px 14px", color:C.green, fontSize:13, cursor:"pointer" }}>✓</button>
              </div>
            </div>
          ))}

          <button className="btn" onClick={() => herbereken(adminDivisie)} disabled={adminBusy} style={{ ...btnGreen, marginTop:8, opacity:adminBusy?.6:1 }}>
            {adminBusy?"⏳ Berekenen...":"🔄 Punten Herberekenen voor "+DIVISIES.find(d=>d.id===adminDivisie)?.naam}
          </button>
        </div>
      )}
    </div>
  );
}
