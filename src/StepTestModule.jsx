import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./supabase.js";

// ─── CONSTANTES ────────────────────────────────────────────────────────────
const ZONES = [
  { key:"B1", label:"B1/E1", desc:"Aeróbio Leve / Recuperação", pctLow:0.60, pctHigh:0.75, color:"#3b82f6" },
  { key:"B2", label:"B2/E2", desc:"Aeróbio Moderado",           pctLow:0.75, pctHigh:0.85, color:"#22c55e" },
  { key:"B3", label:"B3/E3", desc:"Limiar Anaeróbio",           pctLow:0.85, pctHigh:0.93, color:"#f59e0b" },
  { key:"B4", label:"B4/E4", desc:"Velocidade Crítica",         pctLow:0.90, pctHigh:0.95, color:"#f97316" },
  { key:"B5", label:"B5/E5", desc:"Aeróbio Máximo",            pctLow:0.92, pctHigh:1.00, color:"#ef4444" },
];

// Karvonen: FC zona = FC repouso + (FC reserva × pct)
function calcZones(maxHR, restHR) {
  if (!maxHR) return null;
  const rest = restHR || 0;
  const reserve = maxHR - rest;
  return ZONES.map(z => ({
    ...z,
    hrLow:  Math.round(rest + reserve * z.pctLow),
    hrHigh: Math.round(rest + reserve * z.pctHigh),
  }));
}

// Interpolação linear para potência por zona
function interpolatePower(steps, targetHR) {
  if (!steps || steps.length < 2) return null;
  const sorted = [...steps].filter(s => s.step_number !== "Max" && s.hr_bpm && s.power_w)
    .sort((a,b) => a.hr_bpm - b.hr_bpm);
  if (sorted.length < 2) return null;
  if (targetHR <= sorted[0].hr_bpm) return sorted[0].power_w;
  if (targetHR >= sorted[sorted.length-1].hr_bpm) return sorted[sorted.length-1].power_w;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i+1];
    if (targetHR >= a.hr_bpm && targetHR <= b.hr_bpm) {
      const t = (targetHR - a.hr_bpm) / (b.hr_bpm - a.hr_bpm);
      return Math.round(a.power_w + t * (b.power_w - a.power_w));
    }
  }
  return null;
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function fmt1(v) { return v != null ? parseFloat(v).toFixed(1) : "—"; }
function fmt0(v) { return v != null ? Math.round(v) : "—"; }

function excelDateToISO(v) {
  if (!v) return null;
  if (typeof v === "string" && v.match(/^\d{4}-\d{2}-\d{2}/)) return v.slice(0,10);
  const n = parseFloat(v);
  if (!isNaN(n) && n > 40000) {
    const d = new Date((n - 25569) * 86400 * 1000);
    return d.toISOString().slice(0,10);
  }
  return String(v).slice(0,10);
}

// ─── CORES ECP ─────────────────────────────────────────────────────────────
const C = {
  bg:"#070b12", surf:"#0d1421", surfHi:"#131e30",
  border:"#1a2840", blue:"#1a4fa0", blueLt:"#3b82f6",
  text:"#e2eaf5", muted:"#4a6080",
  good:"#22c55e", warn:"#f59e0b", bad:"#ef4444",
};

const GS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{background:${C.bg};color:${C.text};font-family:'Barlow Condensed',sans-serif;}
  .mono{font-family:'JetBrains Mono',monospace;}
  input,select{font-family:'JetBrains Mono',monospace;font-size:13px;background:${C.bg};border:1.5px solid ${C.border};color:${C.text};padding:8px 12px;border-radius:6px;outline:none;width:100%;-webkit-appearance:none;appearance:none;}
  input:focus,select:focus{border-color:${C.blueLt};}
  select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7'%3E%3Cpath d='M0 0l6 7 6-7z' fill='%234a6080'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:28px;}
  button{cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-weight:700;border:none;border-radius:6px;transition:all .15s;touch-action:manipulation;}
  ::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-track{background:${C.bg};}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
