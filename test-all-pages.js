#!/usr/bin/env node
/**
 * Full QA: every home-linked subpage vs live (never tests index.html).
 * Writes /tmp/brother-offline-qa.json
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = __dirname;
const LOCAL_BASE = 'http://localhost/brother-clone/brother_offline/';
const OUT = '/tmp/brother-offline-qa.json';

function linkedPages() {
  const home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
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

function liveCandidates(pageRel) {
  const slug = pageRel.replace(/\/index\.html$/, '');
  return [`https://www.brother-usa.com/${slug}`, `https://www.brother-usa.com/home/${slug}`];
}

function coveoCachePath(pageRel) {
  let p = pageRel.replace(/\/index\.html$/i, '');
  return path.join(ROOT, 'assets/misc/coveo', `${p.replace(/[^a-zA-Z0-9._-]/g, '__')}.json`);
}

async function measure(page, url, waitMs) {
  const failed = [];
  page.on('response', (res) => {
    const u = res.url();
    if (!u.includes('brother-clone/brother_offline') && !u.includes('fonts.googleapis')) return;
    if (res.status() >= 400) failed.push({ status: res.status(), url: u });
  });

  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e.message || e).slice(0, 200)));

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(waitMs);
  } catch (e) {
    return { error: String(e.message || e), failed, consoleErrors };
  }

  const metrics = await page.evaluate(() => {
    const header = document.querySelector('header');
    const hc = document.querySelector('.header-container');
    const main = document.querySelector('main,.global-main');
    const plp = document.querySelector('atomic-search-interface#plp');
    const cards = document.querySelectorAll(
      'atomic-result-list atomic-result, .offline-coveo-card, .coveo-result, atomic-product'
    );
    const rect = (el) => (el ? Math.round(el.getBoundingClientRect().height) : 0);
    const headerCards = document.querySelectorAll(
      'header atomic-product, header atomic-result, header .coveo-result'
    ).length;
    const bodyText = document.body.innerText.length;
    const imgs = [...document.images].filter((i) => i.complete && i.naturalWidth > 0).length;
    const is404 =
      /\b404\b/i.test(document.title) ||
      /page you requested could not be found/i.test(document.body.innerText);
    return {
      title: document.title.trim(),
      h1: (document.querySelector('h1')?.textContent || '').trim(),
      headerH: rect(header),
      containerH: rect(hc),
      headerCards,
      hasMain: !!main,
      hasHeader: !!header,
      hasPlp: !!plp,
      productCards: cards.length,
      textLen: bodyText,
      imgCount: imgs,
      standaloneInHeader: !!document.querySelector('header #standalone, header atomic-search-interface#standalone'),
      globallinkLen: (document.getElementById('globallink-load-area')?.innerHTML || '').length,
      is404,
    };
  });

  return { ...metrics, failed, consoleErrors };
}

function issuesFor(pageRel, local, live, extra) {
  const issues = [];
  if (local.error) issues.push(`load_error: ${local.error}`);
  if (!local.hasHeader) issues.push('missing_header');
  if (local.headerH > 200) issues.push(`header_too_tall:${local.headerH}`);
  if (local.headerCards > 0) issues.push(`header_product_cards:${local.headerCards}`);
  if (local.standaloneInHeader) issues.push('coveo_standalone_in_header');
  if (local.is404) issues.push('local_404_page');
  if (local.failed?.length) issues.push(`asset_404s:${local.failed.length}`);
  if (extra.noCoveoCache && local.hasPlp) issues.push('missing_coveo_cache');
  if (pageRel === 'global-network/index.html') {
    const gl = local.globallinkLen || 0;
    if (gl < 500) issues.push('globallink_empty');
  }
  if (live && !live.is404) {
    const textPct = Math.round((local.textLen / (live.textLen || 1)) * 100);
    const imgPct = Math.round((local.imgCount / (live.imgCount || 1)) * 100);
    const plpOk = local.hasPlp && local.productCards >= 3;
    if (textPct < 30 && !plpOk) issues.push(`low_text:${textPct}%`);
    if (imgPct < 25 && live.imgCount > 15 && local.imgCount < 8) issues.push(`low_images:${imgPct}%`);
    if (local.hasMain !== live.hasMain) issues.push('main_structure_mismatch');
    if (local.hasPlp && local.productCards < 3 && live.productCards >= 3) {
      issues.push(`plp_cards:${local.productCards}_vs_live_${live.productCards}`);
    }
  }
  if (local.consoleErrors?.length) {
    const critical = local.consoleErrors.filter(
      (e) =>
        /undefined is not a function|failed to fetch|\$ is not defined|Coveo is not defined/i.test(e) &&
        !/indexOf is not a function|coveo|atomic|fbq|utag|pardot|optimizely/i.test(e)
    );
    if (critical.length) issues.push(`js_errors:${critical.length}`);
  }
  return issues;
}

async function main() {
  const pages = linkedPages();
  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() =>
    chromium.launch({ headless: true })
  );
  const ctx = await browser.newContext({ viewport: { width: 1536, height: 900 } });
  const results = [];

  for (const pageRel of pages) {
    const localUrl = LOCAL_BASE + pageRel;
    const lp = await ctx.newPage();
    const local = await measure(lp, localUrl, 5000);
    await lp.close();

    let live = null;
    let liveUrl = '';
    for (const c of liveCandidates(pageRel)) {
      const rp = await ctx.newPage();
      try {
        const data = await measure(rp, c, 4000);
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
      } catch {
        await rp.close();
      }
    }

    const extra = { noCoveoCache: !fs.existsSync(coveoCachePath(pageRel)) };
    const issues = issuesFor(pageRel, local, live, extra);
    results.push({
      page: pageRel,
      liveUrl,
      issues,
      local: {
        headerH: local.headerH,
        productCards: local.productCards,
        textLen: local.textLen,
        imgCount: local.imgCount,
        failed: (local.failed || []).length,
      },
      live: live
        ? { textLen: live.textLen, imgCount: live.imgCount, productCards: live.productCards }
        : null,
    });
    const flag = issues.length ? 'FAIL' : 'OK';
    console.log(`${flag}\t${pageRel}${issues.length ? '\t' + issues.join(', ') : ''}`);
  }

  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  const failing = results.filter((r) => r.issues.length);
  console.log(`\n${failing.length}/${results.length} pages with issues → ${OUT}`);
  process.exit(failing.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
