/**
 * Post-process scraped HTML so layout CSS/JS paths work offline.
 */
function fixPageHtml(html, pageRel, prefix) {
    // Broken stylesheet buckets from extension-less URLs
    html = html.replace(
        /<link[^>]+href=["'][^"']*assets\/misc\/css["'][^>]*>/gi,
        ''
    );

    // Live absolute preloads → local assets
    html = html.replace(
        /<link rel="preload" href="\/Coveo\/js\/CoveoJsSearch\.WithDependencies\.min\.js"[^>]*>/gi,
        `<link rel="preload" href="${prefix}assets/js/CoveoJsSearch.WithDependencies.min.js" as="script">`
    );
    html = html.replace(
        /<link rel="preload" href="\/Presentation\/Includes\/_css\/main\.css[^"]*"[^>]*>/gi,
        `<link rel="preload" href="${prefix}assets/css/main.css" as="style">`
    );
    html = html.replace(
        /<link rel="preload" href="\/Presentation\/Includes\/_css\/NewComponents\/main\.css[^"]*"[^>]*>/gi,
        `<link rel="preload" href="${prefix}assets/css/main.css" as="style">`
    );
    html = html.replace(
        /<link rel="preload" href="\/Presentation\/Includes\/_js\/NewComponents\/custom\.js[^"]*"[^>]*>/gi,
        `<link rel="preload" href="${prefix}assets/js/custom.js" as="script">`
    );
    html = html.replace(
        /<link rel="preload" href="\/Presentation\/compiled\/_js\/browserify\/main\.js[^"]*"[^>]*>/gi,
        `<link rel="preload" href="${prefix}assets/js/main.js" as="script">`
    );

    const hasMainCss = /rel=["']stylesheet["'][^>]+main\.css|href=["'][^"']*main\.css["']/i.test(html);
    if (!hasMainCss) {
        html = html.replace(
            /<\/head>/i,
            `    <link rel="stylesheet" href="${prefix}assets/css/main.css" type="text/css">\n    <link rel="stylesheet" href="${prefix}assets/css/bootstrap.min.css" type="text/css">\n    <link rel="stylesheet" href="${prefix}assets/css/optimized-min.css" type="text/css">\n</head>`
        );
    }

    if (!html.includes('fonts.googleapis.com')) {
        html = html.replace(
            /<\/head>/i,
            `    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Catamaran:wght@100;400;600&family=Open+Sans:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400&display=swap">\n</head>`
        );
    }

    html = html.replace(/<script[^>]*otSDKStub\.js[^>]*><\/script>/gi, '');
    html = html.replace(/<script[^>]*otBannerSdk\.js[^>]*><\/script>/gi, '');

    if (!html.includes('offline-stubs.js')) {
        html = html.replace(
            /<\/head>/i,
            `    <script src="${prefix}assets/js/offline-stubs.js"></script>\n</head>`
        );
    }

    return html;
}

module.exports = { fixPageHtml };
