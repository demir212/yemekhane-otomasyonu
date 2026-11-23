'use strict';
(async () => {
  const form = document.getElementById('alerjen-formu');
  const alan = document.getElementById('alerjenler');
  const kutu = document.getElementById('bildirim');

  function bilgileriCiz(ben) {
    const satirlar = [
      ['Ad soyad', `${ben.ad} ${ben.soyad}`],
      ['E-posta', ben.eposta],
      ['Rol', Y.ROL_ADI[ben.rol]],
    ];
    if (ben.ogrenci_no) satirlar.push(['Öğrenci no', ben.ogrenci_no]);
    document.getElementById('bilgiler').innerHTML = satirlar
      .map(([ad, deger]) => `<dt>${ad}</dt><dd>${Y.esc(deger)}</dd>`).join('');
  }

  function alerjenleriCiz(liste) {
    alan.querySelectorAll('label').forEach((e) => e.remove());
    alan.insertAdjacentHTML('beforeend', liste.map((a) => `
      <label class="secim">
        <input type="checkbox" name="alerjen" value="${a.id}"${a.secili ? ' checked' : ''}>
        ${Y.esc(a.ad)}
      </label>`).join(''));
  }

  form.addEventListener('submit', async (olay) => {
    olay.preventDefault();
    Y.bildirimGizle(kutu);
    const dugme = form.querySelector('button[type=submit]');
    dugme.disabled = true;
    const alerjen_idler = [...form.querySelectorAll('input[name=alerjen]:checked')].map((k) => Number(k.value));
    try {
      const liste = await Y.istek('/api/profil/alerjenler', { yontem: 'PUT', govde: { alerjen_idler } });
      alerjenleriCiz(liste);
      const secilen = liste.filter((a) => a.secili).map((a) => a.ad);
      Y.bildir(kutu, secilen.length
        ? `Kaydedildi. Menüde şu alerjenler için uyarı gösterilecek: ${secilen.join(', ')}.`
        : 'Kaydedildi. Hiç alerjen seçmediniz; menüde uyarı gösterilmeyecek.', 'basari');
    } catch (hata) {
      Y.bildir(kutu, hata.message);
    }
    dugme.disabled = false;
  });

  const ben = await Y.sayfaBaslat('/profil.html');
  bilgileriCiz(ben);
  try {
    alerjenleriCiz(await Y.istek('/api/profil/alerjenler'));
  } catch (hata) {
    Y.bildir(kutu, hata.message);
  }
})();
