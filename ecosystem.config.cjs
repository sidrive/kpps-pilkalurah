module.exports = {
  apps: [{
    name: 'kpps-pilkalurah',
    script: './server.mjs',
    env: { PORT: 8080, HOST: '127.0.0.1' },
    max_memory_restart: '150M',
    autorestart: true
  }]
}
