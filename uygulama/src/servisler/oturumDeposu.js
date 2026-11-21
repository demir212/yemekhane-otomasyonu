// Oturum deposu (Aşama 2: bellek içi)
// Not: Uygulama container'ı yeniden başlarsa oturumlar kaybolur; Aşama 3'te Redis'e taşınır.
const ayar = require('../ayarlar');

const oturumlar = new Map(); // token -> { veri, bitis }

async function kaydet(token, veri) {
  oturumlar.set(token, { veri, bitis: Date.now() + ayar.oturumSuresi * 1000 });
}

// Oturumu getirir ve süresini yeniden başlatır (her istekte 30 dakika)
async function getir(token) {
  const kayit = oturumlar.get(token);
  if (!kayit) return null;
  if (kayit.bitis < Date.now()) {
    oturumlar.delete(token);
    return null;
  }
  kayit.bitis = Date.now() + ayar.oturumSuresi * 1000;
  return kayit.veri;
}

async function sil(token) {
  oturumlar.delete(token);
}

module.exports = { kaydet, getir, sil };
