// Veri katmanı · kullanıcı profili: alerjenler (Aşama 4 · kullanici_alerjenleri)
const { yazma } = require('./baglanti');

async function tumAlerjenler(db) {
  const [satirlar] = await db.query('SELECT id, ad FROM alerjenler ORDER BY ad');
  return satirlar;
}

// Kullanıcının seçtiği alerjenler: [{id, ad}]
async function kullaniciAlerjenleri(db, kullaniciId) {
  const [satirlar] = await db.query(
    `SELECT a.id, a.ad
       FROM kullanici_alerjenleri ka
       JOIN alerjenler a ON a.id = ka.alerjen_id
      WHERE ka.kullanici_id = ?
      ORDER BY a.ad`,
    [kullaniciId]
  );
  return satirlar;
}

// Seçimi bütünüyle değiştirir (eski seçimler silinir, yenileri eklenir) · kaynakta, tek transaction
async function alerjenleriKaydet(kullaniciId, alerjenIdler) {
  const baglanti = await yazma.getConnection();
  try {
    await baglanti.beginTransaction();
    await baglanti.query('DELETE FROM kullanici_alerjenleri WHERE kullanici_id = ?', [kullaniciId]);
    if (alerjenIdler.length > 0) {
      await baglanti.query('INSERT INTO kullanici_alerjenleri (kullanici_id, alerjen_id) VALUES ?', [
        alerjenIdler.map((id) => [kullaniciId, id]),
      ]);
    }
    await baglanti.commit();
  } catch (hata) {
    await baglanti.rollback();
    throw hata;
  } finally {
    baglanti.release();
  }
}

module.exports = { tumAlerjenler, kullaniciAlerjenleri, alerjenleriKaydet };
