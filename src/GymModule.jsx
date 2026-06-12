import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase.js";

// ─── CORES ECP ─────────────────────────────────────────────────────────────
const C = {
  bg:"#0a0c10", surf:"#111520", surfHi:"#192133", border:"#1e2d47",
  blue:"#1a4fa0", blueLt:"#2563c4", text:"#dce6f5", muted:"#4a6080",
  good:"#22c55e", warn:"#f59e0b", bad:"#ef4444",
};

// Tabela de projeção de 1RM (reps → % de 1RM). Âncoras do treinador: 8=80%, 10=75%.
const PCT = {1:1.00,2:0.95,3:0.93,4:0.90,5:0.87,6:0.85,7:0.83,8:0.80,9:0.77,10:0.75,11:0.72,12:0.70,13:0.69,14:0.67,15:0.65};
function projE1RM(load, reps) {
  if (!load || !reps) return null;
  const r = Math.min(Math.max(parseInt(reps),1),15);
  return load / (PCT[r] || 0.65);
}

// Alvos (x peso corporal) — da planilha do treinador
// [Sênior, Sub23/Sub21, Sub19]
const ALVOS = {
  Supino:      { m:[1.6,1.4,1.2], f:[1.3,1.2,1.0] },
  Remada:      { m:[1.6,1.4,1.2], f:[1.3,1.2,1.0] },
  Agachamento: { m:[1.9,1.7,1.4], f:[1.6,1.4,1.2] },
  Terra:       { m:[1.9,1.7,1.4], f:[1.6,1.4,1.2] },
};
function alvoFor(ath, grp) {
  const t = ALVOS[grp];
  if (!t || !ath) return null;
  const fem = String(ath.gender||"").toUpperCase().includes("FEM");
  const cat = String(ath.category||"").toUpperCase();
  const tier = cat.includes("SUB19") ? 2 : (cat.includes("SUB23")||cat.includes("SUB21")) ? 1 : 0;
  return (fem ? t.f : t.m)[tier];
}

const GRP_ORDER = ["Supino","Remada","Agachamento","Terra","Outros"];
const GRP_ICON = { Supino:"🏋️", Remada:"🚣", Agachamento:"🦵", Terra:"⚓", Outros:"💪" };

function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2); }
function slug(s) { return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
function todayISO() { return new Date().toISOString().slice(0,10); }
function fmtBR(d) { return d ? `${d.slice(8,10)}/${d.slice(5,7)}/${d.slice(2,4)}` : "—"; }
function firstName(n) { const w=String(n||"").trim().split(" "); return w.length>=2?`${w[0]} ${w[1]}`:w[0]; }

// ─── UI ATOMS ──────────────────────────────────────────────────────────────
function Card({ children, s }) { return <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:16,...s}}>{children}</div>; }
function Lbl({ children }) { return <div style={{fontSize:10,letterSpacing:2,color:C.blueLt,textTransform:"uppercase",marginBottom:5,fontWeight:600}}>{children}</div>; }
function Btn({ children, onClick, variant="primary", sz="md", disabled }) {
  const V = { primary:{background:C.blue,color:"#fff"}, outline:{background:"transparent",color:C.blueLt,border:`1.5px solid ${C.blueLt}`}, ghost:{background:C.surfHi,color:C.text}, danger:{background:C.bad,color:"#fff"} };
  const S = { sm:{padding:"5px 14px",fontSize:12}, md:{padding:"9px 20px",fontSize:14} };
  return <button onClick={onClick} disabled={disabled} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,whiteSpace:"nowrap",opacity:disabled?.5:1,letterSpacing:"0.5px",border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontWeight:700,...V[variant],...S[sz]}}>{children}</button>;
}

