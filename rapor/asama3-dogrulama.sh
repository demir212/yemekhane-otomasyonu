#!/bin/bash
# =====================================================================
# Aşama 3 · Redis doğrulaması (oturum + menü önbelleği)
# Depo kökünden, sistem ayaktayken çalıştırın:   bash rapor/asama3-dogrulama.sh
# Her komut ve çıktısı ekrana yazılır ve rapor/asama3-cikti.txt dosyasına kaydedilir.
# (Windows'ta Git Bash ile çalıştırın.)
# =====================================================================
set -u
export MSYS_NO_PATHCONV=1
export TZ='<+03>-3'   # Türkiye saati (UTC+3); Git Bash bölge adlarını tanımaz
CIKTI="rapor/asama3-cikti.txt"
: > "$CIKTI"

ADRES="http://localhost:8080"
YEMEKHANE=1
OGUN=2                                   # Öğle
TARIH=$(date -d tomorrow +%F)            # yarının menüsü: süre yarın gün sonuna kadar olmalı
ANAHTAR="menu:$YEMEKHANE:$TARIH:$OGUN"
SIFRE='Yemek2026!'

baslik() { printf '\n==================== %s ====================\n' "$*" | tee -a "$CIKTI"; }
not()    { echo "# $*" | tee -a "$CIKTI"; }
calistir() {
    echo "\$ $*" | tee -a "$CIKTI"
    "$@" 2>&1 | tee -a "$CIKTI"
}
rcli() { calistir docker compose exec -T redis redis-cli "$@"; }

# API isteği: komut, belirteç kısaltılarak kaydedilir
api() {
    local token=$1; shift
    echo "\$ curl -s -H 'Cookie: oturum=${token:0:8}…' $*" | tee -a "$CIKTI"
    curl -s -H "Cookie: oturum=$token" "$@" 2>&1 | tee -a "$CIKTI"
    echo | tee -a "$CIKTI"
}
giris() {
    curl -s -D - -o /dev/null -H 'Content-Type: application/json' \
        -d "{\"eposta\":\"$1\",\"sifre\":\"$SIFRE\"}" "$ADRES/api/oturum/giris" \
        | tr -d '\r' | sed -n 's/^[Ss]et-[Cc]ookie: oturum=\([a-f0-9]*\).*/\1/p'
}
uygulama_gunlugu() {
    echo "\$ docker compose logs --since $1 uygulama | grep '\[önbellek\]'" | tee -a "$CIKTI"
    docker compose logs --no-log-prefix --since "$1" uygulama 2>&1 | grep '\[önbellek\]' | tee -a "$CIKTI"
}
bekle_healthy() {
    for i in {1..60}; do
        durum=$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q "$1")" 2>/dev/null)
        [ "$durum" = "healthy" ] && return 0
        sleep 2
    done
    echo "UYARI: $1 healthy olmadı" | tee -a "$CIKTI"
}

baslik "Tarih"
calistir date '+%Y-%m-%d %H:%M:%S %z'

# ---------------------------------------------------------------------
baslik "1. Oturum: oturum:{token}, 30 dk, her istekte yenilenir"
TOKEN=$(giris mehmet.yildiz@ogr.kampus.edu.tr)
not "Mehmet Yıldız giriş yaptı; çerezdeki belirteç: ${TOKEN:0:8}… (64 hex karakter)"
rcli --scan --pattern 'oturum:*'
rcli GET "oturum:$TOKEN"
rcli TTL "oturum:$TOKEN"
not "6 saniye bekleniyor; süre azalır..."
sleep 6
rcli TTL "oturum:$TOKEN"
not "Herhangi bir istek süreyi yeniden 1800 saniyeye çıkarır:"
api "$TOKEN" "$ADRES/api/ben" -o /dev/null -w 'HTTP %{http_code}'
rcli TTL "oturum:$TOKEN"

# ---------------------------------------------------------------------
baslik "2. Menü önbelleği: ilk istek veritabanından, ikincisi Redis'ten"
not "Temiz başlangıç için anahtar silinir"
rcli DEL "$ANAHTAR"
BAS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
not "1. istek"
api "$TOKEN" "$ADRES/api/menu?yemekhane_id=$YEMEKHANE&tarih=$TARIH&ogun_id=$OGUN" -o /dev/null -w 'HTTP %{http_code}'
not "2. istek (aynı menü)"
api "$TOKEN" "$ADRES/api/menu?yemekhane_id=$YEMEKHANE&tarih=$TARIH&ogun_id=$OGUN" -o /dev/null -w 'HTTP %{http_code}'
sleep 1
not "Uygulama günlüğü: ilk istek ISKA (veritabanı), ikinci istek ISABET (Redis)"
uygulama_gunlugu "$BAS"
rcli --scan --pattern 'menu:*'
rcli TTL "$ANAHTAR"
BITIS=$(docker compose exec -T redis redis-cli EXPIRETIME "$ANAHTAR" | tr -d '\r')
rcli EXPIRETIME "$ANAHTAR"
not "Anahtarın silineceği an: $(date -d "@$BITIS" '+%Y-%m-%d %H:%M:%S %z') (İstanbul) — menü gününün sonu"
echo "\$ docker compose exec -T redis redis-cli GET $ANAHTAR | cut -c1-300" | tee -a "$CIKTI"
docker compose exec -T redis redis-cli GET "$ANAHTAR" | cut -c1-300 | tee -a "$CIKTI"

