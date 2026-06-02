#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const AUDIT_LOG = '/tmp/post-rescrape-audit.log';
const ROOT = path.join(__dirname);
const BASE = 'https://static.cloud.coveo.com/atomic/v2/';

function parseMissingJs() {
  if (!fs.existsSync(AUDIT_LOG)) return [];
  const txt = fs.readFileSync(AUDIT_LOG, 'utf8');
  const out = new Set();
  for (const m of txt.matchAll(/404 http:\/\/localhost\/brother-clone\/brother_offline\/(assets\/js\/[^\s]+)/g)) {
    out.add(m[1]);
  }
  return [...out];
}

function download(url, dest) {
  return new Promise((resolve) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    https
      .get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Referer: 'https://www.brother-usa.com/',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return download(res.headers.location, dest).then(resolve);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return resolve(false);
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            fs.writeFileSync(dest, Buffer.concat(chunks));
            resolve(true);
          });
        }
      )
      .on('error', () => resolve(false));
  });
}

async function main() {
  const list = parseMissingJs();
  let ok = 0;
  let fail = 0;
  for (const rel of list) {
    const file = path.basename(rel);
    const src = `${BASE}${file}`;
    const dest = path.join(ROOT, rel);
    const done = await download(src, dest);
    if (done) ok++;
    else fail++;
  }
  console.log(`Downloaded ${ok}, failed ${fail}, total ${list.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
