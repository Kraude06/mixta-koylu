# Vampir Köylü — VPS Kurulumu

Oyun tek bir Node.js süreci olarak çalışır: hem oyun sunucusu (Socket.io) hem web arayüzü
aynı porttan sunulur. Sunucudaki diğer uygulamalara (ör. CRM) dokunmaz:
kendi klasörü, kendi pm2 süreci, kendi portu ve kendi nginx dosyası vardır.

## 0. Ön kontrol (hiçbir şeyi değiştirmez)

```bash
node -v                       # v18 veya üstü olmalı — değilse DURUN, Node'u değiştirmeyin (CRM'i etkiler)
pm2 -v                        # pm2 kurulu mu?
nginx -v                      # nginx mi kullanılıyor?
sudo ss -ltnp | grep 3100     # 3100 portu boş mu? (çıktı boşsa boştur)
pm2 list                      # mevcut süreçler — 'vampir-koylu' adı kullanılmıyor olmalı
```

3100 doluysa boş bir port seçin ve aşağıda 3100 geçen her yeri değiştirin.

## 1. Kodu indir ve kur

```bash
cd /var/www                     # veya CRM'den ayrı herhangi bir klasör
git clone https://github.com/Kraude06/mixta-koylu.git vampir-koylu
cd vampir-koylu

# Sadece gereken paketler (mobil uygulama paketleri yüklenmez)
npm install --workspace=server --workspace=web --include-workspace-root

# Web arayüzünü derle (web/dist oluşur, sunucu bunu otomatik sunar)
npm run build --workspace=web
```

## 2. pm2 ile başlat

```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save                        # sunucu yeniden başlayınca oyun da açılsın
curl http://127.0.0.1:3100/health   # {"ok":true,...} dönmeli
```

## 3. nginx (alt alan adı)

Önce alan adı panelinizden `oyun.ALANADINIZ.com` için VPS'in IP'sine bir **A kaydı** ekleyin.

```bash
sudo cp deploy/nginx-vampir-koylu.conf /etc/nginx/sites-available/vampir-koylu
sudo nano /etc/nginx/sites-available/vampir-koylu      # oyun.ORNEK.com → kendi alan adınız
sudo ln -s /etc/nginx/sites-available/vampir-koylu /etc/nginx/sites-enabled/
sudo nginx -t                   # "syntax is ok" demeden devam ETMEYİN
sudo systemctl reload nginx     # reload: mevcut siteler (CRM) kesintisiz devam eder
sudo certbot --nginx -d oyun.ALANADINIZ.com            # ücretsiz HTTPS
```

## Güncelleme (yeni sürüm çıkınca)

```bash
cd /var/www/vampir-koylu
git pull
npm install --workspace=server --workspace=web --include-workspace-root
npm run build --workspace=web
pm2 restart vampir-koylu        # sadece oyun yeniden başlar
```

## Sorun giderme

```bash
pm2 logs vampir-koylu --lines 50
```

- Sayfa açılıyor ama oda kurulamıyor → nginx dosyasındaki `Upgrade` / `Connection` satırlarını kontrol edin.
- 502 Bad Gateway → `pm2 list` ile oyunun çalıştığını, portun doğru olduğunu kontrol edin.
