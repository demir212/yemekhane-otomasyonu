'use strict';
(async () => {
  const liste = document.getElementById('liste');
  const kutu = document.getElementById('bildirim');
  const filtre = document.getElementById('durum');
  let rezervasyonlar = [];

  function satir(r) {
    const iptal = r.iptal_edilebilir
      ? `<button class="dugme dugme-kucuk dugme-tehlike" data-iptal="${r.id}">İptal et</button>`
      : '';
    return `<tr>
      <td data-baslik="Tarih">${Y.kisaTarih(r.tarih)}</td>
      <td data-baslik="Öğün">${Y.esc(r.ogun)}</td>
      <td data-baslik="Yemekhane">${Y.esc(r.yemekhane)}</td>
      <td data-baslik="Porsiyon">${r.porsiyon === 'yarim' ? 'Yarım' : 'Tam'}</td>
      <td data-baslik="Ücret" class="sayi">${Y.para(r.ucret)}</td>
      <td data-baslik="Durum"><span class="etiket etiket-${r.durum}">${Y.DURUM_ADI[r.durum]}</span></td>
      <td data-baslik="">${iptal}</td>
    </tr>`;
  }

  function ciz() {
    const secili = rezervasyonlar.filter((r) => !filtre.value || r.durum === filtre.value);
    liste.innerHTML = secili.length
      ? secili.map(satir).join('')
      : '<tr><td colspan="7" class="soluk">Kayıt yok.</td></tr>';
  }

  async function yukle() {
    rezervasyonlar = await Y.istek('/api/rezervasyonlar');
    ciz();
  }

  liste.addEventListener('click', async (olay) => {
    const dugme = olay.target.closest('[data-iptal]');
    if (!dugme) return;
    if (!confirm('Bu rezervasyonu iptal etmek istiyor musunuz? Ücret bakiyenize iade edilir.')) return;
    dugme.disabled = true;
    try {
      const sonuc = await Y.istek(`/api/rezervasyonlar/${dugme.dataset.iptal}`, { yontem: 'DELETE' });
      Y.bakiyeGoster(sonuc.bakiye);
      await yukle();
      Y.bildir(kutu, `Rezervasyon iptal edildi. İade: ${Y.para(sonuc.iade)}, yeni bakiye: ${Y.para(sonuc.bakiye)}`, 'basari');
    } catch (hata) {
      Y.bildir(kutu, hata.message);
      dugme.disabled = false;
    }
  });

  filtre.addEventListener('change', ciz);
  await Y.sayfaBaslat('/rezervasyonlarim.html');
  try { await yukle(); } catch (hata) { Y.bildir(kutu, hata.message); }
})();
