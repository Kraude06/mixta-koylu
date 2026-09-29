// pm2 ayarı — VPS'te: pm2 start deploy/ecosystem.config.cjs
// Sunucudaki diğer uygulamalardan (CRM vb.) bağımsız, kendi adıyla çalışır.
module.exports = {
  apps: [
    {
      name: 'vampir-koylu',
      cwd: __dirname + '/..',
      script: 'node_modules/.bin/tsx',
      args: 'server/src/index.ts',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        // Sunucuda boş bir port seçin (CRM'in portuyla çakışmamalı)
        PORT: 3100,
      },
      max_memory_restart: '300M',
      restart_delay: 3000,
    },
  ],
};
