// Kullanıcıya gösterilecek, beklenen hatalar (doğrulama, yetki, bulunamadı)
class UygulamaHatasi extends Error {
  constructor(mesaj, durumKodu = 400) {
    super(mesaj);
    this.durumKodu = durumKodu;
  }
}

module.exports = { UygulamaHatasi };
