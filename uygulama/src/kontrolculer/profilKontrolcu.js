// Controller · profil (alerjen seçimi)
const profilServisi = require('../servisler/profilServisi');

async function alerjenler(req, res) {
  res.json(await profilServisi.alerjenler(req.oturum));
}

async function alerjenleriKaydet(req, res) {
  res.json(await profilServisi.alerjenleriKaydet(req.oturum, req.body));
}

module.exports = { alerjenler, alerjenleriKaydet };
