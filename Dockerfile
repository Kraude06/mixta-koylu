# Vampir Köylü — tek container: oyun sunucusu + derlenmiş web arayüzü
FROM node:20-alpine
WORKDIR /app

# Mobil uygulama (React Native) sunucuda gerekmez; workspace listesinden çıkar
COPY package.json ./
RUN node -e "const f='package.json',p=require('./'+f);p.workspaces=['shared','server','web'];require('fs').writeFileSync(f,JSON.stringify(p,null,2))"

COPY shared/package.json shared/
COPY server/package.json server/
COPY web/package.json web/
RUN npm install --no-audit --no-fund

COPY shared shared
COPY server server
COPY web web
RUN npm run build --workspace=web

ENV NODE_ENV=production PORT=3100
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3100/health || exit 1
CMD ["node_modules/.bin/tsx", "server/src/index.ts"]
