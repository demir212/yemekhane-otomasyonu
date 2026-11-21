// İş katmanı · rezervasyon yapma, iptal, listeleme
const rezervasyonVeri = require('../veri/rezervasyonVeri');
const tutarlilik = require('./tutarlilik');
const dogrula = require('./dogrula');

async function rezervasyonYap(oturum, govde) {
  const menuId = dogrula.id(govde.menu_id, 'Menü');
  // Kapasite, son saat, bakiye kontrolleri yordamın içindedir (kaynakta, kilitli)
  const sonuc = await rezervasyonVeri.rezervasyonYap(oturum.kullanici_id, menuId);
  await tutarlilik.yazmaYapildi(oturum.kullanici_id);
  // Dönen bakiye yordamdan, yani kaynaktan gelir: replika gecikmesinden etkilenmez
  return sonuc;
}

async function rezervasyonIptal(oturum, rezervasyonId) {
  const id = dogrula.id(rezervasyonId, 'Rezervasyon');
  const sonuc = await rezervasyonVeri.rezervasyonIptal(oturum.kullanici_id, id);
  await tutarlilik.yazmaYapildi(oturum.kullanici_id);
  return sonuc;
}

async function rezervasyonlarim(oturum) {
  const db = await tutarlilik.okumaHavuzu(oturum.kullanici_id);
  const liste = await rezervasyonVeri.kullaniciRezervasyonlari(db, oturum.kullanici_id);
  return liste.map((r) => ({ ...r, iptal_edilebilir: Boolean(r.iptal_edilebilir) }));
}

module.exports = { rezervasyonYap, rezervasyonIptal, rezervasyonlarim };