`;

function Btn({ children, onClick, variant="primary", sz="md", disabled, full }) {
  const V = { primary:{background:C.blue,color:"#fff"}, outline:{background:"transparent",color:C.blueLt,border:`1.5px solid ${C.blueLt}`}, ghost:{background:C.surfHi,color:C.text}, danger:{background:C.bad,color:"#fff"} };
  const S = { sm:{padding:"5px 12px",fontSize:12}, md:{padding:"8px 18px",fontSize:14}, lg:{padding:"12px 24px",fontSize:15} };
  return <button onClick={onClick} disabled={disabled} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,opacity:disabled?.5:1,width:full?"100%":undefined,letterSpacing:.5,...V[variant],...S[sz]}}>{children}</button>;
}
function Card({ children, s }) { return <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:16,...s}}>{children}</div>; }
function Lbl({ children }) { return <div style={{fontSize:10,letterSpacing:2,color:C.blueLt,textTransform:"uppercase",marginBottom:4,fontWeight:600}}>{children}</div>; }
function Field({ label, children, span }) { return <div style={{gridColumn:span?`span ${span}`:undefined,display:"flex",flexDirection:"column",gap:3}}><Lbl>{label}</Lbl>{children}</div>; }

// ─── MINI SPARKLINE SVG ────────────────────────────────────────────────────
function Spark({ vals, color="#3b82f6", w=80, h=28 }) {
  const v = vals.filter(x => x != null);
  if (v.length < 2) return null;
  const mn = Math.min(...v), mx = Math.max(...v), rng = mx - mn || 1;
  const p = 3;
  const pts = vals.map((val,i) => {
    const vv = val ?? mn;
    const x = p + (i/(vals.length-1))*(w-p*2);
    const y = p + (1-(vv-mn)/rng)*(h-p*2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity=".8"/>
      {vals.map((val,i) => {
        if (val == null) return null;
        const vv = val;
        const x = p+(i/(vals.length-1))*(w-p*2);
        const y = p+(1-(vv-mn)/rng)*(h-p*2);
        return <circle key={i} cx={x} cy={y} r={i===vals.length-1?3:1.5} fill={i===vals.length-1?color:"rgba(255,255,255,.4)"}/>;
      })}
    </svg>
  );
}

// ─── ZONE TABLE ───────────────────────────────────────────────────────────
function ZoneTable({ test, steps }) {
  const zones = calcZones(test.max_hr, test.rest_hr);
  if (!zones) return <div style={{color:C.muted,fontSize:13}}>FCmax não registrada — zonas indisponíveis.</div>;
  return (
    <div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:C.surfHi}}>
              {["Zona","Descrição","FC Inferior","FC Superior","% FCmax","Potência (W)"].map(h=>(
                <th key={h} style={{padding:"8px 10px",fontSize:10,letterSpacing:2,color:C.blueLt,textTransform:"uppercase",textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zones.map((z,i) => {
              const pwLow  = interpolatePower(steps, z.hrLow);
              const pwHigh = interpolatePower(steps, z.hrHigh);
              return (
                <tr key={z.key} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"9px 10px"}}>
                    <span style={{background:z.color,color:"#fff",fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:4}}>{z.label}</span>
                  </td>
                  <td style={{padding:"9px 10px",fontSize:12,color:C.muted}}>{z.desc}</td>
                  <td style={{padding:"9px 10px"}} className="mono">{z.hrLow} bpm</td>
                  <td style={{padding:"9px 10px"}} className="mono">{z.hrHigh} bpm</td>
                  <td style={{padding:"9px 10px",fontSize:11,color:C.muted}} className="mono">{Math.round(z.pctLow*100)}-{Math.round(z.pctHigh*100)}%</td>
                  <td style={{padding:"9px 10px"}} className="mono" style={{color:z.color,fontWeight:700}}>
                    {pwLow && pwHigh ? `${pwLow}–${pwHigh} W` : pwLow ? `~${pwLow} W` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {test.rest_hr && (
        <div style={{marginTop:8,fontSize:11,color:C.muted}}>
          Método Karvonen · FC repouso: <span className="mono">{test.rest_hr} bpm</span> · FC máx: <span className="mono">{test.max_hr} bpm</span> · FC reserva: <span className="mono">{test.max_hr - test.rest_hr} bpm</span>
        </div>
      )}
      {!test.rest_hr && (
        <div style={{marginTop:8,fontSize:11,color:C.warn}}>⚠️ FC de repouso não registrada — zonas calculadas sem método Karvonen (FC reserva = 0).</div>
      )}
    </div>
  );
}

// ─── STEP TABLE ───────────────────────────────────────────────────────────
function StepTable({ steps }) {
  const sorted = [...steps].sort((a,b) => {
    if (a.step_number === "Max") return 1;
    if (b.step_number === "Max") return -1;
    return parseInt(a.step_number) - parseInt(b.step_number);
  });
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead>
          <tr style={{background:C.surfHi}}>
            {["Step","Potência (W)","Pot. Rel. (w.kg)","FC (bpm)","Distância (m)","VOG","Lactato","RPE"].map(h=>(
              <th key={h} style={{padding:"8px 10px",fontSize:10,letterSpacing:1.5,color:C.blueLt,textTransform:"uppercase",textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((s,i) => (
            <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:s.step_number==="Max"?C.surfHi:"transparent"}}>
              <td style={{padding:"8px 10px"}}>
                <span style={{background:s.step_number==="Max"?C.bad:C.blue,color:"#fff",fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:4}}>
                  {s.step_number==="Max"?"MAX":s.step_number}
                </span>
              </td>
              <td className="mono" style={{padding:"8px 10px",fontWeight:s.step_number==="Max"?700:400}}>{fmt0(s.power_w)}</td>
              <td className="mono" style={{padding:"8px 10px"}}>{fmt1(s.rel_power)}</td>
              <td className="mono" style={{padding:"8px 10px",color:s.step_number==="Max"?C.bad:C.text}}>{fmt0(s.hr_bpm)}</td>
              <td className="mono" style={{padding:"8px 10px"}}>{fmt0(s.distance_m)}</td>
              <td className="mono" style={{padding:"8px 10px"}}>{s.stroke_rate ?? "—"}</td>
              <td className="mono" style={{padding:"8px 10px"}}>{s.lactate != null ? fmt1(s.lactate) : "—"}</td>
              <td className="mono" style={{padding:"8px 10px"}}>{s.rpe ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── HR ZONE CHART (SVG barras horizontais) ───────────────────────────────
function HRZoneChart({ test, steps }) {
  const zones = calcZones(test.max_hr, test.rest_hr);
  if (!zones || !test.max_hr) return null;
  const maxFC = test.max_hr + 5;
  const minFC = (test.rest_hr || 40) - 5;
  const range = maxFC - minFC;
  const w = 320, h = 200, padL = 48, padR = 8, padT = 10, padB = 24;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const toY = fc => padT + innerH - ((fc - minFC) / range) * innerH;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{overflow:"visible"}}>
      {/* grid lines */}
      {[minFC, ...zones.map(z=>z.hrLow), test.max_hr].filter((v,i,a)=>a.indexOf(v)===i).map(fc => (
        <line key={fc} x1={padL} y1={toY(fc)} x2={padL+innerW} y2={toY(fc)} stroke={C.border} strokeWidth="1"/>
      ))}
      {/* zone bands */}
      {zones.map(z => {
        const y1 = toY(z.hrHigh), y2 = toY(z.hrLow);
        return (
          <rect key={z.key} x={padL} y={y1} width={innerW} height={y2-y1} fill={z.color} opacity=".18"/>
        );
      })}
      {/* zone labels */}
      {zones.map(z => {
        const midY = (toY(z.hrHigh) + toY(z.hrLow)) / 2;
        return (
          <text key={z.key} x={padL+innerW-4} y={midY+4} textAnchor="end" fontSize="10" fill={z.color} fontWeight="700" fontFamily="Barlow Condensed,sans-serif">{z.label}</text>
        );
      })}
      {/* FC axis labels */}
      {zones.map(z => (
        <text key={`l${z.key}`} x={padL-4} y={toY(z.hrLow)+4} textAnchor="end" fontSize="9" fill={C.muted} fontFamily="JetBrains Mono,monospace">{z.hrLow}</text>
      ))}
      <text x={padL-4} y={toY(test.max_hr)+4} textAnchor="end" fontSize="9" fill={C.bad} fontFamily="JetBrains Mono,monospace">{test.max_hr}</text>
      {/* HR line from steps */}
      {(() => {
        const pts = [...steps]
          .filter(s => s.step_number !== "Max" && s.hr_bpm)
          .sort((a,b) => parseInt(a.step_number)-parseInt(b.step_number));
        if (pts.length < 2) return null;
        const xStep = innerW / (pts.length + 1);
        const points = pts.map((s,i) => `${padL + xStep*(i+1)},${toY(s.hr_bpm)}`).join(" ");
        return <>
          <polyline points={points} fill="none" stroke={C.blueLt} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          {pts.map((s,i) => (
            <circle key={i} cx={padL+xStep*(i+1)} cy={toY(s.hr_bpm)} r="3" fill={C.blueLt}/>
          ))}
        </>;
      })()}
    </svg>
  );
}

// ─── EVOLUTION CHART (potência relativa corrigida) ─────────────────────────
function EvolutionChart({ tests }) {
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const recent = [...tests]
    .filter(t => new Date(t.test_date) >= threeYearsAgo && t.max_rel_power_corrg)
    .sort((a,b) => a.test_date.localeCompare(b.test_date));
  if (recent.length < 2) return (
    <div style={{color:C.muted,fontSize:13,padding:"16px 0"}}>Dados insuficientes para gráfico de evolução (mínimo 2 testes nos últimos 3 anos).</div>
  );
  const vals = recent.map(t => t.max_rel_power_corrg);
  const mn = Math.min(...vals) * 0.97, mx = Math.max(...vals) * 1.02;
  const rng = mx - mn || 1;
  const w = 400, h = 120, padL = 42, padR = 10, padT = 10, padB = 28;
  const iW = w-padL-padR, iH = h-padT-padB;
  const toX = i => padL + (i/(recent.length-1))*iW;
  const toY = v => padT + iH - ((v-mn)/rng)*iH;

  // trend
  const n = recent.length;
  const xMean = (n-1)/2;
  const yMean = vals.reduce((a,b)=>a+b,0)/n;
  const num = vals.reduce((s,v,i)=>(s+(i-xMean)*(v-yMean)),0);
  const den = vals.reduce((s,_,i)=>(s+(i-xMean)**2),0);
  const slope = den ? num/den : 0;
  const intercept = yMean - slope*xMean;
  const t0y = toY(intercept);
  const t1y = toY(intercept + slope*(n-1));

  const latestTrend = slope > 0.05 ? { icon:"↗", color:C.good, label:"Melhorando" }
    : slope < -0.05 ? { icon:"↘", color:C.bad, label:"Regredindo" }
    : { icon:"→", color:C.warn, label:"Estável" };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
        <div style={{fontSize:10,color:C.muted,letterSpacing:2}}>EVOLUÇÃO — POTÊNCIA RELATIVA CORRIGIDA (w.kg) · ÚLTIMOS 3 ANOS</div>
        <span style={{fontSize:14,fontWeight:800,color:latestTrend.color}}>{latestTrend.icon} {latestTrend.label}</span>
      </div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{overflow:"visible",maxWidth:"100%"}}>
        {/* grid */}
        {[0,0.25,0.5,0.75,1].map(t => {
          const v = mn + t*rng;
          const y = toY(v);
          return <g key={t}><line x1={padL} y1={y} x2={padL+iW} y2={y} stroke={C.border} strokeWidth="1"/><text x={padL-4} y={y+4} textAnchor="end" fontSize="9" fill={C.muted} fontFamily="JetBrains Mono">{v.toFixed(1)}</text></g>;
        })}
        {/* trend line */}
        <line x1={toX(0)} y1={t0y} x2={toX(n-1)} y2={t1y} stroke={latestTrend.color} strokeWidth="1.5" strokeDasharray="4 3" opacity=".5"/>
        {/* data line */}
        <polyline points={recent.map((t,i)=>`${toX(i)},${toY(t.max_rel_power_corrg)}`).join(" ")} fill="none" stroke={C.blueLt} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {recent.map((t,i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(t.max_rel_power_corrg)} r="3.5" fill={C.blueLt}/>
            <text x={toX(i)} y={h-4} textAnchor="middle" fontSize="8" fill={C.muted} fontFamily="JetBrains Mono">{t.test_date.slice(2,7)}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── TEST REPORT VIEW ─────────────────────────────────────────────────────
function TestReport({ test, steps, prevTest, prevSteps, onBack }) {
  const [tab, setTab] = useState("zones");
  const zones = calcZones(test.max_hr, test.rest_hr);

  const diff = (curr, prev) => {
    if (!curr || !prev) return null;
    const d = curr - prev;
    return { d, pct: (d/prev*100).toFixed(1), pos: d >= 0 };
  };
  const pwDiff  = diff(test.max_power, prevTest?.max_power);
  const rDiff   = diff(test.max_rel_power_corrg, prevTest?.max_rel_power_corrg);

  return (
    <div>
      <style>{GS}</style>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <Btn variant="ghost" sz="sm" onClick={onBack}>← Voltar</Btn>
        <div>
          <div style={{fontSize:20,fontWeight:800}}>{new Date(test.test_date).toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})}</div>
          <div style={{fontSize:11,color:C.muted}}>{test.protocol} · Peso: {test.body_mass ? `${test.body_mass} kg` : "—"} · Temp: {test.temp ? `${test.temp}°C` : "—"}</div>
        </div>
      </div>

      {/* Resultados max */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10,marginBottom:16}}>
        {[
          { label:"FC Máxima",  val:`${test.max_hr ?? "—"} bpm`,       diff:null,   color:C.bad },
          { label:"Potência",   val:`${fmt0(test.max_power)} W`,        diff:pwDiff, color:C.blueLt },
          { label:"Pot. Rel.",  val:`${fmt1(test.max_rel_power)} w.kg`, diff:null,   color:C.blueLt },
          { label:"Pot. Corrg",val:`${fmt1(test.max_rel_power_corrg)}`,diff:rDiff,  color:C.good },
          { label:"Distância",  val:`${fmt0(test.max_distance)} m`,     diff:null,   color:C.text },
          { label:"Lactato",    val:test.max_lactate ? `${fmt1(test.max_lactate)} mM` : "—", diff:null, color:C.warn },
        ].map(s => (
          <Card key={s.label} s={{padding:12,borderTop:`2px solid ${s.color}`}}>
            <Lbl>{s.label}</Lbl>
            <div className="mono" style={{fontSize:17,fontWeight:800,color:s.color}}>{s.val}</div>
            {s.diff && (
              <div style={{fontSize:10,color:s.diff.pos?C.good:C.bad,marginTop:3}}>
                {s.diff.pos?"+":""}{s.diff.d.toFixed(1)} ({s.diff.pos?"+":""}{s.diff.pct}%) vs anterior
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:12,background:C.bg,borderRadius:8,padding:4}}>
        {[["zones","🎯 Zonas"],["steps","📊 Steps"],["chart","📈 Gráfico FC"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"7px 0",background:tab===k?C.blue:"transparent",color:tab===k?"#fff":C.muted,border:"none",borderRadius:6,fontWeight:700,fontSize:13,cursor:"pointer",letterSpacing:1}}>
            {l}
          </button>
        ))}
      </div>

      <Card>
        {tab==="zones" && <ZoneTable test={test} steps={steps}/>}
        {tab==="steps" && <StepTable steps={steps}/>}
        {tab==="chart" && <HRZoneChart test={test} steps={steps}/>}
      </Card>
    </div>
  );
}

// ─── FORM NOVO STEP TEST ──────────────────────────────────────────────────
function NewTestForm({ athleteId, athletes, onSave, onCancel }) {
  const [info, setInfo] = useState({
    athlete_id: athleteId || "",
    test_date: new Date().toISOString().slice(0,10),
    protocol: "StepTestSlide",
    body_mass: "",
    rest_hr: "",
    temp: "",
    notes: "",
  });
  const [numSteps, setNumSteps] = useState(6);
  const [steps, setSteps] = useState(
    Array.from({length:6}, (_,i) => ({ step_number: String(i+1), power_w:"", hr_bpm:"", distance_m:"", stroke_rate:"", lactate:"", rpe:"" }))
  );
  const [maxStep, setMaxStep] = useState({ power_w:"", hr_bpm:"", distance_m:"", stroke_rate:"", lactate:"", rpe:"" });
  const [saving, setSaving] = useState(false);

  function updateNumSteps(n) {
    setNumSteps(n);
    setSteps(Array.from({length:n}, (_,i) => steps[i] || { step_number:String(i+1), power_w:"", hr_bpm:"", distance_m:"", stroke_rate:"", lactate:"", rpe:"" }));
  }

  function setStep(i, key, val) {
    setSteps(prev => prev.map((s,j) => j===i ? {...s,[key]:val} : s));
  }

  async function save() {
    if (!info.athlete_id || !info.test_date) { alert("Selecione atleta e data."); return; }
    if (!maxStep.hr_bpm) { alert("FC Máxima é obrigatória."); return; }
    setSaving(true);
    try {
      const testId = uid();
      const n = (v) => v === "" ? null : parseFloat(v);
      const ni = (v) => v === "" ? null : parseInt(v);

      const { error: e1 } = await supabase.from("step_tests").insert({
        id: testId,
        athlete_id: info.athlete_id,
        test_date: info.test_date,
        protocol: info.protocol,
        body_mass: n(info.body_mass),
        rest_hr: ni(info.rest_hr),
        temp: n(info.temp),
        max_hr: ni(maxStep.hr_bpm),
        max_power: n(maxStep.power_w),
        max_rel_power: info.body_mass && maxStep.power_w ? n(maxStep.power_w)/n(info.body_mass) : null,
        max_rel_power_corrg: null,
        max_distance: n(maxStep.distance_m),
        max_lactate: n(maxStep.lactate),
        notes: info.notes || null,
        created_by: "user",
      });
      if (e1) throw e1;

      const stepsToInsert = [
        ...steps.filter(s => s.power_w || s.hr_bpm).map(s => ({
          id: uid(), test_id: testId, step_number: s.step_number,
          power_w: n(s.power_w), rel_power: info.body_mass && s.power_w ? n(s.power_w)/n(info.body_mass) : null,
          hr_bpm: n(s.hr_bpm), distance_m: n(s.distance_m),
          stroke_rate: n(s.stroke_rate), lactate: n(s.lactate), rpe: ni(s.rpe),
        })),
        { id: uid(), test_id: testId, step_number: "Max",
          power_w: n(maxStep.power_w), rel_power: info.body_mass && maxStep.power_w ? n(maxStep.power_w)/n(info.body_mass) : null,
          hr_bpm: n(maxStep.hr_bpm), distance_m: n(maxStep.distance_m),
          stroke_rate: n(maxStep.stroke_rate), lactate: n(maxStep.lactate), rpe: ni(maxStep.rpe),
        }
      ];

      const { error: e2 } = await supabase.from("step_test_steps").insert(stepsToInsert);
      if (e2) throw e2;
      onSave();
    } catch(e) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  const stepCols = ["Potência (W)","FC (bpm)","Distância (m)","VOG","Lactato","RPE"];
  const stepKeys = ["power_w","hr_bpm","distance_m","stroke_rate","lactate","rpe"];

  return (
    <div>
      <style>{GS}</style>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <Btn variant="ghost" sz="sm" onClick={onCancel}>← Cancelar</Btn>
        <div style={{fontSize:20,fontWeight:800}}>Novo Step Test</div>
      </div>

      {/* Info geral */}
      <Card s={{marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:C.blueLt,letterSpacing:2,marginBottom:12}}>INFORMAÇÕES GERAIS</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
          {!athleteId && (
            <Field label="Atleta" span={2}>
              <select value={info.athlete_id} onChange={e=>setInfo(p=>({...p,athlete_id:e.target.value}))}>
                <option value="">Selecione...</option>
                {athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Data"><input type="date" value={info.test_date} onChange={e=>setInfo(p=>({...p,test_date:e.target.value}))}/></Field>
          <Field label="Protocolo">
            <select value={info.protocol} onChange={e=>setInfo(p=>({...p,protocol:e.target.value}))}>
              <option>StepTestSlide</option><option>StepTestCHAO</option><option>7 x 4 min</option>
            </select>
          </Field>
          <Field label="Peso (kg)"><input type="number" step="0.1" value={info.body_mass} onChange={e=>setInfo(p=>({...p,body_mass:e.target.value}))} placeholder="80.5"/></Field>
          <Field label="FC Repouso"><input type="number" value={info.rest_hr} onChange={e=>setInfo(p=>({...p,rest_hr:e.target.value}))} placeholder="52"/></Field>
          <Field label="Temp (°C)"><input type="number" step="0.1" value={info.temp} onChange={e=>setInfo(p=>({...p,temp:e.target.value}))} placeholder="22"/></Field>
          <Field label="Nº de Steps">
            <select value={numSteps} onChange={e=>updateNumSteps(parseInt(e.target.value))}>
              {[3,4,5,6,7].map(n=><option key={n} value={n}>{n} steps</option>)}
            </select>
          </Field>
        </div>
      </Card>

      {/* Steps */}
      <Card s={{marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:C.blueLt,letterSpacing:2,marginBottom:12}}>DADOS POR STEP</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
            <thead>
              <tr style={{background:C.surfHi}}>
                <th style={{padding:"8px 10px",fontSize:10,letterSpacing:1.5,color:C.blueLt,textAlign:"left"}}>STEP</th>
                {stepCols.map(c=><th key={c} style={{padding:"8px 10px",fontSize:10,letterSpacing:1.5,color:C.blueLt,textAlign:"left",whiteSpace:"nowrap"}}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {steps.map((s,i) => (
                <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"6px 10px"}}>
                    <span style={{background:C.blue,color:"#fff",fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:4}}>{s.step_number}</span>
                  </td>
                  {stepKeys.map(k=>(
                    <td key={k} style={{padding:"4px 6px"}}>
                      <input type="number" step={k==="lactate"?"0.1":"1"} value={s[k]} onChange={e=>setStep(i,k,e.target.value)} style={{width:80,padding:"5px 8px",fontSize:12}}/>
                    </td>
                  ))}
                </tr>
              ))}
              {/* Max row */}
              <tr style={{background:C.surfHi,borderTop:`2px solid ${C.bad}`}}>
                <td style={{padding:"6px 10px"}}>
                  <span style={{background:C.bad,color:"#fff",fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:4}}>MAX *</span>
                </td>
                {stepKeys.map(k=>(
                  <td key={k} style={{padding:"4px 6px"}}>
                    <input type="number" step={k==="lactate"?"0.1":"1"} value={maxStep[k]} onChange={e=>setMaxStep(p=>({...p,[k]:e.target.value}))} style={{width:80,padding:"5px 8px",fontSize:12,borderColor:k==="hr_bpm"?C.bad:C.border}}/>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{fontSize:11,color:C.muted,marginTop:8}}>* FC Máxima obrigatória para cálculo das zonas</div>
      </Card>

      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Btn>
        <Btn onClick={save} disabled={saving}>{saving?"Salvando...":"💾 Salvar Step Test"}</Btn>
      </div>
    </div>
  );
}

// ─── ATHLETE TESTS LIST ───────────────────────────────────────────────────
function AthleteTestList({ athlete, tests, allSteps, onNewTest, onSelectTest, isCoach }) {
  const threeYearsAgo = new Date(); threeYearsAgo.setFullYear(threeYearsAgo.getFullYear()-3);
  const recentTests = [...tests].filter(t=>t.max_rel_power_corrg && new Date(t.test_date)>=threeYearsAgo).sort((a,b)=>a.test_date.localeCompare(b.test_date));
  const evolVals = recentTests.map(t=>t.max_rel_power_corrg);
  const sortedTests = [...tests].sort((a,b)=>b.test_date.localeCompare(a.test_date));
  const latest = sortedTests[0];

  return (
    <div>
      {/* Header atleta */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:20,fontWeight:900}}>{athlete.name}</div>
          <div style={{fontSize:12,color:C.muted}}>{athlete.category} · {tests.length} teste{tests.length!==1?"s":""} registrado{tests.length!==1?"s":""}</div>
        </div>
        <Btn sz="sm" onClick={onNewTest}>+ Novo Step Test</Btn>
      </div>

      {/* Resumo último teste */}
      {latest && (
        <Card s={{marginBottom:14,borderTop:`2px solid ${C.blue}`}}>
          <div style={{fontSize:11,color:C.muted,letterSpacing:2,marginBottom:10}}>ÚLTIMO TESTE — {new Date(latest.test_date).toLocaleDateString("pt-BR")}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10,marginBottom:12}}>
            {[
              {l:"FC Máx",    v:`${latest.max_hr ?? "—"} bpm`,           c:C.bad},
              {l:"Potência",  v:`${fmt0(latest.max_power)} W`,            c:C.blueLt},
              {l:"Pot. Rel.", v:`${fmt1(latest.max_rel_power)} w.kg`,     c:C.blueLt},
              {l:"Pot. Corrg",v:`${fmt1(latest.max_rel_power_corrg)}`,    c:C.good},
              {l:"Distância", v:`${fmt0(latest.max_distance)} m`,         c:C.text},
            ].map(s=>(
              <div key={s.l}>
                <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:2}}>{s.l.toUpperCase()}</div>
                <div className="mono" style={{fontSize:16,fontWeight:700,color:s.c}}>{s.v}</div>
              </div>
            ))}
          </div>
          {evolVals.length >= 2 && (
            <div>
              <div style={{fontSize:9,color:C.muted,letterSpacing:2,marginBottom:4}}>EVOLUÇÃO POTÊNCIA CORRIGIDA (3 ANOS)</div>
              <Spark vals={evolVals} color={C.good} w={160} h={32}/>
            </div>
          )}
        </Card>
      )}

      {/* Lista de testes */}
      {tests.length === 0 ? (
        <Card>
          <div style={{textAlign:"center",color:C.muted,padding:"24px 0",fontSize:14}}>Nenhum step test registrado.</div>
        </Card>
      ) : (
        <Card>
          <div style={{fontSize:11,color:C.muted,letterSpacing:2,marginBottom:10}}>HISTÓRICO COMPLETO</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {sortedTests.map(t => {
              const steps = allSteps.filter(s=>s.test_id===t.id);
              const zones = calcZones(t.max_hr, t.rest_hr);
              return (
                <div key={t.id} onClick={()=>onSelectTest(t)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:C.surfHi,borderRadius:8,border:`1px solid ${C.border}`,cursor:"pointer",transition:"border-color .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=C.blue}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                  <div style={{minWidth:90}}>
                    <div className="mono" style={{fontSize:12,fontWeight:600}}>{new Date(t.test_date).toLocaleDateString("pt-BR")}</div>
                    <div style={{fontSize:10,color:C.muted}}>{t.protocol}</div>
                  </div>
                  <div style={{flex:1,display:"flex",gap:16,flexWrap:"wrap"}}>
                    <div><div style={{fontSize:9,color:C.muted}}>FC MÁX</div><div className="mono" style={{fontSize:13,color:C.bad}}>{t.max_hr ?? "—"}</div></div>
                    <div><div style={{fontSize:9,color:C.muted}}>POTÊNCIA</div><div className="mono" style={{fontSize:13}}>{fmt0(t.max_power)} W</div></div>
                    <div><div style={{fontSize:9,color:C.muted}}>POT. CORRG</div><div className="mono" style={{fontSize:13,color:C.good}}>{fmt1(t.max_rel_power_corrg)}</div></div>
                    <div><div style={{fontSize:9,color:C.muted}}>STEPS</div><div className="mono" style={{fontSize:13}}>{steps.filter(s=>s.step_number!=="Max").length}</div></div>
                  </div>
                  <div style={{color:C.muted,fontSize:18}}>›</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── MAIN MODULE ──────────────────────────────────────────────────────────
export default function StepTestModule({ session, athletes }) {
  const [tests,      setTests]      = useState([]);
  const [steps,      setSteps]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [view,       setView]       = useState("list");   // list | athlete | report | new
  const [selAthlete, setSelAthlete] = useState(null);
  const [selTest,    setSelTest]    = useState(null);
  const [filter,     setFilter]     = useState("");

  const isCoach = session?.role === "admin";
  const myAthleteId = session?.athleteId;

  async function load() {
    setLoading(true);
    const [{ data: ts }, { data: ss }] = await Promise.all([
      supabase.from("step_tests").select("*").order("test_date", { ascending: false }),
      supabase.from("step_test_steps").select("*"),
    ]);
    setTests(ts || []);
    setSteps(ss || []);
    setLastUpdate(new Date());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Atletas com acesso
  const visibleAthletes = useMemo(() => {
    if (isCoach) return athletes;
    return athletes.filter(a => a.id === myAthleteId);
  }, [athletes, isCoach, myAthleteId]);

  // Atleta selecionado ao carregar (atleta vê direto os próprios testes)
  useEffect(() => {
    if (!isCoach && myAthleteId && athletes.length > 0 && view === "list") {
      const a = athletes.find(x => x.id === myAthleteId);
      if (a) { setSelAthlete(a); setView("athlete"); }
    }
  }, [isCoach, myAthleteId, athletes]);

  const athleteTests = selAthlete ? tests.filter(t => t.athlete_id === selAthlete.id) : [];
  const sorted = [...athleteTests].sort((a,b) => a.test_date.localeCompare(b.test_date));
  const prevTest = selTest ? sorted[sorted.findIndex(t=>t.id===selTest.id)-1] : null;
  const prevSteps = prevTest ? steps.filter(s=>s.test_id===prevTest.id) : [];

  const filteredAthletes = useMemo(() => {
    if (!filter) return visibleAthletes;
    return visibleAthletes.filter(a => a.name.toLowerCase().includes(filter.toLowerCase()));
  }, [visibleAthletes, filter]);

  if (loading) return (
    <div style={{padding:40,textAlign:"center",color:C.muted}}>
      <style>{GS}</style>
      <div style={{fontSize:32,marginBottom:12}}>🔬</div>
      <div style={{letterSpacing:3,fontSize:13}}>CARREGANDO STEP TESTS...</div>
    </div>
  );

  // ── VIEW: NOVO TESTE ──
  if (view === "new") return (
    <NewTestForm
      athleteId={selAthlete?.id}
      athletes={athletes}
      onSave={async () => { await load(); setView("athlete"); }}
      onCancel={() => setView("athlete")}
    />
  );

  // ── VIEW: RELATÓRIO ──
  if (view === "report" && selTest) {
    const testSteps = steps.filter(s => s.test_id === selTest.id);
    return (
      <div>
        <style>{GS}</style>
        {/* Evolution chart above report */}
        {athleteTests.length >= 2 && (
          <Card s={{marginBottom:14}}>
            <EvolutionChart tests={athleteTests}/>
          </Card>
        )}
        <TestReport
          test={selTest}
          steps={testSteps}
          prevTest={prevTest}
          prevSteps={prevSteps}
          onBack={() => setView("athlete")}
        />
      </div>
    );
  }

  // ── VIEW: ATLETA ──
  if (view === "athlete" && selAthlete) return (
    <div>
      <style>{GS}</style>
      {isCoach && (
        <div style={{marginBottom:12}}>
          <Btn variant="ghost" sz="sm" onClick={()=>{setSelAthlete(null);setView("list");}}>← Lista de atletas</Btn>
        </div>
      )}
      <AthleteTestList
        athlete={selAthlete}
        tests={athleteTests}
        allSteps={steps}
        onNewTest={()=>setView("new")}
        onSelectTest={t=>{setSelTest(t);setView("report");}}
        isCoach={isCoach}
      />
    </div>
  );

  // ── VIEW: LISTA (coach only) ──
  return (
    <div>
      <style>{GS}</style>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:22,fontWeight:800}}>🔬 Step Tests</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {lastUpdate && <span style={{fontSize:11,color:C.muted}}>Atualizado: {lastUpdate.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>}
          <Btn variant="ghost" sz="sm" onClick={load}>↻ Atualizar</Btn>
        </div>
      </div>

      <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Buscar atleta..." style={{marginBottom:12,maxWidth:320}}/>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
        {filteredAthletes.map(a => {
          const atTests = tests.filter(t=>t.athlete_id===a.id).sort((x,y)=>y.test_date.localeCompare(x.test_date));
          const latest = atTests[0];
          const recentVals = [...atTests].filter(t=>t.max_rel_power_corrg).reverse().slice(-6).map(t=>t.max_rel_power_corrg);
          return (
            <div key={a.id} onClick={()=>{setSelAthlete(a);setView("athlete");}} style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:14,cursor:"pointer",transition:"border-color .15s",borderTop:`2px solid ${C.blue}`}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.blue}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.borderTopColor=C.blue;}}>
              <div style={{fontWeight:800,fontSize:15,marginBottom:2}}>{a.name.split(" ")[0]} {a.name.split(" ").slice(-1)}</div>
              <div style={{fontSize:10,color:C.muted,marginBottom:10}}>{a.category}</div>
              {latest ? (
                <>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                    <div>
                      <div style={{fontSize:9,color:C.muted,letterSpacing:1}}>ÚLTIMO TESTE</div>
                      <div className="mono" style={{fontSize:12}}>{new Date(latest.test_date).toLocaleDateString("pt-BR")}</div>
                      <div className="mono" style={{fontSize:18,fontWeight:700,color:C.good}}>{fmt1(latest.max_rel_power_corrg)}</div>
                      <div style={{fontSize:9,color:C.muted}}>w.kg corrigido</div>
                    </div>
                    {recentVals.length >= 2 && <Spark vals={recentVals} color={C.good} w={64} h={28}/>}
                  </div>
                  <div style={{fontSize:10,color:C.muted,marginTop:6}}>{atTests.length} teste{atTests.length!==1?"s":""}</div>
                </>
              ) : (
                <div style={{color:C.muted,fontSize:12,padding:"8px 0"}}>Sem testes registrados</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
