#!/usr/bin/env node
/**
 * Sitecore media saved as .aspx are often JPEG/PNG/GIF/WebP without extension.
 * Create .jpg/.png/.gif/.webp siblings and rewrite HTML src to use them.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname);
const MISC = path.join(ROOT, 'assets', 'misc');

const SIGS = [
  { ext: '.jpg', mime: 'image/jpeg', sig: [0xff, 0xd8, 0xff] },
  { ext: '.png', mime: 'image/png', sig: [0x89, 0x50, 0x4e, 0x47] },
  { ext: '.gif', mime: 'image/gif', sig: [0x47, 0x49, 0x46] },
  { ext: '.webp', mime: 'image/webp', sig: [0x52, 0x49, 0x46, 0x46] },
];

function detectExt(buf) {
  for (const s of SIGS) {
    if (s.sig.every((b, i) => buf[i] === b)) return s.ext;
  }
  return null;
}

function walkHtml(dir, files = [], base = dir) {
  for (const name of fs.readdirSync(dir)) {
    if (['assets', 'lib', 'node_modules', '.git', 'home', 'login'].includes(name)) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkHtml(full, files, base);
    else if (name === 'index.html') files.push(path.relative(base, full).replace(/\\/g, '/'));
  }
  return files;
}

function main() {
  if (!fs.existsSync(MISC)) return;
  const map = new Map();
  let converted = 0;

  for (const name of fs.readdirSync(MISC)) {
    const full = path.join(MISC, name);
    if (!fs.statSync(full).isFile()) continue;
    if (!/\.aspx$/i.test(name)) continue;
    const buf = Buffer.alloc(12);
    const fd = fs.openSync(full, 'r');
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    const ext = detectExt(buf);
    if (!ext) continue;
    const outName = name.replace(/\.aspx$/i, '') + ext;
    const outPath = path.join(MISC, outName);
    if (!fs.existsSync(outPath)) {
      fs.copyFileSync(full, outPath);
      converted++;
    }
    map.set(name, outName);
  }

  console.log(`Created ${converted} typed image files in assets/misc`);

  const pages = walkHtml(ROOT).filter((p) => p !== 'index.html');
  let htmlUpdates = 0;
  for (const pageRel of pages) {
    const full = path.join(ROOT, pageRel);
    let html = fs.readFileSync(full, 'utf8');
    let changed = false;
    for (const [aspx, typed] of map) {
      const re = new RegExp(aspx.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (re.test(html)) {
        html = html.replace(re, typed);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(full, html);
      htmlUpdates++;
    }
  }
  console.log(`Updated ${htmlUpdates} HTML pages with typed image paths`);
}

main();
