#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, 'assets', 'misc', 'coveo');

function linkedPages() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const re = /href\s*=\s*["'](\.\/[^"'#?]+)["']/gi;
  const out = new Set();
  let m;
  while ((m = re.exec(html))) {
    let p = m[1].slice(2).split('#')[0].split('?')[0];
    if (!p || p.startsWith('assets/')) continue;
    if (/\.(css|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|otf|mjs|aspx)$/i.test(p)) continue;
    if (!p.endsWith('.html')) p = (p.endsWith('/') ? p : `${p}/`) + 'index.html';
    if (p === 'index.html' || p === 'login/index.html') continue;
    out.add(p);
  }
  return [...out].sort();
}

function keyForPage(pageRel) {
  return pageRel.replace(/\/index\.html$/, '').replace(/[^a-zA-Z0-9._-]/g, '__');
}

function liveCandidates(pageRel) {
  const slug = pageRel.replace(/\/index\.html$/, '');
  return [`https://www.brother-usa.com/${slug}`, `https://www.brother-usa.com/home/${slug}`];
}

async function chooseLiveUrl(context, pageRel) {
  for (const u of liveCandidates(pageRel)) {
    const p = await context.newPage();
    try {
      await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await p.waitForTimeout(1200);
      const is404 = await p.evaluate(
        () =>
          /\b404\b/i.test(document.title) ||
          /page you requested could not be found/i.test(document.body.innerText)
      );
      await p.close();
      if (!is404) return u;
    } catch {
      await p.close();
    }
  }
  return null;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pages = linkedPages();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1536, height: 900 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  let saved = 0;
  for (const pageRel of pages) {
    const liveUrl = await chooseLiveUrl(context, pageRel);
    if (!liveUrl) continue;
    const key = keyForPage(pageRel);
    const page = await context.newPage();
    let captured = null;

    page.on('response', async (res) => {
      try {
        const u = res.url();
        if (!u.includes('/rest/search/v2')) return;
        if (res.status() !== 200) return;
        const txt = await res.text();
        if (!txt || txt.length < 50) return;
        const json = JSON.parse(txt);
        if (!json || !json.results) return;
        captured = json;
      } catch {}
    });

    try {
      await page.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(8000);
      if (captured) {
        fs.writeFileSync(path.join(OUT_DIR, `${key}.json`), JSON.stringify(captured));
        saved++;
        console.log(`cached ${pageRel} (${captured.results.length} results)`);
      } else {
        console.log(`no coveo response ${pageRel}`);
      }
    } catch {
      console.log(`failed ${pageRel}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(`\nSaved Coveo caches for ${saved}/${pages.length} pages.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
