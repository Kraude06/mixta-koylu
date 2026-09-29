# Vampir Köylü — VPS Kurulumu (Docker + Caddy)

Sunucu: `187.77.89.169` · Adres: `https://oyun.kaanacar.site`

Sunucuda CRM (`/root/mixta-crm`) Docker ile çalışıyor ve 80/443 portları onun
Caddy container'ında (`mixta-crm-frontend-1`). Oyun bu yapıya en az dokunuşla eklenir:

- Oyun kendi container'ında çalışır (`/root/vampir-koylu`), dışarıya port açmaz.
- CRM'in Docker ağına (`mixta-crm_default`) katılır; Caddy ona `vampir-koylu:3100` ile ulaşır.
- CRM'in Caddyfile'ına sadece oyunun alan adı için bir blok eklenir.

## Güncelleme (yeni sürüm)

```bash
cd /root/vampir-koylu && git pull
docker compose -f deploy/docker-compose.yml up -d --build
```

Sadece oyun container'ı yeniden oluşturulur; CRM etkilenmez.

## Caddy bloğu

`/root/mixta-crm/frontend/Caddyfile` sonuna eklendi:

```
oyun.kaanacar.site {
	encode gzip
	reverse_proxy vampir-koylu:3100
}
```

Caddyfile CRM imajının içine gömülü olduğu için canlıya şöyle alınır (kesintisiz):

```bash
docker cp /root/mixta-crm/frontend/Caddyfile mixta-crm-frontend-1:/etc/caddy/Caddyfile
docker exec mixta-crm-frontend-1 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker exec mixta-crm-frontend-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

> CRM `docker compose up --build` ile yeniden derlenirse blok kaynak dosyada olduğu için korunur.
> CRM derlenmeden container sıfırdan oluşturulursa (`down`/`--force-recreate`) yukarıdaki üç komutu tekrar çalıştırın.

## Sorun giderme

```bash
docker logs --tail 50 vampir-koylu
docker logs --tail 50 mixta-crm-frontend-1 2>&1 | grep -i oyun   # sertifika / yönlendirme
```
