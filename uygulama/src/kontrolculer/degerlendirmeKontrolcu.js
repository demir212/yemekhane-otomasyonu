// Controller · değerlendirmeler
const degerlendirmeServisi = require('../servisler/degerlendirmeServisi');

async function listele(req, res) {
  res.json(await degerlendirmeServisi.listele(req.oturum));
}

async function kaydet(req, res) {
  await degerlendirmeServisi.kaydet(req.oturum, req.body);
  res.json({ tamam: true });
}

module.exports = { listele, kaydet };
