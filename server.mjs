import { createServer as httpsServer } from 'https';
import { createServer as httpServer } from 'http';
import next from 'next';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3333');
const hostname = process.env.HOST || '0.0.0.0';

const certFile = join(__dirname, 'certs', 'cert.pem');
const keyFile  = join(__dirname, 'certs', 'key.pem');
const useHttps = existsSync(certFile) && existsSync(keyFile);

if (useHttps) process.env.HTTPS_ENABLED = '1';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const listener = (req, res) => handle(req, res);

  if (useHttps) {
    httpsServer({ key: readFileSync(keyFile), cert: readFileSync(certFile) }, listener)
      .listen(port, hostname, () => {
        console.log(`> Ready on https://localhost:${port}`);
        console.log('> TLS enabled (self-signed cert)');
      });
  } else {
    httpServer(listener).listen(port, hostname, () => {
      console.log(`> Ready on http://localhost:${port}`);
      console.log('> Tip: run "npm run generate-cert" then restart for HTTPS');
    });
  }
});
