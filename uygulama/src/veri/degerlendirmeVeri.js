// Veri katmanı · değerlendirmeler (v_menu_puan)

// Kullanıcının kullandığı (turnikeden geçtiği) menüler ve verdiği puan
async function degerlendirilebilirMenuler(db, kullaniciId) {
  const [satirlar] = await db.query(
    `SELECT r.menu_id, m.tarih, o.ad AS ogun, yh.ad AS yemekhane,
            d.puan, d.yorum, p.oy_sayisi, p.ortalama_puan
       FROM rezervasyonlar r
       JOIN menuler m       ON m.id  = r.menu_id
       JOIN ogunler o       ON o.id  = m.ogun_id
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
       JOIN v_menu_puan p   ON p.menu_id = r.menu_id
       LEFT JOIN degerlendirmeler d
              ON d.menu_id = r.menu_id AND d.kullanici_id = r.kullanici_id
      WHERE r.kullanici_id = ? AND r.durum = 'kullanildi'
      ORDER BY m.tarih DESC, o.sira DESC`,
    [kullaniciId]
  );
  return satirlar;
}

async function menuKullanildiMi(db, kullaniciId, menuId) {
  const [satirlar] = await db.query(
    `SELECT 1 FROM rezervasyonlar
      WHERE kullanici_id = ? AND menu_id = ? AND durum = 'kullanildi'`,
    [kullaniciId, menuId]
  );
  return satirlar.length > 0;
}

// Kişi başına menü başına tek oy: varsa güncellenir
async function kaydet(db, kullaniciId, menuId, puan, yorum) {
  await db.query(
    `INSERT INTO degerlendirmeler (kullanici_id, menu_id, puan, yorum)
     VALUES (?, ?, ?, ?) AS yeni
     ON DUPLICATE KEY UPDATE puan = yeni.puan, yorum = yeni.yorum`,
    [kullaniciId, menuId, puan, yorum]
  );
}

module.exports = { degerlendirilebilirMenuler, menuKullanildiMi, kaydet };
