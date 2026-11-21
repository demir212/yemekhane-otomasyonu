// Veri katmanı · kullanıcılar
// Her fonksiyon ilk parametre olarak hangi havuzun (yazma/okuma) kullanılacağını alır.

async function epostaIleBul(db, eposta) {
  const [satirlar] = await db.query(
    `SELECT id, ad, soyad, eposta, sifre_hash, rol, aktif
       FROM kullanicilar WHERE eposta = ?`,
    [eposta]
  );
  return satirlar[0] || null;
}

async function idIleBul(db, id) {
  const [satirlar] = await db.query(
    `SELECT id, ad, soyad, eposta, rol, ogrenci_no, bakiye
       FROM kullanicilar WHERE id = ?`,
    [id]
  );
  return satirlar[0] || null;
}

module.exports = { epostaIleBul, idIleBul };
