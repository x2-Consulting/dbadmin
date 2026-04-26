#!/usr/bin/env node
import { execSync } from 'child_process';
import { mkdirSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const certDir = join(__dirname, '..', 'certs');
const keyFile  = join(certDir, 'key.pem');
const certFile = join(certDir, 'cert.pem');
const cfgFile  = join(certDir, '_openssl.cnf');

if (!existsSync(certDir)) mkdirSync(certDir, { recursive: true });

// SAN is required by Chrome 58+ and modern browsers
writeFileSync(cfgFile, `[req]
distinguished_name = req_dn
x509_extensions = v3_req
prompt = no

[req_dn]
CN = localhost

[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1  = 127.0.0.1
`);

try {
  execSync(
    `openssl req -x509 -newkey rsa:4096 -keyout "${keyFile}" -out "${certFile}" -days 3650 -nodes -config "${cfgFile}"`,
    { stdio: 'inherit' }
  );
  console.log('\nCertificate written to:');
  console.log('  Key: ', keyFile);
  console.log('  Cert:', certFile);
  console.log('\nTo trust this cert so browsers stop showing warnings:');
  console.log('  Chrome/Edge: Settings → Privacy → Manage certificates → Authorities → Import cert.pem');
  console.log('  Firefox:     about:preferences#privacy → View Certificates → Authorities → Import cert.pem');
  console.log('  Linux (system trust): sudo cp', certFile, '/usr/local/share/ca-certificates/dbadmin.crt && sudo update-ca-certificates');
  console.log('\nRestart the dev server to enable HTTPS.');
} finally {
  try { unlinkSync(cfgFile); } catch { /* ok */ }
}
