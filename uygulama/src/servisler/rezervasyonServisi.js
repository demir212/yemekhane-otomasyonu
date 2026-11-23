// İş katmanı · rezervasyon yapma, iptal, listeleme
const { UygulamaHatasi } = require('../hatalar');
const rezervasyonVeri = require('../veri/rezervasyonVeri');
const tutarlilik = require('./tutarlilik');
const dogrula = require('./dogrula');

const PORSIYONLAR = ['tam', 'yarim'];

async function rezervasyonYap(oturum, govde) {
  const menuId = dogrula.id(govde.menu_id, 'Menü');
  // Aşama 4: porsiyon gönderilmezse tam porsiyon
  const porsiyon = govde.porsiyon ?? 'tam';
  if (!PORSIYONLAR.includes(porsiyon)) throw new UygulamaHatasi('Geçersiz porsiyon seçimi.');
  // Kapasite, son saat, bakiye ve "kahvaltıda yarım porsiyon yok" kontrolleri yordamın içindedir
  const sonuc = await rezervasyonVeri.rezervasyonYap(oturum.kullanici_id, menuId, porsiyon);
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
