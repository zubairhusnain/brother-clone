#!/usr/bin/env node
const { chromium } = require('playwright');
const fs = require('fs');

const home = fs.readFileSync('brother_offline/index.html', 'utf8');

function linkedPages() {
  const re = /href\s*=\s*["'](\.\/[^"'#?]+)["']/gi;
  const seen = new Set();
  let m;
  while ((m = re.exec(home))) {
    let p = m[1].slice(2).split('#')[0].split('?')[0];
    if (!p || p.startsWith('assets/')) continue;
    if (/\.(css|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|otf|mjs|aspx)$/i.test(p)) continue;
    if (!p.endsWith('.html')) p = (p.endsWith('/') ? p : `${p}/`) + 'index.html';
    if (p === 'index.html' || p === 'login/index.html') continue;
    seen.add(p);
  }
  return [...seen].sort();
}

function candidates(pageRel) {
  const slug = pageRel.replace(/\/index\.html$/, '');
  return [`https://www.brother-usa.com/${slug}`, `https://www.brother-usa.com/home/${slug}`];
}

async function inspect(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let y = 0;
      const t = setInterval(() => {
        window.scrollBy(0, 600);
        y += 600;
        if (y > document.body.scrollHeight + 1200) {
          clearInterval(t);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 80);
    });
  });
  await page.waitForTimeout(1000);
  return page.evaluate(() => ({
    title: document.title.trim(),
    h1: (document.querySelector('h1')?.textContent || '').trim(),
    main: !!document.querySelector('main,.global-main'),
    css: document.styleSheets.length,
    img: [...document.images].filter((i) => i.complete && i.naturalWidth > 0).length,
    text: document.body.innerText.length,
    is404:
      /\b404\b/i.test(document.title) ||
      /page you requested could not be found/i.test(document.body.innerText),
  }));
}

async function main() {
  const pages = linkedPages();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1536, height: 900 } });
  const bad = [];

  for (const p of pages) {
    const localPage = await ctx.newPage();
    const local = await inspect(localPage, `http://localhost/brother-clone/brother_offline/${p}`);
    await localPage.close();

    let live = null;
    let chosen = '';
    for (const url of candidates(p)) {
      const rp = await ctx.newPage();
      try {
        const data = await inspect(rp, url);
        await rp.close();
        if (!data.is404) {
          live = data;
          chosen = url;
          break;
        }
        if (!live) {
          live = data;
          chosen = url;
        }
      } catch {
        await rp.close();
      }
    }
    if (!live) continue;

    const textPct = Math.round((local.text / (live.text || 1)) * 100);
    const imgPct = Math.round((local.img / (live.img || 1)) * 100);
    const cssPct = Math.round((local.css / (live.css || 1)) * 100);
    const score =
      Math.abs(textPct - 100) +
      Math.abs(imgPct - 100) +
      Math.abs(cssPct - 100) +
      (local.title === live.title ? 0 : 40) +
      (local.h1 === live.h1 ? 0 : 30) +
      (local.main === live.main ? 0 : 40);

    if (score > 120) {
      bad.push({ page: p, score, textPct, imgPct, cssPct, chosen });
    }
  }

  await browser.close();
  bad.sort((a, b) => b.score - a.score);
  fs.writeFileSync('/tmp/layout-bad.json', JSON.stringify(bad, null, 2));
  console.log(`checked ${pages.length} pages, high-divergence ${bad.length}`);
  for (const b of bad.slice(0, 20)) {
    console.log(`${b.score}\t${b.textPct}%\t${b.imgPct}%\t${b.cssPct}%\t${b.page}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
