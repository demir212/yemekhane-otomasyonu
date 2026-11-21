// Gelen istek verisinin biçim kontrolleri
const { UygulamaHatasi } = require('../hatalar');

function id(deger, alan = 'Kayıt') {
  const sayi = Number(deger);
  if (!Number.isInteger(sayi) || sayi <= 0) throw new UygulamaHatasi(`${alan} numarası geçersiz.`);
  return sayi;
}

function tarih(deger) {
  if (typeof deger !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(deger) || Number.isNaN(Date.parse(deger))) {
    throw new UygulamaHatasi('Tarih YYYY-AA-GG biçiminde olmalıdır.');
  }
  return deger;
}

function tutar(deger, alan = 'Tutar') {
  const sayi = Number(deger);
  if (deger === '' || deger === null || deger === undefined || !Number.isFinite(sayi)) {
    throw new UygulamaHatasi(`${alan} geçerli bir sayı olmalıdır.`);
  }
  return Math.round(sayi * 100) / 100;
}

// YYYY-AA-GG tarihine gün ekler
function gunEkle(tarihMetni, gun) {
  const t = new Date(`${tarihMetni}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + gun);
  return t.toISOString().slice(0, 10);
}

module.exports = { id, tarih, tutar, gunEkle };
