import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

// ─── DADOS INICIAIS ────────────────────────────────────────────────────────
const SEED_ATHLETES = [
  { id:"a01", name:"ALEF DA ROSA FONTOURA",                category:"Masc Sênior",           gender:"Masc",        weight:"",         birthYear:1996 },
  { id:"a02", name:"ALINA DUMAS",                           category:"Fem Sênior Peso Leve",  gender:"Fem",         weight:"Peso Leve", birthYear:1992 },
  { id:"a03", name:"BRENO BARTOLOZZI",                      category:"Masc Sub23",            gender:"Masc",        weight:"",         birthYear:2004 },
  { id:"a04", name:"CLAUDIA CICERO SANTOS",                 category:"PR1 Fem Para Sênior",   gender:"PR1 Fem Para",weight:"",         birthYear:1977 },
  { id:"a05", name:"FELIPE TADASHI OLIVEIRA MATSUDA",       category:"Masc Sub23 Peso Leve",  gender:"Masc",        weight:"Peso Leve", birthYear:2006 },
  { id:"a06", name:"HEITOR MAXIMO MARANGONI",               category:"Masc Sub19",            gender:"Masc",        weight:"",         birthYear:2009 },
  { id:"a07", name:"IAGO MARIANO NECETTE DE LIRA VOLGARIN", category:"Masc Sub23 Peso Leve",  gender:"Masc",        weight:"Peso Leve", birthYear:2006 },
  { id:"a08", name:"JAIRO NATANAEL FROHLICH KLUG",          category:"Masc Para Sênior",      gender:"Masc Para",   weight:"",         birthYear:1984 },
  { id:"a09", name:"MATHEUS ALMEIDA SANT'ANA",              category:"Masc Sub23 Peso Leve",  gender:"Masc",        weight:"Peso Leve", birthYear:2007 },
  { id:"a10", name:"MATIAS GABRIEL BOLEDI",                 category:"Masc Sênior Peso Leve", gender:"Masc",        weight:"Peso Leve", birthYear:1984 },
  { id:"a11", name:"OLAVO VINICIUS SOARES PELEGRINO",       category:"Masc Sênior",           gender:"Masc",        weight:"",         birthYear:1997 },
  { id:"a12", name:"PEDRO HENRIQUE RODRIGUES MENDES",       category:"Masc Sub23",            gender:"Masc",        weight:"",         birthYear:2007 },
  { id:"a13", name:"RAFAELA BEATRIZ VELSCH POCHINI",        category:"Fem Sub23 Peso Leve",   gender:"Fem",         weight:"Peso Leve", birthYear:2004 },
];

