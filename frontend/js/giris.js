'use strict';
(() => {
  const form = document.getElementById('giris-formu');
  const kutu = document.getElementById('bildirim');

  // Zaten giriş yapılmışsa doğrudan menüye geç
  Y.istek('/api/ben').then(() => { location.href = '/menu.html'; }).catch(() => {});

  form.addEventListener('submit', async (olay) => {
    olay.preventDefault();
    Y.bildirimGizle(kutu);
    const eposta = form.eposta.value.trim();
    const sifre = form.sifre.value;
    if (!eposta || !sifre) return Y.bildir(kutu, 'E-posta ve şifre gereklidir.');

    const dugme = form.querySelector('button');
    dugme.disabled = true;
    try {
      await Y.istek('/api/oturum/giris', { yontem: 'POST', govde: { eposta, sifre } });
      location.href = '/menu.html';
    } catch (hata) {
      Y.bildir(kutu, hata.message);
      dugme.disabled = false;
    }
  });
})();
