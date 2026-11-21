'use strict';
(async () => {
  const liste = document.getElementById('liste');
  const kutu = document.getElementById('bildirim');

  function yildizlar(menuId, secili) {
    let html = '';
    // row-reverse ile çizildiği için 5'ten 1'e yazılır
    for (let p = 5; p >= 1; p--) {
      const id = `p-${menuId}-${p}`;
      html += `<input type="radio" id="${id}" name="puan" value="${p}"${secili === p ? ' checked' : ''}>
               <label for="${id}" title="${p} puan">★</label>`;
    }
    return `<fieldset class="yildizlar"><legend class="soluk" style="float:left;width:100%">Puanınız</legend>${html}</fieldset>`;
  }

  function kart(m) {
    const ortalama = m.ortalama_puan === null ? 'henüz oy yok' : `ortalama ${m.ortalama_puan} (${m.oy_sayisi} oy)`;
    return `<form class="panel" data-menu="${m.menu_id}">
      <h2>${Y.tarihYaz(m.tarih)} · ${Y.esc(m.ogun)}</h2>
      <p class="soluk">${Y.esc(m.yemekhane)} · ${ortalama}</p>
      <div>${yildizlar(m.menu_id, m.puan)}</div>
      <label for="yorum-${m.menu_id}">Yorum (isteğe bağlı)</label>
      <textarea id="yorum-${m.menu_id}" name="yorum" rows="2" maxlength="500">${Y.esc(m.yorum)}</textarea>
      <div style="margin-top:.75rem">
        <button class="dugme" type="submit">${m.puan ? 'Güncelle' : 'Gönder'}</button>
      </div>
    </form>`;
  }

  async function yukle() {
    const menuler = await Y.istek('/api/degerlendirmeler');
    liste.innerHTML = menuler.length
      ? menuler.map(kart).join('')
      : '<section class="panel"><p class="soluk">Değerlendirilecek menü yok. Bir menüyü kullandıktan sonra burada görünür.</p></section>';
  }

  liste.addEventListener('submit', async (olay) => {
    olay.preventDefault();
    const form = olay.target;
    Y.bildirimGizle(kutu);
    const secili = form.querySelector('input[name=puan]:checked');
    if (!secili) {
      Y.bildir(kutu, 'Lütfen 1 ile 5 arasında bir puan seçin.');
      return kutu.scrollIntoView({ block: 'center' });
    }
    try {
      await Y.istek('/api/degerlendirmeler', {
        yontem: 'POST',
        govde: { menu_id: Number(form.dataset.menu), puan: Number(secili.value), yorum: form.yorum.value },
      });
      await yukle();
      Y.bildir(kutu, 'Değerlendirmeniz kaydedildi. Teşekkürler!', 'basari');
    } catch (hata) {
      Y.bildir(kutu, hata.message);
    }
    kutu.scrollIntoView({ block: 'center' });
  });

  await Y.sayfaBaslat('/degerlendirme.html');
  try { await yukle(); } catch (hata) { Y.bildir(kutu, hata.message); }
})();
