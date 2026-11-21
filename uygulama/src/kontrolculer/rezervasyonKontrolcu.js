// Controller · rezervasyonlar
const rezervasyonServisi = require('../servisler/rezervasyonServisi');

async function listele(req, res) {
  res.json(await rezervasyonServisi.rezervasyonlarim(req.oturum));
}

async function olustur(req, res) {
  res.status(201).json(await rezervasyonServisi.rezervasyonYap(req.oturum, req.body));
}

async function iptal(req, res) {
  res.json(await rezervasyonServisi.rezervasyonIptal(req.oturum, req.params.id));
}

module.exports = { listele, olustur, iptal };
