// Bağlantı bilgileri ortam değişkenlerinden okunur (docker-compose.yml → x-uygulama-ortam)
const ortam = (ad, varsayilan) => process.env[ad] ?? varsayilan;

module.exports = {
  port: Number(ortam('PORT', 8000)),
  db: {
    yazmaHost: ortam('DB_YAZMA_HOST', 'mysql-primary'),
    okumaHost: ortam('DB_OKUMA_HOST', 'mysql-replica'),
    port: Number(ortam('DB_PORT', 3306)),
    ad: ortam('DB_ADI', 'yemekhane'),
    kullanici: ortam('DB_KULLANICI', 'yemekhane_app'),
    sifre: ortam('DB_SIFRE', ''),
  },
  redis: {
    host: ortam('REDIS_HOST', 'redis'),
    port: Number(ortam('REDIS_PORT', 6379)),
  },
  // Oturum süresi (saniye): her istekte yeniden başlar
  oturumSuresi: 30 * 60,
  // Yazma işleminden sonra bu kadar saniye boyunca kullanıcının okumaları kaynaktan yapılır
  // (replikasyon gecikmesine karşı "kendi yazdığını oku" tutarlılığı)
  kaynaktanOkumaSuresi: 10,
};
