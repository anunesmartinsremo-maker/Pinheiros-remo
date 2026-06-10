import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase.js";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const SHEET_ID = "1V5b0Wxbgc7SfYIIG58aFofHAXhvAGqg90is246N_6XU";
const sheetUrl = (name) => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;

const ZONES = [
  { key:"B1", label:"B1/E1", desc:"Aeróbio Leve",      pctLow:0.60, pctHigh:0.75, color:"#3b82f6" },
  { key:"B2", label:"B2/E2", desc:"Aeróbio Moderado",  pctLow:0.75, pctHigh:0.85, color:"#22c55e" },
  { key:"B3", label:"B3/E3", desc:"Limiar Anaeróbio",  pctLow:0.85, pctHigh:0.93, color:"#f59e0b" },
  { key:"B4", label:"B4/E4", desc:"Velocidade Crítica",pctLow:0.90, pctHigh:0.95, color:"#f97316" },
  { key:"B5", label:"B5/E5", desc:"Aeróbio Máximo",    pctLow:0.92, pctHigh:1.00, color:"#ef4444" },
];
const TARGET_PERC = { B1:75,B2:80,B3:85,B4:90,B5:95,E1:75,E2:80,E3:85,E4:90,E5:92 };
const SIZES = ["","P","M","G","GG"];
const TRAIN_TYPES = ["B1","B2","B3","B4","B5","E1","E2","E3","E4","E5"];

const C = {
  bg:"#0a0c10", surf:"#111520", surfHi:"#192133", border:"#1e2d47",
  blue:"#1a4fa0", blueLt:"#2563c4", text:"#dce6f5", muted:"#4a6080",
  good:"#22c55e", warn:"#f59e0b", bad:"#ef4444",
};

// ─── UTILS ─────────────────────────────────────────────────────────────────
// Idade esportiva = ano atual - ano de nascimento (regra do remo)
function sportAge(birthDate) {
  if (!birthDate) return null;
  return new Date().getFullYear() - parseInt(String(birthDate).slice(0,4));
}
// Categoria automática conforme planilha do clube
function calcCategory(birthDate) {
  const a = sportAge(birthDate);
  if (a == null) return null;
  if (a <= 14) return "INFANTIL";
  if (a <= 16) return "SUB17";
  if (a <= 18) return "SUB19";
  if (a <= 22) return "SUB23";
  return "SÊNIOR";
}
function fmtDate(d) {
  if (!d) return "—";
  const [y,m,dd] = String(d).slice(0,10).split("-");
  return `${dd}/${m}/${y}`;
}
function calcZones(maxHR, restHR) {
  if (!maxHR) return null;
  const rest = restHR || 0, reserve = maxHR - rest;
  return ZONES.map(z => ({ ...z, hrLow: Math.round(rest+reserve*z.pctLow), hrHigh: Math.round(rest+reserve*z.pctHigh) }));
}
function interpolatePower(steps, targetHR) {
  const s = [...steps].filter(x => x.step_number !== "Max" && x.hr_bpm && x.power_w).sort((a,b)=>a.hr_bpm-b.hr_bpm);
  if (s.length < 2) return null;
  if (targetHR <= s[0].hr_bpm) return Math.round(s[0].power_w);
  if (targetHR >= s[s.length-1].hr_bpm) return Math.round(s[s.length-1].power_w);
  for (let i=0;i<s.length-1;i++){
    if (targetHR>=s[i].hr_bpm && targetHR<=s[i+1].hr_bpm){
      const t=(targetHR-s[i].hr_bpm)/(s[i+1].hr_bpm-s[i].hr_bpm);
      return Math.round(s[i].power_w+t*(s[i+1].power_w-s[i].power_w));
    }
  }
  return null;
}
function parseNum(v){ const n=parseFloat(String(v||"").replace(",",".")); return isNaN(n)?null:n; }
function parseCSVLine(line){const r=[];let c="",q=false;for(const ch of line){if(ch==='"')q=!q;else if(ch===","&&!q){r.push(c);c="";}else c+=ch;}r.push(c);return r;}
function parseCSV(text){
  const lines=text.trim().split("\n"); if(lines.length<2)return[];
  const h=parseCSVLine(lines[0]).map(x=>x.trim().replace(/^"|"$/g,""));
  return lines.slice(1).map(l=>{const v=parseCSVLine(l);const o={};h.forEach((k,i)=>o[k]=(v[i]||"").trim().replace(/^"|"$/g,""));return o;}).filter(r=>Object.values(r).some(x=>x));
}
function avg(a){const v=a.filter(x=>x!=null);return v.length?v.reduce((x,y)=>x+y,0)/v.length:null;}
function fmt1(v){return v!=null?parseFloat(v).toFixed(1):"—";}
function fmt0(v){return v!=null?Math.round(v):"—";}
function fmtTime(s){if(!s||isNaN(s))return"—";const m=Math.floor(s/60),sec=(s%60).toFixed(1);return`${m}:${sec.padStart(4,"0")}`;}
function getFBColor(type,p){if(p==null)return C.muted;const t=TARGET_PERC[String(type).toUpperCase()]||75;return p>=t?C.good:p>=t-2?C.warn:C.bad;}

