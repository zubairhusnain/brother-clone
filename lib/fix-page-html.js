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

    if (!html.includes('offline-hide-banners.css')) {
        html = html.replace(
            /<\/head>/i,
            `    <link rel="stylesheet" href="${prefix}assets/css/offline-hide-banners.css" type="text/css">\n</head>`
        );
    }

    // Remove Evergage/MCP "Exclusive Offers" markup entirely from HTML.
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

    html = html.replace(/<script[^>]*otSDKStub\.js[^>]*><\/script>/gi, '');
    html = html.replace(/<script[^>]*otBannerSdk\.js[^>]*><\/script>/gi, '');

    // Drop third-party trackers that produce offline runtime crashes.
    html = html.replace(
        /<script[^>]+src=["']https?:\/\/[^"']*(?:pardot|pi\.pardot|fbevents|connect\.facebook|tealium|utag\.js|confirmit|digitalfeedback|cdn-cgi\/rum|zi-scripts)[^"']*["'][^>]*><\/script>/gi,
        ''
    );
    html = html.replace(
        /<link[^>]+rel=["']preload["'][^>]+href=["']https?:\/\/use\.fontawesome\.com\/[^"']+["'][^>]*>/gi,
        ''
    );

    if (!html.includes('offline-stubs.js')) {
        html = html.replace(
            /<\/head>/i,
            `    <script>window.fbq=window.fbq||function(){};window.piSetCookie=window.piSetCookie||function(){};window.piTracker=window.piTracker||function(){};window.piResponse=window.piResponse||function(){};window.piAId=window.piAId||'';window.utag=window.utag||{};window.utag.DB=window.utag.DB||function(){};</script>\n    <script src="${prefix}assets/js/offline-stubs.js"></script>\n</head>`
        );
    }

    return html;
}

module.exports = { fixPageHtml };
