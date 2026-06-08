import { useState, useMemo, useEffect } from "react";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const SHEET_ID = "1V5b0Wxbgc7SfYIIG58aFofHAXhvAGqg90is246N_6XU";

function sheetUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

// ─── CSV PARSER ────────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const result = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuote = !inQuote; }
    else if (c === "," && !inQuote) { result.push(cur); cur = ""; }
    else cur += c;
  }
  result.push(cur);
  return result;
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (values[i] || "").trim().replace(/^"|"$/g, ""); });
    return obj;
  }).filter(r => Object.values(r).some(v => v));
}

// ─── UTILS ─────────────────────────────────────────────────────────────────
function parseNum(s) {
  const n = parseFloat(String(s || "").replace(",", ".").trim());
  return isNaN(n) ? null : n;
}

function parseDate(s) {
  if (!s) return null;
  // handles "06/06/2026 07:04:12" or "2026-06-06"
  const dp = s.split(" ")[0];
  if (dp.includes("/")) {
    const [d, m, y] = dp.split("/");
    return new Date(`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`);
  }
  return new Date(dp);
}

function todayStr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0,0,0,0); return d;
}

function weekBounds(offsetWeeks = 0) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1 + offsetWeeks * 7);
  monday.setHours(0,0,0,0);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999);
  return { start: monday, end: sunday };
}

