import { useState, useMemo } from "react";

// ─── DEMO DATA ─────────────────────────────────────────────────────────────
const TODAY = "06/06/2026";

const DEMO_ATHLETES = [
  { ID:"REM-2026-001", Nome:"OLAVO VINICIUS SOARES PELEGRINO", Categoria:"Sênior",   Ativo:"Sim" },
  { ID:"REM-2026-002", Nome:"ALEF DA ROSA FONTOURA",           Categoria:"Sênior",   Ativo:"Sim" },
  { ID:"REM-2026-003", Nome:"BRENO BARTOLOZZI MENEGHINI",      Categoria:"Sub-23",   Ativo:"Sim" },
  { ID:"REM-2026-004", Nome:"FELIPE TADASHI OLIVEIRA MATSUDA", Categoria:"Sub-23",   Ativo:"Sim" },
  { ID:"REM-2026-005", Nome:"GUSTAVO DE OLIVEIRA SANTOS",      Categoria:"Sub-23",   Ativo:"Sim" },
  { ID:"REM-2026-006", Nome:"MATEUS ALMEIDA SANT'ANA",         Categoria:"Sub-23",   Ativo:"Sim" },
  { ID:"REM-2026-007", Nome:"PEDRO HENRIQUE R. MENDES",        Categoria:"Sub-23",   Ativo:"Sim" },
  { ID:"REM-2026-008", Nome:"RAFAELA BEATRIZ VELSCH POCHINI",  Categoria:"Sub-23",   Ativo:"Sim" },
  { ID:"REM-2026-009", Nome:"CLAUDIA CICERO SANTOS",           Categoria:"Pararemo", Ativo:"Sim" },
  { ID:"REM-2026-010", Nome:"JAIRO NATANAEL FROHLICH KLUG",    Categoria:"Pararemo", Ativo:"Sim" },
  { ID:"REM-2026-011", Nome:"GABRIEL MENDE DE SOUZA",          Categoria:"Pararemo", Ativo:"Sim" },
  { ID:"REM-2026-012", Nome:"ALINA DUMAS",                     Categoria:"Pararemo", Ativo:"Sim" },
];

