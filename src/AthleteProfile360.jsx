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

const C = {
  bg:"#0a0c10", surf:"#111520", surfHi:"#192133", border:"#1e2d47",
  blue:"#1a4fa0", blueLt:"#2563c4", text:"#dce6f5", muted:"#4a6080",
  good:"#22c55e", warn:"#f59e0b", bad:"#ef4444",
};

// ─── UTILS ─────────────────────────────────────────────────────────────────
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

// ─── MAIN ──────────────────────────────────────────────────────────────────
export default function AthleteProfile360({ athletes, session }) {
  const isCoach = session?.role === "admin";
  const [selId, setSelId] = useState(isCoach ? (athletes[0]?.id||"") : session?.athleteId);
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
      supabase.from("trainings").select("*").order("created_at",{ascending:false}),
      supabase.from("step_tests").select("*").order("test_date",{ascending:false}),
      supabase.from("step_test_steps").select("*"),
    ];
    // Wellness só para o treinador (norma de alto rendimento)
    if (isCoach) {
      promises.push(fetch(sheetUrl("RESPOSTAS_WELLNESS")).then(r=>r.ok?r.text():null).catch(()=>null));
      promises.push(fetch(sheetUrl("ATLETAS")).then(r=>r.ok?r.text():null).catch(()=>null));
    }
    const res = await Promise.all(promises);
    setTrainings(res[0].data||[]);
    setTests(res[1].data||[]);
    setSteps(res[2].data||[]);
    if (isCoach) {
      setWellness(res[3]?parseCSV(res[3]):[]);
      setWellAthletes(res[4]?parseCSV(res[4]):[]);
    }
    setLastUpdate(new Date());
    setLoading(false);
  }
  useEffect(()=>{ load(); },[]);

  const ath = athletes.find(a=>a.id===selId);

  // Mapeia atleta do site -> ID do wellness via nome (primeiro nome + parte do sobrenome)
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

  // Wellness recente
  const last7 = myWellness.slice(-7);
  const todayScore = last7.length ? parseNum(last7[last7.length-1].Score_Wellness) : null;
  const baseline = avg(myWellness.slice(-8,-1).map(e=>parseNum(e.Score_Wellness)));
  const wellColor = todayScore==null ? C.muted : (baseline && ((baseline-todayScore)/baseline)>=0.15) || todayScore<2.8 ? C.bad : (baseline && ((baseline-todayScore)/baseline)>=0.08) ? C.warn : C.good;

  // Carga semanal de treinos
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
  const weekTrainings = myTrainings.filter(t=>new Date(t.date)>=weekAgo);
  const weekAvgPerc = avg(weekTrainings.map(t=>t.perc_bt).filter(Boolean));

  // Evolução step test (3 anos, pot. corrigida)
  const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear()-3);
  const evol = [...myTests].filter(t=>t.max_rel_power_corrg&&new Date(t.test_date)>=cutoff).sort((a,b)=>a.test_date.localeCompare(b.test_date));
  const evolVals = evol.map(t=>t.max_rel_power_corrg);

  // Alerta inteligente: wellness ruim + treino pesado hoje
  const today = new Date().toISOString().slice(0,10);
  const heavyToday = myTrainings.some(t=>t.date===today&&["B4","B5","E4","E5"].includes(String(t.training_type).toUpperCase()));
  const alert = isCoach && wellColor===C.bad && heavyToday;

  if (loading) return <div style={{padding:40,textAlign:"center",color:C.muted}}><div style={{fontSize:32,marginBottom:10}}>👤</div><div style={{letterSpacing:3,fontSize:13}}>CARREGANDO PERFIL...</div></div>;
  if (!ath) return <div style={{padding:40,textAlign:"center",color:C.muted}}>Atleta não encontrado.</div>;

  const year = new Date().getFullYear();

  return (
    <div>
      {/* Header + seletor */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:22,fontWeight:800}}>👤 Perfil 360</div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {isCoach && (
            <select value={selId} onChange={e=>setSelId(e.target.value)} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,background:C.bg,border:`1.5px solid ${C.border}`,color:C.text,padding:"7px 28px 7px 10px",borderRadius:6,outline:"none"}}>
              {athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
          {lastUpdate&&<span style={{fontSize:11,color:C.muted}}>{lastUpdate.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>}
          <button onClick={load} style={{background:C.surfHi,border:`1px solid ${C.border}`,color:C.text,borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>↻ Atualizar</button>
        </div>
      </div>

      {/* Alerta inteligente */}
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
            <div style={{fontSize:12,color:C.muted}}>{ath.category}{ath.birthYear?` · ${year-ath.birthYear} anos`:""}{ath.weight?` · ${ath.weight}`:""}</div>
          </div>
          <div style={{display:"flex",gap:18,flexWrap:"wrap"}}>
            <div><Lbl t="Treinos (7d)"/><div className="mono" style={{fontSize:20,fontWeight:800,color:C.blueLt}}>{weekTrainings.length}</div></div>
            <div><Lbl t="Média %BT (7d)"/><div className="mono" style={{fontSize:20,fontWeight:800,color:weekAvgPerc?C.good:C.muted}}>{weekAvgPerc?weekAvgPerc.toFixed(1)+"%":"—"}</div></div>
            <div><Lbl t="Step Tests"/><div className="mono" style={{fontSize:20,fontWeight:800,color:C.text}}>{myTests.length}</div></div>
          </div>
        </div>
      </Card>

      {/* Grid: Wellness (coach) + Step Test */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12,marginBottom:12}}>

        {/* WELLNESS — coach only */}
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

        {/* STEP TEST */}
        <Card s={{borderTop:`2px solid ${C.blueLt}`}}>
          <div style={{fontSize:13,fontWeight:800,marginBottom:10}}>🔬 Último Step Test</div>
          {!latestTest?(
            <div style={{color:C.muted,fontSize:12,padding:"10px 0"}}>Nenhum step test registrado.</div>
          ):(
            <>
              <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{new Date(latestTest.test_date+"T12:00:00").toLocaleDateString("pt-BR")} · {latestTest.protocol}</div>
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

      {/* TREINOS RECENTES */}
      <Card>
        <div style={{fontSize:13,fontWeight:800,marginBottom:10}}>📋 Últimos 10 Treinos</div>
        {myTrainings.length===0?(
          <div style={{color:C.muted,fontSize:12,padding:"10px 0"}}>Nenhum treino registrado.</div>
        ):(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:C.surfHi}}>
                {["Data","Tipo","Barco","Dist.","Tempo","% BT","Meta"].map(h=><th key={h} style={{padding:"7px 10px",fontSize:9,letterSpacing:1.5,color:C.blueLt,textTransform:"uppercase",textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {myTrainings.slice(0,10).map(t=>{
                  const tgt=TARGET_PERC[String(t.training_type||"B1").toUpperCase()]||75;
                  const c=getFBColor(t.training_type,t.perc_bt);
                  return(<tr key={t.id} style={{borderBottom:`1px solid ${C.border}`}}>
                    <td className="mono" style={{padding:"7px 10px",fontSize:11,whiteSpace:"nowrap"}}>{t.date}</td>
                    <td style={{padding:"7px 10px"}}><span style={{background:C.surfHi,padding:"2px 7px",borderRadius:4,fontSize:11,color:C.blueLt}}>{t.training_type}</span></td>
                    <td className="mono" style={{padding:"7px 10px",fontSize:11}}>{t.boat_label}</td>
                    <td className="mono" style={{padding:"7px 10px",fontSize:11}}>{t.distance}m</td>
                    <td className="mono" style={{padding:"7px 10px",fontSize:11}}>{fmtTime(t.time_seconds)}</td>
                    <td className="mono" style={{padding:"7px 10px",fontSize:12,fontWeight:700,color:c}}>{t.perc_bt?t.perc_bt.toFixed(1)+"%":"—"}</td>
                    <td className="mono" style={{padding:"7px 10px",fontSize:11,color:C.muted}}>{tgt}%{(t.perc_bt||0)>=tgt&&<span style={{marginLeft:4,color:C.good}}>✓</span>}</td>
                  </tr>);
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
