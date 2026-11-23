// İş katmanı · profil: kullanıcının alerjen seçimi (Aşama 4)
const { UygulamaHatasi } = require('../hatalar');
const profilVeri = require('../veri/profilVeri');
const tutarlilik = require('./tutarlilik');

// Tüm alerjenler, kullanıcının seçtikleri işaretli: [{id, ad, secili}]
async function alerjenler(oturum) {
  const db = await tutarlilik.okumaHavuzu(oturum.kullanici_id);
  const [tumu, secilen] = await Promise.all([
    profilVeri.tumAlerjenler(db),
    profilVeri.kullaniciAlerjenleri(db, oturum.kullanici_id),
  ]);
  const seciliIdler = new Set(secilen.map((a) => a.id));
  return tumu.map((a) => ({ ...a, secili: seciliIdler.has(a.id) }));
}

async function alerjenleriKaydet(oturum, govde) {
  if (!Array.isArray(govde.alerjen_idler)) throw new UygulamaHatasi('Alerjen listesi gönderilmedi.');
  const idler = [...new Set(govde.alerjen_idler.map(Number))];
  if (!idler.every((i) => Number.isInteger(i) && i > 0)) throw new UygulamaHatasi('Geçersiz alerjen seçimi.');
  try {
    await profilVeri.alerjenleriKaydet(oturum.kullanici_id, idler);
  } catch (hata) {
    if (hata.errno === 1452) throw new UygulamaHatasi('Geçersiz alerjen seçimi.');
    throw hata;
  }
  // Kaydettikten hemen sonra menüdeki uyarılar kaynaktan okunur (replika gecikmesine karşı)
  await tutarlilik.yazmaYapildi(oturum.kullanici_id);
  return alerjenler(oturum);
}

// Menü uyarısı için kullanıcının alerjenleri: Map(id -> ad)
async function kullaniciAlerjenHaritasi(oturum) {
  const db = await tutarlilik.okumaHavuzu(oturum.kullanici_id);
  const liste = await profilVeri.kullaniciAlerjenleri(db, oturum.kullanici_id);
  return new Map(liste.map((a) => [a.id, a.ad]));
}

module.exports = { alerjenler, alerjenleriKaydet, kullaniciAlerjenHaritasi };
