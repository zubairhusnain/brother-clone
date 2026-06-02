#!/usr/bin/env node
/**
 * ONLY pages directly linked from brother_offline/index.html (never live mega-menu).
 * Does NOT modify index.html.
 *
 *   node brother_offline/scrape-linked-pages.js --audit
 *   node brother_offline/scrape-linked-pages.js --prune
 *   node brother_offline/scrape-linked-pages.js --rescrape
 *   node brother_offline/scrape-linked-pages.js --rescrape --chunk 1/4
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname);
const HOME = path.join(ROOT, 'index.html');
const { scrapeOnePage } = require('./lib/scrape-one-page.js');

function isPageHref(href) {
    if (!href.startsWith('./')) return false;
    const p = href.split('#')[0].split('?')[0].slice(2);
    if (!p || p.startsWith('assets/')) return false;
    if (/\.(css|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|otf|mjs|aspx)$/i.test(p)) return false;
    return true;
}

function normalizePageHref(href) {
    let p = href.split('#')[0].split('?')[0].slice(2);
    if (!p) return 'index.html';
    if (!p.endsWith('.html')) p = p.endsWith('/') ? `${p}index.html` : `${p}/index.html`;
    return p.replace(/\\/g, '/');
}

function getHomeLinkedPages() {
    const html = fs.readFileSync(HOME, 'utf8');
    const links = new Set(['index.html']);
    const re = /href\s*=\s*["'](\.\/[^"'#?]+)["']/gi;
    let m;
    while ((m = re.exec(html))) {
        if (!isPageHref(m[1])) continue;
        links.add(normalizePageHref(m[1]));
    }
    return [...links].sort();
}

function walkHtmlFiles(dir, files = [], base = dir) {
    for (const name of fs.readdirSync(dir)) {
        if (name === 'node_modules' || name === '.git' || name === 'assets' || name === 'lib') continue;
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) walkHtmlFiles(full, files, base);
        else if (name.endsWith('.html')) files.push(path.relative(base, full).replace(/\\/g, '/'));
    }
    return files;
}

function audit() {
    const pages = getHomeLinkedPages();
    const subpages = pages.filter((p) => p !== 'index.html');
    const missing = [];
    const present = [];
    for (const rel of subpages) {
        const full = path.join(ROOT, rel);
        if (fs.existsSync(full) && fs.statSync(full).size > 1000) present.push(rel);
        else missing.push(rel);
    }
    const allHtml = walkHtmlFiles(ROOT);
    const extra = allHtml.filter((p) => !pages.includes(p) && p !== 'home/index.html');

    console.log(`Links on front page: ${pages.length} (${subpages.length} subpages)`);
    console.log(`Subpages present: ${present.length}`);
    console.log(`Subpages missing/empty: ${missing.length}`);
    console.log(`Extra pages on disk (not linked from home): ${extra.length}`);
    if (missing.length) {
        console.log('\nMissing subpages:');
        missing.forEach((p) => console.log(' ', p));
    }
    if (extra.length) {
        console.log('\nExtra pages (run --prune to remove):');
        extra.slice(0, 20).forEach((p) => console.log(' ', p));
        if (extra.length > 20) console.log(`  ... and ${extra.length - 20} more`);
    }
    return { pages, subpages, missing, present, extra };
}

function pruneExtra() {
    const { pages, extra } = audit();
    let removed = 0;
    for (const rel of extra) {
        const full = path.join(ROOT, rel);
        fs.unlinkSync(full);
        removed++;
        const dir = path.dirname(full);
        try {
            if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
        } catch (e) {}
    }
    console.log(`\nRemoved ${removed} extra HTML pages.`);
    return { pages, removed };
}

function sliceChunk(list, chunkArg) {
    const m = /^(\d+)\/(\d+)$/.exec(chunkArg);
    if (!m) throw new Error(`Bad chunk: ${chunkArg}`);
    const idx = parseInt(m[1], 10) - 1;
    const total = parseInt(m[2], 10);
    const size = Math.ceil(list.length / total);
    return list.slice(idx * size, idx * size + size);
}

async function rescrape(pageRels) {
    const browser = await chromium.launch({
        channel: 'chrome',
        headless: true,
        args: ['--disable-http2', '--window-size=1920,1080'],
    });
    const context = await browser.newContext({
        userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
    });

    let ok = 0;
    let fail = 0;
    for (const rel of pageRels) {
        const r = await scrapeOnePage(context, rel);
        if (r.skipped) continue;
        if (r.ok) ok++;
        else fail++;
    }
    await browser.close();
    console.log(`\nDone: ${ok} saved, ${fail} failed.`);
    return { ok, fail };
}

async function main() {
    const args = process.argv.slice(2);
    if (args.includes('--audit') || !args.length) {
        audit();
        return;
    }
    if (args.includes('--prune')) {
        pruneExtra();
        audit();
        return;
    }
    if (args.includes('--rescrape')) {
        const { subpages } = audit();
        let list = subpages.filter((p) => p !== 'login/index.html');
        const chunkIdx = args.indexOf('--chunk');
        if (chunkIdx !== -1) list = sliceChunk(list, args[chunkIdx + 1]);
        console.log(`\nRe-scraping ${list.length} pages from live (Chrome)...\n`);
        await rescrape(list);
        audit();
        return;
    }
    console.log('Usage: --audit | --prune | --rescrape [--chunk N/M]');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
