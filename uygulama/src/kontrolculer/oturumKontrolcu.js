// Controller · giriş, çıkış, profil
const oturumServisi = require('../servisler/oturumServisi');
const { CEREZ_ADI, tokenAl } = require('../ara/oturumKontrol');

async function giris(req, res) {
  const { token, oturum } = await oturumServisi.girisYap(req.body.eposta, req.body.sifre);
  // HttpOnly: JavaScript okuyamaz. SameSite=Strict: başka siteden gelen istekte gönderilmez.
  res.setHeader('Set-Cookie', `${CEREZ_ADI}=${token}; Path=/; HttpOnly; SameSite=Strict`);
  res.json(oturum);
}

async function cikis(req, res) {
  const token = tokenAl(req);
  if (token) await oturumServisi.cikisYap(token);
  res.setHeader('Set-Cookie', `${CEREZ_ADI}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
  res.json({ tamam: true });
}

async function ben(req, res) {
  res.json(await oturumServisi.profil(req.oturum));
}

module.exports = { giris, cikis, ben };