const SEED_BT = [
  { id:"bt001", boatClass:"1x",  category:"Fem Sênior",            label:"1x Fem Sênior",            timeSeconds:427.71, speedMs:4.6761 },
  { id:"bt002", boatClass:"1x",  category:"Fem Sênior Peso Leve",  label:"1x Fem Sênior Peso Leve",  timeSeconds:444.46, speedMs:4.4998 },
  { id:"bt003", boatClass:"1x",  category:"Fem Sub19",             label:"1x Fem Sub19",             timeSeconds:417.50, speedMs:4.7904 },
  { id:"bt004", boatClass:"1x",  category:"Fem Sub23 Peso Leve",   label:"1x Fem Sub23 Peso Leve",   timeSeconds:448.34, speedMs:4.4609 },
  { id:"bt005", boatClass:"1x",  category:"Masc Sênior",           label:"1x Masc Sênior",           timeSeconds:390.70, speedMs:5.1190 },
  { id:"bt006", boatClass:"1x",  category:"Masc Sênior Peso Leve", label:"1x Masc Sênior Peso Leve", timeSeconds:403.37, speedMs:4.9582 },
  { id:"bt007", boatClass:"1x",  category:"Masc Sub19",            label:"1x Masc Sub19",            timeSeconds:394.58, speedMs:5.0687 },
  { id:"bt008", boatClass:"1x",  category:"Masc Sub23",            label:"1x Masc Sub23",            timeSeconds:406.60, speedMs:4.9188 },
  { id:"bt009", boatClass:"1x",  category:"Masc Sub23 Peso Leve",  label:"1x Masc Sub23 Peso Leve",  timeSeconds:407.34, speedMs:4.9099 },
  { id:"bt010", boatClass:"1x",  category:"PR1 Fem Para Sênior",   label:"1x PR1 Fem Para Sênior",   timeSeconds:587.83, speedMs:3.4023 },
  { id:"bt011", boatClass:"1x",  category:"Masc Para Sênior",      label:"1x Masc Para Sênior",      timeSeconds:448.30, speedMs:4.4613 },
  { id:"bt012", boatClass:"2-",  category:"Fem Sênior",            label:"2- Fem Sênior",            timeSeconds:409.08, speedMs:4.8890 },
  { id:"bt013", boatClass:"2-",  category:"Fem Sênior Peso Leve",  label:"2- Fem Sênior Peso Leve",  timeSeconds:438.30, speedMs:4.5631 },
  { id:"bt014", boatClass:"2-",  category:"Fem Sub19",             label:"2- Fem Sub19",             timeSeconds:435.85, speedMs:4.5887 },
  { id:"bt015", boatClass:"2-",  category:"Fem Sub23",             label:"2- Fem Sub23",             timeSeconds:422.89, speedMs:4.7294 },
  { id:"bt016", boatClass:"2-",  category:"Masc Sênior",           label:"2- Masc Sênior",           timeSeconds:368.50, speedMs:5.4274 },
  { id:"bt017", boatClass:"2-",  category:"Masc Sênior Peso Leve", label:"2- Masc Sênior Peso Leve", timeSeconds:382.91, speedMs:5.2232 },
  { id:"bt018", boatClass:"2-",  category:"Masc Sub19",            label:"2- Masc Sub19",            timeSeconds:392.51, speedMs:5.0954 },
  { id:"bt019", boatClass:"2-",  category:"Masc Sub23",            label:"2- Masc Sub23",            timeSeconds:380.06, speedMs:5.2623 },
  { id:"bt020", boatClass:"2-",  category:"Masc Sub23 Peso Leve",  label:"2- Masc Sub23 Peso Leve",  timeSeconds:386.47, speedMs:5.1750 },
  { id:"bt021", boatClass:"2x",  category:"Fem Sênior",            label:"2x Fem Sênior",            timeSeconds:397.31, speedMs:5.0339 },
  { id:"bt022", boatClass:"2x",  category:"Fem Sênior Peso Leve",  label:"2x Fem Sênior Peso Leve",  timeSeconds:407.69, speedMs:4.9057 },
  { id:"bt023", boatClass:"2x",  category:"Fem Sub19",             label:"2x Fem Sub19",             timeSeconds:423.18, speedMs:4.7261 },
  { id:"bt024", boatClass:"2x",  category:"Fem Sub23",             label:"2x Fem Sub23",             timeSeconds:411.58, speedMs:4.8593 },
  { id:"bt025", boatClass:"2x",  category:"Fem Sub23 Peso Leve",   label:"2x Fem Sub23 Peso Leve",   timeSeconds:414.83, speedMs:4.8213 },
  { id:"bt026", boatClass:"2x",  category:"Masc Sênior",           label:"2x Masc Sênior",           timeSeconds:359.72, speedMs:5.5599 },
  { id:"bt027", boatClass:"2x",  category:"Masc Sênior Peso Leve", label:"2x Masc Sênior Peso Leve", timeSeconds:365.36, speedMs:5.4741 },
  { id:"bt028", boatClass:"2x",  category:"Masc Sub19",            label:"2x Masc Sub19",            timeSeconds:381.73, speedMs:5.2393 },
  { id:"bt029", boatClass:"2x",  category:"Masc Sub23",            label:"2x Masc Sub23",            timeSeconds:367.57, speedMs:5.4411 },
  { id:"bt030", boatClass:"2x",  category:"Masc Sub23 Peso Leve",  label:"2x Masc Sub23 Peso Leve",  timeSeconds:373.62, speedMs:5.3530 },
  { id:"bt031", boatClass:"2x",  category:"Masc Para Sênior",      label:"2x Masc Para Sênior",      timeSeconds:415.00, speedMs:4.8193 },
  { id:"bt032", boatClass:"4-",  category:"Fem Sênior",            label:"4- Fem Sênior",            timeSeconds:374.36, speedMs:5.3425 },
  { id:"bt033", boatClass:"4-",  category:"Fem Sub19",             label:"4- Fem Sub19",             timeSeconds:402.17, speedMs:4.9730 },
  { id:"bt034", boatClass:"4-",  category:"Masc Sênior",           label:"4- Masc Sênior",           timeSeconds:337.86, speedMs:5.9196 },
  { id:"bt035", boatClass:"4-",  category:"Masc Sênior Peso Leve", label:"4- Masc Sênior Peso Leve", timeSeconds:343.16, speedMs:5.8282 },
  { id:"bt036", boatClass:"4-",  category:"Masc Sub19",            label:"4- Masc Sub19",            timeSeconds:358.85, speedMs:5.5734 },
  { id:"bt037", boatClass:"4-",  category:"Masc Sub23",            label:"4- Masc Sub23",            timeSeconds:344.38, speedMs:5.8075 },
  { id:"bt038", boatClass:"4-",  category:"Masc Sub23 Peso Leve",  label:"4- Masc Sub23 Peso Leve",  timeSeconds:354.12, speedMs:5.6478 },
  { id:"bt039", boatClass:"4x",  category:"Fem Sênior",            label:"4x Fem Sênior",            timeSeconds:366.84, speedMs:5.4520 },
  { id:"bt040", boatClass:"4x",  category:"Fem Sênior Peso Leve",  label:"4x Fem Sênior Peso Leve",  timeSeconds:375.95, speedMs:5.3199 },
  { id:"bt041", boatClass:"4x",  category:"Fem Sub19",             label:"4x Fem Sub19",             timeSeconds:390.52, speedMs:5.1214 },
  { id:"bt042", boatClass:"4x",  category:"Masc Sênior",           label:"4x Masc Sênior",           timeSeconds:332.26, speedMs:6.0194 },
  { id:"bt043", boatClass:"4x",  category:"Masc Sênior Peso Leve", label:"4x Masc Sênior Peso Leve", timeSeconds:342.75, speedMs:5.8352 },
  { id:"bt044", boatClass:"4x",  category:"Masc Sub19",            label:"4x Masc Sub19",            timeSeconds:352.96, speedMs:5.6664 },
  { id:"bt045", boatClass:"4x",  category:"Masc Sub23",            label:"4x Masc Sub23",            timeSeconds:339.62, speedMs:5.8889 },
  { id:"bt046", boatClass:"4x",  category:"Masc Sub23 Peso Leve",  label:"4x Masc Sub23 Peso Leve",  timeSeconds:347.26, speedMs:5.7594 },
  { id:"bt047", boatClass:"8+",  category:"Fem Sênior",            label:"8+ Fem Sênior",            timeSeconds:354.16, speedMs:5.6472 },
  { id:"bt048", boatClass:"8+",  category:"Fem Sub19",             label:"8+ Fem Sub19",             timeSeconds:380.16, speedMs:5.2609 },
  { id:"bt049", boatClass:"8+",  category:"Masc Sênior",           label:"8+ Masc Sênior",           timeSeconds:318.68, speedMs:6.2759 },
  { id:"bt050", boatClass:"8+",  category:"Masc Sênior Peso Leve", label:"8+ Masc Sênior Peso Leve", timeSeconds:330.24, speedMs:6.0562 },
  { id:"bt051", boatClass:"8+",  category:"Masc Sub19",            label:"8+ Masc Sub19",            timeSeconds:335.93, speedMs:5.9536 },
  { id:"bt052", boatClass:"8+",  category:"Masc Sub23",            label:"8+ Masc Sub23",            timeSeconds:323.75, speedMs:6.1776 },
  { id:"bt053", boatClass:"ERG", category:"Fem Sub19 Peso Leve",   label:"ERG Fem Sub19 Peso Leve",  timeSeconds:424.90, speedMs:4.7070 },
  { id:"bt054", boatClass:"ERG", category:"Masc Sub19 Peso Leve",  label:"ERG Masc Sub19 Peso Leve", timeSeconds:366.50, speedMs:5.4570 },
  { id:"bt055", boatClass:"ERG", category:"Fem Sub19",             label:"ERG Fem Sub19",            timeSeconds:388.20, speedMs:5.1520 },
  { id:"bt056", boatClass:"ERG", category:"Masc Sub19",            label:"ERG Masc Sub19",           timeSeconds:345.50, speedMs:5.7887 },
  { id:"bt057", boatClass:"ERG", category:"Fem Sub23 Peso Leve",   label:"ERG Fem Sub23 Peso Leve",  timeSeconds:413.80, speedMs:4.8333 },
  { id:"bt058", boatClass:"ERG", category:"Masc Sub23 Peso Leve",  label:"ERG Masc Sub23 Peso Leve", timeSeconds:356.70, speedMs:5.6070 },
  { id:"bt059", boatClass:"ERG", category:"Fem Sub23",             label:"ERG Fem Sub23",            timeSeconds:381.10, speedMs:5.2480 },
  { id:"bt060", boatClass:"ERG", category:"Masc Sub23",            label:"ERG Masc Sub23",           timeSeconds:335.80, speedMs:5.9559 },
  { id:"bt061", boatClass:"ERG", category:"Fem Sênior Peso Leve",  label:"ERG Fem Sênior Peso Leve", timeSeconds:413.80, speedMs:4.8333 },
  { id:"bt062", boatClass:"ERG", category:"Masc Sênior Peso Leve", label:"ERG Masc Sênior Peso Leve",timeSeconds:356.70, speedMs:5.6070 },
  { id:"bt063", boatClass:"ERG", category:"Fem Sênior",            label:"ERG Fem Sênior",           timeSeconds:381.10, speedMs:5.2480 },
  { id:"bt064", boatClass:"ERG", category:"Masc Sênior",           label:"ERG Masc Sênior",          timeSeconds:335.80, speedMs:5.9559 },
  { id:"bt065", boatClass:"ERG", category:"Masc Para Sênior",      label:"ERG Masc Para Sênior",     timeSeconds:370.20, speedMs:5.4025 },
  { id:"bt066", boatClass:"ERG", category:"Fem Para Sênior",       label:"ERG Fem Para Sênior",      timeSeconds:423.10, speedMs:4.7270 },
  { id:"bt067", boatClass:"ERG", category:"PR1 Fem Para Sênior",   label:"ERG PR1 Fem Para Sênior",  timeSeconds:510.00, speedMs:3.9216 },
];

// ─── CONSTANTES ────────────────────────────────────────────────────────────
const BOAT_WATER  = ["1x","2-","2x","4-","4x","8+"];
const BOAT_ALL    = ["ERG","1x","2-","2x","4-","4x","8+"];
const TRAIN_TYPES = ["B1","B2","B3","B4","B5","E1","E2","E3","E4","E5"];
const WIND_OPTS   = ["Sem vento","Brisa leve","Brisa moderada","Vento fraco","Vento moderado","Vento forte","A favor","Contra","N/A"];
const TARGET_PERC = { B1:75, B2:80, B3:85, B4:90, B5:95, E1:75, E2:80, E3:85, E4:90, E5:92 };
const FB_CFG = {
  B1:[{min:75,msg:"Excelente! Meta atingida.",c:"#22c55e"},{min:73,msg:"Bom, quase lá.",c:"#f59e0b"},{min:0,msg:"Abaixo da meta.",c:"#ef4444"}],
  B2:[{min:80,msg:"Excelente! Meta atingida.",c:"#22c55e"},{min:78,msg:"Bom, quase lá.",c:"#f59e0b"},{min:0,msg:"Abaixo da meta.",c:"#ef4444"}],
  B3:[{min:85,msg:"Excelente! Meta atingida.",c:"#22c55e"},{min:83,msg:"Bom, quase lá.",c:"#f59e0b"},{min:0,msg:"Abaixo da meta.",c:"#ef4444"}],
  B4:[{min:90,msg:"Excelente! Meta atingida.",c:"#22c55e"},{min:88,msg:"Bom, quase lá.",c:"#f59e0b"},{min:0,msg:"Abaixo da meta.",c:"#ef4444"}],
  B5:[{min:95,msg:"Excelente! Meta atingida.",c:"#22c55e"},{min:93,msg:"Bom, quase lá.",c:"#f59e0b"},{min:0,msg:"Abaixo da meta.",c:"#ef4444"}],
  E1:[{min:75,msg:"Excelente! Meta atingida.",c:"#22c55e"},{min:73,msg:"Bom, quase lá.",c:"#f59e0b"},{min:0,msg:"Abaixo da meta.",c:"#ef4444"}],
  E2:[{min:80,msg:"Excelente! Meta atingida.",c:"#22c55e"},{min:78,msg:"Bom, quase lá.",c:"#f59e0b"},{min:0,msg:"Abaixo da meta.",c:"#ef4444"}],
  E3:[{min:85,msg:"Excelente! Meta atingida.",c:"#22c55e"},{min:83,msg:"Bom, quase lá.",c:"#f59e0b"},{min:0,msg:"Abaixo da meta.",c:"#ef4444"}],
  E4:[{min:90,msg:"Excelente! Meta atingida.",c:"#22c55e"},{min:88,msg:"Bom, quase lá.",c:"#f59e0b"},{min:0,msg:"Abaixo da meta.",c:"#ef4444"}],
  E5:[{min:92,msg:"Excelente! Meta atingida.",c:"#22c55e"},{min:90,msg:"Bom, quase lá.",c:"#f59e0b"},{min:0,msg:"Abaixo da meta.",c:"#ef4444"}],
};
const ADMIN_USER = "treinador", ADMIN_PASS = "remo2025", ATH_PASS = "atleta2025";

