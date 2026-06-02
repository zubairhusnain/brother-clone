/**
 * Scrape one live Brother /home/* page — full HTML + assets.
 * Never modifies brother_offline/index.html.
 */
const fs = require('fs');
const path = require('path');
const {
    LOCAL_DIR,
    TARGET_HOST,
    getRelativePrefix,
    downloadAsset,
} = require('../../scraper.js');
const { fixPageHtml } = require('./fix-page-html.js');

const LIVE_BASE = 'https://www.brother-usa.com';

function localPathToLiveUrl(pageRel) {
    if (pageRel === 'index.html') return `${LIVE_BASE}/home`;
    const slug = pageRel.replace(/\/index\.html$/, '');
    return `${LIVE_BASE}/${slug}`;
}

function localPathToHomeUrl(pageRel) {
    if (pageRel === 'index.html') return `${LIVE_BASE}/home`;
    const slug = pageRel.replace(/\/index\.html$/, '');
    return `${LIVE_BASE}/home/${slug}`;
}

function isLikely404Page(page) {
    const url = page.url();
    if (/\/404([/?#]|$)/i.test(url)) return true;
    const title = (page && page._pageTitle) || '';
    if (/\b404\b/i.test(title)) return true;
    return false;
}

function assetBucket(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (['.js', '.mjs'].includes(ext)) return 'js';
    if (ext === '.css') return 'css';
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext)) return 'images';
    if (['.woff', '.woff2', '.ttf', '.eot', '.otf'].includes(ext)) return 'fonts';
    return 'misc';
}

async function collectAssetUrls(page) {
    return page.evaluate(() => {
        const urls = new Set();
        const add = (u) => {
            if (!u || u.startsWith('data:')) return;
            try {
                urls.add(new URL(u.split(/\s+/)[0], location.href).href);
            } catch (e) {}
        };
        document
            .querySelectorAll(
                'link[href], script[src], img[src], img[data-src], source[srcset], video[src], use[href]'
            )
            .forEach((el) => {
                if (el.href) add(el.href);
                if (el.src) add(el.src);
                if (el.getAttribute('data-src')) add(el.getAttribute('data-src'));
                if (el.srcset) el.srcset.split(',').forEach((p) => add(p.trim().split(/\s+/)[0]));
            });
        document.querySelectorAll('style').forEach((el) => {
            const m = el.textContent.match(/url\(['"]?([^'")]+)/g);
            if (m) m.forEach((u) => add(u.replace(/^url\(['"]?/, '')));
        });
        return [...urls];
    });
}

async function rewriteDom(page, prefix) {
    await page.evaluate(
        ({ prefix, host }) => {
            function rewriteAssetUrl(val) {
                if (!val || val.startsWith('data:')) return null;
                try {
                    const abs = new URL(val.split(' ')[0], location.href);
                    if (abs.hostname !== host && !abs.hostname.includes('brother')) {
                        if (abs.pathname.match(/\.(css|js|png|jpe?g|gif|svg|webp|woff2?)$/i)) {
                            /* still rewrite brother CDN paths */
                        } else return null;
                    }
                    const pathname = abs.pathname.split('?')[0];
                    const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
                    if (!filename || !filename.includes('.')) return null;
                    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
                    let bucket = 'misc';
                    if (['.js', '.mjs'].includes(ext)) bucket = 'js';
                    else if (ext === '.css') bucket = 'css';
                    else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext))
                        bucket = 'images';
                    else if (['.woff', '.woff2', '.ttf', '.eot', '.otf'].includes(ext)) bucket = 'fonts';
                    return `${prefix}assets/${bucket}/${filename}`;
                } catch (e) {
                    return null;
                }
            }

            document.querySelectorAll('link[href], script[src], img[src], img[data-src]').forEach((el) => {
                const attr = el.tagName === 'LINK' ? 'href' : 'src';
                const val = el.getAttribute(attr);
                const next = rewriteAssetUrl(val);
                if (next) el.setAttribute(attr, next);
            });

            document.querySelectorAll('a[href]').forEach((el) => {
                const href = el.getAttribute('href');
                if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:'))
                    return;
                try {
                    const abs = new URL(href, location.href);
                    if (abs.host !== host) return;
                    let cleanLinkPath = abs.pathname.replace(/^\/+/, '').replace(/^home\//i, '');
                    if (
                        !cleanLinkPath ||
                        cleanLinkPath.toLowerCase() === 'home' ||
                        cleanLinkPath.toLowerCase() === 'home/'
                    ) {
                        el.setAttribute('href', `${prefix}index.html`);
                    } else {
                        el.setAttribute(
                            'href',
                            `${prefix}${cleanLinkPath.replace(/\/$/, '')}/index.html`
                        );
                    }
                } catch (e) {}
            });
        },
        { prefix, host: TARGET_HOST }
    );
}

async function scrapeOnePage(context, pageRel, options = {}) {
    if (pageRel === 'index.html' && !options.allowHome) {
        console.log(`  ⊘ skipped ${pageRel} (front page is not modified)`);
        return { ok: false, skipped: true };
    }
    if (pageRel === 'login/index.html') {
        console.log(`  ⊘ skipped ${pageRel} (login stub kept)`);
        return { ok: false, skipped: true };
    }

    const physicalPagePath = path.join(LOCAL_DIR, pageRel);
    const relativePrefix = getRelativePrefix(pageRel === 'index.html' ? 'index.html' : pageRel);
    const candidates = options.liveUrl
        ? [options.liveUrl]
        : [localPathToLiveUrl(pageRel), localPathToHomeUrl(pageRel)];

    const page = await context.newPage();
    try {
        console.log(`\n→ ${pageRel}`);

        let liveUrl = null;
        for (const candidate of candidates) {
            console.log(`  trying ${candidate}`);
            await page.goto(candidate, { waitUntil: 'domcontentloaded', timeout: 90000 });
            await page.waitForTimeout(2500);
            page._pageTitle = await page.title().catch(() => '');
            if (!isLikely404Page(page)) {
                liveUrl = candidate;
                break;
            }
        }
        if (!liveUrl) {
            throw new Error(`Only 404 versions found for ${pageRel}`);
        }
        console.log(`  selected ${liveUrl}`);
        await page.waitForSelector('header, .global-main, main', { timeout: 60000 }).catch(() => {});
        await page.waitForTimeout(3000);

        for (const sel of [
            '#onetrust-accept-btn-handler',
            '.onetrust-close-btn-handler',
            '#onetrust-banner-sdk button',
        ]) {
            const btn = await page.$(sel);
            if (btn) {
                await btn.click().catch(() => {});
                await page.waitForTimeout(600);
                break;
            }
        }

        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let total = 0;
                const timer = setInterval(() => {
                    window.scrollBy(0, 500);
                    total += 500;
                    if (total >= document.body.scrollHeight + 800) {
                        clearInterval(timer);
                        window.scrollTo(0, 0);
                        resolve();
                    }
                }, 120);
            });
        });
        await page.waitForTimeout(3000);

        const assets = await collectAssetUrls(page);
        for (const assetUrl of assets) {
            await downloadAsset(context, assetUrl, liveUrl);
        }

        await rewriteDom(page, relativePrefix);
        let html = await page.content();
        html = fixPageHtml(html, pageRel, relativePrefix);

        fs.mkdirSync(path.dirname(physicalPagePath), { recursive: true });
        fs.writeFileSync(physicalPagePath, html);
        console.log(`  ✓ saved (${Math.round(html.length / 1024)} KB)`);
        return { ok: true, bytes: html.length };
    } catch (err) {
        console.error(`  ✗ ${err.message}`);
        return { ok: false, error: err.message };
    } finally {
        await page.close();
    }
}

module.exports = { LIVE_BASE, localPathToLiveUrl, scrapeOnePage };
