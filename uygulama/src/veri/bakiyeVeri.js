// Veri katmanı · bakiye ve bakiye hareketleri
const { yordamCagir } = require('./baglanti');

function bakiyeYukle(kullaniciId, tutar) {
  return yordamCagir('CALL sp_bakiye_yukle(?, ?)', [kullaniciId, tutar]);
}

async function bakiye(db, kullaniciId) {
  const [satirlar] = await db.query('SELECT bakiye FROM kullanicilar WHERE id = ?', [kullaniciId]);
  return satirlar[0] ? satirlar[0].bakiye : null;
}

async function hareketler(db, kullaniciId, adet = 50) {
  const [satirlar] = await db.query(
    `SELECT h.id, h.tur, h.tutar, h.aciklama, h.olusturma,
            m.tarih AS menu_tarih, o.ad AS ogun
       FROM bakiye_hareketleri h
       LEFT JOIN rezervasyonlar r ON r.id = h.rezervasyon_id
       LEFT JOIN menuler m        ON m.id = r.menu_id
       LEFT JOIN ogunler o        ON o.id = m.ogun_id
      WHERE h.kullanici_id = ?
      ORDER BY h.id DESC
      LIMIT ?`,
    [kullaniciId, adet]
  );
  return satirlar;
}

module.exports = { bakiyeYukle, bakiye, hareketler };
