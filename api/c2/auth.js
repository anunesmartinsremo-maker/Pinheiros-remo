// Inicia a conexão da conta Concept2 do atleta (OAuth)
// URL: /api/c2/auth?athlete=ID_DO_ATLETA

module.exports = (req, res) => {
  const athlete = req.query.athlete;
  if (!athlete) return res.status(400).send("Parâmetro 'athlete' é obrigatório.");
  if (!process.env.C2_CLIENT_ID) return res.status(500).send("C2_CLIENT_ID não configurado na Vercel.");

  const base = process.env.C2_BASE_URL || "https://log.concept2.com";
  const redirect = `https://${req.headers.host}/api/c2/callback`;

  const url =
    `${base}/oauth/authorize` +
    `?client_id=${encodeURIComponent(process.env.C2_CLIENT_ID)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent("user:read,results:read")}` +
    `&state=${encodeURIComponent(athlete)}` +
    `&redirect_uri=${encodeURIComponent(redirect)}`;

  res.redirect(302, url);
};
