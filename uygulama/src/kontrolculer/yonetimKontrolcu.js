// Controller · yönetici paneli
const yonetimServisi = require('../servisler/yonetimServisi');

async function menuRaporu(req, res) {
  res.json(await yonetimServisi.menuRaporu(req.oturum, req.query));
}

async function yemekler(req, res) {
  res.json(await yonetimServisi.yemekler(req.oturum));
}

async function menuGetir(req, res) {
  res.json(await yonetimServisi.menuGetir(req.oturum, req.params.id));
}

async function menuOlustur(req, res) {
  res.status(201).json(await yonetimServisi.menuOlustur(req.oturum, req.body));
}

async function menuGuncelle(req, res) {
  res.json(await yonetimServisi.menuGuncelle(req.oturum, req.params.id, req.body));
}

module.exports = { menuRaporu, yemekler, menuGetir, menuOlustur, menuGuncelle };
