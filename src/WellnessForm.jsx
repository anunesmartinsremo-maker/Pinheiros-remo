import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";

// ─── CORES ECP ─────────────────────────────────────────────────────────────
const C = {
  bg:"#070b12", surf:"#0d1421", surfHi:"#131e30",
  border:"#1a2840", blue:"#1a4fa0", blueLt:"#3b82f6",
  text:"#e2eaf5", muted:"#4a6080",
  good:"#22c55e", warn:"#f59e0b", bad:"#ef4444",
};

const GS = `
  .mono{font-family:'JetBrains Mono',monospace;}
`;

// Escala 1–5: 5 é sempre o MELHOR estado (mantém a lógica do score do painel)
const QUESTIONS = [
  { key:"sleep_quality", icon:"😴", label:"Qualidade do Sono",
    hints:{1:"Péssima",2:"Ruim",3:"Regular",4:"Boa",5:"Excelente"} },
  { key:"fatigue", icon:"🔋", label:"Fadiga",
    hints:{1:"Exausto",2:"Muito cansado",3:"Cansado",4:"Pouco cansado",5:"Descansado"} },
  { key:"soreness", icon:"💪", label:"Dor Muscular",
    hints:{1:"Dor intensa",2:"Dor forte",3:"Dor moderada",4:"Dor leve",5:"Sem dor"} },
  { key:"motivation", icon:"🔥", label:"Motivação",
    hints:{1:"Nenhuma",2:"Baixa",3:"Média",4:"Alta",5:"Máxima"} },
];

function todayISO() { return new Date().toISOString().slice(0,10); }
function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

