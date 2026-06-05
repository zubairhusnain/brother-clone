#!/usr/bin/env node
/**
 * Fix layout/404 issues on all home-linked subpages (never touches index.html).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = path.join(__dirname);
const ASSETS = path.join(ROOT, 'assets');
const { sanitizeOfflinePageHtml } = require('./lib/sanitize-offline-header.js');
const {
    normalizeMalformedPageHtml,
    injectBeforeHeadClose,
    injectOutletHeroIfMissing,
} = require('./lib/normalize-page-html.js');

const COVEO_ATOMIC = [
    'https://static.cloud.coveo.com/atomic/v2/atomic.esm.js',
    'https://static.cloud.coveo.com/atomic/v2/p-e1255160.js',
    'https://static.cloud.coveo.com/atomic/v2/p-5925f187.js',
];

const PRESENTATION_ASSETS = [
    '/Presentation/Includes/_images/icons/icon-account.svg',
    '/Presentation/Includes/_images/icons/logo-white.svg',
    '/Presentation/Includes/_images/icons/icon-arrow-base.png',
];
const ATOMIC_CDN = 'https://static.cloud.coveo.com/atomic/v2';

function getHomeLinkedPages() {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const links = new Set();
    const re = /href\s*=\s*["'](\.\/[^"'#?]+)["']/gi;
    let m;
    while ((m = re.exec(html))) {
        const href = m[1];
        if (!href.startsWith('./')) continue;
        let p = href.split('#')[0].split('?')[0].slice(2);
        if (!p || p.startsWith('assets/')) continue;
        if (/\.(css|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|otf|mjs)$/i.test(p)) continue;
        if (!p.endsWith('.html')) p = p.endsWith('/') ? `${p}index.html` : `${p}/index.html`;
        if (p !== 'index.html') links.add(p);
    }
    return [...links];
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

function downloadUrl(url, dest) {
    return new Promise((resolve) => {
        const client = url.startsWith('https') ? https : http;
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        client
            .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    downloadUrl(res.headers.location, dest).then(resolve);
                    return;
                }
                if (res.statusCode !== 200) {
                    res.resume();
                    resolve(false);
                    return;
                }
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => {
                    fs.writeFileSync(dest, Buffer.concat(chunks));
                    resolve(true);
                });
            })
            .on('error', () => resolve(false));
    });
}

async function downloadCoreAssets() {
    console.log('Downloading Coveo atomic v2 chunks...');
    for (const url of COVEO_ATOMIC) {
        const name = path.basename(url);
        const dest = path.join(ASSETS, 'js', name);
        const ok = await downloadUrl(url, dest);
        console.log(ok ? `  ✓ ${name}` : `  ✗ ${name}`);
    }

    console.log('Downloading Presentation icons...');
    for (const p of PRESENTATION_ASSETS) {
        const name = path.basename(p);
        const dest = path.join(ASSETS, 'images', name);
        if (fs.existsSync(dest)) continue;
        const ok = await downloadUrl(`https://www.brother-usa.com${p}`, dest);
        console.log(ok ? `  ✓ ${name}` : `  ✗ ${name}`);
    }
}

function prefixForPage(pageRel) {
    const depth = pageRel.split('/').length - 1;
    return depth > 0 ? '../'.repeat(depth) : './';
}

const PRESENTATION_STYLESHEETS = [
    'Presentation__Includes___css__main.css',
    'Presentation__Includes___css__NewComponents__main.css',
];

function ensurePresentationStylesheets(html, prefix) {
    for (const name of PRESENTATION_STYLESHEETS) {
        const href = `${prefix}assets/css/${name}`;
        const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(
            new RegExp(`<link[^>]+href=["'][^"']*${esc}["'][^>]*>`, 'gi'),
            ''
        );
        if (!new RegExp(`<link[^>]+rel=["']stylesheet["'][^>]+href=["']${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i').test(html)) {
            html = injectBeforeHeadClose(html, `    <link rel="stylesheet" href="${href}">`);
        }
    }
    return html;
}

function stripOrphanHeadClosingTags(html) {
    return html.replace(/(\s*<\/div>\s*)+(?=\s*<\/head>)/gi, '\n');
}

function fixHtml(html, pageRel) {
    const prefix = prefixForPage(pageRel);

    html = normalizeMalformedPageHtml(html);
    html = injectOutletHeroIfMissing(html, pageRel);

    // Absolute Presentation paths → local images
    html = html.replace(
        /url\(\s*\/Presentation\/Includes\/_images\/([^)]+)\)/gi,
        (_, sub) => `url(${prefix}assets/images/${path.basename(sub.split('?')[0])})`
    );
    html = html.replace(
        /(["'])\/Presentation\/Includes\/_images\/([^"']+)\1/gi,
        (_, q, sub) => `${q}${prefix}assets/images/${path.basename(sub.split('?')[0])}${q}`
    );

    // Protocol-relative fonts
    html = html.replace(/href="\/\/fonts\.googleapis\.com/g, 'href="https://fonts.googleapis.com');
    html = html.replace(/href='\/\/fonts\.googleapis\.com/g, "href='https://fonts.googleapis.com");
    html = html.replace(/src="\/\/([^"]+)"/g, 'src="https://$1"');
    html = html.replace(/src='\/\/([^']+)'/g, "src='https://$1'");

    // Broken misc/css links
    html = html.replace(/<link[^>]+href=["'][^"']*assets\/misc\/css["'][^>]*>/gi, '');

    // Remove remote third-party scripts that can break offline rendering
    html = html.replace(
        /<script[^>]+src=["']https?:\/\/[^"']+["'][^>]*><\/script>/gi,
        (tag) => {
            // Keep only localizable/static brother video API includes if any
            if (/youtube\.com\/iframe_api/i.test(tag)) return '';
            return '';
        }
    );
    html = html.replace(/<script[^>]+src=["']\/\/[^"']+["'][^>]*><\/script>/gi, '');
    html = html.replace(/<script[^>]+src=["'][^"']*\/cdn-cgi\/[^"']*["'][^>]*><\/script>/gi, '');

    // Remove preconnect/preload hints to remote origins (no effect offline)
    html = html.replace(/<link[^>]+rel=["']preconnect["'][^>]*>/gi, '');
    html = html.replace(/<link[^>]+rel=["']preload["'][^>]+href=["']https?:\/\/[^"']+["'][^>]*>/gi, '');

    // Always load Atomic directly from CDN (prevents missing local *.entry.js chunks)
    html = html.replace(
        /<script[^>]+type=["']module["'][^>]+src=["'][^"']*atomic\.esm\.js["'][^>]*><\/script>/gi,
        '<script type="module" src="https://static.cloud.coveo.com/atomic/v2/atomic.esm.js"></script>'
    );
    const plpHasSearchHub =
        /<atomic-search-interface[^>]*\bid=["']plp["'][^>]*\bsearch-hub=["'][^"'\s][^"']*["']/i.test(html);
    const plpHasRenderedResults =
        /<atomic-search-interface[^>]*\bid=["']plp["'][^>]*>[\s\S]*?<atomic-result[\s>]/i.test(html);
    if (plpHasSearchHub && !/atomic\.esm\.js/i.test(html)) {
        html = injectBeforeHeadClose(
            html,
            '    <script type="module" src="https://static.cloud.coveo.com/atomic/v2/atomic.esm.js"></script>'
        );
    }
    if (plpHasRenderedResults && !plpHasSearchHub) {
        html = html.replace(
            /\s*<script[^>]+src=["'][^"']*atomic\.esm\.js["'][^>]*><\/script>\s*/gi,
            ''
        );
    }
    html = html.replace(
        /language-assets-path=["']\.\/lang["']/gi,
        `language-assets-path="${prefix}assets/misc/lang"`
    );
    html = html.replace(
        /icon-assets-path=["']\.\/assets["']/gi,
        `icon-assets-path="${prefix}assets"`
    );

    // Coveo atomic imports resolve locally
    html = html.replace(
        /from\s*["']\.\/p-(5925f187|e1255160)\.js["']/g,
        (m) => m
    );

    // Duplicate optimized-min (keep first at end of body area)
    let optCount = 0;
    html = html.replace(
        /<script[^>]*src=["'][^"']*optimized-min\.js["'][^>]*><\/script>\s*/gi,
        (match) => {
            optCount++;
            return optCount === 1 ? match : '';
        }
    );

    // Hide cookie/personalization overlays that break layout offline
    if (!html.includes('offline-layout-fix')) {
        html = injectBeforeHeadClose(
            html,
            `<style id="offline-layout-fix">
#onetrust-banner-sdk,#onetrust-consent-sdk,.embedded-messaging{display:none!important}
.global-header,.header-container,.mega-menu-container{visibility:visible!important}
</style>`
        );
    }

    if (!html.includes('offline-hide-banners.css')) {
        html = injectBeforeHeadClose(
            html,
            `    <link rel="stylesheet" href="${prefix}assets/css/offline-hide-banners.css">`
        );
    }

    if (!html.includes('offline-layout-parity.css')) {
        html = injectBeforeHeadClose(
            html,
            `    <link rel="stylesheet" href="${prefix}assets/css/offline-layout-parity.css">`
        );
    }

    if (/subscription-info/i.test(pageRel) && !html.includes('auth-drill-down.css')) {
        html = injectBeforeHeadClose(
            html,
            `    <link rel="stylesheet" href="${prefix}assets/css/auth-drill-down.css">`
        );
    }

    if (/subscription-info/i.test(pageRel)) {
        html = html.replace(/^<!DOCTYPE html><html[^>]*>\s*/i, '');
        html = html.replace(/<h1>\s*<\/h1>\s*/gi, '');
        if (!/<title>Brother Refresh/i.test(html)) {
            html = html.replace(
                /<head([^>]*)>/i,
                `<head$1>\n    <title>Brother Refresh EZ Print Subscription Service | Brother</title>`
            );
        }
        if (!html.includes('offline-subscription-fix.css')) {
            html = injectBeforeHeadClose(
                html,
                `    <link rel="stylesheet" href="${prefix}assets/css/offline-subscription-fix.css">`
            );
        }
        if (!html.includes('global-alert-promo') && /<body[^>]*>/i.test(html)) {
            html = html.replace(
                /<body([^>]*)>/i,
                `<body$1>\n<div class="global-alert-promo richTextTealiumTracker" role="region" aria-label="Global Alert Section" style="display:block"><div class="container" style="text-align:center;padding:10px 15px;background:#0d2ea0;color:#fff;font-size:14px;"><a href="${prefix}supplies/subscription-info/index.html" style="color:#fff;text-decoration:none;">Subscribe &amp; Save with Refresh EZ Print Subscription</a></div></div>`
            );
        }
        html = html.replace(
            /observerHero\.observe\(document\.querySelector\("\.main-header-section"\)\);/g,
            'var heroObserve = document.querySelector(".billboard-text-overlay-hero") || document.querySelector(".main-header-section"); if (heroObserve) observerHero.observe(heroObserve);'
        );
        html = html.replace(
            /\s*<link[^>]+href=["'][^"']*CoveoCustom__css__index\.css["'][^>]*>\s*/gi,
            ''
        );
        if (!html.includes('CoveoCustom__css__index.css')) {
            html = injectBeforeHeadClose(
                html,
                `    <link rel="stylesheet" href="${prefix}assets/css/CoveoCustom__css__index.css">`
            );
        }
    }

    if (!html.includes('offline-header-fix.css')) {
        html = injectBeforeHeadClose(
            html,
            `    <link rel="stylesheet" href="${prefix}assets/css/offline-header-fix.css">`
        );
    }

    if (/<atomic-search-interface[^>]*\bid=["']plp["']/i.test(html) && !html.includes('offline-plp-fix.css')) {
        html = injectBeforeHeadClose(
            html,
            `    <link rel="stylesheet" href="${prefix}assets/css/offline-plp-fix.css">`
        );
    }

    if (pageRel === 'outlet/index.html' && !html.includes('offline-outlet-plp.css')) {
        html = injectBeforeHeadClose(
            html,
            `    <link rel="stylesheet" href="${prefix}assets/css/offline-outlet-plp.css">`
        );
    }

    if (pageRel === 'outlet/index.html' && !/<title>Brother Outlet/i.test(html)) {
        html = html.replace(/<head([^>]*)>/i, `<head$1>\n    <title>Brother Outlet | Deals on Printers, Sewing &amp; More</title>`);
    }

    // Remove Evergage/MCP "Exclusive Offers" widget markup entirely.
    html = html.replace(
        /<style[^>]*>[\s\S]*?#mcp-toast-parent-container[\s\S]*?<\/style>/gi,
        ''
    );
    html = html.replace(
        /<div[^>]*id=["']mcp-toast-parent-container["'][^>]*>[\s\S]*?(?=<div[^>]*id=["']__EAAPS_PORTAL["']|<script[^>]+src=["'][^"']*main\.js["']|<\/body>)/gi,
        ''
    );
    html = html.replace(/<div[^>]*id=["']mcp-utm["'][^>]*>\s*<\/div>/gi, '');
    html = html.replace(/<div[^>]*id=["']mcp-toast1["'][^>]*>\s*<\/div>/gi, '');
    html = html.replace(/<div[^>]*class=["'][^"']*elfsight-app-[^"']*["'][^>]*>\s*<\/div>/gi, '');
    html = html.replace(/<div[^>]*id=["']__EAAPS_PORTAL["'][\s\S]*?<\/aside>\s*<\/div>/gi, '');
    html = html.replace(/<aside[^>]*class=["'][^"']*cf_invite_[^"']*["'][\s\S]*?<\/aside>/gi, '');

    if (!html.includes('offline-stubs.js')) {
        html = injectBeforeHeadClose(
            html,
            `    <script src="${prefix}assets/js/offline-stubs.js"></script>`
        );
    }

    html = html.replace(
        /\s*<script[^>]+src=["'][^"']*jquery-3\.2\.1\.min\.js["'][^>]*><\/script>\s*/gi,
        ''
    );
    if (!/<head[^>]*>[\s\S]{0,800}jquery-3\.2\.1/i.test(html)) {
        html = html.replace(
            /<head([^>]*)>/i,
            `<head$1>\n    <script src="${prefix}assets/js/jquery-3.2.1.min.js"></script>`
        );
    }

    if (!html.includes('fonts.googleapis.com/css2')) {
        html = injectBeforeHeadClose(
            html,
            `    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Catamaran:wght@100;400;600&family=Open+Sans:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400&display=swap">`
        );
    }

    // Ensure core CSS present once
    const hasMain = /href=["'][^"']*assets\/css\/main\.css["']/i.test(html);
    if (!hasMain) {
        html = injectBeforeHeadClose(
            html,
            `    <link rel="stylesheet" href="${prefix}assets/css/bootstrap.min.css">\n    <link rel="stylesheet" href="${prefix}assets/css/main.css">\n    <link rel="stylesheet" href="${prefix}assets/css/optimized-min.css">`
        );
    }

    // Ensure key local scripts exist once
    if (!/src=["'][^"']*assets\/js\/main\.js["']/i.test(html)) {
        html = html.replace(
            /<\/body>/i,
            `    <script src="${prefix}assets/js/main.js" defer></script>\n</body>`
        );
    }
    if (!/src=["'][^"']*assets\/js\/custom\.js["']/i.test(html)) {
        html = html.replace(
            /<\/body>/i,
            `    <script src="${prefix}assets/js/custom.js"></script>\n</body>`
        );
    }
    if (!/src=["'][^"']*assets\/js\/optimized-min\.js["']/i.test(html)) {
        html = html.replace(
            /<\/body>/i,
            `    <script src="${prefix}assets/js/optimized-min.js"></script>\n</body>`
        );
    }

    // Malformed attributes from scrape
    html = html.replace(/\s+t=""/g, '');
    html = html.replace(/\s+"=""/g, '');

    html = stripOrphanHeadClosingTags(html);
    html = ensurePresentationStylesheets(html, prefix);
    html = html.replace(/\.main-header-sectiFGeton/g, '.main-header-section');

    if (!html.includes('offline-sticky-bar-fix')) {
        html = injectBeforeHeadClose(
            html,
            `<style id="offline-sticky-bar-fix">
.sticky-bar-hero{top:130px!important}
@media (max-width:767px){.sticky-bar{bottom:35px!important}}
</style>`
        );
    }

    html = sanitizeOfflinePageHtml(html);

    if (pageRel === 'global-network/index.html') {
        if (!html.includes('globallink.css')) {
            html = injectBeforeHeadClose(
                html,
                `    <link rel="stylesheet" href="${prefix}assets/css/globallink.css">`
            );
        }
    }

    return html;
}

function parseMissingFromAuditLog(auditPath) {
    if (!fs.existsSync(auditPath)) return [];
    const txt = fs.readFileSync(auditPath, 'utf8');
    const out = new Set();
    for (const line of txt.split('\n')) {
        const m = line.match(/404 http:\/\/localhost\/brother-clone\/brother_offline\/(.+)$/);
        if (m) out.add(m[1].trim());
    }
    return [...out];
}

function resolveSourceUrlForMissing(relPath) {
    if (/^assets\/js\/p-[a-f0-9]+\.entry\.js$/i.test(relPath)) {
        return `${ATOMIC_CDN}/${path.basename(relPath)}`;
    }
    if (relPath === 'assets/js/addthis_widget.js') {
        return 'https://s7.addthis.com/js/300/addthis_widget.js';
    }
    if (relPath === 'assets/js/2.32.1/ps-widget.js') {
        return 'https://cdn.pricespider.com/1/lib/ps-widget.js';
    }
    if (relPath === 'fonts/Avenir-Medium.woff') {
        return 'https://www.brother-usa.com/Presentation/Includes/_fonts/Avenir-Medium.woff';
    }
    if (relPath.includes('/-/media/')) {
        return `https://www.brother-usa.com/${relPath.slice(relPath.indexOf('-/media/'))}`;
    }
    if (relPath.includes('/~/media/')) {
        return `https://www.brother-usa.com/${relPath.slice(relPath.indexOf('~/media/'))}`;
    }
    if (relPath === 'assets/images/icons/icon-arrow-base.png') {
        return 'https://www.brother-usa.com/Presentation/Includes/_images/icons/icon-arrow-base.png';
    }
    return null;
}

async function downloadMissingFromAudit() {
    const missing = parseMissingFromAuditLog('/tmp/full-asset-audit.log');
    if (!missing.length) return;
    console.log(`\nDownloading ${missing.length} missing assets from audit log...`);
    let ok = 0;
    for (const rel of missing) {
        if (rel === 'assets/js/js/') continue;
        const src = resolveSourceUrlForMissing(rel);
        if (!src) continue;
        const dest = path.join(ROOT, rel);
        const done = await downloadUrl(src, dest);
        if (done) ok++;
    }
    console.log(`  downloaded ${ok} assets`);
}

async function main() {
    await downloadCoreAssets();

    console.log('Fixing media MIME paths...');
    require('child_process').execSync('node fix-media-mime.js', { cwd: ROOT, stdio: 'inherit' });

    const pages = getHomeLinkedPages();
    const all = [...new Set([...pages, ...walkHtml(ROOT).filter((p) => p !== 'index.html')])];

    console.log(`\nFixing ${all.length} HTML pages...`);
    for (const pageRel of all) {
        const full = path.join(ROOT, pageRel);
        if (!fs.existsSync(full)) continue;
        const before = fs.readFileSync(full, 'utf8');
        const after = fixHtml(before, pageRel);
        if (after !== before) {
            fs.writeFileSync(full, after);
            console.log(`  fixed ${pageRel}`);
        }
    }
    await downloadMissingFromAudit();
    console.log('\nDone.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