function Spark({vals,color="#3b82f6",w=120,h=30}){
  const v=vals.filter(x=>x!=null); if(v.length<2)return null;
  const mn=Math.min(...v),mx=Math.max(...v),rng=mx-mn||1,p=3,iW=w-p*2,iH=h-p*2;
  const pts=vals.map((val,i)=>`${p+(i/(vals.length-1))*iW},${p+iH-(((val??mn)-mn)/rng)*iH}`).join(" ");
  return(<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
    <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity=".85"/>
    {vals.map((val,i)=>val==null?null:<circle key={i} cx={p+(i/(vals.length-1))*iW} cy={p+iH-((val-mn)/rng)*iH} r={i===vals.length-1?3:1.5} fill={i===vals.length-1?color:"rgba(255,255,255,.3)"}/>)}
  </svg>);
}
function Card({children,s}){return<div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:14,...s}}>{children}</div>;}
function Lbl({t}){return<div style={{fontSize:9,letterSpacing:2,color:C.blueLt,textTransform:"uppercase",marginBottom:4,fontWeight:700}}>{t}</div>;}
function PInput(props){return<input {...props} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,background:C.bg,border:`1.5px solid ${C.border}`,color:C.text,padding:"7px 10px",borderRadius:6,outline:"none",width:"100%",...props.style}}/>;}
function PSelect(props){return<select {...props} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,background:C.bg,border:`1.5px solid ${C.border}`,color:C.text,padding:"7px 10px",borderRadius:6,outline:"none",width:"100%",...props.style}}/>;}

