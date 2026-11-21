// Ara katman · tüm hataları tek yerde JSON'a çevirir
const { UygulamaHatasi } = require('../hatalar');

// eslint-disable-next-line no-unused-vars
function hataYakalayici(hata, req, res, next) {
  // Beklenen hata (doğrulama, yetki)
  if (hata instanceof UygulamaHatasi) {
    return res.status(hata.durumKodu).json({ hata: hata.message });
  }
  // Stored procedure hatası: SQLSTATE 45000 / MySQL 1644. Mesaj değiştirilmeden iletilir.
  if (hata.errno === 1644) {
    return res.status(400).json({ hata: hata.sqlMessage });
  }
  // Bozuk JSON gövdesi
  if (hata.type === 'entity.parse.failed') {
    return res.status(400).json({ hata: 'İstek gövdesi geçerli JSON değil.' });
  }
  // CHECK ihlali (3819) ve diğer her şey programlama hatasıdır: ham hali kullanıcıya gösterilmez
  console.error(`[hata] ${req.method} ${req.originalUrl}`, hata.errno || '', hata.message);
  return res.status(500).json({ hata: 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.' });
}

module.exports = hataYakalayici;
