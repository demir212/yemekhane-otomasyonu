// Veri katmanı · rezervasyonlar
// Para hareketi yapan işlemler yalnızca stored procedure ile yapılır (kaynakta).
const { yordamCagir } = require('./baglanti');

function rezervasyonYap(kullaniciId, menuId) {
  return yordamCagir('CALL sp_rezervasyon_yap(?, ?)', [kullaniciId, menuId]);
}

function rezervasyonIptal(kullaniciId, rezervasyonId) {
  return yordamCagir('CALL sp_rezervasyon_iptal(?, ?)', [kullaniciId, rezervasyonId]);
}

async function kullaniciRezervasyonlari(db, kullaniciId) {
  const [satirlar] = await db.query(
    `SELECT r.id, r.menu_id, r.durum, r.ucret, r.olusturma, r.kullanma_zamani, r.iptal_zamani,
            m.tarih, o.ad AS ogun, yh.ad AS yemekhane,
            TIMESTAMP(m.tarih, o.son_saat) AS rezervasyon_son,
            (r.durum = 'aktif' AND NOW() < TIMESTAMP(m.tarih, o.son_saat)) AS iptal_edilebilir
       FROM rezervasyonlar r
       JOIN menuler m       ON m.id  = r.menu_id
       JOIN ogunler o       ON o.id  = m.ogun_id
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
      WHERE r.kullanici_id = ?
      ORDER BY m.tarih DESC, o.sira DESC`,
    [kullaniciId]
  );
  return satirlar;
}

// Verilen menülerde kullanıcının rezervasyon durumu: { menu_id: {id, durum} }
async function menulerdekiDurum(db, kullaniciId, menuIdler) {
  if (menuIdler.length === 0) return {};
  const [satirlar] = await db.query(
    `SELECT id, menu_id, durum FROM rezervasyonlar
      WHERE kullanici_id = ? AND menu_id IN (?)`,
    [kullaniciId, menuIdler]
  );
  return Object.fromEntries(satirlar.map((s) => [s.menu_id, { id: s.id, durum: s.durum }]));
}

module.exports = { rezervasyonYap, rezervasyonIptal, kullaniciRezervasyonlari, menulerdekiDurum };