// Semana atual: 02/06 a 06/06 | Semana anterior: 26/05 a 01/06
const DEMO_WELLNESS = [
  // ── ALEF (REM-2026-002) ─────────────────────────────────────────────────
  { Timestamp:"26/05/2026 07:10:00", ID_Atleta:"REM-2026-002", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"1", Motivacao:"4", FC_Repouso:"52", HRV_VFC:"68", Score_Wellness:"3.85", Estado_Geral:"" },
  { Timestamp:"27/05/2026 07:10:00", ID_Atleta:"REM-2026-002", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"2", Motivacao:"4", FC_Repouso:"51", HRV_VFC:"70", Score_Wellness:"3.80", Estado_Geral:"" },
  { Timestamp:"28/05/2026 07:10:00", ID_Atleta:"REM-2026-002", Qualidade_Sono:"5", Fadiga:"1", Dor_Muscular:"1", Motivacao:"5", FC_Repouso:"50", HRV_VFC:"72", Score_Wellness:"4.00", Estado_Geral:"" },
  { Timestamp:"29/05/2026 07:10:00", ID_Atleta:"REM-2026-002", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"1", Motivacao:"4", FC_Repouso:"53", HRV_VFC:"65", Score_Wellness:"3.75", Estado_Geral:"" },
  { Timestamp:"02/06/2026 07:10:00", ID_Atleta:"REM-2026-002", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"1", Motivacao:"4", FC_Repouso:"52", HRV_VFC:"67", Score_Wellness:"3.80", Estado_Geral:"" },
  { Timestamp:"03/06/2026 07:10:00", ID_Atleta:"REM-2026-002", Qualidade_Sono:"3", Fadiga:"2", Dor_Muscular:"2", Motivacao:"4", FC_Repouso:"54", HRV_VFC:"63", Score_Wellness:"3.65", Estado_Geral:"" },
  { Timestamp:"04/06/2026 07:10:00", ID_Atleta:"REM-2026-002", Qualidade_Sono:"4", Fadiga:"1", Dor_Muscular:"1", Motivacao:"5", FC_Repouso:"51", HRV_VFC:"71", Score_Wellness:"3.90", Estado_Geral:"" },
  { Timestamp:"05/06/2026 07:10:00", ID_Atleta:"REM-2026-002", Qualidade_Sono:"3", Fadiga:"2", Dor_Muscular:"2", Motivacao:"4", FC_Repouso:"55", HRV_VFC:"60", Score_Wellness:"3.70", Estado_Geral:"" },
  { Timestamp:"06/06/2026 07:19:47", ID_Atleta:"REM-2026-002", Qualidade_Sono:"2", Fadiga:"2", Dor_Muscular:"1", Motivacao:"4", FC_Repouso:"57", HRV_VFC:"58", Score_Wellness:"3.60", Estado_Geral:"Dormi mal por rinite, mas estou bem pra treinar" },

  // ── BRENO (REM-2026-003) ─────────────────────────────────────────────────
  { Timestamp:"26/05/2026 07:10:00", ID_Atleta:"REM-2026-003", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"2", Motivacao:"4", FC_Repouso:"", HRV_VFC:"", Score_Wellness:"3.85", Estado_Geral:"" },
  { Timestamp:"27/05/2026 07:10:00", ID_Atleta:"REM-2026-003", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"3", Motivacao:"4", FC_Repouso:"", HRV_VFC:"", Score_Wellness:"3.75", Estado_Geral:"" },
  { Timestamp:"28/05/2026 07:10:00", ID_Atleta:"REM-2026-003", Qualidade_Sono:"5", Fadiga:"1", Dor_Muscular:"2", Motivacao:"5", FC_Repouso:"", HRV_VFC:"", Score_Wellness:"4.00", Estado_Geral:"" },
  { Timestamp:"02/06/2026 07:10:00", ID_Atleta:"REM-2026-003", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"2", Motivacao:"4", FC_Repouso:"", HRV_VFC:"", Score_Wellness:"3.80", Estado_Geral:"" },
  { Timestamp:"03/06/2026 07:10:00", ID_Atleta:"REM-2026-003", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"3", Motivacao:"5", FC_Repouso:"", HRV_VFC:"", Score_Wellness:"3.85", Estado_Geral:"" },
  { Timestamp:"04/06/2026 07:10:00", ID_Atleta:"REM-2026-003", Qualidade_Sono:"5", Fadiga:"1", Dor_Muscular:"2", Motivacao:"5", FC_Repouso:"", HRV_VFC:"", Score_Wellness:"4.00", Estado_Geral:"" },
  { Timestamp:"06/06/2026 07:08:52", ID_Atleta:"REM-2026-003", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"3", Motivacao:"4", FC_Repouso:"", HRV_VFC:"", Score_Wellness:"3.80", Estado_Geral:"Bem" },

  // ── FELIPE (REM-2026-004) ────────────────────────────────────────────────
  { Timestamp:"26/05/2026 07:10:00", ID_Atleta:"REM-2026-004", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"2", Motivacao:"4", FC_Repouso:"58", HRV_VFC:"", Score_Wellness:"3.70", Estado_Geral:"" },
  { Timestamp:"27/05/2026 07:10:00", ID_Atleta:"REM-2026-004", Qualidade_Sono:"4", Fadiga:"3", Dor_Muscular:"3", Motivacao:"3", Score_Wellness:"3.40", Estado_Geral:"" },
  { Timestamp:"28/05/2026 07:10:00", ID_Atleta:"REM-2026-004", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"2", Motivacao:"4", Score_Wellness:"3.60", Estado_Geral:"" },
  { Timestamp:"02/06/2026 07:10:00", ID_Atleta:"REM-2026-004", Qualidade_Sono:"4", Fadiga:"3", Dor_Muscular:"3", Motivacao:"3", FC_Repouso:"60", Score_Wellness:"3.35", Estado_Geral:"" },
  { Timestamp:"03/06/2026 07:10:00", ID_Atleta:"REM-2026-004", Qualidade_Sono:"3", Fadiga:"3", Dor_Muscular:"3", Motivacao:"3", FC_Repouso:"62", Score_Wellness:"3.10", Estado_Geral:"" },
  { Timestamp:"04/06/2026 07:10:00", ID_Atleta:"REM-2026-004", Qualidade_Sono:"3", Fadiga:"4", Dor_Muscular:"4", Motivacao:"2", FC_Repouso:"64", Score_Wellness:"2.85", Estado_Geral:"Cansado" },
  { Timestamp:"06/06/2026 14:02:31", ID_Atleta:"REM-2026-004", Qualidade_Sono:"4", Fadiga:"4", Dor_Muscular:"4", Motivacao:"2", FC_Repouso:"66", HRV_VFC:"", Score_Wellness:"2.60", Estado_Geral:"Mediano" },

  // ── MATEUS (REM-2026-006) ────────────────────────────────────────────────
  { Timestamp:"26/05/2026 07:10:00", ID_Atleta:"REM-2026-006", Qualidade_Sono:"4", Fadiga:"1", Dor_Muscular:"1", Motivacao:"5", Score_Wellness:"4.10", Estado_Geral:"" },
  { Timestamp:"27/05/2026 07:10:00", ID_Atleta:"REM-2026-006", Qualidade_Sono:"5", Fadiga:"1", Dor_Muscular:"1", Motivacao:"5", Score_Wellness:"4.20", Estado_Geral:"" },
  { Timestamp:"02/06/2026 07:10:00", ID_Atleta:"REM-2026-006", Qualidade_Sono:"4", Fadiga:"1", Dor_Muscular:"1", Motivacao:"4", Score_Wellness:"3.95", Estado_Geral:"" },
  { Timestamp:"03/06/2026 07:10:00", ID_Atleta:"REM-2026-006", Qualidade_Sono:"4", Fadiga:"1", Dor_Muscular:"1", Motivacao:"5", Score_Wellness:"4.00", Estado_Geral:"" },
  { Timestamp:"06/06/2026 06:53:01", ID_Atleta:"REM-2026-006", Qualidade_Sono:"3", Fadiga:"1", Dor_Muscular:"1", Motivacao:"4", Score_Wellness:"3.90", Estado_Geral:"Estou bem, sem dores específicas e descansando." },

  // ── PEDRO (REM-2026-007) ─────────────────────────────────────────────────
  { Timestamp:"26/05/2026 07:10:00", ID_Atleta:"REM-2026-007", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"2", Motivacao:"4", Score_Wellness:"3.75", Estado_Geral:"" },
  { Timestamp:"27/05/2026 07:10:00", ID_Atleta:"REM-2026-007", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"2", Motivacao:"4", Score_Wellness:"3.80", Estado_Geral:"" },
  { Timestamp:"02/06/2026 07:10:00", ID_Atleta:"REM-2026-007", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"2", Motivacao:"3", Score_Wellness:"3.50", Estado_Geral:"" },
  { Timestamp:"03/06/2026 07:10:00", ID_Atleta:"REM-2026-007", Qualidade_Sono:"3", Fadiga:"3", Dor_Muscular:"3", Motivacao:"3", Score_Wellness:"3.20", Estado_Geral:"" },
  { Timestamp:"04/06/2026 07:10:00", ID_Atleta:"REM-2026-007", Qualidade_Sono:"3", Fadiga:"3", Dor_Muscular:"3", Motivacao:"2", Score_Wellness:"3.10", Estado_Geral:"" },
  { Timestamp:"06/06/2026 09:43:50", ID_Atleta:"REM-2026-007", Qualidade_Sono:"4", Fadiga:"3", Dor_Muscular:"3", Motivacao:"2", Score_Wellness:"3.05", Estado_Geral:"Bem, mas um pouco cansado" },

  // ── RAFAELA (REM-2026-008) ───────────────────────────────────────────────
  { Timestamp:"26/05/2026 07:10:00", ID_Atleta:"REM-2026-008", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"1", Motivacao:"4", Score_Wellness:"3.80", Estado_Geral:"" },
  { Timestamp:"27/05/2026 07:10:00", ID_Atleta:"REM-2026-008", Qualidade_Sono:"5", Fadiga:"1", Dor_Muscular:"1", Motivacao:"5", Score_Wellness:"4.10", Estado_Geral:"" },
  { Timestamp:"02/06/2026 07:10:00", ID_Atleta:"REM-2026-008", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"2", Motivacao:"4", Score_Wellness:"3.75", Estado_Geral:"" },
  { Timestamp:"03/06/2026 07:10:00", ID_Atleta:"REM-2026-008", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"2", Motivacao:"4", Score_Wellness:"3.70", Estado_Geral:"" },
  { Timestamp:"06/06/2026 07:04:12", ID_Atleta:"REM-2026-008", Qualidade_Sono:"4", Fadiga:"3", Dor_Muscular:"1", Motivacao:"3", Score_Wellness:"3.70", Estado_Geral:"Dor de cabeça" },

  // ── CLAUDIA (REM-2026-009) ───────────────────────────────────────────────
  { Timestamp:"26/05/2026 07:10:00", ID_Atleta:"REM-2026-009", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"2", Motivacao:"4", FC_Repouso:"55", HRV_VFC:"62", Score_Wellness:"3.80", Estado_Geral:"" },
  { Timestamp:"27/05/2026 07:10:00", ID_Atleta:"REM-2026-009", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"2", Motivacao:"4", FC_Repouso:"54", HRV_VFC:"65", Score_Wellness:"3.85", Estado_Geral:"" },
  { Timestamp:"28/05/2026 07:10:00", ID_Atleta:"REM-2026-009", Qualidade_Sono:"5", Fadiga:"1", Dor_Muscular:"1", Motivacao:"5", FC_Repouso:"52", HRV_VFC:"70", Score_Wellness:"4.00", Estado_Geral:"" },
  { Timestamp:"02/06/2026 07:10:00", ID_Atleta:"REM-2026-009", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"2", Motivacao:"4", FC_Repouso:"56", HRV_VFC:"60", Score_Wellness:"3.70", Estado_Geral:"" },
  { Timestamp:"03/06/2026 07:10:00", ID_Atleta:"REM-2026-009", Qualidade_Sono:"4", Fadiga:"3", Dor_Muscular:"3", Motivacao:"4", FC_Repouso:"57", HRV_VFC:"58", Score_Wellness:"3.55", Estado_Geral:"" },
  { Timestamp:"06/06/2026 07:15:52", ID_Atleta:"REM-2026-009", Qualidade_Sono:"4", Fadiga:"3", Dor_Muscular:"3", Motivacao:"4", FC_Repouso:"55", HRV_VFC:"61", Score_Wellness:"3.55", Estado_Geral:"Estou bem." },

  // ── GABRIEL (REM-2026-011) ───────────────────────────────────────────────
  { Timestamp:"26/05/2026 07:10:00", ID_Atleta:"REM-2026-011", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"3", Motivacao:"4", FC_Repouso:"48", HRV_VFC:"75", Score_Wellness:"3.75", Estado_Geral:"" },
  { Timestamp:"27/05/2026 07:10:00", ID_Atleta:"REM-2026-011", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"3", Motivacao:"5", FC_Repouso:"47", HRV_VFC:"78", Score_Wellness:"3.85", Estado_Geral:"" },
  { Timestamp:"02/06/2026 07:10:00", ID_Atleta:"REM-2026-011", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"3", Motivacao:"5", FC_Repouso:"48", HRV_VFC:"76", Score_Wellness:"3.85", Estado_Geral:"" },
  { Timestamp:"03/06/2026 07:10:00", ID_Atleta:"REM-2026-011", Qualidade_Sono:"5", Fadiga:"1", Dor_Muscular:"2", Motivacao:"5", FC_Repouso:"46", HRV_VFC:"80", Score_Wellness:"4.10", Estado_Geral:"" },
  { Timestamp:"06/06/2026 07:25:39", ID_Atleta:"REM-2026-011", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"4", Motivacao:"5", FC_Repouso:"45", HRV_VFC:"", Score_Wellness:"3.85", Estado_Geral:"Um pouco de incômodo nas costas" },

  // ── ALINA (REM-2026-012) ─────────────────────────────────────────────────
  { Timestamp:"26/05/2026 07:10:00", ID_Atleta:"REM-2026-012", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"2", Motivacao:"4", Score_Wellness:"3.70", Estado_Geral:"" },
  { Timestamp:"27/05/2026 07:10:00", ID_Atleta:"REM-2026-012", Qualidade_Sono:"4", Fadiga:"2", Dor_Muscular:"2", Motivacao:"3", Score_Wellness:"3.50", Estado_Geral:"" },
  { Timestamp:"02/06/2026 07:10:00", ID_Atleta:"REM-2026-012", Qualidade_Sono:"3", Fadiga:"2", Dor_Muscular:"3", Motivacao:"3", Score_Wellness:"3.20", Estado_Geral:"" },
  { Timestamp:"03/06/2026 07:10:00", ID_Atleta:"REM-2026-012", Qualidade_Sono:"3", Fadiga:"3", Dor_Muscular:"3", Motivacao:"2", Score_Wellness:"3.00", Estado_Geral:"" },
  { Timestamp:"06/06/2026 07:17:56", ID_Atleta:"REM-2026-012", Qualidade_Sono:"3", Fadiga:"2", Dor_Muscular:"3", Motivacao:"2", Score_Wellness:"3.00", Estado_Geral:"" },
];