function ScaleRow({ q, value, onChange }) {
  return (
    <div style={{marginBottom:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:14,fontWeight:700}}>{q.icon} {q.label}</div>
        <div style={{fontSize:12,color:value?C.blueLt:C.muted,fontWeight:600}}>
          {value ? q.hints[value] : "Selecione"}
        </div>
      </div>
      <div style={{display:"flex",gap:6}}>
        {[1,2,3,4,5].map(n=>(
          <button key={n} onClick={()=>onChange(n)}
            style={{flex:1,padding:"12px 0",borderRadius:8,fontSize:16,fontWeight:800,
              background:value===n?C.blue:C.surfHi,color:value===n?"#fff":C.muted,
              border:`1.5px solid ${value===n?C.blueLt:C.border}`,cursor:"pointer",transition:"all .15s"}}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function WellnessForm({ session, athletes }) {
  const athleteId = session?.athleteId;
  const athlete = athletes.find(a=>a.id===athleteId);
  const [vals, setVals] = useState({ sleep_quality:null, fatigue:null, soreness:null, motivation:null });
  const [hrv, setHrv] = useState("");
  const [restHr, setRestHr] = useState("");
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [alreadyToday, setAlreadyToday] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const date = todayISO();

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("wellness_responses")
      .select("*").eq("athlete_id", athleteId)
      .order("date",{ascending:false}).limit(8);
    const rows = data || [];
    setHistory(rows);
    const today = rows.find(r=>r.date===date);
    if (today) {
      setAlreadyToday(true);
      setVals({ sleep_quality:today.sleep_quality, fatigue:today.fatigue, soreness:today.soreness, motivation:today.motivation });
      setHrv(today.hrv ?? "");
      setRestHr(today.rest_hr ?? "");
      setComments(today.comments ?? "");
    }
    setLoading(false);
  }
  useEffect(()=>{ if (athleteId) load(); },[athleteId]);

  const filled = QUESTIONS.every(q=>vals[q.key]!=null);
  const score = filled
    ? (QUESTIONS.reduce((s,q)=>s+vals[q.key],0)/QUESTIONS.length)
    : null;

  async function save() {
    if (!filled) { alert("Responda as 4 perguntas antes de enviar."); return; }
    const hrvN = hrv===""?null:parseInt(hrv);
    const fcN  = restHr===""?null:parseInt(restHr);
    if (hrvN!=null&&(hrvN<5||hrvN>300)) { alert("HRV fora do intervalo válido (5–300 ms)."); return; }
    if (fcN!=null&&(fcN<25||fcN>120)) { alert("FC de repouso fora do intervalo válido (25–120 bpm)."); return; }
    setSaving(true);
    const row = {
      id: `${athleteId}-${date}`,
      athlete_id: athleteId,
      date,
      time: nowTime(),
      sleep_quality: vals.sleep_quality,
      fatigue: vals.fatigue,
      soreness: vals.soreness,
      motivation: vals.motivation,
      score: parseFloat(score.toFixed(2)),
      hrv: hrvN,
      rest_hr: fcN,
      comments: comments.trim() || null,
    };
    const { error } = await supabase.from("wellness_responses").upsert(row);
    setSaving(false);
    if (error) { alert("Erro ao salvar: "+error.message); return; }
    setSaved(true);
    setAlreadyToday(true);
    load();
    setTimeout(()=>setSaved(false), 3000);
  }

  if (loading) return (
    <div style={{padding:40,textAlign:"center",color:C.muted}}>
      <style>{GS}</style>
      <div style={{fontSize:32,marginBottom:12}}>💚</div>
      <div style={{letterSpacing:3,fontSize:13}}>CARREGANDO...</div>
    </div>
  );

  return (
    <div>
      <style>{GS}</style>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:800}}>💚 Bem-Estar Diário</div>
        <div style={{fontSize:12,color:C.muted}}>
          {new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})} · {athlete?.name}
        </div>
      </div>

      {alreadyToday&&!saved&&(
        <div style={{background:"rgba(34,197,94,.1)",border:`1px solid ${C.good}`,borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.good,fontWeight:700}}>
          ✅ Você já respondeu hoje. Pode editar e reenviar se precisar corrigir algo.
        </div>
      )}

      <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:16,marginBottom:14}}>
        <div style={{fontSize:11,color:C.muted,letterSpacing:2,marginBottom:14}}>COMO VOCÊ ESTÁ HOJE? (1 = pior · 5 = melhor)</div>
        {QUESTIONS.map(q=>(
          <ScaleRow key={q.key} q={q} value={vals[q.key]} onChange={v=>setVals(p=>({...p,[q.key]:v}))}/>
        ))}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div>
            <div style={{fontSize:10,letterSpacing:2,color:C.blueLt,textTransform:"uppercase",marginBottom:5,fontWeight:600}}>📊 HRV (ms) — opcional</div>
            <input type="number" value={hrv} onChange={e=>setHrv(e.target.value)} placeholder="ex: 65"
              style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,background:C.bg,border:`1.5px solid ${C.border}`,color:C.text,padding:"9px 12px",borderRadius:6,outline:"none",width:"100%"}}/>
          </div>
          <div>
            <div style={{fontSize:10,letterSpacing:2,color:C.blueLt,textTransform:"uppercase",marginBottom:5,fontWeight:600}}>❤️ FC Repouso (bpm) — opcional</div>
            <input type="number" value={restHr} onChange={e=>setRestHr(e.target.value)} placeholder="ex: 52"
              style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,background:C.bg,border:`1.5px solid ${C.border}`,color:C.text,padding:"9px 12px",borderRadius:6,outline:"none",width:"100%"}}/>
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <div style={{fontSize:10,letterSpacing:2,color:C.blueLt,textTransform:"uppercase",marginBottom:5,fontWeight:600}}>💬 Como você se sente? — opcional</div>
          <input value={comments} onChange={e=>setComments(e.target.value)} placeholder="Observações sobre seu estado geral..."
            style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,background:C.bg,border:`1.5px solid ${C.border}`,color:C.text,padding:"9px 12px",borderRadius:6,outline:"none",width:"100%"}}/>
        </div>

        {score!=null&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.surfHi,borderRadius:8,padding:"10px 14px",marginBottom:14}}>
            <span style={{fontSize:12,color:C.muted,letterSpacing:1}}>SEU SCORE DE HOJE</span>
            <span className="mono" style={{fontSize:24,fontWeight:800,color:score>=3.5?C.good:score>=2.8?C.warn:C.bad}}>{score.toFixed(2)}</span>
          </div>
        )}

        <button onClick={save} disabled={saving||!filled}
          style={{width:"100%",padding:"14px 0",background:saved?C.good:C.blue,color:"#fff",border:"none",borderRadius:8,fontWeight:800,fontSize:15,letterSpacing:1,cursor:"pointer",opacity:(saving||!filled)?.6:1,fontFamily:"inherit",transition:"all .2s"}}>
          {saving?"ENVIANDO...":saved?"✅ ENVIADO!":alreadyToday?"💾 ATUALIZAR RESPOSTA":"💾 ENVIAR"}
        </button>
      </div>

      {history.length>0&&(
        <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:16}}>
          <div style={{fontSize:11,color:C.muted,letterSpacing:2,marginBottom:10}}>SEUS ÚLTIMOS REGISTROS</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {history.map(h=>(
              <div key={h.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:C.surfHi,borderRadius:8,border:`1px solid ${C.border}`}}>
                <span className="mono" style={{fontSize:12,color:C.muted}}>{h.date?.slice(8,10)}/{h.date?.slice(5,7)}</span>
                <span style={{fontSize:11,color:C.muted}}>
                  😴{h.sleep_quality} 🔋{h.fatigue} 💪{h.soreness} 🔥{h.motivation}
                  {h.hrv?` · 📊${h.hrv}`:""}{h.rest_hr?` · ❤️${h.rest_hr}`:""}
                </span>
                <span className="mono" style={{fontSize:15,fontWeight:700,color:(h.score>=3.5)?C.good:(h.score>=2.8)?C.warn:C.bad}}>{h.score?.toFixed?h.score.toFixed(2):h.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
