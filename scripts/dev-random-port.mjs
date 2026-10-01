import { spawn } from 'node:child_process'
import net from 'node:net'

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()

    server.once('error', reject)
    server.listen(0, () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : null
      server.close(() => {
        if (port) resolve(port)
        else reject(new Error('Gagal menemukan port kosong.'))
      })
    })
  })
}

const port = await findFreePort()
const vite = spawn('vite', ['--host', '0.0.0.0', '--port', String(port)], {
  stdio: 'inherit',
  shell: true
})

function forwardSignal(signal) {
  process.on(signal, () => {
    vite.kill(signal)
  })
}

forwardSignal('SIGINT')
forwardSignal('SIGTERM')

vite.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 0)
})