// ─── DADOS PESSOAIS ────────────────────────────────────────────────────────
function PersonalDataCard({ ath, canSeePrivate, canEdit, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k,v)=>setF(p=>({...p,[k]:v}));

  function startEdit() {
    setF({
      birth_date: ath.birthDate || "", matricula: ath.matricula || "",
      rg: ath.rg || "", cpf: ath.cpf || "", admission_date: ath.admissionDate || "",
      shirt_size: ath.shirtSize || "", shorts_size: ath.shortsSize || "",
      jacket_size: ath.jacketSize || "", unisuit_size: ath.unisuitSize || "",
    });
    setEditing(true);
  }
  async function save() {
    setSaving(true);
    const payload = {};
    for (const [k,v] of Object.entries(f)) payload[k] = v === "" ? null : v;
    const { error } = await supabase.from("athletes").update(payload).eq("id", ath.id);
    setSaving(false);
    if (error) { alert("Erro ao salvar: "+error.message); return; }
    setEditing(false);
    onSaved();
  }

  const autoCat = calcCategory(editing ? f.birth_date : ath.birthDate);
  const age = sportAge(editing ? f.birth_date : ath.birthDate);
  const missing = !ath.birthDate || !ath.shirtSize;

  if (editing) return (
    <Card s={{marginBottom:12,border:`1px solid ${C.blueLt}`}}>
      <div style={{fontSize:13,fontWeight:800,marginBottom:12,color:C.blueLt,letterSpacing:1}}>✏️ EDITANDO DADOS PESSOAIS</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,marginBottom:12}}>
        <div><Lbl t="Data de Nascimento"/><PInput type="date" value={f.birth_date} onChange={e=>set("birth_date",e.target.value)}/></div>
        <div><Lbl t="Matrícula"/><PInput value={f.matricula} onChange={e=>set("matricula",e.target.value)} placeholder="91000000"/></div>
        {canSeePrivate && <div><Lbl t="RG"/><PInput value={f.rg} onChange={e=>set("rg",e.target.value)}/></div>}
        {canSeePrivate && <div><Lbl t="CPF"/><PInput value={f.cpf} onChange={e=>set("cpf",e.target.value)} placeholder="000.000.000-00"/></div>}
        <div><Lbl t="Data de Admissão"/><PInput type="date" value={f.admission_date} onChange={e=>set("admission_date",e.target.value)}/></div>
        <div><Lbl t="Camiseta"/><PSelect value={f.shirt_size} onChange={e=>set("shirt_size",e.target.value)}>{SIZES.map(s=><option key={s} value={s}>{s||"—"}</option>)}</PSelect></div>
        <div><Lbl t="Bermuda"/><PSelect value={f.shorts_size} onChange={e=>set("shorts_size",e.target.value)}>{SIZES.map(s=><option key={s} value={s}>{s||"—"}</option>)}</PSelect></div>
        <div><Lbl t="Agasalho"/><PSelect value={f.jacket_size} onChange={e=>set("jacket_size",e.target.value)}>{SIZES.map(s=><option key={s} value={s}>{s||"—"}</option>)}</PSelect></div>
        <div><Lbl t="Macaquinho"/><PSelect value={f.unisuit_size} onChange={e=>set("unisuit_size",e.target.value)}>{SIZES.map(s=><option key={s} value={s}>{s||"—"}</option>)}</PSelect></div>
      </div>
      {autoCat&&<div style={{fontSize:11,color:C.muted,marginBottom:12}}>Categoria calculada automaticamente: <span style={{background:C.blue,color:"#fff",padding:"2px 10px",borderRadius:4,fontWeight:800,fontSize:11}}>{autoCat}</span> (idade esportiva: {age})</div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={()=>setEditing(false)} disabled={saving} style={{background:C.surfHi,color:C.text,border:"none",borderRadius:6,padding:"8px 18px",cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:13}}>Cancelar</button>
        <button onClick={save} disabled={saving} style={{background:C.blue,color:"#fff",border:"none",borderRadius:6,padding:"8px 18px",cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:13}}>{saving?"Salvando...":"💾 Salvar"}</button>
      </div>
    </Card>
  );

  return (
    <Card s={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontSize:13,fontWeight:800}}>🪪 Dados Pessoais</div>
        {canEdit&&<button onClick={startEdit} style={{background:C.surfHi,border:`1px solid ${C.border}`,color:C.blueLt,borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>✏️ Editar</button>}
      </div>
      {missing&&canEdit&&(
        <div style={{background:"rgba(245,158,11,.1)",border:`1px solid ${C.warn}`,borderRadius:6,padding:"8px 12px",marginBottom:10,fontSize:12,color:C.warn}}>
          ⚠️ Dados incompletos — clique em Editar e complete suas informações.
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(135px,1fr))",gap:12}}>
        <div><Lbl t="Nascimento"/><div className="mono" style={{fontSize:13}}>{fmtDate(ath.birthDate)}</div></div>
        <div><Lbl t="Idade Esportiva"/><div className="mono" style={{fontSize:13}}>{age??"—"}</div></div>
        <div><Lbl t="Categoria (auto)"/>{autoCat?<span style={{background:C.blue,color:"#fff",padding:"2px 10px",borderRadius:4,fontWeight:800,fontSize:11}}>{autoCat}</span>:<span style={{color:C.muted}}>—</span>}</div>
        <div><Lbl t="Matrícula"/><div className="mono" style={{fontSize:13}}>{ath.matricula||"—"}</div></div>
        {canSeePrivate&&<div><Lbl t="RG"/><div className="mono" style={{fontSize:13}}>{ath.rg||"—"}</div></div>}
        {canSeePrivate&&<div><Lbl t="CPF"/><div className="mono" style={{fontSize:13}}>{ath.cpf||"—"}</div></div>}
        <div><Lbl t="Admissão"/><div className="mono" style={{fontSize:13}}>{fmtDate(ath.admissionDate)}</div></div>
        <div><Lbl t="Camiseta"/><div className="mono" style={{fontSize:13}}>{ath.shirtSize||"—"}</div></div>
        <div><Lbl t="Bermuda"/><div className="mono" style={{fontSize:13}}>{ath.shortsSize||"—"}</div></div>
        <div><Lbl t="Agasalho"/><div className="mono" style={{fontSize:13}}>{ath.jacketSize||"—"}</div></div>
        <div><Lbl t="Macaquinho"/><div className="mono" style={{fontSize:13}}>{ath.unisuitSize||"—"}</div></div>
      </div>
    </Card>
  );
}

// ─── BUSCA DE TREINOS ──────────────────────────────────────────────────────
function TrainingSearch({ myTrainings }) {
  const [fType, setFType] = useState("");
  const [fAct, setFAct] = useState("");
  const [fDist, setFDist] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(()=>myTrainings.filter(t=>{
    if (fType && String(t.training_type).toUpperCase() !== fType) return false;
    if (fAct && t.activity !== fAct) return false;
    if (fDist && String(t.distance) !== String(fDist)) return false;
    if (fFrom && t.date < fFrom) return false;
    if (fTo && t.date > fTo) return false;
    return true;
  }),[myTrainings,fType,fAct,fDist,fFrom,fTo]);

  const hasFilter = fType||fAct||fDist||fFrom||fTo;
  const shown = (hasFilter||showAll) ? filtered : filtered.slice(0,10);
  const avgPerc = avg(filtered.map(t=>t.perc_bt).filter(Boolean));

  return (
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
        <div style={{fontSize:13,fontWeight:800}}>🔎 Buscar Treinos</div>
        <div style={{fontSize:11,color:C.muted}}>
          {filtered.length} treino{filtered.length!==1?"s":""}
          {avgPerc!=null&&<> · média <span className="mono" style={{color:C.good,fontWeight:700}}>{avgPerc.toFixed(1)}%</span></>}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:8,marginBottom:12}}>
        <div><Lbl t="Tipo"/><PSelect value={fType} onChange={e=>setFType(e.target.value)}><option value="">Todos</option>{TRAIN_TYPES.map(t=><option key={t}>{t}</option>)}</PSelect></div>
        <div><Lbl t="Atividade"/><PSelect value={fAct} onChange={e=>setFAct(e.target.value)}><option value="">Todas</option><option>BARCO</option><option>REMO ERGÔMETRO</option></PSelect></div>
        <div><Lbl t="Distância (m)"/><PInput type="number" value={fDist} onChange={e=>setFDist(e.target.value)} placeholder="ex: 2000"/></div>
        <div><Lbl t="De"/><PInput type="date" value={fFrom} onChange={e=>setFFrom(e.target.value)}/></div>
        <div><Lbl t="Até"/><PInput type="date" value={fTo} onChange={e=>setFTo(e.target.value)}/></div>
      </div>
      {hasFilter&&(
        <button onClick={()=>{setFType("");setFAct("");setFDist("");setFFrom("");setFTo("");}} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,borderRadius:6,padding:"4px 12px",cursor:"pointer",fontSize:11,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,marginBottom:10}}>✕ Limpar filtros</button>
      )}
      {shown.length===0?(
        <div style={{color:C.muted,fontSize:12,padding:"14px 0",textAlign:"center"}}>Nenhum treino encontrado com esses filtros.</div>
      ):(
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:C.surfHi}}>
              {["Data","Tipo","Barco","Dist.","Tempo","VOG","% BT","Meta"].map(h=><th key={h} style={{padding:"7px 10px",fontSize:9,letterSpacing:1.5,color:C.blueLt,textTransform:"uppercase",textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {shown.map(t=>{
                const tgt=TARGET_PERC[String(t.training_type||"B1").toUpperCase()]||75;
                const c=getFBColor(t.training_type,t.perc_bt);
                return(<tr key={t.id} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td className="mono" style={{padding:"7px 10px",fontSize:11,whiteSpace:"nowrap"}}>{t.date}</td>
                  <td style={{padding:"7px 10px"}}><span style={{background:C.surfHi,padding:"2px 7px",borderRadius:4,fontSize:11,color:C.blueLt}}>{t.training_type}</span></td>
                  <td className="mono" style={{padding:"7px 10px",fontSize:11}}>{t.boat_label}</td>
                  <td className="mono" style={{padding:"7px 10px",fontSize:11}}>{t.distance}m</td>
                  <td className="mono" style={{padding:"7px 10px",fontSize:11}}>{fmtTime(t.time_seconds)}</td>
                  <td className="mono" style={{padding:"7px 10px",fontSize:11}}>{t.spm||"—"}</td>
                  <td className="mono" style={{padding:"7px 10px",fontSize:12,fontWeight:700,color:c}}>{t.perc_bt?t.perc_bt.toFixed(1)+"%":"—"}</td>
                  <td className="mono" style={{padding:"7px 10px",fontSize:11,color:C.muted}}>{tgt}%{(t.perc_bt||0)>=tgt&&<span style={{marginLeft:4,color:C.good}}>✓</span>}</td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      )}
      {!hasFilter&&!showAll&&filtered.length>10&&(
        <div style={{textAlign:"center",marginTop:10}}>
          <button onClick={()=>setShowAll(true)} style={{background:C.surfHi,border:`1px solid ${C.border}`,color:C.blueLt,borderRadius:6,padding:"6px 16px",cursor:"pointer",fontSize:12,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>Ver todos os {filtered.length} treinos ↓</button>
        </div>
      )}
    </Card>
  );
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
export default function AthleteProfile360({ athletes, session }) {
  const isCoach = session?.role === "admin";
  const [selId, setSelId] = useState(isCoach ? (athletes[0]?.id||"") : session?.athleteId);
  const [athDb, setAthDb] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [tests, setTests] = useState([]);
  const [steps, setSteps] = useState([]);
  const [wellness, setWellness] = useState([]);
  const [wellAthletes, setWellAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  async function load() {
    setLoading(true);
    const promises = [
      supabase.from("athletes").select("*"),
      supabase.from("trainings").select("*").order("created_at",{ascending:false}),
      supabase.from("step_tests").select("*").order("test_date",{ascending:false}),
      supabase.from("step_test_steps").select("*"),
    ];
    if (isCoach) {
      promises.push(fetch(sheetUrl("RESPOSTAS_WELLNESS")).then(r=>r.ok?r.text():null).catch(()=>null));
      promises.push(fetch(sheetUrl("ATLETAS")).then(r=>r.ok?r.text():null).catch(()=>null));
    }
    const res = await Promise.all(promises);
    setAthDb(res[0].data||[]);
    setTrainings(res[1].data||[]);
    setTests(res[2].data||[]);
    setSteps(res[3].data||[]);
    if (isCoach) {
      setWellness(res[4]?parseCSV(res[4]):[]);
      setWellAthletes(res[5]?parseCSV(res[5]):[]);
    }
    setLastUpdate(new Date());
    setLoading(false);
  }
  useEffect(()=>{ load(); },[]);

  // Atleta com dados completos do banco (inclui colunas novas)
  const ath = useMemo(()=>{
    const base = athletes.find(a=>a.id===selId);
    const db = (athDb||[]).find(a=>a.id===selId);
    if (!base) return null;
    return {
      ...base,
      birthDate: db?.birth_date || null, matricula: db?.matricula || null,
      rg: db?.rg || null, cpf: db?.cpf || null, admissionDate: db?.admission_date || null,
      shirtSize: db?.shirt_size || null, shortsSize: db?.shorts_size || null,
      jacketSize: db?.jacket_size || null, unisuitSize: db?.unisuit_size || null,
    };
  },[athletes,athDb,selId]);

  const isOwnProfile = !isCoach && session?.athleteId === selId;
  const canSeePrivate = isCoach || isOwnProfile;
  const canEdit = isCoach || isOwnProfile;

  const wellnessId = useMemo(()=>{
    if (!ath || !wellAthletes.length) return null;
    const target = ath.name.toUpperCase();
    const m = wellAthletes.find(w=>{
      const wn=(w.Nome||"").toUpperCase();
      if(!wn) return false;
      const wParts=wn.split(" ").filter(Boolean);
      return wParts.length && target.includes(wParts[0]) && (wParts.length<2 || target.includes(wParts[wParts.length-1]));
    });
    return m ? (m.ID||"").trim() : null;
  },[ath,wellAthletes]);

  const myWellness = useMemo(()=>{
    if(!wellnessId) return [];
    return wellness.filter(w=>(w.ID_Atleta||"").trim()===wellnessId).sort((a,b)=>(a.Timestamp||"").localeCompare(b.Timestamp||""));
  },[wellness,wellnessId]);

  const myTrainings = trainings.filter(t=>t.athlete_id===selId);
  const myTests = tests.filter(t=>t.athlete_id===selId);
  const latestTest = myTests[0];
  const latestSteps = latestTest ? steps.filter(s=>s.test_id===latestTest.id) : [];
  const zones = latestTest ? calcZones(latestTest.max_hr, latestTest.rest_hr) : null;

  const last7 = myWellness.slice(-7);
  const todayScore = last7.length ? parseNum(last7[last7.length-1].Score_Wellness) : null;
  const baseline = avg(myWellness.slice(-8,-1).map(e=>parseNum(e.Score_Wellness)));
  const wellColor = todayScore==null ? C.muted : (baseline && ((baseline-todayScore)/baseline)>=0.15) || todayScore<2.8 ? C.bad : (baseline && ((baseline-todayScore)/baseline)>=0.08) ? C.warn : C.good;

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
  const weekTrainings = myTrainings.filter(t=>new Date(t.date)>=weekAgo);
  const weekAvgPerc = avg(weekTrainings.map(t=>t.perc_bt).filter(Boolean));

  const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear()-3);
  const evol = [...myTests].filter(t=>t.max_rel_power_corrg&&new Date(t.test_date)>=cutoff).sort((a,b)=>a.test_date.localeCompare(b.test_date));
  const evolVals = evol.map(t=>t.max_rel_power_corrg);

  const today = new Date().toISOString().slice(0,10);
  const heavyToday = myTrainings.some(t=>t.date===today&&["B4","B5","E4","E5"].includes(String(t.training_type).toUpperCase()));
  const alert = isCoach && wellColor===C.bad && heavyToday;

  if (loading) return <div style={{padding:40,textAlign:"center",color:C.muted}}><div style={{fontSize:32,marginBottom:10}}>👤</div><div style={{letterSpacing:3,fontSize:13}}>CARREGANDO PERFIL...</div></div>;
  if (!ath) return <div style={{padding:40,textAlign:"center",color:C.muted}}>Atleta não encontrado.</div>;

  return (
    <div>
      {/* Header + seletor */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:22,fontWeight:800}}>👤 Perfil 360</div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {isCoach && (
            <PSelect value={selId} onChange={e=>setSelId(e.target.value)} style={{width:"auto",paddingRight:28}}>
              {athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
            </PSelect>
          )}
          {lastUpdate&&<span style={{fontSize:11,color:C.muted}}>{lastUpdate.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>}
          <button onClick={load} style={{background:C.surfHi,border:`1px solid ${C.border}`,color:C.text,borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>↻ Atualizar</button>
        </div>
      </div>

      {alert && (
        <div style={{background:"rgba(239,68,68,.1)",border:`1px solid ${C.bad}`,borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.bad,fontWeight:700}}>
          ⚠️ ATENÇÃO: Wellness em alerta vermelho E treino de alta intensidade (B4/B5) registrado hoje. Considere ajustar a carga.
        </div>
      )}

      {/* Identificação */}
      <Card s={{marginBottom:12,borderTop:`3px solid ${C.blue}`}}>
        <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <div style={{width:54,height:54,borderRadius:"50%",background:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:"#fff",flexShrink:0}}>
            {ath.name.split(" ").filter(Boolean).slice(0,2).map(p=>p[0]).join("")}
          </div>
          <div style={{flex:1,minWidth:180}}>
            <div style={{fontSize:19,fontWeight:900}}>{ath.name}</div>
            <div style={{fontSize:12,color:C.muted}}>{ath.category}{ath.weight?` · ${ath.weight}`:""}</div>
          </div>
          <div style={{display:"flex",gap:18,flexWrap:"wrap"}}>
            <div><Lbl t="Treinos (7d)"/><div className="mono" style={{fontSize:20,fontWeight:800,color:C.blueLt}}>{weekTrainings.length}</div></div>
            <div><Lbl t="Média %BT (7d)"/><div className="mono" style={{fontSize:20,fontWeight:800,color:weekAvgPerc?C.good:C.muted}}>{weekAvgPerc?weekAvgPerc.toFixed(1)+"%":"—"}</div></div>
            <div><Lbl t="Step Tests"/><div className="mono" style={{fontSize:20,fontWeight:800,color:C.text}}>{myTests.length}</div></div>
          </div>
        </div>
      </Card>

      {/* DADOS PESSOAIS */}
      <PersonalDataCard ath={ath} canSeePrivate={canSeePrivate} canEdit={canEdit} onSaved={load}/>

      {/* Grid: Wellness (coach) + Step Test */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12,marginBottom:12}}>
        {isCoach && (
          <Card s={{borderTop:`2px solid ${wellColor}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:800}}>💚 Bem-Estar</div>
              {todayScore!=null&&<span style={{background:wellColor,color:"#fff",fontSize:10,fontWeight:800,padding:"2px 10px",borderRadius:4,letterSpacing:1}}>{wellColor===C.good?"🟢 ÓTIMO":wellColor===C.warn?"🟡 ATENÇÃO":"🔴 ALERTA"}</span>}
            </div>
            {myWellness.length===0?(
              <div style={{color:C.muted,fontSize:12,padding:"10px 0"}}>Sem respostas de wellness vinculadas.</div>
            ):(
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:8}}>
                  <div>
                    <Lbl t="Score hoje"/>
                    <div className="mono" style={{fontSize:26,fontWeight:800,color:wellColor}}>{todayScore!=null?todayScore.toFixed(2):"—"}</div>
                    {baseline!=null&&<div style={{fontSize:10,color:C.muted}}>baseline 7d: <span className="mono">{baseline.toFixed(2)}</span></div>}
                  </div>
                  <Spark vals={last7.map(e=>parseNum(e.Score_Wellness))} color={wellColor} w={120} h={34}/>
                </div>
                {last7.length>0&&last7[last7.length-1].Estado_Geral&&(
                  <div style={{fontSize:11,color:C.muted,fontStyle:"italic",borderTop:`1px solid ${C.border}`,paddingTop:8}}>"{last7[last7.length-1].Estado_Geral}"</div>
                )}
              </>
            )}
          </Card>
        )}

        <Card s={{borderTop:`2px solid ${C.blueLt}`}}>
          <div style={{fontSize:13,fontWeight:800,marginBottom:10}}>🔬 Último Step Test</div>
          {!latestTest?(
            <div style={{color:C.muted,fontSize:12,padding:"10px 0"}}>Nenhum step test registrado.</div>
          ):(
            <>
              <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{fmtDate(latestTest.test_date)} · {latestTest.protocol}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(80px,1fr))",gap:8,marginBottom:10}}>
                <div><Lbl t="FC Máx"/><div className="mono" style={{fontSize:16,fontWeight:700,color:C.bad}}>{latestTest.max_hr??"—"}</div></div>
                <div><Lbl t="Potência"/><div className="mono" style={{fontSize:16,fontWeight:700,color:C.blueLt}}>{fmt0(latestTest.max_power)} W</div></div>
                <div><Lbl t="Pot. Corrg"/><div className="mono" style={{fontSize:16,fontWeight:700,color:C.good}}>{fmt1(latestTest.max_rel_power_corrg)}</div></div>
              </div>
              {evolVals.length>=2&&(
                <div>
                  <Lbl t="Evolução 3 anos (w.kg corrigido)"/>
                  <Spark vals={evolVals} color={C.good} w={180} h={34}/>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* ZONAS */}
      {zones && (
        <Card s={{marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:800,marginBottom:10}}>🎯 Zonas de Treinamento Atuais</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:C.surfHi}}>
                {["Zona","Descrição","FC (bpm)","Potência"].map(h=><th key={h} style={{padding:"7px 10px",fontSize:9,letterSpacing:1.5,color:C.blueLt,textTransform:"uppercase",textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {zones.map(z=>{
                  const pL=interpolatePower(latestSteps,z.hrLow),pH=interpolatePower(latestSteps,z.hrHigh);
                  return(<tr key={z.key} style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:"8px 10px"}}><span style={{background:z.color,color:"#fff",fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:4}}>{z.label}</span></td>
                    <td style={{padding:"8px 10px",fontSize:12,color:C.muted}}>{z.desc}</td>
                    <td className="mono" style={{padding:"8px 10px",fontSize:12}}>{z.hrLow}–{z.hrHigh}</td>
                    <td className="mono" style={{padding:"8px 10px",fontSize:12,fontWeight:700,color:z.color}}>{pL&&pH?`${pL}–${pH} W`:pL?`~${pL} W`:"—"}</td>
                  </tr>);
                })}
              </tbody>
            </table>
          </div>
          {latestTest.rest_hr&&<div style={{marginTop:6,fontSize:10,color:C.muted}}>Karvonen · FC rep: {latestTest.rest_hr} · FC máx: {latestTest.max_hr}</div>}
        </Card>
      )}

      {/* BUSCA DE TREINOS (substitui "últimos 10") */}
      <TrainingSearch myTrainings={myTrainings}/>
    </div>
  );
}
