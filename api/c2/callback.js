// Recebe a autorização do Concept2, troca o código por tokens e guarda no banco
// O Concept2 redireciona para cá automaticamente após o atleta autorizar

const { createClient } = require("@supabase/supabase-js");

module.exports = async (req, res) => {
  const base = process.env.C2_BASE_URL || "https://log.concept2.com";
  try {
    const { code, state } = req.query;
    if (!code || !state) return res.redirect(302, "/?c2=erro");

    const redirect = `https://${req.headers.host}/api/c2/callback`;
    const body = new URLSearchParams({
      client_id: process.env.C2_CLIENT_ID,
      client_secret: process.env.C2_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirect,
    });

    const r = await fetch(`${base}/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!r.ok) return res.redirect(302, "/?c2=erro");
    const tok = await r.json();

    // Identifica o usuário Concept2 (informativo)
    let c2UserId = null;
    try {
      const u = await fetch(`${base}/api/users/me`, {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      });
      if (u.ok) {
        const uj = await u.json();
        c2UserId = String(uj.data?.id ?? "");
      }
    } catch (_) {}

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

    const { error: e1 } = await supabase.from("c2_tokens").upsert({
      athlete_id: state,
      c2_user_id: c2UserId,
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      expires_at: new Date(Date.now() + (tok.expires_in || 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (e1) return res.redirect(302, "/?c2=erro");

    await supabase.from("athletes").update({ c2_connected: true }).eq("id", state);

    res.redirect(302, "/?c2=ok");
  } catch (e) {
    res.redirect(302, "/?c2=erro");
  }
};