// ─── UTILS ─────────────────────────────────────────────────────────────────
function parseNum(s) {
  const n = parseFloat(String(s||"").replace(",",".").trim());
  return isNaN(n) ? null : n;
}
function parseDate(s) {
  if (!s) return null;
  const [dp] = s.split(" ");
  const [d,m,y] = dp.split("/");
  return new Date(`${y}-${m}-${d}`);
}
function avg(arr) {
  const v = arr.filter(x=>x!=null);
  return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null;
}
function initials(name) {
  const p = name.trim().split(" ").filter(Boolean);
  return p.length===1 ? p[0][0].toUpperCase() : (p[0][0]+p[p.length-1][0]).toUpperCase();
}
function firstName(name) { return name?.trim().split(" ")[0]||"?"; }

function weekBounds(offsetWeeks=0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now); monday.setDate(now.getDate()-day+1+(offsetWeeks*7));
  monday.setHours(0,0,0,0);
  const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
  sunday.setHours(23,59,59,999);
  return { start:monday, end:sunday };
}

// Score status
function scoreStatus(today, baseline) {
  if (today==null) return "none";
  if (baseline==null) return today>=3.5?"green":today>=2.8?"yellow":"red";
  const drop=((baseline-today)/baseline)*100;
  if (drop>=15||today<2.8) return "red";
  if (drop>=8) return "yellow";
  return "green";
}
// HRV status (higher = better)
function hrvStatus(today, baseline) {
  if (today==null) return null;
  if (baseline==null) return "info";
  const pct=((today-baseline)/baseline)*100;
  if (pct<=-15) return "red";
  if (pct<=-8)  return "yellow";
  return "green";
}
// FC status (lower = better)
function fcStatus(today, baseline) {
  if (today==null) return null;
  if (baseline==null) return "info";
  const pct=((today-baseline)/baseline)*100;
  if (pct>=10) return "red";
  if (pct>=5)  return "yellow";
  return "green";
}
// Weekly trend
function trendStatus(thisWeekAvg, lastWeekAvg) {
  if (thisWeekAvg==null||lastWeekAvg==null) return null;
  const diff=thisWeekAvg-lastWeekAvg;
  if (diff>=0.15) return "up";
  if (diff<=-0.15) return "down";
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
  const valid = scores.filter(s=>s!=null);
  if (valid.length<2) return null;
  const w=72,h=22,p=2;
  const mn=Math.min(...valid),mx=Math.max(...valid),rng=mx-mn||0.5;
  const allScores = scores.map(v=>v??mn);
  const pts=allScores.map((v,i)=>{
    const x=p+(i/(allScores.length-1))*(w-p*2);
    const y=p+(1-(v-mn)/rng)*(h-p*2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color||C.blueLt} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".7"/>
      {allScores.map((v,i)=>{
        const x=p+(i/(allScores.length-1))*(w-p*2);
        const y=p+(1-(v-mn)/rng)*(h-p*2);
        return <circle key={i} cx={x} cy={y} r={i===allScores.length-1?2.5:1.5} fill={i===allScores.length-1?(color||C.blueLt):"rgba(59,130,246,.35)"}/>;
      })}
    </svg>
  );
}

// ─── METRIC PILL ───────────────────────────────────────────────────────────
function MetricPill({ icon, label, value, unit, status }) {
  if (value==null) return null;
  const s = SC[status]||SC.info;
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:C.surfHi,borderRadius:6,border:`1px solid ${s.bg}30`,flex:1}}>
      <span style={{fontSize:13}}>{icon}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:9,color:C.muted,letterSpacing:1}}>{label}</div>
        <div className="mono" style={{fontSize:13,fontWeight:700,color:s.bg,lineHeight:1}}>
          {value}{unit}
        </div>
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

  // 7-day baseline for score
  const recent7 = allEntries.slice(-8,-1).map(e=>parseNum(e.Score_Wellness));
  const baseline = avg(recent7);

  // HRV / FC baselines
  const hrvHistory = allEntries.slice(0,-1).map(e=>parseNum(e.HRV_VFC)).filter(Boolean);
  const fcHistory  = allEntries.slice(0,-1).map(e=>parseNum(e.FC_Repouso)).filter(Boolean);
  const hrvBaseline = avg(hrvHistory.slice(-7));
  const fcBaseline  = avg(fcHistory.slice(-7));

  // Weekly scores
  const thisWeekScores = thisWeekEntries.map(e=>parseNum(e.Score_Wellness));
  const lastWeekScores = lastWeekEntries.map(e=>parseNum(e.Score_Wellness));
  const thisWeekAvg = avg(thisWeekScores);
  const lastWeekAvg = avg(lastWeekScores);
  const trend = trendStatus(thisWeekAvg, lastWeekAvg);
  const trendDiff = (thisWeekAvg!=null&&lastWeekAvg!=null) ? (thisWeekAvg-lastWeekAvg) : null;

  const status = scoreStatus(todayScore, baseline);
  const s = SC[status];

  // Sparkline — últimos 7 dias
  const spark7 = allEntries.slice(-7).map(e=>parseNum(e.Score_Wellness));

  return (
    <div onClick={onClick} style={{
      position:"relative",background:C.surf,borderRadius:12,padding:16,cursor:"pointer",
      border:`1px solid ${status==="none"?C.border:s.bg}`,
      borderLeft:`4px solid ${s.bg}`,overflow:"hidden",
      transition:"transform .15s,box-shadow .15s",
    }}
    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 24px ${s.glow}`;}}
    onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>

      <div style={{position:"absolute",inset:0,background:s.glow,pointerEvents:"none"}}/>
      <div style={{position:"relative"}}>

        {/* Row 1: Avatar + Name + Score */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <div style={{
            width:44,height:44,borderRadius:"50%",background:s.bg,flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:16,fontWeight:900,color:"#fff",letterSpacing:1,
            boxShadow:`0 0 12px ${s.bg}50`
          }}>{initials(athlete.Nome)}</div>

          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:15,lineHeight:1.1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {firstName(athlete.Nome)}
            </div>
            <div style={{fontSize:10,color:C.muted,marginTop:2,letterSpacing:1}}>{athlete.Categoria.toUpperCase()}</div>
          </div>

          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:9,color:C.muted,letterSpacing:1}}>HOJE</div>
            <div className="mono" style={{fontSize:22,fontWeight:700,color:s.bg,lineHeight:1}}>
              {todayScore!=null?todayScore.toFixed(2):"—"}
            </div>
          </div>
        </div>

        {/* Row 2: Status badge + weekly trend */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{background:s.bg,color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,letterSpacing:1}}>
            {s.emoji} {s.label.toUpperCase()}
          </span>
          {trend && (
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:10,color:C.muted}}>Semana:</span>
              <span style={{fontSize:13,fontWeight:800,color:TREND[trend].color}}>{TREND[trend].icon}</span>
              <span style={{fontSize:10,color:TREND[trend].color}}>
                {trendDiff!=null?(trendDiff>0?"+":"")+trendDiff.toFixed(2):""}
              </span>
            </div>
          )}
        </div>

        {/* Row 3: Sparkline + avg */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:9,color:C.muted,letterSpacing:1}}>7D</span>
            <Spark scores={spark7} color={s.bg}/>
          </div>
          {baseline!=null&&(
            <span style={{fontSize:11,color:C.muted}}>
              base: <span className="mono" style={{color:C.text}}>{baseline.toFixed(2)}</span>
            </span>
          )}
        </div>

        {/* Row 4: HRV + FC pills (only if data exists) */}
        {(todayHRV!=null||todayFC!=null) && (
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {todayHRV!=null&&<MetricPill icon="📊" label="HRV" value={todayHRV} unit="ms" status={hrvStatus(todayHRV,hrvBaseline)}/>}
            {todayFC!=null&&<MetricPill icon="❤️" label="FC rep." value={todayFC} unit="bpm" status={fcStatus(todayFC,fcBaseline)}/>}
          </div>
        )}

        {/* Row 5: Observation */}
        {todayEntry?.Estado_Geral&&(
          <div style={{fontSize:11,color:C.muted,fontStyle:"italic",borderTop:`1px solid ${C.border}`,paddingTop:8,lineHeight:1.4}}>
            "{todayEntry.Estado_Geral}"
          </div>
        )}
        {!todayEntry&&(
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
      <div onClick={e=>e.stopPropagation()} style={{
        background:C.surf,border:`1px solid ${C.border}`,borderRadius:14,
        padding:24,width:"100%",maxWidth:500,maxHeight:"88vh",overflowY:"auto"
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <div style={{fontSize:20,fontWeight:900}}>{athlete.Nome}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:2}}>{athlete.Categoria} · {athlete.ID}</div>
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
            const status=scoreStatus(score,null);
            const s=SC[status];
            const hrv=parseNum(e.HRV_VFC);
            const fc=parseNum(e.FC_Repouso);
            return(
              <div key={i} style={{padding:"10px 12px",background:C.surfHi,borderRadius:8,border:`1px solid ${C.border}`,borderLeft:`3px solid ${s.bg}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span className="mono" style={{fontSize:11,color:C.muted}}>{e.Timestamp?.slice(0,10)}</span>
                  <span className="mono" style={{fontSize:16,fontWeight:700,color:s.bg}}>{score!=null?score.toFixed(2):"—"}</span>
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
  const trends = allData.map(d=>{
    const tw=avg(d.thisWeekEntries.map(e=>parseNum(e.Score_Wellness)));
    const lw=avg(d.lastWeekEntries.map(e=>parseNum(e.Score_Wellness)));
    return trendStatus(tw,lw);
  });
  const up=trends.filter(t=>t==="up").length;
  const stable=trends.filter(t=>t==="stable").length;
  const down=trends.filter(t=>t==="down").length;
  const noData=trends.filter(t=>t===null).length;

  return(
    <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",marginBottom:16}}>
      <div style={{fontSize:10,color:C.muted,letterSpacing:2,marginBottom:10}}>TENDÊNCIA DA EQUIPE — SEMANA ATUAL vs SEMANA ANTERIOR</div>
      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
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

// ─── MAIN ──────────────────────────────────────────────────────────────────
export default function WellnessDashboard() {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("todos");

  const thisWeek = weekBounds(0);
  const lastWeek = weekBounds(-1);

  const allData = useMemo(()=>{
    return DEMO_ATHLETES.map(ath=>{
      const mine = DEMO_WELLNESS.filter(w=>w.ID_Atleta===ath.ID)
        .sort((a,b)=>a.Timestamp.localeCompare(b.Timestamp));
      const todayEntry = [...mine].reverse().find(w=>w.Timestamp?.startsWith(TODAY));
      const thisWeekEntries = mine.filter(w=>{ const d=parseDate(w.Timestamp); return d&&d>=thisWeek.start&&d<=thisWeek.end; });
      const lastWeekEntries = mine.filter(w=>{ const d=parseDate(w.Timestamp); return d&&d>=lastWeek.start&&d<=lastWeek.end; });
      return { athlete:ath, todayEntry, thisWeekEntries, lastWeekEntries, allEntries:mine };
    });
  },[]);

  const responded = allData.filter(d=>d.todayEntry).length;
  const alerts = allData.filter(d=>{
    const s=d.todayEntry?parseNum(d.todayEntry.Score_Wellness):null;
    const b7=d.allEntries.slice(-8,-1).map(e=>parseNum(e.Score_Wellness));
    return scoreStatus(s,avg(b7))==="red";
  }).length;

  const filtered = allData.filter(d=>{
    if(filter==="alerta"){
      const s=d.todayEntry?parseNum(d.todayEntry.Score_Wellness):null;
      const b7=avg(d.allEntries.slice(-8,-1).map(e=>parseNum(e.Score_Wellness)));
      return scoreStatus(s,b7)==="red";
    }
    if(filter==="sem-resposta") return !d.todayEntry;
    if(filter==="caindo"){
      const tw=avg(d.thisWeekEntries.map(e=>parseNum(e.Score_Wellness)));
      const lw=avg(d.lastWeekEntries.map(e=>parseNum(e.Score_Wellness)));
      return trendStatus(tw,lw)==="down";
    }
    const cats=[...new Set(DEMO_ATHLETES.map(a=>a.Categoria))];
    if(cats.includes(filter)) return d.athlete.Categoria===filter;
    return true;
  });

  const categories=[...new Set(DEMO_ATHLETES.map(a=>a.Categoria))];
  const selectedData = selected ? allData.find(d=>d.athlete.ID===selected) : null;

  return(
    <div style={{minHeight:"100vh",background:C.bg}}>
      <style>{GS}</style>

      {/* Header */}
      <div style={{background:"#111111",borderBottom:`3px solid ${C.blue}`,padding:"0 20px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",minHeight:54}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <svg width={36} height={36} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="49" fill="#111"/>
              <circle cx="50" cy="50" r="40" fill={C.blue}/>
              <circle cx="50" cy="50" r="30" fill="#fff"/>
              <text x="50" y="45" textAnchor="middle" fontSize="12" fontWeight="900" fontFamily="Arial" fill={C.blue}>ECP</text>
              <text x="50" y="59" textAnchor="middle" fontSize="8" fontFamily="Arial" fill={C.blue}>PINHEIROS</text>
            </svg>
            <div>
              <div style={{fontSize:16,fontWeight:900,color:"#fff",letterSpacing:2}}>PINHEIROS <span style={{color:C.muted,fontSize:12,fontWeight:400}}>BEM-ESTAR</span></div>
              <div style={{fontSize:10,color:C.muted,letterSpacing:1}}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</div>
            </div>
          </div>
          <div style={{fontSize:11,color:C.muted,textAlign:"right"}}>
            <div>⚠️ Demo — dados reais no site</div>
            <div style={{color:"#374151"}}>Auto-atualiza a cada 5 min</div>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"16px 14px"}}>

        {/* Summary */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10,marginBottom:14}}>
          {[
            {icon:"🚣",label:"Total",val:DEMO_ATHLETES.length,c:C.blue},
            {icon:"✅",label:"Responderam",val:responded,c:"#16a34a"},
            {icon:"⏳",label:"Sem resposta",val:DEMO_ATHLETES.length-responded,c:C.muted},
            {icon:"🔴",label:"Em alerta",val:alerts,c:"#dc2626"},
          ].map(s=>(
            <div key={s.label} style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",borderTop:`2px solid ${s.c}`}}>
              <div style={{fontSize:18}}>{s.icon}</div>
              <div style={{fontSize:9,letterSpacing:2,color:C.muted,margin:"4px 0 1px",textTransform:"uppercase"}}>{s.label}</div>
              <div style={{fontSize:26,fontWeight:900,color:s.c}}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Team trend panel */}
        <TeamTrendPanel allData={allData}/>

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
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(255px,1fr))",gap:12}}>
          {filtered.map(d=>(
            <AthleteCard key={d.athlete.ID} data={d} onClick={()=>setSelected(d.athlete.ID)}/>
          ))}
        </div>

        <div style={{marginTop:16,textAlign:"center",fontSize:11,color:"#1f2937"}}>
          Visualização de demonstração · No site real os dados são sincronizados do Google Sheets automaticamente
        </div>
      </div>

      {selectedData&&<Detail data={selectedData} onClose={()=>setSelected(null)}/>}
    </div>
  );
}
