/**
 * Fix home page (index.html) asset paths and download missing files.
 * Run: node fix-home-page.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname);
const ASSETS = path.join(ROOT, 'assets');

const DOWNLOADS = [
    { url: 'https://www.brother-usa.com/-/media/homepage-redesign/2025/05-may/brother-printer-spring-hero-banner.png', dest: 'images/brother-printer-spring-hero-banner.png' },
    { url: 'https://static.cloud.coveo.com/atomic/v2/p-e1255160.js', dest: 'js/p-e1255160.js' },
    { url: 'https://static.cloud.coveo.com/atomic/v2/p-5925f187.js', dest: 'js/p-5925f187.js' },
    { url: 'https://www.brother-usa.com/Presentation/Includes/_images/icons/icon-arrow.png', dest: 'images/icon-arrow.png' },
    { url: 'https://www.brother-usa.com/Presentation/Includes/_images/icons/icon-arrow-white.png', dest: 'images/icon-arrow-white.png' },
    { url: 'https://www.brother-usa.com/Presentation/Includes/_images/icons/icon-search-white.svg', dest: 'images/icon-search-white.svg' },
    { url: 'https://www.brother-usa.com/Presentation/Includes/_images/icons/maximize.png', dest: 'images/maximize.png' },
    { url: 'https://www.brother-usa.com/Presentation/Includes/_images/icons/icons8-open-in-new-window-16.png', dest: 'images/icons8-open-in-new-window-16.png' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/fontawesome-webfont.woff2', dest: 'fonts/fontawesome-webfont.woff2' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/fontawesome-webfont.woff', dest: 'fonts/fontawesome-webfont.woff' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/fontawesome-webfont.ttf', dest: 'fonts/fontawesome-webfont.ttf' },
    { url: 'https://www.brother-usa.com/Presentation/Includes/_images/icons/eA_Icon.svg', dest: 'images/eA_Icon.svg' },
    { url: 'https://www.brother-usa.com/-/media/bic-usa/generic-icons/download_on_the_app_store_badge_us-uk_rgb_blk_092917.png', dest: 'images/app-store-badge.png' },
    { url: 'https://www.brother-usa.com/-/media/bic-usa/generic-icons/google-play-badge-resized.png', dest: 'images/google-play-badge.png' },
    { url: 'https://code.jquery.com/ui/1.12.1/themes/ui-lightness/images/ui-bg_highlight-soft_100_eeeeee_1x100.png', dest: 'images/ui-bg_highlight-soft_100_eeeeee_1x100.png' },
];

function fetchUrl(urlStr) {
    const url = new URL(urlStr);
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchUrl(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                reject(new Error(`${res.statusCode} ${url}`));
                return;
            }
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
}

function patchCss(filePath) {
    if (!fs.existsSync(filePath)) return;
    let css = fs.readFileSync(filePath, 'utf8');
    css = css
        .replace(/url\(\.\.\/_images\//g, 'url(../images/')
        .replace(/url\(\/_images\//g, 'url(../images/')
        .replace(/url\(\/Presentation\/Includes\/_images\//gi, 'url(../images/')
        .replace(/url\(\/presentation\/includes\/_images\//gi, 'url(../images/')
        .replace(/fontawesome-webfont-woff2\.woff2\?v=4\.7\.0/g, 'fontawesome-webfont.woff2')
        .replace(/fontawesome-webfont-woff\.woff\?v=4\.7\.0/g, 'fontawesome-webfont.woff')
        .replace(/fontawesome-webfont-ttf\.ttf\?v=4\.7\.0/g, 'fontawesome-webfont.ttf')
        .replace(/fontawesome-webfont\.woff2\?v=4\.7\.0/g, 'fontawesome-webfont.woff2')
        .replace(/fontawesome-webfont\.woff\?v=4\.7\.0/g, 'fontawesome-webfont.woff')
        .replace(/fontawesome-webfont\.ttf\?v=4\.7\.0/g, 'fontawesome-webfont.ttf');
    fs.writeFileSync(filePath, css);
    console.log('patched css', path.basename(filePath));
}

function syncIconsDir() {
    const imagesDir = path.join(ASSETS, 'images');
    const iconsDir = path.join(imagesDir, 'icons');
    fs.mkdirSync(iconsDir, { recursive: true });
    const iconFiles = [
        'icon-arrow.png', 'icon-arrow-white.png', 'icon-search-white.svg',
        'maximize.png', 'icons8-open-in-new-window-16.png', 'eA_Icon.svg',
    ];
    for (const name of iconFiles) {
        const src = path.join(imagesDir, name);
        const dest = path.join(iconsDir, name);
        if (fs.existsSync(src)) fs.copyFileSync(src, dest);
    }
    console.log('synced assets/images/icons/');
}

async function downloadCoveoEntryChunks() {
    const atomicPath = path.join(ASSETS, 'js/atomic.esm.js');
    if (!fs.existsSync(atomicPath)) return;
    const s = fs.readFileSync(atomicPath, 'utf8');
    const re = /"p-[a-f0-9]+"/g;
    const ids = new Set();
    let m;
    while ((m = re.exec(s))) ids.add(m[0].slice(1, -1));
    const BASE = 'https://static.cloud.coveo.com/atomic/v2';
    for (const id of ids) {
        const file = `${id}.entry.js`;
        const dest = path.join(ASSETS, 'js', file);
        if (fs.existsSync(dest) && fs.statSync(dest).size > 100) continue;
        try {
            fs.writeFileSync(dest, await fetchUrl(`${BASE}/${file}`));
            console.log('ok', file);
        } catch (e) {
            console.warn('fail', file, e.message);
        }
    }
}

async function main() {
    syncIconsDir();
    for (const item of DOWNLOADS) {
        const dest = path.join(ASSETS, item.dest);
        if (fs.existsSync(dest)) {
            console.log('skip', item.dest);
            continue;
        }
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        try {
            fs.writeFileSync(dest, await fetchUrl(item.url));
            console.log('ok', item.dest);
        } catch (e) {
            console.warn('fail', item.url, e.message);
        }
    }

    await downloadCoveoEntryChunks();

    patchCss(path.join(ASSETS, 'css/main.css'));
    patchCss(path.join(ASSETS, 'css/optimized-min.css'));

    const indexPath = path.join(ROOT, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');

    // Fix preload links
    html = html.replace(/<link rel="preload" href="\/Coveo\/js\/CoveoJsSearch\.WithDependencies\.min\.js"[^>]*>/,
        '<link rel="preload" href="./assets/js/CoveoJsSearch.WithDependencies.min.js" as="script">');
    html = html.replace(/<link rel="preload" href="\/Presentation\/Includes\/_css\/main\.css[^"]*"[^>]*>/,
        '<link rel="preload" href="./assets/css/main.css" as="style">');
    html = html.replace(/<link rel="preload" href="\/Presentation\/Includes\/_css\/NewComponents\/main\.css[^"]*"[^>]*>/,
        '<link rel="preload" href="./assets/css/main.css" as="style">');
    html = html.replace(/<link rel="preload" href="\/Presentation\/Includes\/_js\/NewComponents\/custom\.js[^"]*"[^>]*>/,
        '<link rel="preload" href="./assets/js/custom.js" as="script">');
    html = html.replace(/<link rel="preload" href="\/Presentation\/compiled\/_js\/browserify\/main\.js[^"]*"[^>]*>/,
        '<link rel="preload" href="./assets/js/main.js" as="script">');
    html = html.replace(/<link rel="preload" href="\/\/use\.fontawesome\.com[^"]*"[^>]*>/,
        '<link rel="preload" href="./assets/js/e8a6b1b49d.js" as="script">');
    html = html.replace(/<link rel="preload" href="\/\/cdn\.pricespider\.com[^"]*"[^>]*>/,
        '<link rel="preload" href="./assets/js/ps-widget.js" as="script">');

    html = html.replace(
        /<link rel="stylesheet" href="\.\/assets\/misc\/css">\s*<link rel="stylesheet" href="\.\/assets\/misc\/css">/,
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Catamaran:wght@100;400;600&family=Open+Sans:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400&display=swap">'
    );

    html = html.replace(/<script[^>]*otSDKStub\.js[^>]*><\/script>/gi, '');
    html = html.replace(/<script[^>]*otBannerSdk\.js[^>]*><\/script>/gi, '');

    html = html.replace(
        /<script type="text\/javascript"> \(function\(a,b,c,d\)\{ a='\/\/tags\.tiqcdn\.com[^<]*<\/script>/,
        ''
    );

    if (!html.includes('offline-home-assets.css')) {
        html = html.replace(
            'home-header-fix.css',
            'home-header-fix.css">\n        <link rel="stylesheet" href="./assets/css/offline-home-assets.css'
        );
    }

    html = html.replace(
        /let productSKU = parts\[parts\.length - 1\]\.split\("\?"\)\[0\];\s*\$\(this\)\.addClass\("SKU_" \+ productSKU\.toUpperCase\(\)\)\s*productSKUs\.push\(productSKU\.toUpperCase\(\)\);\s*\}/g,
        `let productSKU = parts[parts.length - 1].split("?")[0];
\t\t\t\t$(this).addClass("SKU_" + productSKU.toUpperCase());
\t\t\t\tproductSKUs.push(productSKU.toUpperCase());`
    );
    html = html.replace(
        /if \(\$\(this\)\.attr\("href"\) != undefined && \$\(this\)\.attr\("href"\)\.indexOf\("\/products"\)>0\) \{\s*let getHref = \$\(this\)\.attr\("href"\)\s*let productSKU = getHref\.split\("\/"\)\[4\]\.split\("\?"\)\[0\];/g,
        `const href = $(this).attr("href");
\t\t\t\tif (!href || href.indexOf("/products") < 0) { return; }
\t\t\t\tconst parts = href.split("/").filter(Boolean);
\t\t\t\tif (parts.length < 2) { return; }
\t\t\t\tlet productSKU = parts[parts.length - 1].split("?")[0];`
    );

    if (!html.includes('offline-stubs.js')) {
        html = html.replace(
            '<script type="module" src="./assets/js/atomic.esm.js">',
            '<script src="./assets/js/offline-stubs.js"></script>\n        <script type="module" src="./assets/js/atomic.esm.js">'
        );
    }

    const promoBar = `<div class="brother-promo-bar" role="region" aria-label="Global Alert Section">
    <a href="./supplies/subscription-info/index.html">Subscribe &amp; Save with Refresh EZ Print Subscription</a>
    <a href="./refurbished-printers-scanners-sewing-machines/index.html">Buy Genuine Brother Refurbished Products</a>
    <a href="./promotions/instant-rebates/index.html">Shop Our Weekly Deals</a>
    <a href="./ordering-shipping-information/index.html">Free Ground Shipping on Orders of $49.99+</a>
</div>`;
    if (!html.includes('brother-promo-bar')) {
        html = html.replace(
            /<div class="global-alert-promo[\s\S]*?<\/script>\s*(?=<input type="hidden" value="" id="autofill_phone">)/,
            promoBar + '\n'
        );
        html = html.replace(
            '<input type="hidden" value="" id="autofill_phone">',
            promoBar + '\n<input type="hidden" value="" id="autofill_phone">'
        );
    }

    const searchForm = `<form class="brother-offline-search" action="#" method="get" role="search">
    <input type="search" name="q" placeholder="Search brother-usa.com here..." aria-label="Search brother-usa.com" autocomplete="off">
    <button type="submit" aria-label="Search"><i class="fa fa-search" aria-hidden="true"></i></button>
</form>`;
    if (!html.includes('brother-offline-search')) {
        html = html.replace(
            /<\/atomic-external>\s*(<atomic-search-interface)/g,
            `</atomic-external>\n${searchForm}\n$1`
        );
    }

    if (!html.includes('live-home-layout.css')) {
        html = html.replace(
            'offline-home-assets.css',
            'offline-home-assets.css">\n        <link rel="stylesheet" href="./assets/css/live-home-layout.css'
        );
    }

    html = html.replace(
        /class="jan-price-table-wrapper jan-price-small content-left"/g,
        'class="jan-price-table-wrapper jan-price-small content-left text-overlay-content"'
    );
    html = html.replace(
        /class="header-container header-eq-height\s*"/g,
        'class="header-container header-eq-height no-scroll"'
    );
    html = html.replace(
        /\s*<div class="site-select pull-left hidden-md hidden-lg">[\s\S]*?<\/div>\s*<div class="pull-left hidden-sm hidden-xs home-business-title">[\s\S]*?<\/div>\s*/g,
        '\n'
    );
    html = html.replace(
        /<div class="left-billboard" style="text-align: center;">/g,
        '<div class="left-billboard" style="text-align: left;">'
    );
    html = html.replace(
        /@media \(min-width: 1600px\) \{\s*\.jan-price-table-wrapper\.jan-price-small\.content-left \{\s*position: static;\s*\}\s*\}/g,
        '@media (min-width: 1600px) {\n    .two-column-splitter .jan-price-table-wrapper.jan-price-small.content-left {\n        position: static;\n    }\n}'
    );

    html = html.replace(/src="\.\/assets\/misc\/BIC"/g, 'src="./assets/images/app-store-badge.png"');
    html = html.replace(
        /(<img alt="Google Play" )src="\.\/assets\/images\/app-store-badge\.png"/g,
        '$1src="./assets/images/google-play-badge.png"'
    );

    fs.writeFileSync(indexPath, html);
    console.log('patched index.html');
}

main();
