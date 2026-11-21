// Controller · menüler
const menuServisi = require('../servisler/menuServisi');

async function referanslar(req, res) {
  res.json(await menuServisi.referanslar());
}

async function gununMenusu(req, res) {
  const menu = await menuServisi.gununMenusu(req.oturum, req.query);
  if (!menu) return res.status(404).json({ hata: 'Bu yemekhane, tarih ve öğün için menü yok.' });
  res.json(menu);
}

async function haftalik(req, res) {
  res.json(await menuServisi.haftalikMenu(req.oturum, req.query));
}

module.exports = { referanslar, gununMenusu, haftalik };
