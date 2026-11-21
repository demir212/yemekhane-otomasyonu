// İş katmanı · bakiye ve bakiye yükleme
const bakiyeVeri = require('../veri/bakiyeVeri');
const tutarlilik = require('./tutarlilik');
const dogrula = require('./dogrula');

async function ozet(oturum) {
  const db = await tutarlilik.okumaHavuzu(oturum.kullanici_id);
  const [bakiye, hareketler] = await Promise.all([
    bakiyeVeri.bakiye(db, oturum.kullanici_id),
    bakiyeVeri.hareketler(db, oturum.kullanici_id),
  ]);
  return { bakiye, hareketler };
}

async function yukle(oturum, govde) {
  // 10–1000 TL sınırı yordamda kontrol edilir; mesajı olduğu gibi arayüze gider
  const tutar = dogrula.tutar(govde.tutar);
  const sonuc = await bakiyeVeri.bakiyeYukle(oturum.kullanici_id, tutar);
  await tutarlilik.yazmaYapildi(oturum.kullanici_id);
  return sonuc;
}

module.exports = { ozet, yukle };