// ─── UTILS ─────────────────────────────────────────────────────────────────
function parseTime(s) {
  if (!s) return null;
  s = String(s).replace(",", ".").trim();
  if (s.includes(":")) {
    const p = s.split(":");
    return p.length === 2 ? parseFloat(p[0])*60+parseFloat(p[1]) : parseFloat(p[0])*3600+parseFloat(p[1])*60+parseFloat(p[2]);
  }
  return parseFloat(s);
}
function fmtTime(s) {
  if (!s || isNaN(s)) return "—";
  const m = Math.floor(s/60), sec = (s%60).toFixed(1);
  return `${m}:${sec.padStart(4,"0")}`;
}
function calcPerc(tS, dist, spd) {
  if (!tS || !dist || !spd) return null;
  return (dist/tS/spd)*100;
}
function getFB(type, p) {
  if (p == null) return null;
  const arr = FB_CFG[String(type).toUpperCase()] || FB_CFG.B1;
  for (const t of arr) if (p >= t.min) return t;
  return arr[arr.length-1];
}
function proximityScore(type, perc) {
  if (perc == null) return -9999;
  return perc - (TARGET_PERC[String(type).toUpperCase()] || 75);
}
function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2); }
function firstName(n) { const w = n.trim().split(" "); return w.length >= 2 ? `${w[0]} ${w[1]}` : w[0]; }
function todayStr() { return new Date().toISOString().slice(0,10); }
function weekStart() {
  const d = new Date(); d.setDate(d.getDate()-d.getDay());
  return d.toISOString().slice(0,10);
}

// ─── SUPABASE HELPERS ──────────────────────────────────────────────────────
function dbToAthlete(r) {
  return { id:r.id, name:r.name, category:r.category, gender:r.gender||"", weight:r.weight||"", birthYear:r.birth_year };
}
function dbToTraining(r) {
  return { id:r.id, athleteId:r.athlete_id, date:r.date, time:r.time||"", activity:r.activity||"BARCO",
    trainingType:r.training_type||"B1", series:r.series||"1", boatClass:r.boat_class||"1x",
    boatLabel:r.boat_label||"", distance:r.distance||"2000", timeRowed:r.time_rowed||"",
    timeSeconds:r.time_seconds, speedMs:r.speed_ms, spm:r.spm||"", watts:r.watts||"",
    wind:r.wind||"", notes:r.notes||"", percBT:r.perc_bt, btLabel:r.bt_label||"",
    btSpeed:r.bt_speed, createdAt:r.created_at };
}
function dbToBT(r) {
  return { id:r.id, boatClass:r.boat_class, category:r.category, label:r.label, timeSeconds:r.time_seconds, speedMs:r.speed_ms };
}
function athleteToDb(a) {
  return { id:a.id, name:a.name, category:a.category, gender:a.gender, weight:a.weight, birth_year:a.birthYear||null };
}
function trainingToDb(t) {
  return { id:t.id, athlete_id:t.athleteId, date:t.date, time:t.time, activity:t.activity,
    training_type:t.trainingType, series:t.series, boat_class:t.boatClass, boat_label:t.boatLabel,
    distance:t.distance, time_rowed:t.timeRowed, time_seconds:t.timeSeconds, speed_ms:t.speedMs,
    spm:t.spm, watts:t.watts, wind:t.wind, notes:t.notes, perc_bt:t.percBT,
    bt_label:t.btLabel, bt_speed:t.btSpeed };
}
function btToDb(b) {
  return { id:b.id, boat_class:b.boatClass, category:b.category, label:b.label, time_seconds:b.timeSeconds, speed_ms:b.speedMs };
}

// ─── CORES EC PINHEIROS ────────────────────────────────────────────────────
const C = {
  bg:"#0a0c10", surf:"#111520", surfHi:"#192133", border:"#1e2d47",
  blue:"#1a4fa0", blueLt:"#2563c4", text:"#dce6f5", muted:"#4a6080",
  good:"#22c55e", warn:"#f59e0b", bad:"#ef4444",
};

const GS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{-webkit-text-size-adjust:100%;}
  body{background:${C.bg};color:${C.text};font-family:'Barlow Condensed',sans-serif;min-height:100vh;}
  ::-webkit-scrollbar{width:5px;height:5px;}
  ::-webkit-scrollbar-track{background:${C.bg};}
  ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}
  input,select,textarea{font-family:'JetBrains Mono',monospace;font-size:13px;background:${C.bg};border:1.5px solid ${C.border};color:${C.text};padding:9px 12px;border-radius:6px;outline:none;width:100%;transition:border-color .15s;-webkit-appearance:none;appearance:none;}
  input:focus,select:focus{border-color:${C.blueLt};}
  select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7'%3E%3Cpath d='M0 0l6 7 6-7z' fill='%234a6080'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px;}
  button{cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-weight:700;border:none;border-radius:6px;transition:all .15s;touch-action:manipulation;-webkit-tap-highlight-color:transparent;}
  table{width:100%;border-collapse:collapse;}
  th{background:${C.surfHi};color:${C.blueLt};font-size:10px;letter-spacing:2px;text-transform:uppercase;padding:10px 12px;text-align:left;white-space:nowrap;}
  td{padding:10px 12px;border-bottom:1px solid ${C.border};font-size:13px;vertical-align:middle;}
  tr:last-child td{border-bottom:none;}
  tr:hover td{background:rgba(26,79,160,.06);}
  .mono{font-family:'JetBrains Mono',monospace;}
  @media(max-width:640px){th,td{padding:8px 8px;font-size:12px;}}
