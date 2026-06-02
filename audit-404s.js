#!/usr/bin/env node
/** Audit local pages for failed network requests (404s). */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname);
const BASE = 'http://localhost/brother-clone/brother_offline';

function walkHtml(dir, files = [], base = dir) {
    for (const name of fs.readdirSync(dir)) {
        if (['assets', 'lib', 'node_modules', '.git'].includes(name)) continue;
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) walkHtml(full, files, base);
        else if (name.endsWith('.html') && name === 'index.html') {
            files.push(path.relative(base, path.dirname(full)).replace(/\\/g, '/') || '.');
        }
    }
    return files;
}

async function auditPage(context, pagePath) {
    const url = pagePath === '.' ? `${BASE}/index.html` : `${BASE}/${pagePath}/index.html`;
    const page = await context.newPage();
    const failed = [];
    page.on('response', (res) => {
        const u = res.url();
        if (!u.includes('brother-clone/brother_offline') && !u.includes('fonts.googleapis')) return;
        if (res.status() >= 400) failed.push({ status: res.status(), url: u });
    });
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(2000);
    } catch (e) {
        failed.push({ status: 'ERR', url: e.message });
    }
    await page.close();
    return { pagePath, url, failed };
}

async function main() {
    const only = process.argv.slice(2);
    let pages = walkHtml(ROOT).filter((p) => p !== 'home' && p !== 'login');
    if (only.length) pages = only;

    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext();
    const allFailed = new Map();

    for (const p of pages) {
        const r = await auditPage(context, p === '.' ? '.' : p);
        if (r.failed.length) {
            console.log(`\n${r.pagePath}: ${r.failed.length} failures`);
            r.failed.slice(0, 15).forEach((f) => console.log(`  ${f.status} ${f.url}`));
            if (r.failed.length > 15) console.log(`  ... +${r.failed.length - 15} more`);
            for (const f of r.failed) {
                const key = f.url.replace(/.*brother_offline\//, '');
                allFailed.set(key, (allFailed.get(key) || 0) + 1);
            }
        } else {
            console.log(`OK ${r.pagePath}`);
        }
    }

    await browser.close();
    if (allFailed.size) {
        console.log('\n=== Top missing assets (across pages) ===');
        [...allFailed.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 40)
            .forEach(([u, n]) => console.log(`${n}x ${u}`));
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