// ─── GRÁFICO DE EVOLUÇÃO (SVG) ────────────────────────────────────────────
function EvoChart({ points, color=C.blueLt }) {
  if (!points || points.length < 2) return <div style={{color:C.muted,fontSize:12,textAlign:"center",padding:"24px 0"}}>Poucos dados para o gráfico (mínimo 2 registros).</div>;
  const W=600, H=200, P=34;
  const vals = points.map(p=>p.val);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = (max-min)||1;
  const x = i => P + (i/(points.length-1))*(W-2*P);
  const y = v => H-P - ((v-min)/span)*(H-2*P);
  const path = points.map((p,i)=>`${i===0?"M":"L"}${x(i).toFixed(1)},${y(p.val).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}}>
      {[0,0.5,1].map(f=>{
        const v=min+span*f, yy=y(v);
        return <g key={f}>
          <line x1={P} y1={yy} x2={W-P} y2={yy} stroke={C.border} strokeWidth="1"/>
          <text x={P-6} y={yy+4} fill={C.muted} fontSize="11" textAnchor="end" fontFamily="monospace">{v.toFixed(0)}</text>
        </g>;
      })}
      <path d={path} fill="none" stroke={color} strokeWidth="2.5"/>
      {points.map((p,i)=>(
        <circle key={i} cx={x(i)} cy={y(p.val)} r="3.5" fill={color}/>
      ))}
      <text x={P} y={H-8} fill={C.muted} fontSize="11" fontFamily="monospace">{fmtBR(points[0].date)}</text>
      <text x={W-P} y={H-8} fill={C.muted} fontSize="11" textAnchor="end" fontFamily="monospace">{fmtBR(points[points.length-1].date)}</text>
    </svg>
  );
}

function EvoChartMulti({ points, exercises }) {
  // points: [{date, vals: {exerciseName: value}}]
  if (!points || points.length < 2) return <div style={{color:C.muted,fontSize:12,textAlign:"center",padding:"24px 0"}}>Poucos dados.</div>;
  
  const COLORS = ["#2563c4","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
  const W=600, H=200, P=34;
  
  // Encontrar min/max globais
  let globalMin = Infinity, globalMax = -Infinity;
  points.forEach(pt=>{
    Object.values(pt.vals).forEach(v=>{
      if (v) { globalMin = Math.min(globalMin, v); globalMax = Math.max(globalMax, v); }
    });
  });
  if (globalMin === Infinity) return <div style={{color:C.muted}}>Sem dados.</div>;
  
  const span = (globalMax - globalMin) || 1;
  const x = i => P + (i/(points.length-1))*(W-2*P);
  const y = v => H-P - ((v-globalMin)/span)*(H-2*P);
  
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}}>
      {[0,0.5,1].map(f=>{
        const v=globalMin+span*f, yy=y(v);
        return <g key={f}>
          <line x1={P} y1={yy} x2={W-P} y2={yy} stroke={C.border} strokeWidth="1"/>
          <text x={P-6} y={yy+4} fill={C.muted} fontSize="11" textAnchor="end" fontFamily="monospace">{v.toFixed(0)}</text>
        </g>;
      })}
      {exercises.map((ex, exIdx)=>{
        const path = points.filter(pt=>pt.vals[ex]!=null).map((p,i,arr)=>{
          const index = points.indexOf(p);
          return `${i===0?"M":"L"}${x(index).toFixed(1)},${y(p.vals[ex]).toFixed(1)}`;
        }).join(" ");
        const color = COLORS[exIdx % COLORS.length];
        return (
          <g key={ex}>
            {path&&<path d={path} fill="none" stroke={color} strokeWidth="2.5" opacity="0.8"/>}
            {points.filter(pt=>pt.vals[ex]!=null).map((p,i)=>{
              const index = points.indexOf(p);
              return <circle key={`${ex}-${i}`} cx={x(index)} cy={y(p.vals[ex])} r="2.5" fill={color}/>;
            })}
          </g>
        );
      })}
      <text x={P} y={H-8} fill={C.muted} fontSize="11" fontFamily="monospace">{fmtBR(points[0].date)}</text>
      <text x={W-P} y={H-8} fill={C.muted} fontSize="11" textAnchor="end" fontFamily="monospace">{fmtBR(points[points.length-1].date)}</text>
    </svg>
  );
}

// ─── FORMULÁRIO DE REGISTRO ───────────────────────────────────────────────
function GymForm({ athlete, exercises, records, onSaved }) {
  const lastBW = useMemo(()=>{
    const mine = records.filter(r=>r.athlete_id===athlete?.id && r.body_weight).sort((a,b)=>b.date.localeCompare(a.date));
    return mine[0]?.body_weight || "";
  },[records, athlete]);
  const [f,setF]=useState({ date:todayISO(), series:"3", reps:"8", interval:"", bw:"" });
  const [loads,setLoads]=useState({});
  const [saving,setSaving]=useState(false);
  useEffect(()=>{ setF(p=>({...p, bw: p.bw || String(lastBW||"") })); },[lastBW]);

  const active = exercises.filter(e=>e.active!==false);
  const byGrp = GRP_ORDER.map(g=>({ g, items: active.filter(e=>e.grp===g) })).filter(x=>x.items.length);

  async function save() {
    if (!athlete) { alert("Selecione o atleta."); return; }
    const filled = Object.entries(loads).filter(([,v])=>v!=="" && v!=null);
    if (!filled.length) { alert("Preencha a carga de pelo menos um exercício."); return; }
    const reps = parseInt(f.reps)||null;
    const bw = f.bw===""?null:parseFloat(String(f.bw).replace(",","."));
    setSaving(true);
    const rows = filled.map(([exId, v])=>{
      const ex = exercises.find(e=>e.id===exId);
      const load = parseFloat(String(v).replace(",","."));
      const e1 = projE1RM(load, reps);
      return {
        id: `gym-${athlete.id}-${f.date}-${slug(ex.name)}`,
        athlete_id: athlete.id, date: f.date,
        series: parseInt(f.series)||null, reps,
        interval_s: f.interval||null, body_weight: bw,
        exercise: ex.name, grp: ex.grp,
        load_kg: load, e1rm: e1!=null?parseFloat(e1.toFixed(1)):null,
      };
    });
    const { error } = await supabase.from("gym_records").upsert(rows);
    setSaving(false);
    if (error) { alert("Erro ao salvar: "+error.message); return; }
    alert(`✅ ${rows.length} exercício(s) registrado(s)!`);
    setLoads({});
    onSaved();
  }

  const inputStyle = {fontFamily:"'JetBrains Mono',monospace",fontSize:13,background:C.bg,border:`1.5px solid ${C.border}`,color:C.text,padding:"8px 10px",borderRadius:6,outline:"none",width:"100%"};

  return (
    <Card>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10,marginBottom:14}}>
        <div><Lbl>Data</Lbl><input type="date" value={f.date} onChange={e=>setF(p=>({...p,date:e.target.value}))} style={inputStyle}/></div>
        <div><Lbl>Séries</Lbl><input type="number" value={f.series} onChange={e=>setF(p=>({...p,series:e.target.value}))} style={inputStyle}/></div>
        <div><Lbl>Repetições</Lbl><input type="number" value={f.reps} onChange={e=>setF(p=>({...p,reps:e.target.value}))} style={inputStyle}/></div>
        <div><Lbl>Intervalo</Lbl><input value={f.interval} onChange={e=>setF(p=>({...p,interval:e.target.value}))} placeholder="ex: 2min" style={inputStyle}/></div>
        <div><Lbl>Peso Corporal (kg)</Lbl><input type="number" step="0.1" value={f.bw} onChange={e=>setF(p=>({...p,bw:e.target.value}))} style={inputStyle}/></div>
      </div>
      <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Preencha a carga (kg) apenas dos exercícios realizados. Registrar de novo na mesma data substitui o valor.</div>
      {byGrp.map(({g,items})=>(
        <div key={g} style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:800,color:C.blueLt,letterSpacing:2,marginBottom:8}}>{GRP_ICON[g]} {g.toUpperCase()}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}}>
            {items.map(ex=>(
              <div key={ex.id} style={{background:C.surfHi,borderRadius:8,padding:"8px 10px",border:`1px solid ${loads[ex.id]?C.blueLt:C.border}`}}>
                <div style={{fontSize:11,fontWeight:700,marginBottom:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ex.is_key&&"⭐ "}{ex.name}</div>
                <input type="number" step="0.5" placeholder="kg" value={loads[ex.id]||""}
                  onChange={e=>setLoads(p=>({...p,[ex.id]:e.target.value}))}
                  style={{...inputStyle,padding:"6px 8px"}}/>
              </div>
            ))}
          </div>
        </div>
      ))}
      <Btn onClick={save} disabled={saving}>{saving?"Salvando...":"💾 Salvar Registro"}</Btn>
    </Card>
  );
}

// ─── EVOLUÇÃO + RECORDES + ALVOS ──────────────────────────────────────────
function GymEvolution({ athlete, records, exercises }) {
  const mine = useMemo(()=>records.filter(r=>r.athlete_id===athlete?.id),[records,athlete]);
  const keyExs = exercises.filter(e=>e.is_key);
  const [selEx,setSelEx]=useState(keyExs.length>0?keyExs[0].name:"");

  const lastBW = useMemo(()=>{
    const w = mine.filter(r=>r.body_weight).sort((a,b)=>b.date.localeCompare(a.date));
    return w[0]?.body_weight || null;
  },[mine]);

  // Alvos por grupo (melhor 1RM projetado de exercício-chave nos últimos 365 dias)
  const cutoff = new Date(Date.now()-365*86400000).toISOString().slice(0,10);
  const alvoCards = ["Supino","Remada","Agachamento","Terra"].map(g=>{
    const keyNames = keyExs.filter(e=>e.grp===g).map(e=>e.name);
    const recent = mine.filter(r=>keyNames.includes(r.exercise)&&r.e1rm&&r.date>=cutoff);
    const best = recent.length?Math.max(...recent.map(r=>r.e1rm)):null;
    const alvo = alvoFor(athlete,g);
    const ratio = (best&&lastBW)?best/lastBW:null;
    const pct = (ratio&&alvo)?ratio/alvo*100:null;
    return { g, best, alvo, ratio, pct };
  });

  // Série temporal do exercício selecionado (melhor e1rm por data, últimos 12 meses)
  const points = useMemo(()=>{
    const byDate = {};
    mine.filter(r=>r.exercise===selEx&&r.e1rm&&r.date>=cutoff).forEach(r=>{
      if (!byDate[r.date]||r.e1rm>byDate[r.date]) byDate[r.date]=r.e1rm;
    });
    return Object.entries(byDate).map(([date,val])=>({date,val})).sort((a,b)=>a.date.localeCompare(b.date));
  },[mine,selEx,cutoff]);

  // Recordes (melhor e1rm de todos os tempos por exercício)
  const prs = useMemo(()=>{
    const best = {};
    mine.filter(r=>r.e1rm).forEach(r=>{
      if (!best[r.exercise]||r.e1rm>best[r.exercise].e1rm) best[r.exercise]=r;
    });
    const arr = Object.values(best);
    const isKey = n => keyExs.some(e=>e.name===n);
    return arr.sort((a,b)=>(isKey(b.exercise)-isKey(a.exercise))||b.e1rm-a.e1rm);
  },[mine,keyExs]);

  return (
    <div>
      {/* Alvos */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10,marginBottom:16}}>
        {alvoCards.map(({g,best,alvo,ratio,pct})=>(
          <Card key={g} s={{padding:12,borderTop:`2px solid ${pct==null?C.border:pct>=100?C.good:pct>=85?C.warn:C.bad}`}}>
            <Lbl>{GRP_ICON[g]} {g}</Lbl>
            {best==null?<div style={{color:C.muted,fontSize:12,padding:"6px 0"}}>Sem registro recente</div>:(
              <>
                <div style={{display:"flex",alignItems:"baseline",gap:6}}>
                  <span className="mono" style={{fontSize:22,fontWeight:800}}>{ratio?ratio.toFixed(2):"—"}<span style={{fontSize:12,color:C.muted}}>x peso</span></span>
                </div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>1RM proj.: <span className="mono" style={{color:C.text}}>{best.toFixed(0)} kg</span> · Alvo: <span className="mono" style={{color:C.blueLt}}>{alvo?alvo.toFixed(1):"—"}x</span></div>
                {pct!=null&&(
                  <div style={{marginTop:6}}>
                    <div style={{height:6,background:C.border,borderRadius:3,overflow:"hidden"}}>
                      <div style={{width:`${Math.min(pct,100)}%`,height:"100%",background:pct>=100?C.good:pct>=85?C.warn:C.bad}}/>
                    </div>
                    <div className="mono" style={{fontSize:11,marginTop:3,color:pct>=100?C.good:pct>=85?C.warn:C.bad,fontWeight:700}}>{pct.toFixed(0)}% do alvo</div>
                    <div style={{fontSize:9,color:C.muted,marginTop:2,lineHeight:1.4}}>Cálculo: (1RM ÷ peso corporal) ÷ alvo da categoria × 100.</div>
                  </div>
                )}
              </>
            )}
          </Card>
        ))}
      </div>

      {/* Evolução */}
      <Card s={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:10}}>
          <div style={{fontSize:14,fontWeight:800}}>📈 Evolução do 1RM Projetado (últimos 12 meses)</div>
          <select value={selEx} onChange={e=>setSelEx(e.target.value)}
            style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,background:C.bg,border:`1.5px solid ${C.border}`,color:C.text,padding:"6px 28px 6px 10px",borderRadius:6,outline:"none"}}>
            {keyExs.map(e=><option key={e.id} value={e.name}>⭐ {e.name}</option>)}
          </select>
        </div>
        <EvoChart points={points}/>
        <div style={{fontSize:10,color:C.muted,marginTop:6}}>1RM projetado pela tabela de repetições — permite comparar períodos com séries diferentes.</div>
      </Card>

      {/* Recordes */}
      <Card>
        <div style={{fontSize:14,fontWeight:800,marginBottom:10}}>🏆 Recordes Pessoais (1RM projetado)</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              {["Exercício","1RM Proj.","Carga × Reps","Data"].map(h=><th key={h} style={{background:C.surfHi,color:C.blueLt,fontSize:10,letterSpacing:2,textTransform:"uppercase",padding:"8px 10px",textAlign:"left"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {prs.length===0&&<tr><td colSpan={4} style={{textAlign:"center",color:C.muted,padding:24,fontSize:13}}>Sem registros ainda.</td></tr>}
              {prs.map(r=>{
                const isKey = exercises.some(e=>e.is_key&&e.name===r.exercise);
                return <tr key={r.exercise}>
                  <td style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}`,fontSize:13,fontWeight:isKey?800:400}}>{isKey&&"⭐ "}{r.exercise}</td>
                  <td className="mono" style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}`,fontSize:14,fontWeight:700,color:C.good}}>{r.e1rm.toFixed(0)} kg</td>
                  <td className="mono" style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}`,fontSize:12,color:C.muted}}>{Math.round(r.load_kg)} kg × {r.reps||"?"}</td>
                  <td className="mono" style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}`,fontSize:12,color:C.muted}}>{fmtBR(r.date)}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── RANKING DE FORÇA RELATIVA ────────────────────────────────────────────
function GymRanking({ athletes, records, exercises }) {
  const keyExs = exercises.filter(e=>e.is_key);
  const [selEx,setSelEx]=useState("Remada Deitada");
  const cutoff = new Date(Date.now()-90*86400000).toISOString().slice(0,10);
  const grp = exercises.find(e=>e.name===selEx)?.grp;

  const ranked = athletes.map(a=>{
    const mine = records.filter(r=>r.athlete_id===a.id);
    const recent = mine.filter(r=>r.exercise===selEx&&r.e1rm&&r.date>=cutoff);
    if (!recent.length) return null;
    const best = recent.reduce((m,r)=>r.e1rm>m.e1rm?r:m, recent[0]);
    const bwRec = mine.filter(r=>r.body_weight).sort((x,y)=>y.date.localeCompare(x.date))[0];
    const bw = bwRec?.body_weight||null;
    const ratio = bw?best.e1rm/bw:null;
    const alvo = alvoFor(a, grp);
    const pct = (ratio&&alvo)?ratio/alvo*100:null;
    return { a, best, bw, ratio, alvo, pct };
  }).filter(Boolean).sort((x,y)=>(y.pct??-1)-(x.pct??-1));

  const medals=["🥇","🥈","🥉"];
  return (
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:12}}>
        <div style={{fontSize:14,fontWeight:800}}>🏆 Ranking Força Relativa <span style={{fontSize:11,color:C.muted,fontWeight:400}}>(últimos 90 dias · % do alvo da categoria)</span></div>
        <select value={selEx} onChange={e=>setSelEx(e.target.value)}
          style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,background:C.bg,border:`1.5px solid ${C.border}`,color:C.text,padding:"6px 28px 6px 10px",borderRadius:6,outline:"none"}}>
          {keyExs.map(e=><option key={e.id} value={e.name}>⭐ {e.name}</option>)}
        </select>
      </div>
      {ranked.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:"center",padding:"20px 0"}}>Sem registros recentes deste exercício.</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {ranked.map((r,i)=>(
          <div key={r.a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:C.surfHi,borderRadius:8,border:`1px solid ${r.pct>=100?C.good:C.border}`}}>
            <div style={{fontSize:18,minWidth:28,textAlign:"center"}}>{medals[i]||<span style={{color:C.muted,fontSize:13}}>{i+1}</span>}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:13}}>{firstName(r.a.name)}</div>
              <div style={{fontSize:11,color:C.muted}}>
                1RM proj.: <span className="mono" style={{color:C.text}}>{r.best.e1rm.toFixed(0)} kg</span>
                {r.bw&&<> · <span className="mono">{r.ratio.toFixed(2)}x peso</span></>}
                {r.alvo&&<> · alvo: <span className="mono" style={{color:C.blueLt}}>{r.alvo.toFixed(1)}x</span></>}
              </div>
              {r.pct!=null&&(
                <div style={{height:6,background:C.border,borderRadius:3,overflow:"hidden",marginTop:5}}>
                  <div style={{width:`${Math.min(r.pct,100)}%`,height:"100%",background:r.pct>=100?C.good:r.pct>=85?C.warn:C.bad}}/>
                </div>
              )}
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              {r.pct!=null
                ? <div className="mono" style={{fontSize:20,fontWeight:700,color:r.pct>=100?C.good:r.pct>=85?C.warn:C.bad}}>{r.pct.toFixed(0)}%</div>
                : <div className="mono" style={{fontSize:14,color:C.muted}}>{r.best.e1rm.toFixed(0)} kg</div>}
              {r.pct>=100&&<div style={{fontSize:10,color:C.good,letterSpacing:1}}>✓ ALVO</div>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── HISTÓRICO (lista por data, com exclusão p/ treinador) ────────────────
function GymHistory({ athlete, records, isCoach, onChanged }) {
  const mine = records.filter(r=>r.athlete_id===athlete?.id).sort((a,b)=>b.date.localeCompare(a.date));
  const byDate = {};
  mine.forEach(r=>{ (byDate[r.date]=byDate[r.date]||[]).push(r); });
  const dates = Object.keys(byDate).sort((a,b)=>b.localeCompare(a)).slice(0,15);
  async function delDate(d) {
    if (!confirm(`Excluir todos os registros de ${fmtBR(d)}?`)) return;
    const ids = byDate[d].map(r=>r.id);
    const { error } = await supabase.from("gym_records").delete().in("id", ids);
    if (error) { alert("Erro: "+error.message); return; }
    onChanged();
  }
  if (!dates.length) return null;
  return (
    <Card s={{marginTop:16}}>
      <div style={{fontSize:14,fontWeight:800,marginBottom:10}}>📋 Últimas Sessões</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {dates.map(d=>{
          const rows = byDate[d];
          return (
            <div key={d} style={{background:C.surfHi,borderRadius:8,padding:"8px 12px",border:`1px solid ${C.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span className="mono" style={{fontSize:12,fontWeight:700,color:C.blueLt}}>{fmtBR(d)} <span style={{color:C.muted,fontWeight:400}}>· {rows[0].series||"?"}×{rows[0].reps||"?"}{rows[0].body_weight?` · ${rows[0].body_weight} kg`:""}</span></span>
                {isCoach&&<button onClick={()=>delDate(d)} style={{background:"transparent",color:C.bad,border:"none",fontSize:14,cursor:"pointer"}}>🗑</button>}
              </div>
              <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>
                {rows.map(r=><span key={r.id} style={{marginRight:10,whiteSpace:"nowrap"}}>{r.exercise}: <span className="mono" style={{color:C.text}}>{r.load_kg}kg</span></span>)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── CATÁLOGO DE EXERCÍCIOS (treinador) ───────────────────────────────────
function GymCatalog({ exercises, onChanged }) {
  const [nf,setNf]=useState({name:"",grp:"Outros",is_key:false});
  const inputStyle = {fontFamily:"'JetBrains Mono',monospace",fontSize:13,background:C.bg,border:`1.5px solid ${C.border}`,color:C.text,padding:"8px 10px",borderRadius:6,outline:"none",width:"100%"};
  async function add() {
    if (!nf.name.trim()) { alert("Digite o nome do exercício."); return; }
    const { error } = await supabase.from("gym_exercises").insert({ id:`ge-${slug(nf.name)}-${uid().slice(-4)}`, name:nf.name.trim(), grp:nf.grp, is_key:nf.is_key, active:true, sort:100 });
    if (error) { alert("Erro: "+error.message); return; }
    setNf({name:"",grp:"Outros",is_key:false}); onChanged();
  }
  async function toggle(ex) {
    await supabase.from("gym_exercises").update({ active: ex.active===false }).eq("id", ex.id);
    onChanged();
  }
  async function del(ex) {
    if (!confirm(`Remover "${ex.name}" do catálogo? (registros antigos são mantidos)`)) return;
    await supabase.from("gym_exercises").delete().eq("id", ex.id);
    onChanged();
  }
  return (
    <Card>
      <div style={{fontSize:14,fontWeight:800,marginBottom:4}}>⚙️ Exercícios do Período</div>
      <div style={{fontSize:11,color:C.muted,marginBottom:12}}>Desative os exercícios fora do período atual — eles somem do formulário, mas o histórico é mantido. ⭐ = exercício-chave (entra nos alvos e ranking).</div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr auto auto",gap:8,marginBottom:14,alignItems:"end"}}>
        <div><Lbl>Novo exercício</Lbl><input value={nf.name} onChange={e=>setNf(p=>({...p,name:e.target.value}))} placeholder="Nome" style={inputStyle}/></div>
        <div><Lbl>Grupo</Lbl><select value={nf.grp} onChange={e=>setNf(p=>({...p,grp:e.target.value}))} style={inputStyle}>{GRP_ORDER.map(g=><option key={g}>{g}</option>)}</select></div>
        <label style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:C.muted,paddingBottom:9,cursor:"pointer"}}><input type="checkbox" checked={nf.is_key} onChange={e=>setNf(p=>({...p,is_key:e.target.checked}))} style={{width:"auto"}}/>⭐</label>
        <Btn sz="sm" onClick={add}>+ Adicionar</Btn>
      </div>
      {GRP_ORDER.map(g=>{
        const items = exercises.filter(e=>e.grp===g);
        if (!items.length) return null;
        return (
          <div key={g} style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:800,color:C.blueLt,letterSpacing:2,marginBottom:6}}>{GRP_ICON[g]} {g.toUpperCase()}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {items.map(ex=>(
                <div key={ex.id} style={{display:"flex",alignItems:"center",gap:6,background:ex.active===false?C.bg:C.surfHi,border:`1px solid ${ex.active===false?C.border:C.blueLt}`,borderRadius:6,padding:"4px 8px",opacity:ex.active===false?.5:1}}>
                  <span style={{fontSize:12}}>{ex.is_key&&"⭐ "}{ex.name}</span>
                  <button onClick={()=>toggle(ex)} title={ex.active===false?"Ativar":"Desativar"} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:C.muted}}>{ex.active===false?"👁":"🚫"}</button>
                  <button onClick={()=>del(ex)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:C.bad}}>✕</button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

// ─── PENDÊNCIAS DE REGISTRO (treinador) ───────────────────────────────────
function GymPending({ athletes, records }) {
  const items = athletes.map(a=>{
    const mine = records.filter(r=>r.athlete_id===a.id);
    const last = mine.length ? mine.reduce((m,r)=>r.date>m?r.date:m, mine[0].date) : null;
    const days = last ? Math.floor((Date.now()-new Date(last+"T12:00:00").getTime())/86400000) : null;
    return { a, last, days };
  }).sort((x,y)=>(y.days??9999)-(x.days??9999));
  return (
    <Card s={{marginBottom:16,padding:12}}>
      <div style={{fontSize:11,fontWeight:800,color:C.blueLt,letterSpacing:2,marginBottom:8}}>⏰ DIAS SEM REGISTRAR MUSCULAÇÃO</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {items.map(({a,last,days})=>{
          const col = days==null?C.bad:days<=7?C.good:days<=13?C.warn:C.bad;
          return (
            <div key={a.id} style={{display:"flex",alignItems:"center",gap:6,background:C.surfHi,border:`1px solid ${col}`,borderRadius:6,padding:"4px 10px"}}>
              <span style={{fontSize:12,fontWeight:700}}>{firstName(a.name)}</span>
              <span className="mono" style={{fontSize:12,fontWeight:800,color:col}}>{days==null?"nunca":days===0?"hoje":`${days}d`}</span>
            </div>
          );
        })}
      </div>
      <div style={{fontSize:10,color:C.muted,marginTop:8}}>Verde ≤ 7 dias · Amarelo 8–13 · Vermelho 14+ ou sem registro. Use para cobrar quem está atrasado.</div>
    </Card>
  );
}

// ─── MÓDULO PRINCIPAL ─────────────────────────────────────────────────────
export default function GymModule({ session, athletes }) {
  const isCoach = session.role==="admin";
  const [records,setRecords]=useState([]);
  const [exercises,setExercises]=useState([]);
  const [loading,setLoading]=useState(true);
  const [selId,setSelId]=useState(isCoach ? (athletes[0]?.id||"") : session.athleteId);
  const [tab,setTab]=useState("evo");
  const athlete = athletes.find(a=>a.id===(isCoach?selId:session.athleteId));

  async function load() {
    const [{data:rec},{data:exs}] = await Promise.all([
      supabase.from("gym_records").select("*").order("date",{ascending:false}).limit(5000),
      supabase.from("gym_exercises").select("*").order("sort"),
    ]);
    setRecords(rec||[]);
    setExercises(exs||[]);
    setLoading(false);
  }
  useEffect(()=>{ load(); },[]);

  if (loading) return <div style={{color:C.muted,textAlign:"center",padding:40,letterSpacing:3,fontSize:13}}>CARREGANDO MUSCULAÇÃO...</div>;

  const TABS = [["evo","📈 Evolução"],["form","➕ Registrar"],["rank","🏆 Ranking"]];
  if (isCoach) TABS.push(["cat","⚙️ Exercícios"]);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:4,height:24,background:C.blue,borderRadius:2}}/>
          <div style={{fontSize:22,fontWeight:800}}>🏋️ Musculação</div>
        </div>
        {isCoach&&(
          <select value={selId} onChange={e=>setSelId(e.target.value)}
            style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,background:C.bg,border:`1.5px solid ${C.border}`,color:C.text,padding:"7px 28px 7px 10px",borderRadius:6,outline:"none",maxWidth:280}}>
            {athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
      </div>
      <div style={{display:"flex",gap:4,background:C.bg,borderRadius:8,padding:4,marginBottom:16,overflowX:"auto"}}>
        {TABS.map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,minWidth:90,padding:"8px 0",background:tab===k?C.blue:"transparent",color:tab===k?"#fff":C.muted,border:"none",borderRadius:6,fontWeight:700,fontSize:13,cursor:"pointer",letterSpacing:1,whiteSpace:"nowrap",fontFamily:"inherit"}}>{l}</button>
        ))}
      </div>
      {isCoach&&<GymPending athletes={athletes} records={records}/>}
      {tab==="evo"&&<><GymEvolution athlete={athlete} records={records} exercises={exercises}/><GymHistory athlete={athlete} records={records} isCoach={isCoach} onChanged={load}/></>}
      {tab==="form"&&<GymForm athlete={athlete} exercises={exercises} records={records} onSaved={load}/>}
      {tab==="rank"&&<GymRanking athletes={athletes} records={records} exercises={exercises}/>}
      {tab==="cat"&&isCoach&&<GymCatalog exercises={exercises} onChanged={load}/>}
    </div>
  );
}