`;

// ─── UI ATOMS ──────────────────────────────────────────────────────────────
function Btn({ children, onClick, variant="primary", sz="md", disabled, full }) {
  const V = { primary:{background:C.blue,color:"#fff"}, outline:{background:"transparent",color:C.blueLt,border:`1.5px solid ${C.blueLt}`}, ghost:{background:C.surfHi,color:C.text}, danger:{background:C.bad,color:"#fff"} };
  const S = { sm:{padding:"5px 14px",fontSize:12}, md:{padding:"9px 20px",fontSize:14}, lg:{padding:"13px 28px",fontSize:16} };
  return <button onClick={onClick} disabled={disabled} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,whiteSpace:"nowrap",opacity:disabled?.5:1,width:full?"100%":undefined,letterSpacing:"0.5px",...V[variant],...S[sz]}}>{children}</button>;
}
function Card({ children, s }) { return <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:16,...s}}>{children}</div>; }
function Lbl({ children }) { return <div style={{fontSize:10,letterSpacing:2,color:C.blueLt,textTransform:"uppercase",marginBottom:5,fontWeight:600}}>{children}</div>; }
function Field({ label, children, span }) { return <div style={{gridColumn:span?`span ${span}`:undefined,display:"flex",flexDirection:"column",gap:3}}><Lbl>{label}</Lbl>{children}</div>; }
function Badge({ val, type }) {
  if (val == null) return <span style={{color:C.muted,fontFamily:"JetBrains Mono"}}>—</span>;
  const fb = getFB(type, val);
  return <span className="mono" style={{color:fb?.c||C.muted,fontWeight:600}}>{val.toFixed(1)}%</span>;
}
function PercBar({ val, type }) {
  if (!val) return null;
  const fb = getFB(type, val);
  const target = TARGET_PERC[String(type||"B1").toUpperCase()]||75;
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,height:6,background:C.border,borderRadius:3,overflow:"hidden",position:"relative"}}>
        <div style={{width:`${Math.min(val,100)}%`,height:"100%",background:fb?.c||C.muted,borderRadius:3}}/>
        <div style={{position:"absolute",top:0,left:`${Math.min(target,100)}%`,width:2,height:"100%",background:"rgba(255,255,255,.4)",transform:"translateX(-1px)"}}/>
      </div>
      <span className="mono" style={{color:fb?.c,fontSize:13,fontWeight:600,minWidth:52,textAlign:"right"}}>{val.toFixed(1)}%</span>
    </div>
  );
}
function SectionHead({ children }) {
  return <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><div style={{width:4,height:24,background:C.blue,borderRadius:2}}/><div style={{fontSize:22,fontWeight:800}}>{children}</div></div>;
}
function ECPLogo({ sz=40 }) {
  return (
    <svg width={sz} height={sz} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="49" fill="#111111"/>
      <circle cx="50" cy="50" r="40" fill={C.blue}/>
      <circle cx="50" cy="50" r="30" fill="#ffffff"/>
      <text x="50" y="45" textAnchor="middle" fontSize="13" fontWeight="900" fontFamily="Arial,sans-serif" fill={C.blue}>ECP</text>
      <text x="50" y="60" textAnchor="middle" fontSize="8" fontWeight="600" fontFamily="Arial,sans-serif" fill={C.blue}>PINHEIROS</text>
    </svg>
  );
}
function AppHeader({ nav, right }) {
  return (
    <div style={{background:"#111111",borderBottom:`3px solid ${C.blue}`,position:"sticky",top:0,zIndex:100}}>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"0 14px",display:"flex",justifyContent:"space-between",alignItems:"center",minHeight:54}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <ECPLogo sz={38}/>
          <div style={{lineHeight:1.1}}>
            <div style={{fontSize:16,fontWeight:900,color:"#ffffff",letterSpacing:2}}>PINHEIROS</div>
            <div style={{fontSize:9,color:C.muted,letterSpacing:3}}>REMO · PERFORMANCE</div>
          </div>
        </div>
        {nav}
        <div style={{flexShrink:0}}>{right}</div>
      </div>
    </div>
  );
}

// ─── RANKING PROXIMIDADE ──────────────────────────────────────────────────
function ProximityRanking({ title, trainings, athletes, period }) {
  const today = todayStr(), wStart = weekStart();
  const filtered = trainings.filter(t => {
    if (t.percBT == null) return false;
    if (period==="day") return t.date===today;
    if (period==="week") return t.date>=wStart && t.date<=today;
    return true;
  });
  const byAthlete = {};
  filtered.forEach(t => {
    const score = proximityScore(t.trainingType, t.percBT);
    if (!byAthlete[t.athleteId] || score > byAthlete[t.athleteId].score)
      byAthlete[t.athleteId] = { score, perc:t.percBT, type:t.trainingType };
  });
  const ranked = Object.entries(byAthlete).map(([id,d]) => {
    const ath = athletes.find(a=>a.id===id);
    const target = TARGET_PERC[String(d.type).toUpperCase()]||75;
    return { id, ath, ...d, target, reached:d.score>=0 };
  }).sort((a,b) => {
    if (a.reached&&b.reached) return Math.abs(a.score)-Math.abs(b.score);
    if (a.reached!==b.reached) return a.reached?-1:1;
    return b.score-a.score;
  });
  const medals = ["🥇","🥈","🥉"];
  if (ranked.length===0) return (
    <Card s={{borderTop:`2px solid ${C.blue}`}}>
      <div style={{fontSize:12,fontWeight:700,color:C.blueLt,letterSpacing:2,marginBottom:10}}>{title}</div>
      <div style={{color:C.muted,fontSize:13,textAlign:"center",padding:"16px 0"}}>{period==="day"?"Sem treinos registrados hoje.":"Sem treinos nesta semana."}</div>
    </Card>
  );
  return (
    <Card s={{borderTop:`2px solid ${C.blue}`}}>
      <div style={{fontSize:12,fontWeight:700,color:C.blueLt,letterSpacing:2,marginBottom:12}}>{title}</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {ranked.map((r,i) => {
          const fb = getFB(r.type, r.perc);
          const diffLabel = r.score>=0 ? `+${r.score.toFixed(1)}% acima da meta` : `${r.score.toFixed(1)}% da meta`;
          return (
            <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:C.surfHi,borderRadius:8,border:`1px solid ${r.reached?C.blue:C.border}`}}>
              <div style={{fontSize:18,minWidth:28,textAlign:"center"}}>{medals[i]||<span style={{color:C.muted,fontSize:13}}>{i+1}</span>}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.ath?firstName(r.ath.name):"?"}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                  Treino <span style={{background:C.bg,padding:"1px 5px",borderRadius:3,color:C.blueLt}}>{r.type}</span>
                  {" · "}meta: <span className="mono">{r.target}%</span>
                  {" · "}<span style={{color:r.reached?C.good:C.warn}}>{diffLabel}</span>
                </div>
                <PercBar val={r.perc} type={r.type}/>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div className="mono" style={{fontSize:20,fontWeight:700,color:fb?.c}}>{r.perc.toFixed(1)}%</div>
                {r.reached&&<div style={{fontSize:10,color:C.good,letterSpacing:1}}>✓ META</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── LOADING ───────────────────────────────────────────────────────────────
function Loading({ msg="Carregando..." }) {
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:C.bg,gap:16}}>
      <style>{GS}</style>
      <ECPLogo sz={60}/>
      <div style={{color:C.muted,fontSize:13,letterSpacing:3}}>{msg.toUpperCase()}</div>
    </div>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────
function Login({ athletes, onLogin }) {
  const [tab,setTab]=useState("admin");
  const [user,setUser]=useState(""), [pass,setPass]=useState("");
  const [aid,setAid]=useState(""), [ap,setAp]=useState("");
  const [err,setErr]=useState("");
  function go() {
    setErr("");
    if (tab==="admin") {
      if (user===ADMIN_USER&&pass===ADMIN_PASS) onLogin({role:"admin"});
      else setErr("Usuário ou senha incorretos.");
    } else {
      if (!aid){setErr("Selecione seu nome.");return;}
      if (ap===ATH_PASS) onLogin({role:"athlete",athleteId:aid});
      else setErr("Senha incorreta.");
    }
  }
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 16px",background:C.bg}}>
      <style>{GS}</style>
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:14}}>
          <ECPLogo sz={70}/>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:11,letterSpacing:5,color:C.muted,fontWeight:600,marginBottom:2}}>ESPORTE CLUBE</div>
            <div style={{fontSize:42,fontWeight:900,lineHeight:1,color:"#ffffff",letterSpacing:2}}>PINHEIROS</div>
            <div style={{fontSize:11,letterSpacing:3,color:C.blueLt,marginTop:2}}>REMO · PERFORMANCE</div>
          </div>
        </div>
        <div style={{height:1,background:`linear-gradient(90deg,transparent,${C.blue},transparent)`,maxWidth:340,margin:"0 auto"}}/>
      </div>
      <div style={{width:"100%",maxWidth:380}}>
        <Card>
          <div style={{display:"flex",gap:4,background:C.bg,borderRadius:8,padding:4,marginBottom:20}}>
            {["admin","athlete"].map(t=>(
              <button key={t} onClick={()=>{setTab(t);setErr("");}}
                style={{flex:1,padding:"9px 0",background:tab===t?C.blue:"transparent",color:tab===t?"#fff":C.muted,border:"none",borderRadius:6,fontWeight:700,fontSize:13,letterSpacing:1,cursor:"pointer",transition:"all .2s"}}>
                {t==="admin"?"🔐 TREINADOR":"🚣 ATLETA"}
              </button>
            ))}
          </div>
          {tab==="admin" ? (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <Field label="Usuário"><input value={user} onChange={e=>setUser(e.target.value)} placeholder="treinador"/></Field>
              <Field label="Senha"><input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="••••••••"/></Field>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <Field label="Seu nome">
                <select value={aid} onChange={e=>setAid(e.target.value)}>
                  <option value="">Selecione seu nome...</option>
                  {athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Field>
              <Field label="Senha"><input type="password" value={ap} onChange={e=>setAp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="••••••••"/></Field>
            </div>
          )}
          {err&&<div style={{color:C.bad,fontSize:13,marginTop:10,textAlign:"center"}}>{err}</div>}
          <div style={{marginTop:14}}><Btn onClick={go} sz="lg" full>ENTRAR</Btn></div>
        </Card>
      </div>
    </div>
  );
}

// ─── FORMULÁRIO DE TREINO ─────────────────────────────────────────────────
function TrainingForm({ athletes, bestTimes, onSave, onCancel, preAthlete }) {
  const [f,setF]=useState({athleteId:preAthlete||"",date:todayStr(),time:"",activity:"BARCO",trainingType:"B1",series:"1",boatClass:"1x",distance:"2000",timeRowed:"",spm:"",watts:"",wind:"Sem vento",notes:""});
  const [saving,setSaving]=useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const isErg=f.activity==="REMO ERGÔMETRO";
  const ath=athletes.find(a=>a.id===f.athleteId);
  const boatLabel=isErg?"ERG":f.boatClass;
  const btLabel=`${boatLabel} ${ath?.category||""}`;
  const bt=bestTimes.find(b=>b.label===btLabel);
  const tS=parseTime(f.timeRowed);
  const dist=parseFloat(f.distance);
  const perc=(bt&&tS&&dist)?calcPerc(tS,dist,bt.speedMs):null;
  const spd=(tS&&dist)?dist/tS:null;
  const fb=getFB(f.trainingType,perc);
  const target=TARGET_PERC[f.trainingType]||75;
  async function save() {
    if (!f.athleteId||!f.timeRowed||!f.distance){alert("Preencha atleta, distância e tempo.");return;}
    setSaving(true);
    const rec={id:uid(),...f,timeSeconds:tS,speedMs:spd,percBT:perc,boatLabel,btLabel,btSpeed:bt?.speedMs||null,createdAt:new Date().toISOString()};
    await onSave(rec);
    setSaving(false);
  }
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:12}}>
        <Field label="Atleta" span={2}><select value={f.athleteId} onChange={e=>set("athleteId",e.target.value)}><option value="">Selecione...</option>{athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        <Field label="Data"><input type="date" value={f.date} onChange={e=>set("date",e.target.value)}/></Field>
        <Field label="Hora"><input type="time" value={f.time} onChange={e=>set("time",e.target.value)}/></Field>
        <Field label="Atividade"><select value={f.activity} onChange={e=>set("activity",e.target.value)}><option>BARCO</option><option>REMO ERGÔMETRO</option></select></Field>
        <Field label="Tipo de Treino"><select value={f.trainingType} onChange={e=>set("trainingType",e.target.value)}>{TRAIN_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
        <Field label="Série nº"><input type="number" min="1" max="20" value={f.series} onChange={e=>set("series",e.target.value)}/></Field>
        {!isErg&&<Field label="Tipo de Barco"><select value={f.boatClass} onChange={e=>set("boatClass",e.target.value)}>{BOAT_WATER.map(b=><option key={b}>{b}</option>)}</select></Field>}
        <Field label="Distância (m)"><input type="number" value={f.distance} onChange={e=>set("distance",e.target.value)} placeholder="2000"/></Field>
        <Field label="Tempo (mm:ss,d)"><input value={f.timeRowed} onChange={e=>set("timeRowed",e.target.value)} placeholder="7:30,5"/></Field>
        <Field label="VOG (rem/min)"><input type="number" value={f.spm} onChange={e=>set("spm",e.target.value)}/></Field>
        <Field label="Watts"><input type="number" value={f.watts} onChange={e=>set("watts",e.target.value)}/></Field>
        <Field label="Vento"><select value={f.wind} onChange={e=>set("wind",e.target.value)}>{WIND_OPTS.map(w=><option key={w}>{w}</option>)}</select></Field>
        <Field label="Notas" span={2}><input value={f.notes} onChange={e=>set("notes",e.target.value)} placeholder="Observações..."/></Field>
      </div>
      {perc!=null&&(
        <div style={{background:C.surfHi,borderRadius:8,padding:14,marginTop:14,border:`1px solid ${fb?.c||C.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div>
              <span style={{fontSize:12,color:C.muted}}>Ref: <span className="mono" style={{color:C.text,fontSize:11}}>{btLabel}</span></span>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>Meta para {f.trainingType}: <span className="mono" style={{color:C.blueLt}}>{target}%</span></div>
            </div>
            <span className="mono" style={{fontSize:26,fontWeight:800,color:fb?.c}}>{perc.toFixed(1)}%</span>
          </div>
          <PercBar val={perc} type={f.trainingType}/>
          {fb&&<div style={{marginTop:8,fontSize:13,color:fb.c}}>{fb.msg}</div>}
          <div style={{fontSize:11,color:C.muted,marginTop:4}}>Vel: <span className="mono">{spd?.toFixed(3)} m/s</span> · BT: <span className="mono">{bt?.speedMs?.toFixed(4)} m/s</span></div>
        </div>
      )}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
        <Btn variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Btn>
        <Btn onClick={save} disabled={saving}>{saving?"Salvando...":"💾 Salvar"}</Btn>
      </div>
    </div>
  );
}

