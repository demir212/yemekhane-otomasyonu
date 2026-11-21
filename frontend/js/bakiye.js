'use strict';
(async () => {
  const form = document.getElementById('yukle-formu');
  const kutu = document.getElementById('bildirim');
  const TUR_ADI = { yukleme: 'Yükleme', rezervasyon: 'Rezervasyon', iade: 'İade' };

  function hareketSatiri(h) {
    const aciklama = h.menu_tarih ? `${h.aciklama} · ${Y.kisaTarih(h.menu_tarih)} ${h.ogun}` : h.aciklama;
    return `<tr>
      <td data-baslik="Zaman">${Y.kisaTarih(h.olusturma)} ${Y.saat(h.olusturma)}</td>
      <td data-baslik="İşlem">${TUR_ADI[h.tur]}</td>
      <td data-baslik="Açıklama">${Y.esc(aciklama)}</td>
      <td data-baslik="Tutar" class="sayi ${h.tutar > 0 ? 'arti' : 'eksi'}">${h.tutar > 0 ? '+' : ''}${Y.para(h.tutar)}</td>
    </tr>`;
  }

  async function yukle() {
    const veri = await Y.istek('/api/bakiye');
    document.getElementById('bakiye').textContent = Y.para(veri.bakiye);
    Y.bakiyeGoster(veri.bakiye);
    document.getElementById('hareketler').innerHTML = veri.hareketler.length
      ? veri.hareketler.map(hareketSatiri).join('')
      : '<tr><td colspan="4" class="soluk">Hareket yok.</td></tr>';
  }

  form.addEventListener('click', (olay) => {
    const hizli = olay.target.closest('[data-hizli]');
    if (hizli) form.tutar.value = hizli.dataset.hizli;
  });

  form.addEventListener('submit', async (olay) => {
    olay.preventDefault();
    Y.bildirimGizle(kutu);
    if (form.tutar.value === '') return Y.bildir(kutu, 'Yüklenecek tutarı girin.');
    const dugme = form.querySelector('[type=submit]');
    dugme.disabled = true;
    try {
      const sonuc = await Y.istek('/api/bakiye/yukle', { yontem: 'POST', govde: { tutar: Number(form.tutar.value) } });
      form.reset();
      await yukle();
      Y.bildir(kutu, `Yükleme başarılı. Yeni bakiye: ${Y.para(sonuc.bakiye)}`, 'basari');
    } catch (hata) {
      Y.bildir(kutu, hata.message);
    } finally {
      dugme.disabled = false;
    }
  });

  await Y.sayfaBaslat('/bakiye.html');
  try { await yukle(); } catch (hata) { Y.bildir(kutu, hata.message); }
})();