function avg(arr) {
  const v = arr.filter(x => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function initials(name) {
  if (!name) return "?";
  const p = name.trim().split(" ").filter(Boolean);
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase();
}

function firstName(name) { return name?.trim().split(" ")[0] || "?"; }

// ─── STATUS LOGIC ──────────────────────────────────────────────────────────
function scoreStatus(today, baseline) {
  if (today == null) return "none";
  if (baseline == null) return today >= 3.5 ? "green" : today >= 2.8 ? "yellow" : "red";
  const drop = ((baseline - today) / baseline) * 100;
  if (drop >= 15 || today < 2.8) return "red";
  if (drop >= 8) return "yellow";
  return "green";
}

function hrvStatus(today, baseline) {
  if (today == null) return null;
  if (baseline == null) return "info";
  const pct = ((today - baseline) / baseline) * 100;
  if (pct <= -15) return "red";
  if (pct <= -8) return "yellow";
  return "green";
}

function fcStatus(today, baseline) {
  if (today == null) return null;
  if (baseline == null) return "info";
  const pct = ((today - baseline) / baseline) * 100;
  if (pct >= 10) return "red";
  if (pct >= 5) return "yellow";
  return "green";
}

function trendStatus(thisW, lastW) {
  if (thisW == null || lastW == null) return null;
  const diff = thisW - lastW;
  if (diff >= 0.15) return "up";
  if (diff <= -0.15) return "down";
  return "stable";
}

const SC = {
  green:  { bg:"#16a34a", glow:"rgba(22,163,74,.12)",  label:"Ótimo",    emoji:"🟢" },
  yellow: { bg:"#d97706", glow:"rgba(217,119,6,.12)",  label:"Atenção",  emoji:"🟡" },
  red:    { bg:"#dc2626", glow:"rgba(220,38,38,.12)",  label:"Alerta",   emoji:"🔴" },
  none:   { bg:"#374151", glow:"rgba(55,65,81,.06)",   label:"Sem dado", emoji:"⚪" },
  info:   { bg:"#3b82f6", glow:"rgba(59,130,246,.1)",  label:"Novo",     emoji:"🔵" },
};

const TREND = {
  up:     { icon:"↗", color:"#22c55e", label:"Subindo"  },
  stable: { icon:"→", color:"#f59e0b", label:"Estável"  },
  down:   { icon:"↘", color:"#ef4444", label:"Caindo"   },
};

// ─── COLORS ────────────────────────────────────────────────────────────────
const C = {
  bg:"#070b12", surf:"#0d1421", surfHi:"#131e30",
  border:"#1a2840", blue:"#1a4fa0", blueLt:"#3b82f6",
  text:"#e2eaf5", muted:"#4a6080",
};

const GS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{background:${C.bg};color:${C.text};font-family:'Barlow Condensed',sans-serif;}
  .mono{font-family:'JetBrains Mono',monospace;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-track{background:${C.bg};}
  ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
`;

// ─── SPARKLINE ─────────────────────────────────────────────────────────────
function Spark({ scores, color }) {
  const valid = scores.filter(s => s != null);
  if (valid.length < 2) return null;
  const w=72, h=22, p=2;
  const mn=Math.min(...valid), mx=Math.max(...valid), rng=mx-mn||0.5;
  const pts = scores.map((v,i) => {
    const val = v ?? mn;
    const x = p + (i/(scores.length-1))*(w-p*2);
    const y = p + (1-(val-mn)/rng)*(h-p*2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color||C.blueLt} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".7"/>
      {scores.map((v,i) => {
        const val = v??mn;
        const x = p+(i/(scores.length-1))*(w-p*2);
        const y = p+(1-(val-mn)/rng)*(h-p*2);
        return <circle key={i} cx={x} cy={y} r={i===scores.length-1?2.5:1.5} fill={i===scores.length-1?(color||C.blueLt):"rgba(59,130,246,.35)"}/>;
      })}
    </svg>
  );
}

// ─── METRIC PILL ───────────────────────────────────────────────────────────
function MetricPill({ icon, label, value, unit, status }) {
  if (value == null) return null;
  const s = SC[status] || SC.info;
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:C.surfHi,borderRadius:6,border:`1px solid ${s.bg}40`,flex:1}}>
      <span style={{fontSize:13}}>{icon}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:9,color:C.muted,letterSpacing:1}}>{label}</div>
        <div className="mono" style={{fontSize:13,fontWeight:700,color:s.bg,lineHeight:1}}>{value}{unit}</div>
      </div>
      <span style={{fontSize:11}}>{s.emoji}</span>
    </div>
  );
}

// ─── ATHLETE CARD ──────────────────────────────────────────────────────────
function AthleteCard({ data, onClick }) {
  const { athlete, todayEntry, thisWeekEntries, lastWeekEntries, allEntries } = data;

  const todayScore = todayEntry ? parseNum(todayEntry.Score_Wellness) : null;
  const todayHRV   = todayEntry ? parseNum(todayEntry.HRV_VFC) : null;
  const todayFC    = todayEntry ? parseNum(todayEntry.FC_Repouso) : null;

  const recent7    = allEntries.slice(-8,-1).map(e => parseNum(e.Score_Wellness));
  const baseline   = avg(recent7);

  const hrvHistory = allEntries.slice(0,-1).map(e => parseNum(e.HRV_VFC)).filter(Boolean);
  const fcHistory  = allEntries.slice(0,-1).map(e => parseNum(e.FC_Repouso)).filter(Boolean);
  const hrvBaseline = avg(hrvHistory.slice(-7));
  const fcBaseline  = avg(fcHistory.slice(-7));

  const thisWeekAvg = avg(thisWeekEntries.map(e => parseNum(e.Score_Wellness)));
  const lastWeekAvg = avg(lastWeekEntries.map(e => parseNum(e.Score_Wellness)));
  const trend       = trendStatus(thisWeekAvg, lastWeekAvg);
  const trendDiff   = (thisWeekAvg != null && lastWeekAvg != null) ? thisWeekAvg - lastWeekAvg : null;

  const status = scoreStatus(todayScore, baseline);
  const s = SC[status];
  const spark7 = allEntries.slice(-7).map(e => parseNum(e.Score_Wellness));

  return (
    <div onClick={onClick}
      style={{position:"relative",background:C.surf,borderRadius:12,padding:16,cursor:"pointer",
        border:`1px solid ${status==="none"?C.border:s.bg}`,borderLeft:`4px solid ${s.bg}`,
        overflow:"hidden",transition:"transform .15s,box-shadow .15s"}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 24px ${s.glow}`;}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>

      <div style={{position:"absolute",inset:0,background:s.glow,pointerEvents:"none"}}/>
      <div style={{position:"relative"}}>

        {/* Avatar + name + score */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <div style={{width:44,height:44,borderRadius:"50%",background:s.bg,flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:16,fontWeight:900,color:"#fff",letterSpacing:1,boxShadow:`0 0 12px ${s.bg}50`}}>
            {initials(athlete.Nome||athlete.name||"")}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:15,lineHeight:1.1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {firstName(athlete.Nome||athlete.name||"")}
            </div>
            <div style={{fontSize:10,color:C.muted,marginTop:2,letterSpacing:1}}>
              {(athlete.Categoria||athlete.category||"").toUpperCase()}
            </div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:9,color:C.muted,letterSpacing:1}}>HOJE</div>
            <div className="mono" style={{fontSize:22,fontWeight:700,color:s.bg,lineHeight:1}}>
              {todayScore != null ? todayScore.toFixed(2) : "—"}
            </div>
          </div>
        </div>

        {/* Status + trend */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{background:s.bg,color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,letterSpacing:1}}>
            {s.emoji} {s.label.toUpperCase()}
          </span>
          {trend && (
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:10,color:C.muted}}>Semana:</span>
              <span style={{fontSize:13,fontWeight:800,color:TREND[trend].color}}>{TREND[trend].icon}</span>
              <span style={{fontSize:10,color:TREND[trend].color}}>
                {trendDiff != null ? (trendDiff > 0 ? "+" : "") + trendDiff.toFixed(2) : ""}
              </span>
            </div>
          )}
        </div>

        {/* Sparkline */}
        {spark7.some(v=>v!=null) && (
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:9,color:C.muted,letterSpacing:1}}>7D</span>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <Spark scores={spark7} color={s.bg}/>
              {baseline!=null&&<span style={{fontSize:11,color:C.muted}}>base: <span className="mono" style={{color:C.text}}>{baseline.toFixed(2)}</span></span>}
            </div>
          </div>
        )}

        {/* HRV + FC pills */}
        {(todayHRV!=null||todayFC!=null) && (
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {todayHRV!=null&&<MetricPill icon="📊" label="HRV" value={todayHRV} unit="ms" status={hrvStatus(todayHRV,hrvBaseline)}/>}
            {todayFC!=null&&<MetricPill icon="❤️" label="FC rep." value={todayFC} unit="bpm" status={fcStatus(todayFC,fcBaseline)}/>}
          </div>
        )}

        {/* Observation */}
        {todayEntry?.Estado_Geral && (
          <div style={{fontSize:11,color:C.muted,fontStyle:"italic",borderTop:`1px solid ${C.border}`,paddingTop:8,lineHeight:1.4}}>
            "{todayEntry.Estado_Geral}"
          </div>
        )}
        {!todayEntry && (
          <div style={{fontSize:11,color:C.muted,textAlign:"center",paddingTop:6,borderTop:`1px solid ${C.border}`}}>
            Não respondeu hoje
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DETAIL MODAL ──────────────────────────────────────────────────────────
function Detail({ data, onClose }) {
  const { athlete, allEntries } = data;
  const sorted = [...allEntries].sort((a,b)=>b.Timestamp.localeCompare(a.Timestamp)).slice(0,14);
  const scores = sorted.map(e=>parseNum(e.Score_Wellness)).reverse();
  const hrvs   = sorted.map(e=>parseNum(e.HRV_VFC)).reverse();
  const fcs    = sorted.map(e=>parseNum(e.FC_Repouso)).reverse();

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:14,padding:24,width:"100%",maxWidth:500,maxHeight:"88vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <div style={{fontSize:20,fontWeight:900}}>{athlete.Nome||athlete.name}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:2}}>{athlete.Categoria||athlete.category} · {athlete.ID||athlete.id}</div>
          </div>
          <button onClick={onClose} style={{background:C.surfHi,border:"none",color:C.text,borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:16,fontFamily:"inherit"}}>✕</button>
        </div>

        {/* Charts */}
        <div style={{display:"grid",gridTemplateColumns:hrvs.filter(Boolean).length>=2?"1fr 1fr 1fr":"1fr",gap:10,marginBottom:16}}>
          {[
            {label:"SCORE",scores,color:C.blueLt},
            ...(hrvs.filter(Boolean).length>=2?[{label:"HRV",scores:hrvs,color:"#8b5cf6"}]:[]),
            ...(fcs.filter(Boolean).length>=2?[{label:"FC REP.",scores:fcs,color:"#ef4444"}]:[]),
          ].map(chart=>(
            <div key={chart.label} style={{background:C.surfHi,borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:6}}>{chart.label}</div>
              <Spark scores={chart.scores} color={chart.color}/>
            </div>
          ))}
        </div>

        <div style={{fontSize:11,fontWeight:700,color:C.blueLt,letterSpacing:2,marginBottom:10}}>HISTÓRICO</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {sorted.length===0&&<div style={{color:C.muted,fontSize:13}}>Sem registros.</div>}
          {sorted.map((e,i)=>{
            const score=parseNum(e.Score_Wellness);
            const st=scoreStatus(score,null);
            const ss=SC[st];
            const hrv=parseNum(e.HRV_VFC);
            const fc=parseNum(e.FC_Repouso);
            return(
              <div key={i} style={{padding:"10px 12px",background:C.surfHi,borderRadius:8,border:`1px solid ${C.border}`,borderLeft:`3px solid ${ss.bg}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span className="mono" style={{fontSize:11,color:C.muted}}>{e.Timestamp?.slice(0,10)}</span>
                  <span className="mono" style={{fontSize:16,fontWeight:700,color:ss.bg}}>{score!=null?score.toFixed(2):"—"}</span>
                </div>
                <div style={{fontSize:11,color:C.muted,marginBottom:3}}>
                  {[e.Qualidade_Sono&&`Sono:${e.Qualidade_Sono}`,e.Fadiga&&`Fad:${e.Fadiga}`,e.Dor_Muscular&&`Dor:${e.Dor_Muscular}`,e.Motivacao&&`Mot:${e.Motivacao}`].filter(Boolean).join(" · ")}
                </div>
                {(hrv||fc)&&(
                  <div style={{display:"flex",gap:10,fontSize:11}}>
                    {hrv&&<span>📊 HRV <span className="mono" style={{color:"#8b5cf6"}}>{hrv}ms</span></span>}
                    {fc&&<span>❤️ FC <span className="mono" style={{color:"#ef4444"}}>{fc}bpm</span></span>}
                  </div>
                )}
                {e.Estado_Geral&&<div style={{fontSize:11,color:C.text,marginTop:4,fontStyle:"italic"}}>"{e.Estado_Geral}"</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── TEAM TREND PANEL ──────────────────────────────────────────────────────
function TeamTrendPanel({ allData }) {
  const trends = allData.map(d => {
    const tw = avg(d.thisWeekEntries.map(e=>parseNum(e.Score_Wellness)));
    const lw = avg(d.lastWeekEntries.map(e=>parseNum(e.Score_Wellness)));
    return trendStatus(tw,lw);
  });
  const up=trends.filter(t=>t==="up").length;
  const stable=trends.filter(t=>t==="stable").length;
  const down=trends.filter(t=>t==="down").length;
  const noData=trends.filter(t=>t===null).length;
  return(
    <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",marginBottom:14}}>
      <div style={{fontSize:10,color:C.muted,letterSpacing:2,marginBottom:10}}>TENDÊNCIA DA EQUIPE — SEMANA ATUAL vs ANTERIOR</div>
      <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
        {[
          {icon:"↗",color:"#22c55e",label:"Melhorando",val:up},
          {icon:"→",color:"#f59e0b",label:"Estável",val:stable},
          {icon:"↘",color:"#ef4444",label:"Piorando",val:down},
          {icon:"—",color:C.muted,label:"Sem dados",val:noData},
        ].map(t=>(
          <div key={t.label} style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:20,fontWeight:800,color:t.color}}>{t.icon}</span>
            <div>
              <div style={{fontSize:9,color:C.muted,letterSpacing:1}}>{t.label.toUpperCase()}</div>
              <div style={{fontSize:22,fontWeight:900,color:t.color}}>{t.val}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ────────────────────────────────────────────────────────
export default function WellnessDashboard() {
  const [athletes,  setAthletes]  = useState([]);
  const [wellness,  setWellness]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [lastUpdate,setLastUpdate]= useState(null);
  const [selected,  setSelected]  = useState(null);
  const [filter,    setFilter]    = useState("todos");

  async function fetchSheet(name) {
    const res = await fetch(sheetUrl(name));
    if (!res.ok) throw new Error(`Erro ao carregar aba ${name} (${res.status})`);
    const text = await res.text();
    return parseCSV(text);
  }

  async function load() {
    try {
      setLoading(true); setError(null);
      const [ath, well] = await Promise.all([
        fetchSheet("ATLETAS"),
        fetchSheet("RESPOSTAS_WELLNESS"),
      ]);
      setAthletes(ath.filter(a => (a.Ativo||"").trim() === "Sim"));
      setWellness(well);
      setLastUpdate(new Date());
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const today    = todayStr();
  const ago30    = daysAgo(30);
  const thisWeek = weekBounds(0);
  const lastWeek = weekBounds(-1);

  const allData = useMemo(() => {
    return athletes.map(ath => {
      // Match by ID or name (handles both sheet formats)
      const mine = wellness.filter(w => {
        const wId = (w.ID_Atleta||"").trim();
        const aId = (ath.ID||"").trim();
        return wId === aId;
      }).sort((a,b) => a.Timestamp.localeCompare(b.Timestamp));

      const todayEntry = [...mine].reverse().find(w => w.Timestamp?.startsWith(today));

      const filterRange = (arr, start, end) => arr.filter(w => {
        const d = parseDate(w.Timestamp); return d && d >= start && d <= end;
      });

      return {
        athlete: ath,
        todayEntry,
        thisWeekEntries: filterRange(mine, thisWeek.start, thisWeek.end),
        lastWeekEntries: filterRange(mine, lastWeek.start, lastWeek.end),
        allEntries: mine,
      };
    });
  }, [athletes, wellness, today]);

  const responded = allData.filter(d => d.todayEntry).length;
  const alerts = allData.filter(d => {
    const s = d.todayEntry ? parseNum(d.todayEntry.Score_Wellness) : null;
    const b = avg(d.allEntries.slice(-8,-1).map(e=>parseNum(e.Score_Wellness)));
    return scoreStatus(s, b) === "red";
  }).length;

  const categories = [...new Set(athletes.map(a => a.Categoria).filter(Boolean))];

  const filtered = allData.filter(d => {
    if (filter === "alerta") {
      const s = d.todayEntry ? parseNum(d.todayEntry.Score_Wellness) : null;
      const b = avg(d.allEntries.slice(-8,-1).map(e=>parseNum(e.Score_Wellness)));
      return scoreStatus(s,b) === "red";
    }
    if (filter === "sem-resposta") return !d.todayEntry;
    if (filter === "caindo") {
      const tw = avg(d.thisWeekEntries.map(e=>parseNum(e.Score_Wellness)));
      const lw = avg(d.lastWeekEntries.map(e=>parseNum(e.Score_Wellness)));
      return trendStatus(tw,lw) === "down";
    }
    if (categories.includes(filter)) return d.athlete.Categoria === filter;
    return true;
  });

  const selectedData = selected ? allData.find(d => (d.athlete.ID||d.athlete.id) === selected) : null;

  if (loading) return (
    <div style={{padding:40,textAlign:"center",color:C.muted}}>
      <style>{GS}</style>
      <div style={{fontSize:32,marginBottom:12}}>💚</div>
      <div style={{letterSpacing:3,fontSize:13}}>CARREGANDO BEM-ESTAR...</div>
    </div>
  );

  if (error) return (
    <div style={{padding:32,textAlign:"center",maxWidth:440,margin:"0 auto"}}>
      <style>{GS}</style>
      <div style={{fontSize:32,marginBottom:12}}>⚠️</div>
      <div style={{color:"#ef4444",fontSize:16,marginBottom:8}}>Erro ao carregar dados</div>
      <div style={{color:C.muted,fontSize:13,marginBottom:8}}>{error}</div>
      <div style={{color:C.muted,fontSize:12,marginBottom:16}}>
        Verifique se a planilha está compartilhada publicamente:<br/>
        <span style={{color:C.blueLt,fontSize:11}}>Google Sheets → Compartilhar → Qualquer pessoa com o link → Leitor</span>
      </div>
      <button onClick={load} style={{background:C.blue,color:"#fff",border:"none",borderRadius:6,padding:"10px 20px",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:14}}>
        Tentar novamente
      </button>
    </div>
  );

  return (
    <div style={{minHeight:"100%",background:C.bg}}>
      <style>{GS}</style>

      {/* Sub-header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:20,fontWeight:800}}>💚 Bem-Estar da Equipe</div>
          <div style={{fontSize:12,color:C.muted}}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {lastUpdate&&<span style={{fontSize:11,color:C.muted}}>Atualizado: {lastUpdate.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>}
          <button onClick={load} style={{background:C.surfHi,border:`1px solid ${C.border}`,color:C.text,borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}>↻ Atualizar</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10,marginBottom:14}}>
        {[
          {icon:"🚣",label:"Total",val:athletes.length,c:C.blue},
          {icon:"✅",label:"Responderam",val:responded,c:"#16a34a"},
          {icon:"⏳",label:"Sem resposta",val:athletes.length-responded,c:C.muted},
          {icon:"🔴",label:"Em alerta",val:alerts,c:"#dc2626"},
        ].map(s=>(
          <div key={s.label} style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",borderTop:`2px solid ${s.c}`}}>
            <div style={{fontSize:18}}>{s.icon}</div>
            <div style={{fontSize:9,letterSpacing:2,color:C.muted,margin:"4px 0 1px",textTransform:"uppercase"}}>{s.label}</div>
            <div style={{fontSize:26,fontWeight:900,color:s.c}}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Team trend */}
      {allData.length > 0 && <TeamTrendPanel allData={allData}/>}

      {/* Filters */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {["todos","alerta","sem-resposta","caindo",...categories].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:"5px 12px",background:filter===f?C.blue:C.surfHi,color:filter===f?"#fff":C.muted,
              border:`1px solid ${filter===f?C.blue:C.border}`,borderRadius:6,fontFamily:"inherit",
              fontWeight:700,fontSize:11,cursor:"pointer",letterSpacing:1,transition:"all .15s",textTransform:"uppercase"}}>
            {f==="todos"?"Todos":f==="alerta"?"🔴 Alerta":f==="sem-resposta"?"⏳ S/ Resposta":f==="caindo"?"↘ Caindo":f}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{textAlign:"center",color:C.muted,padding:40,fontSize:14}}>
          Nenhum atleta encontrado para este filtro.
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(255px,1fr))",gap:12}}>
          {filtered.map(d=>(
            <AthleteCard key={d.athlete.ID||d.athlete.id} data={d}
              onClick={()=>setSelected(d.athlete.ID||d.athlete.id)}/>
          ))}
        </div>
      )}

      {selectedData && <Detail data={selectedData} onClose={()=>setSelected(null)}/>}
    </div>
  );
}
