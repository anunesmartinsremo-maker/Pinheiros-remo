// Sincroniza treinos do Concept2 Logbook → tabela trainings
// /api/c2/sync            → sincroniza todos os atletas conectados (usado pelo cron diário)
// /api/c2/sync?athlete=ID → sincroniza um atleta específico (botão no site)
//
// Cada treino importado recebe id "c2-<id do Concept2>", então rodar
// quantas vezes quiser NUNCA duplica. Registros manuais não são afetados.

const { createClient } = require("@supabase/supabase-js");

const BASE = () => process.env.C2_BASE_URL || "https://log.concept2.com";

// Mesmas zonas do Step Test (Karvonen)
const ZONES = [
  { key: "B1", lo: 0.60, hi: 0.75 },
  { key: "B2", lo: 0.75, hi: 0.85 },
  { key: "B3", lo: 0.85, hi: 0.93 },
  { key: "B4", lo: 0.90, hi: 0.95 },
  { key: "B5", lo: 0.92, hi: 1.00 },
];
function calcZones(maxHR, restHR) {
  const rest = restHR || 0, reserve = maxHR - rest;
  return ZONES.map(z => ({ key: z.key, lo: Math.round(rest + reserve * z.lo), hi: Math.round(rest + reserve * z.hi) }));
}
function classify(fc, zones) {
  if (!fc || !zones) return null;
  if (fc < zones[0].lo) return "B1";
  for (const z of zones) if (fc >= z.lo && fc <= z.hi) return z.key;
  return "B5";
}
function fmtTimeRowed(sec) {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return `${m}:${s.padStart(4, "0").replace(".", ",")}`;
}

async function refreshIfNeeded(supabase, tok) {
  const exp = tok.expires_at ? new Date(tok.expires_at).getTime() : 0;
  if (exp - Date.now() > 120000) return tok.access_token;
  const body = new URLSearchParams({
    client_id: process.env.C2_CLIENT_ID,
    client_secret: process.env.C2_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: tok.refresh_token,
    scope: "user:read,results:read",
  });
  const r = await fetch(`${BASE()}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`Token expirado e renovação falhou (${r.status}). Atleta precisa reconectar.`);
  const j = await r.json();
  await supabase.from("c2_tokens").update({
    access_token: j.access_token,
    refresh_token: j.refresh_token || tok.refresh_token,
    expires_at: new Date(Date.now() + (j.expires_in || 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("athlete_id", tok.athlete_id);
  return j.access_token;
}

module.exports = async (req, res) => {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

    let q = supabase.from("c2_tokens").select("*");
    if (req.query.athlete) q = q.eq("athlete_id", req.query.athlete);
    const { data: toks, error: eTok } = await q;
    if (eTok) throw eTok;
    if (!toks || !toks.length) {
      return res.status(200).json({ imported: 0, detail: "Nenhuma conta Concept2 conectada." });
    }

    const [{ data: athletes }, { data: bts }, { data: stepTests }] = await Promise.all([
      supabase.from("athletes").select("id,category"),
      supabase.from("best_times").select("label,speed_ms"),
      supabase.from("step_tests").select("athlete_id,test_date,max_hr,rest_hr").order("test_date", { ascending: false }),
    ]);

    // Janela: últimos 60 dias (ids determinísticos ⇒ sem duplicação)
    const from = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    let imported = 0;
    const problems = [];

    for (const tok of toks) {
      let access;
      try { access = await refreshIfNeeded(supabase, tok); }
      catch (e) { problems.push(`${tok.athlete_id}: ${e.message}`); continue; }

      const ath = (athletes || []).find(a => a.id === tok.athlete_id);
      const bt = ath ? (bts || []).find(b => b.label === `ERG ${ath.category}`) : null;
      const st = (stepTests || []).find(s => s.athlete_id === tok.athlete_id && s.max_hr);
      const zones = st ? calcZones(st.max_hr, st.rest_hr) : null;

      // Ids já importados deste atleta (para inserir só o que é novo)
      const { data: existing } = await supabase.from("trainings")
        .select("id").eq("athlete_id", tok.athlete_id).like("id", "c2-%");
      const have = new Set((existing || []).map(x => x.id));

      const rows = [];
      let page = 1, pages = 1;
      while (page <= pages && page <= 10) {
        const r = await fetch(`${BASE()}/api/users/me/results?from=${from}&page=${page}`, {
          headers: { Authorization: `Bearer ${access}` },
        });
        if (!r.ok) { problems.push(`${tok.athlete_id}: erro ${r.status} ao buscar resultados`); break; }
        const j = await r.json();
        pages = (j.meta && j.meta.pagination && j.meta.pagination.total_pages) || 1;

        (j.data || []).forEach(w => {
          // Só remo (ergômetro estático, dynamic ou slides) — ignora BikeErg/SkiErg
          if (!["rower", "dynamic", "slides"].includes(w.type)) return;
          if (!w.distance || !w.time) return;
          const id = `c2-${w.id}`;
          if (have.has(id)) return;

          const sec = w.time / 10;            // Concept2 envia tempo em décimos
          const dist = w.distance;
          const speed = dist / sec;
          const perc = bt ? (speed / bt.speed_ms) * 100 : null;
          const fcA = (w.heart_rate && w.heart_rate.average) || null;
          const fcM = (w.heart_rate && w.heart_rate.max) || null;
          const watts = Math.round(2.8 / Math.pow(sec / dist, 3));

          rows.push({
            id,
            athlete_id: tok.athlete_id,
            date: String(w.date).slice(0, 10),
            time: String(w.date).slice(11, 16),
            activity: "REMO ERGÔMETRO",
            training_type: classify(fcA, zones) || "B1",
            series: "1",
            boat_class: "1x",
            boat_label: "ERG",
            distance: String(dist),
            time_rowed: fmtTimeRowed(sec),
            time_seconds: sec,
            speed_ms: speed,
            spm: w.stroke_rate ? String(w.stroke_rate) : "",
            watts: isFinite(watts) ? String(watts) : "",
            fc_avg: fcA,
            fc_max: fcM,
            wind: "N/A",
            notes: "Importado do Concept2",
            perc_bt: perc,
            bt_label: bt ? `ERG ${ath.category}` : "",
            bt_speed: bt ? bt.speed_ms : null,
          });
        });
        page++;
      }

      if (rows.length) {
        const { error: eIns } = await supabase.from("trainings").insert(rows);
        if (eIns) problems.push(`${tok.athlete_id}: ${eIns.message}`);
        else imported += rows.length;
      }
    }

    res.status(200).json({ imported, problems: problems.length ? problems : undefined });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