# ---------------------------------------------------------------------
baslik "3. Yönetici menüyü değiştirir: eski anahtar silinir, arayüz yeni menüyü gösterir"
YTOKEN=$(giris leyla.arslan@kampus.edu.tr)
not "Leyla Arslan (yönetici) giriş yaptı"
MENU=$(curl -s -H "Cookie: oturum=$TOKEN" "$ADRES/api/menu?yemekhane_id=$YEMEKHANE&tarih=$TARIH&ogun_id=$OGUN")
MENU_ID=$(echo "$MENU" | grep -o '"menu_id":[0-9]*' | head -1 | cut -d: -f2)
ESKI=$(curl -s -H "Cookie: oturum=$YTOKEN" "$ADRES/api/yonetim/menuler/$MENU_ID")
OGR=$(echo "$ESKI" | grep -o '"ogrenci_fiyati":[0-9.]*' | cut -d: -f2)
PER=$(echo "$ESKI" | grep -o '"personel_fiyati":[0-9.]*' | cut -d: -f2)
YEMEKLER=$(echo "$ESKI" | grep -o '"yemek_idler":\[[0-9,]*\]' | cut -d: -f2)
YENI=$(awk "BEGIN{print $OGR + 5}")
not "Menü $MENU_ID: öğrenci fiyatı $OGR TL → $YENI TL yapılacak"
not "Önbellekteki fiyat (değişiklikten önce):"
echo "\$ docker compose exec -T redis redis-cli GET $ANAHTAR | grep -o '\"ogrenci_fiyati\":[0-9.]*'" | tee -a "$CIKTI"
docker compose exec -T redis redis-cli GET "$ANAHTAR" | grep -o '"ogrenci_fiyati":[0-9.]*' | tee -a "$CIKTI"
BAS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
api "$YTOKEN" -X PUT -H 'Content-Type: application/json' \
    -d "{\"ogrenci_fiyati\":$YENI,\"personel_fiyati\":$PER,\"yemek_idler\":$YEMEKLER}" \
    "$ADRES/api/yonetim/menuler/$MENU_ID"
sleep 1
not "Uygulama günlüğü: eski anahtar silindi, yeni içerik kaynaktan okunup yazıldı"
uygulama_gunlugu "$BAS"
not "Önbellekteki fiyat (değişiklikten sonra):"
echo "\$ docker compose exec -T redis redis-cli GET $ANAHTAR | grep -o '\"ogrenci_fiyati\":[0-9.]*'" | tee -a "$CIKTI"
docker compose exec -T redis redis-cli GET "$ANAHTAR" | grep -o '"ogrenci_fiyati":[0-9.]*' | tee -a "$CIKTI"
not "Öğrencinin gördüğü menü (arayüzün çağırdığı API):"
echo "\$ curl -s -H 'Cookie: oturum=${TOKEN:0:8}…' '$ADRES/api/menu?...' | grep -o '\"fiyat\":[0-9.]*'" | tee -a "$CIKTI"
curl -s -H "Cookie: oturum=$TOKEN" "$ADRES/api/menu?yemekhane_id=$YEMEKHANE&tarih=$TARIH&ogun_id=$OGUN" | grep -o '"fiyat":[0-9.]*' | tee -a "$CIKTI"
# Fiyat eski haline getirilir (kayda alınmaz)
curl -s -o /dev/null -X PUT -H "Cookie: oturum=$YTOKEN" -H 'Content-Type: application/json' \
    -d "{\"ogrenci_fiyati\":$OGR,\"personel_fiyati\":$PER,\"yemek_idler\":$YEMEKLER}" "$ADRES/api/yonetim/menuler/$MENU_ID"

# ---------------------------------------------------------------------
baslik "4. Uygulama container'ı yeniden başlatılır: oturum düşmez"
calistir docker compose restart uygulama
bekle_healthy uygulama
calistir docker compose ps uygulama --format '{{.Service}}  {{.Status}}'
not "Aynı çerezle istek (yeniden giriş yapılmadan):"
api "$TOKEN" "$ADRES/api/ben"

# ---------------------------------------------------------------------
baslik "5. Çıkış: oturum anahtarı silinir"
rcli EXISTS "oturum:$TOKEN"
api "$TOKEN" -X POST "$ADRES/api/oturum/cikis"
rcli EXISTS "oturum:$TOKEN"
api "$TOKEN" "$ADRES/api/ben"
curl -s -o /dev/null -X POST -H "Cookie: oturum=$YTOKEN" "$ADRES/api/oturum/cikis"

echo
echo "Bitti. Çıktı: $CIKTI"
