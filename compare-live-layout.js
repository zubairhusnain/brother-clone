#!/usr/bin/env node
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = __dirname;
const home = fs.readFileSync(`${ROOT}/index.html`, 'utf8');

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
  await page.waitForTimeout(1400);
  return page.evaluate(() => ({
    title: document.title.trim(),
    h1: (document.querySelector('h1')?.textContent || '').trim(),
    text: document.body.innerText.length,
    imgs: [...document.images].filter((i) => i.complete && i.naturalWidth > 0).length,
    css: document.styleSheets.length,
    main: !!document.querySelector('main,.global-main'),
    is404:
      /\b404\b/i.test(document.title) ||
      /page you requested could not be found/i.test(document.body.innerText),
  }));
}

async function main() {
  const pages = linkedPages();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1536, height: 900 } });
  const out = [];

  for (const p of pages) {
    const lp = await ctx.newPage();
    const local = await inspect(lp, `http://localhost/brother-clone/brother_offline/${p}`);
    await lp.close();

    let live = null;
    let liveUrl = '';
    for (const c of candidates(p)) {
      const rp = await ctx.newPage();
      try {
        const data = await inspect(rp, c);
        await rp.close();
        if (!data.is404) {
          live = data;
          liveUrl = c;
          break;
        }
        if (!live) {
          live = data;
          liveUrl = c;
        }
      } catch (e) {
        await rp.close();
      }
    }
    if (!live) continue;

    const textPct = Math.round((local.text / (live.text || 1)) * 100);
    const imgPct = Math.round((local.imgs / (live.imgs || 1)) * 100);
    const cssPct = Math.round((local.css / (live.css || 1)) * 100);
    const score =
      Math.abs(textPct - 100) +
      Math.abs(imgPct - 100) +
      Math.abs(cssPct - 100) +
      (local.title === live.title ? 0 : 40) +
      (local.h1 === live.h1 ? 0 : 25) +
      (local.main === live.main ? 0 : 40);

    out.push({
      page: p,
      liveUrl,
      score,
      textPct,
      imgPct,
      cssPct,
      titleSame: local.title === live.title,
      h1Same: local.h1 === live.h1,
      mainSame: local.main === live.main,
    });
  }

  await browser.close();
  out.sort((a, b) => b.score - a.score);
  fs.writeFileSync('/tmp/layout-compare.json', JSON.stringify(out, null, 2));
  console.log(`Compared ${out.length} pages.`);
  for (const r of out.slice(0, 12)) {
    console.log(
      `${r.score}\t${r.textPct}%\t${r.imgPct}%\t${r.cssPct}%\t${r.page}\t${r.titleSame ? 'T' : 't'}${r.h1Same ? 'H' : 'h'}${r.mainSame ? 'M' : 'm'}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