// ─── ATHLETE VIEW ─────────────────────────────────────────────────────────
function AthleteView({ session, athletes, trainings, bestTimes, onLogout, onAdd }) {
  const ath=athletes.find(a=>a.id===session.athleteId);
  const [showForm,setShowForm]=useState(false);
  const [rankTab,setRankTab]=useState("day");
  const mine=[...trainings.filter(t=>t.athleteId===session.athleteId)].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return (
    <div style={{minHeight:"100vh",background:C.bg}}>
      <style>{GS}</style>
      <AppHeader right={<div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:11,color:C.muted,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ath?.name}</span><Btn variant="ghost" sz="sm" onClick={onLogout}>Sair</Btn></div>}/>
      <div style={{maxWidth:900,margin:"0 auto",padding:"16px 12px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
          {[{label:"Treinos",val:mine.length},{label:"Categoria",val:(ath?.category||"").split(" ").slice(0,2).join(" ")},{label:"Último",val:mine[0]?.date||"—"}].map(s=>(
            <Card key={s.label} s={{padding:12,borderTop:`2px solid ${C.blue}`}}><Lbl>{s.label}</Lbl><div style={{fontSize:18,fontWeight:800,wordBreak:"break-all",lineHeight:1.2}}>{s.val}</div></Card>
          ))}
        </div>
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:18,fontWeight:800}}>🏆 Ranking Proximidade à Meta</div>
            <div style={{display:"flex",gap:4,background:C.bg,borderRadius:6,padding:3}}>
              {["day","week"].map(p=>(
                <button key={p} onClick={()=>setRankTab(p)} style={{padding:"5px 14px",background:rankTab===p?C.blue:"transparent",color:rankTab===p?"#fff":C.muted,border:"none",borderRadius:4,fontWeight:700,fontSize:12,cursor:"pointer",transition:"all .15s"}}>{p==="day"?"Hoje":"Semana"}</button>
              ))}
            </div>
          </div>
          <ProximityRanking title={rankTab==="day"?"MELHOR DO DIA":"MELHOR DA SEMANA"} trainings={trainings} athletes={athletes} period={rankTab}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:18,fontWeight:800}}>Meus Treinos</div>
          <Btn sz="sm" onClick={()=>setShowForm(v=>!v)}>{showForm?"✕ Fechar":"+ Registrar"}</Btn>
        </div>
        {showForm&&<Card s={{marginBottom:14}}><Lbl>Novo Registro</Lbl><div style={{marginBottom:10}}/><TrainingForm athletes={athletes} bestTimes={bestTimes} preAthlete={session.athleteId} onSave={async r=>{await onAdd(r);setShowForm(false);}} onCancel={()=>setShowForm(false)}/></Card>}
        <Card>
          <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            <table>
              <thead><tr><th>Data</th><th>Tipo</th><th>Barco</th><th>Dist.</th><th>Tempo</th><th>VOG</th><th>% BT</th><th>Meta</th><th>Feedback</th></tr></thead>
              <tbody>
                {mine.length===0&&<tr><td colSpan={9} style={{textAlign:"center",color:C.muted,padding:32}}>Nenhum treino registrado ainda.</td></tr>}
                {mine.map(t=>{
                  const fb=getFB(t.trainingType,t.percBT);
                  const tgt=TARGET_PERC[String(t.trainingType||"B1").toUpperCase()]||75;
                  return <tr key={t.id}><td className="mono" style={{fontSize:11,whiteSpace:"nowrap"}}>{t.date}</td><td><span style={{background:C.surfHi,padding:"2px 8px",borderRadius:4,fontSize:11,color:C.blueLt}}>{t.trainingType}</span></td><td className="mono" style={{fontSize:11}}>{t.boatLabel}</td><td className="mono" style={{fontSize:11}}>{t.distance}m</td><td className="mono" style={{fontSize:11}}>{fmtTime(t.timeSeconds)}</td><td className="mono" style={{fontSize:11}}>{t.spm||"—"}</td><td><Badge val={t.percBT} type={t.trainingType}/></td><td className="mono" style={{fontSize:11,color:C.muted}}>{tgt}%</td><td style={{fontSize:11,color:fb?.c||C.muted}}>{fb?.msg||"—"}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────
function Dashboard({ athletes, trainings }) {
  const [rankTab,setRankTab]=useState("day");
  const today=todayStr();
  return (
    <div>
      <SectionHead>Dashboard</SectionHead>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10,marginBottom:20}}>
        {[{icon:"🚣",label:"Atletas",val:athletes.length},{icon:"📊",label:"Treinos",val:trainings.length},{icon:"📅",label:"Hoje",val:trainings.filter(t=>t.date===today).length},{icon:"📆",label:"Esta semana",val:trainings.filter(t=>t.date>=weekStart()&&t.date<=today).length}].map(s=>(
          <Card key={s.label} s={{padding:14,borderTop:`2px solid ${C.blue}`}}><div style={{fontSize:22}}>{s.icon}</div><Lbl>{s.label}</Lbl><div style={{fontSize:28,fontWeight:900}}>{s.val}</div></Card>
        ))}
      </div>
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:18,fontWeight:800}}>🏆 Ranking Proximidade à Meta</div>
          <div style={{display:"flex",gap:4,background:C.bg,borderRadius:6,padding:3}}>
            {["day","week"].map(p=>(
              <button key={p} onClick={()=>setRankTab(p)} style={{padding:"6px 16px",background:rankTab===p?C.blue:"transparent",color:rankTab===p?"#fff":C.muted,border:"none",borderRadius:4,fontWeight:700,fontSize:12,cursor:"pointer",transition:"all .15s"}}>{p==="day"?"Hoje":"Semana"}</button>
            ))}
          </div>
        </div>
        <ProximityRanking title={rankTab==="day"?"MELHOR DO DIA":"MELHOR DA SEMANA"} trainings={trainings} athletes={athletes} period={rankTab}/>
      </div>
      <Card>
        <div style={{fontSize:12,fontWeight:700,color:C.blueLt,letterSpacing:2,marginBottom:12}}>ÚLTIMOS REGISTROS</div>
        <div style={{overflowX:"auto"}}>
          <table>
            <thead><tr><th>Data</th><th>Atleta</th><th>Tipo</th><th>Barco</th><th>% BT</th><th>Meta</th></tr></thead>
            <tbody>
              {[...trainings].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,12).map(t=>{
                const a=athletes.find(x=>x.id===t.athleteId);
                const tgt=TARGET_PERC[String(t.trainingType||"B1").toUpperCase()]||75;
                return <tr key={t.id}><td className="mono" style={{fontSize:11,whiteSpace:"nowrap"}}>{t.date}</td><td style={{fontSize:12}}>{a?firstName(a.name):"?"}</td><td><span style={{background:C.surfHi,padding:"1px 6px",borderRadius:4,fontSize:11,color:C.blueLt}}>{t.trainingType}</span></td><td className="mono" style={{fontSize:11}}>{t.boatLabel}</td><td><Badge val={t.percBT} type={t.trainingType}/></td><td><span className="mono" style={{fontSize:11,color:C.muted}}>{tgt}%</span>{(t.percBT||0)>=tgt&&<span style={{marginLeft:5,color:C.good,fontSize:10}}>✓</span>}</td></tr>;
              })}
              {trainings.length===0&&<tr><td colSpan={6} style={{textAlign:"center",color:C.muted,padding:24}}>Sem registros.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── ALL TRAININGS ────────────────────────────────────────────────────────
function AllTrainings({ athletes, trainings, bestTimes, onAdd, onDelete }) {
  const [showForm,setShowForm]=useState(false);
  const [fa,setFa]=useState(""),[fac,setFac]=useState(""),[ft,setFt]=useState("");
  const filtered=[...trainings].filter(t=>{
    if(fa&&t.athleteId!==fa)return false;
    if(fac&&t.activity!==fac)return false;
    if(ft&&t.trainingType!==ft)return false;
    return true;
  }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <SectionHead>Todos os Treinos</SectionHead>
        <Btn sz="sm" onClick={()=>setShowForm(v=>!v)}>{showForm?"✕ Fechar":"+ Registrar"}</Btn>
      </div>
      {showForm&&<Card s={{marginBottom:14}}><Lbl>Novo Registro</Lbl><div style={{marginBottom:10}}/><TrainingForm athletes={athletes} bestTimes={bestTimes} onSave={async r=>{await onAdd(r);setShowForm(false);}} onCancel={()=>setShowForm(false)}/></Card>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:10,marginBottom:12}}>
        <select value={fa} onChange={e=>setFa(e.target.value)}><option value="">Todos atletas</option>{athletes.map(a=><option key={a.id} value={a.id}>{firstName(a.name)}</option>)}</select>
        <select value={fac} onChange={e=>setFac(e.target.value)}><option value="">Todas atividades</option><option>BARCO</option><option>REMO ERGÔMETRO</option></select>
        <select value={ft} onChange={e=>setFt(e.target.value)}><option value="">Todos tipos</option>{TRAIN_TYPES.map(t=><option key={t}>{t}</option>)}</select>
        <div style={{display:"flex",alignItems:"center",fontSize:12,color:C.muted}}>{filtered.length} registros</div>
      </div>
      <Card>
        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          <table>
            <thead><tr><th>Data</th><th>Atleta</th><th>Tipo</th><th>Barco</th><th>Dist.</th><th>Tempo</th><th>VOG</th><th>m/s</th><th>% BT</th><th>Meta</th><th>Vento</th><th></th></tr></thead>
            <tbody>
              {filtered.length===0&&<tr><td colSpan={12} style={{textAlign:"center",color:C.muted,padding:28}}>Nenhum resultado.</td></tr>}
              {filtered.map(t=>{
                const a=athletes.find(x=>x.id===t.athleteId);
                const tgt=TARGET_PERC[String(t.trainingType||"B1").toUpperCase()]||75;
                return <tr key={t.id}><td className="mono" style={{fontSize:11,whiteSpace:"nowrap"}}>{t.date}</td><td style={{fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{a?firstName(a.name):"?"}</td><td><span style={{background:C.surfHi,padding:"2px 7px",borderRadius:4,fontSize:11,color:C.blueLt}}>{t.trainingType}</span></td><td className="mono" style={{fontSize:11}}>{t.boatLabel}</td><td className="mono" style={{fontSize:11}}>{t.distance}m</td><td className="mono" style={{fontSize:11}}>{fmtTime(t.timeSeconds)}</td><td className="mono" style={{fontSize:11}}>{t.spm||"—"}</td><td className="mono" style={{fontSize:11}}>{t.speedMs?.toFixed(3)||"—"}</td><td><Badge val={t.percBT} type={t.trainingType}/></td><td><span className="mono" style={{fontSize:11,color:C.muted}}>{tgt}%</span>{(t.percBT||0)>=tgt&&<span style={{marginLeft:4,color:C.good,fontSize:10}}>✓</span>}</td><td style={{fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{t.wind}</td><td><button onClick={()=>{if(confirm("Excluir?"))onDelete(t.id);}} style={{background:"transparent",color:C.bad,border:"none",fontSize:15,cursor:"pointer",padding:"3px 6px"}}>🗑</button></td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── ATHLETES ADMIN ───────────────────────────────────────────────────────
function AthletesAdmin({ athletes, onAdd, onDelete }) {
  const [showAdd,setShowAdd]=useState(false);
  const [f,setF]=useState({name:"",category:"",gender:"Masc",weight:"",birthYear:""});
  const [saving,setSaving]=useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const year=new Date().getFullYear();
  async function add(){
    if(!f.name.trim()||!f.category.trim()){alert("Nome e categoria são obrigatórios.");return;}
    setSaving(true);
    await onAdd({id:uid(),...f,birthYear:parseInt(f.birthYear)||null});
    setF({name:"",category:"",gender:"Masc",weight:"",birthYear:""});
    setShowAdd(false);setSaving(false);
  }
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <SectionHead>Atletas ({athletes.length})</SectionHead>
        <Btn sz="sm" onClick={()=>setShowAdd(v=>!v)}>{showAdd?"✕ Fechar":"+ Adicionar"}</Btn>
      </div>
      {showAdd&&<Card s={{marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:12,marginBottom:12}}>
          <Field label="Nome completo" span={2}><input value={f.name} onChange={e=>set("name",e.target.value)} placeholder="Nome completo"/></Field>
          <Field label="Categoria"><input value={f.category} onChange={e=>set("category",e.target.value)} placeholder="ex: Masc Sênior"/></Field>
          <Field label="Gênero"><select value={f.gender} onChange={e=>set("gender",e.target.value)}><option>Masc</option><option>Fem</option><option>Masc Para</option><option>PR1 Fem Para</option></select></Field>
          <Field label="Peso Leve"><select value={f.weight} onChange={e=>set("weight",e.target.value)}><option value="">Não</option><option value="Peso Leve">Sim</option></select></Field>
          <Field label="Ano Nasc."><input type="number" value={f.birthYear} onChange={e=>set("birthYear",e.target.value)} placeholder="2000"/></Field>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn variant="ghost" sz="sm" onClick={()=>setShowAdd(false)} disabled={saving}>Cancelar</Btn>
          <Btn sz="sm" onClick={add} disabled={saving}>{saving?"Salvando...":"Salvar Atleta"}</Btn>
        </div>
      </Card>}
      <Card>
        <div style={{overflowX:"auto"}}>
          <table>
            <thead><tr><th>Nome</th><th>Categoria</th><th>PL</th><th>Nasc.</th><th>Idade</th><th></th></tr></thead>
            <tbody>
              {athletes.map(a=>(
                <tr key={a.id}>
                  <td style={{fontWeight:600,fontSize:13}}>{a.name}</td>
                  <td style={{fontSize:12,color:C.muted}}>{a.category}</td>
                  <td>{a.weight?<span style={{color:C.blueLt,fontSize:11}}>✓ PL</span>:"—"}</td>
                  <td className="mono" style={{fontSize:11}}>{a.birthYear||"—"}</td>
                  <td className="mono" style={{color:C.blueLt,fontSize:12}}>{a.birthYear?year-a.birthYear:"—"}</td>
                  <td><button onClick={()=>{if(confirm("Remover atleta?"))onDelete(a.id);}} style={{background:"transparent",color:C.bad,border:"none",fontSize:15,cursor:"pointer"}}>🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── BEST TIMES ADMIN ─────────────────────────────────────────────────────
function BestTimesAdmin({ bestTimes, onUpdate, onAdd, onDelete }) {
  const [editing,setEditing]=useState(null);
  const [ef,setEf]=useState({});
  const [showAdd,setShowAdd]=useState(false);
  const [nf,setNf]=useState({boatClass:"1x",category:"",label:"",timeSeconds:"",speedMs:""});
  const [saving,setSaving]=useState(false);
  async function saveEdit(){
    setSaving(true);
    const t=parseFloat(ef.timeSeconds),sp=parseFloat(ef.speedMs)||2000/t;
    await onUpdate({...ef,speedMs:sp});
    setEditing(null);setSaving(false);
  }
  async function addBT(){
    if(!nf.category.trim()){alert("Preencha a categoria.");return;}
    setSaving(true);
    const t=parseFloat(nf.timeSeconds),sp=parseFloat(nf.speedMs)||2000/t;
    const label=nf.label||`${nf.boatClass} ${nf.category}`;
    await onAdd({id:uid(),...nf,label,speedMs:sp});
    setShowAdd(false);setNf({boatClass:"1x",category:"",label:"",timeSeconds:"",speedMs:""});setSaving(false);
  }
  const groups=[...new Set(bestTimes.map(b=>b.boatClass))];
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <SectionHead>Best Times Mundiais</SectionHead>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <a href="https://worldrowing.com/events/world-records" target="_blank" rel="noreferrer" style={{color:C.blueLt,fontSize:12,textDecoration:"none"}}>🌐 WorldRowing.com</a>
          <Btn sz="sm" onClick={()=>setShowAdd(v=>!v)}>{showAdd?"✕":"+ Adicionar"}</Btn>
        </div>
      </div>
      <div style={{background:`rgba(26,79,160,.08)`,border:`1px solid ${C.border}`,borderRadius:8,padding:12,marginBottom:14,fontSize:12,color:C.muted}}>
        ⚠️ Atualize manualmente consultando o <a href="https://worldrowing.com/events/world-records" target="_blank" rel="noreferrer" style={{color:C.blueLt}}>worldrowing.com</a>. Esses valores são a base de todos os cálculos de % BT.
      </div>
      {showAdd&&<Card s={{marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,marginBottom:12}}>
          <Field label="Tipo Barco"><select value={nf.boatClass} onChange={e=>setNf(p=>({...p,boatClass:e.target.value}))}>{BOAT_ALL.map(b=><option key={b}>{b}</option>)}</select></Field>
          <Field label="Categoria"><input value={nf.category} onChange={e=>setNf(p=>({...p,category:e.target.value}))} placeholder="ex: Masc Sênior"/></Field>
          <Field label="Tempo 2000m (s)"><input type="number" value={nf.timeSeconds} onChange={e=>setNf(p=>({...p,timeSeconds:e.target.value}))}/></Field>
          <Field label="Vel. m/s (opcional)"><input type="number" step="0.0001" value={nf.speedMs} onChange={e=>setNf(p=>({...p,speedMs:e.target.value}))}/></Field>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn variant="ghost" sz="sm" onClick={()=>setShowAdd(false)} disabled={saving}>Cancelar</Btn><Btn sz="sm" onClick={addBT} disabled={saving}>{saving?"Salvando...":"Salvar"}</Btn></div>
      </Card>}
      {groups.map(grp=>(
        <div key={grp} style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{background:C.blue,color:"#fff",padding:"3px 14px",borderRadius:4,fontSize:13,fontWeight:800}}>{grp}</span>
            <span style={{color:C.muted,fontSize:11}}>{bestTimes.filter(b=>b.boatClass===grp).length} entradas</span>
          </div>
          <Card>
            <div style={{overflowX:"auto"}}>
              <table>
                <thead><tr><th>Categoria</th><th>Label</th><th>Tempo</th><th>m/s</th><th></th></tr></thead>
                <tbody>
                  {bestTimes.filter(b=>b.boatClass===grp).map(bt=>(
                    <tr key={bt.id}>
                      {editing===bt.id?(
                        <>
                          <td><input value={ef.category} onChange={e=>setEf(p=>({...p,category:e.target.value}))} style={{fontSize:12}}/></td>
                          <td><input value={ef.label} onChange={e=>setEf(p=>({...p,label:e.target.value}))} style={{fontSize:12}}/></td>
                          <td><input type="number" value={ef.timeSeconds} onChange={e=>setEf(p=>({...p,timeSeconds:e.target.value}))} style={{width:90,fontSize:12}}/></td>
                          <td><input type="number" step="0.0001" value={ef.speedMs} onChange={e=>setEf(p=>({...p,speedMs:e.target.value}))} style={{width:90,fontSize:12}}/></td>
                          <td style={{display:"flex",gap:5}}><Btn sz="sm" onClick={saveEdit} disabled={saving}>✓</Btn><Btn sz="sm" variant="ghost" onClick={()=>setEditing(null)}>✕</Btn></td>
                        </>
                      ):(
                        <>
                          <td style={{fontSize:12}}>{bt.category}</td>
                          <td style={{fontSize:11,color:C.muted}}>{bt.label}</td>
                          <td className="mono" style={{color:C.blueLt,fontSize:12}}>{fmtTime(bt.timeSeconds)}</td>
                          <td className="mono" style={{fontSize:12}}>{bt.speedMs?.toFixed(4)}</td>
                          <td style={{display:"flex",gap:5,whiteSpace:"nowrap"}}>
                            <Btn sz="sm" variant="outline" onClick={()=>{setEditing(bt.id);setEf({...bt});}}>✏️</Btn>
                            <Btn sz="sm" variant="danger" onClick={()=>{if(confirm("Remover?"))onDelete(bt.id);}}>🗑</Btn>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}

// ─── ADMIN LAYOUT ─────────────────────────────────────────────────────────
function AdminView({ session, athletes, trainings, bestTimes, onLogout, onAddAthlete, onDeleteAthlete, onAddTraining, onDeleteTraining, onUpdateBT, onAddBT, onDeleteBT }) {
  const [tab,setTab]=useState("dashboard");
  const TABS=[{id:"dashboard",icon:"📊",label:"Dashboard"},{id:"trainings",icon:"📋",label:"Treinos"},{id:"athletes",icon:"🚣",label:"Atletas"},{id:"besttimes",icon:"🏆",label:"Best Times"}];
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",background:C.bg}}>
      <style>{GS}</style>
      <AppHeader
        right={<Btn variant="ghost" sz="sm" onClick={onLogout}>Sair</Btn>}
        nav={<div style={{display:"flex",gap:0,overflowX:"auto",flex:1,justifyContent:"center"}}>{TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"16px 12px",background:"transparent",color:tab===t.id?"#fff":C.muted,border:"none",borderBottom:tab===t.id?"2px solid #fff":"2px solid transparent",fontWeight:700,fontSize:13,cursor:"pointer",letterSpacing:1,whiteSpace:"nowrap",transition:"color .15s"}}>{t.icon} {t.label}</button>)}</div>}
      />
      <div style={{flex:1,maxWidth:1200,margin:"0 auto",width:"100%",padding:"20px 12px"}}>
        {tab==="dashboard"&&<Dashboard athletes={athletes} trainings={trainings}/>}
        {tab==="trainings"&&<AllTrainings athletes={athletes} trainings={trainings} bestTimes={bestTimes} onAdd={onAddTraining} onDelete={onDeleteTraining}/>}
        {tab==="athletes"&&<AthletesAdmin athletes={athletes} onAdd={onAddAthlete} onDelete={onDeleteAthlete}/>}
        {tab==="besttimes"&&<BestTimesAdmin bestTimes={bestTimes} onUpdate={onUpdateBT} onAdd={onAddBT} onDelete={onDeleteBT}/>}
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session,  setSession]  = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [trainings,setTrainings]= useState([]);
  const [bestTimes,setBestTimes]= useState([]);
  const [loading,  setLoading]  = useState(true);
  const [loadMsg,  setLoadMsg]  = useState("Conectando ao banco de dados...");

  // Carrega dados do Supabase
  useEffect(()=>{
    (async()=>{
      setLoadMsg("Carregando atletas...");
      const {data:ath} = await supabase.from("athletes").select("*").order("name");

      // Se não há atletas, insere os dados iniciais
      if (!ath||ath.length===0) {
        setLoadMsg("Configurando dados iniciais...");
        await supabase.from("athletes").insert(SEED_ATHLETES.map(athleteToDb));
        await supabase.from("best_times").insert(SEED_BT.map(btToDb));
        const {data:ath2} = await supabase.from("athletes").select("*").order("name");
        const {data:bt2}  = await supabase.from("best_times").select("*").order("boat_class");
        setAthletes((ath2||[]).map(dbToAthlete));
        setBestTimes((bt2||[]).map(dbToBT));
      } else {
        setLoadMsg("Carregando treinos...");
        const {data:bt}  = await supabase.from("best_times").select("*").order("boat_class");
        const {data:tr}  = await supabase.from("trainings").select("*").order("created_at",{ascending:false});
        setAthletes((ath||[]).map(dbToAthlete));
        setBestTimes((bt||[]).map(dbToBT));
        setTrainings((tr||[]).map(dbToTraining));
      }
      setLoading(false);
    })();
  },[]);

  // Realtime — atualiza treinos automaticamente quando qualquer dispositivo insere
  useEffect(()=>{
    const channel = supabase.channel("trainings-realtime")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"trainings"},payload=>{
        setTrainings(p=>[dbToTraining(payload.new),...p]);
      })
      .on("postgres_changes",{event:"DELETE",schema:"public",table:"trainings"},payload=>{
        setTrainings(p=>p.filter(t=>t.id!==payload.old.id));
      })
      .subscribe();
    return ()=>supabase.removeChannel(channel);
  },[]);

  // CRUD handlers
  const addTraining = useCallback(async(rec)=>{
    const {error} = await supabase.from("trainings").insert(trainingToDb(rec));
    if (error) { alert("Erro ao salvar treino: "+error.message); return; }
    // Realtime vai atualizar automaticamente
  },[]);

  const deleteTraining = useCallback(async(id)=>{
    await supabase.from("trainings").delete().eq("id",id);
    setTrainings(p=>p.filter(t=>t.id!==id));
  },[]);

  const addAthlete = useCallback(async(a)=>{
    const {error} = await supabase.from("athletes").insert(athleteToDb(a));
    if (error) { alert("Erro: "+error.message); return; }
    setAthletes(p=>[...p,a].sort((a,b)=>a.name.localeCompare(b.name)));
  },[]);

  const deleteAthlete = useCallback(async(id)=>{
    await supabase.from("athletes").delete().eq("id",id);
    setAthletes(p=>p.filter(a=>a.id!==id));
  },[]);

  const updateBT = useCallback(async(bt)=>{
    const {error} = await supabase.from("best_times").update(btToDb(bt)).eq("id",bt.id);
    if (error) { alert("Erro: "+error.message); return; }
    setBestTimes(p=>p.map(b=>b.id===bt.id?bt:b));
  },[]);

  const addBT = useCallback(async(bt)=>{
    const {error} = await supabase.from("best_times").insert(btToDb(bt));
    if (error) { alert("Erro: "+error.message); return; }
    setBestTimes(p=>[...p,bt]);
  },[]);

  const deleteBT = useCallback(async(id)=>{
    await supabase.from("best_times").delete().eq("id",id);
    setBestTimes(p=>p.filter(b=>b.id!==id));
  },[]);

  if (loading) return <Loading msg={loadMsg}/>;
  if (!session) return <Login athletes={athletes} onLogin={setSession}/>;
  if (session.role==="athlete") return (
    <AthleteView session={session} athletes={athletes} trainings={trainings} bestTimes={bestTimes}
      onLogout={()=>setSession(null)} onAdd={addTraining}/>
  );
  return (
    <AdminView session={session}
      athletes={athletes} trainings={trainings} bestTimes={bestTimes}
      onLogout={()=>setSession(null)}
      onAddTraining={addTraining}   onDeleteTraining={deleteTraining}
      onAddAthlete={addAthlete}     onDeleteAthlete={deleteAthlete}
      onUpdateBT={updateBT}         onAddBT={addBT}         onDeleteBT={deleteBT}/>
  );
}
