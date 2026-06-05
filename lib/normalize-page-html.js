/**
 * Fix scraped PLP pages where Coveo markup closed </main> before <header>,
 * leaving no </head> and breaking offline CSS/JS injection.
 */

function needsStructureNormalization(html) {
    if (!/<body[^>]*>/i.test(html) && /<header>/i.test(html) && /<main[^>]*class=["'][^"']*global-main/i.test(html)) {
        return true;
    }
    if (!/<\/head>/i.test(html)) return true;
    const headerIdx = html.search(/<header>/i);
    if (headerIdx < 0) return false;
    const mainCloseBeforeHeader = html.slice(0, headerIdx).search(/<\/main>/i);
    return mainCloseBeforeHeader >= 0;
}

function extractBlock(html, re) {
    const m = html.match(re);
    return m ? m[0] : '';
}

function extractTailAfterFooter(html, footerBlock) {
    const idx = html.indexOf(footerBlock);
    if (idx < 0) return '';
    let tail = html.slice(idx + footerBlock.length);
    tail = tail.replace(/<\/body>\s*<\/html>\s*$/i, '');
    return tail.trim();
}

function normalizeMissingBodyWrapper(html) {
    const header = extractBlock(html, /<header>[\s\S]*?<\/header>/i);
    const main = extractBlock(html, /<main[^>]*class=["'][^"']*global-main[^>]*>[\s\S]*?<\/main>/i);
    const footer = extractBlock(html, /<footer class="global-footer">[\s\S]*?<\/footer>/i);
    if (!header || !main || !footer) return html;
    if (/<body[^>]*>/i.test(html)) return html;

    const headerIdx = html.indexOf(header);
    const doctype = html.match(/<!DOCTYPE[^>]*>/i)?.[0] || '<!DOCTYPE html>';
    const htmlOpen = html.match(/<html[^>]*>/i)?.[0] || '<html lang="en">';
    const headPart = html.slice(0, headerIdx).trim();
    const tail = extractTailAfterFooter(html, footer);

    return `${doctype}${htmlOpen}
${headPart}
</head>
<body class="default-device bodyclass loaded" id="main">
${header}
${main}
${footer}
${tail}
</body>
</html>`;
}

function stripDuplicateHeaderFromHead(html) {
    const headClose = html.search(/<\/head>/i);
    if (headClose < 0) return html;
    const headOpen = html.search(/<head[^>]*>/i);
    if (headOpen < 0) return html;
    const headChunk = html.slice(headOpen, headClose);
    const dupIdx = headChunk.search(
        /<div class="main-header-section"|<ul class="no-bullets nav nav-pills\s+user-login-ul"|<div class="header utility-nav|<div class="user-login-ul|<div class="auth-sub-menu"/i
    );
    if (dupIdx < 0) return html;
    let cleanedHead = headChunk.slice(0, dupIdx).trim();
    cleanedHead = cleanedHead.replace(/(\s*<\/div>\s*)+$/i, '');
    cleanedHead = `${cleanedHead}\n</head>`;
    return html.slice(0, headOpen) + cleanedHead + html.slice(headClose + '</head>'.length);
}

function stripEmptySearchHubPlp(html) {
    return html.replace(
        /<atomic-search-interface[^>]*\bid=["']plp["'][^>]*\bsearch-hub=["']\s*["'][^>]*>[\s\S]*?<\/atomic-search-interface>/gi,
        ''
    );
}

function stripOrphanOnetrust(html) {
    return html.replace(/<div[^>]*id=["']onetrust-consent-sdk["'][^>]*>[\s\S]*?<\/div>\s*(?=<iframe|<script|<\/body)/gi, '');
}

function rebuildWithHeaderMainFooter(html) {
    const header = extractBlock(html, /<header>[\s\S]*?<\/header>/i);
    const main = extractBlock(html, /<main[^>]*class=["'][^"']*global-main[^>]*>[\s\S]*?<\/main>/i);
    const footer = extractBlock(html, /<footer class="global-footer">[\s\S]*?<\/footer>/i);
    if (!header || !main || !footer) return html;

    const headerIdx = html.indexOf(header);
    const headPart = html.slice(0, headerIdx).trim();
    let headInner = headPart.replace(/<\/?head[^>]*>/gi, '').trim();
    if (!headInner.includes('</head>')) {
        headInner = headPart.replace(/<head[^>]*>/i, '').replace(/<\/head>/i, '').trim();
    } else {
        headInner = headPart.match(/<head[^>]*>([\s\S]*)<\/head>/i)?.[1]?.trim() || headInner;
    }

    const tail = extractTailAfterFooter(html, footer);
    const doctype = html.match(/<!DOCTYPE[^>]*>/i)?.[0] || '<!DOCTYPE html>';
    const htmlOpen = html.match(/<html[^>]*>/i)?.[0] || '<html lang="en">';

    return `${doctype}${htmlOpen}
<head>
${headInner}
</head>
<body class="default-device bodyclass loaded" id="main">
${header}
${main}
${footer}
${tail}
</body>
</html>`;
}

function normalizeMalformedPageHtml(html) {
    html = stripDuplicateHeaderFromHead(html);
    html = stripEmptySearchHubPlp(html);
    html = stripOrphanOnetrust(html);

    if (!needsStructureNormalization(html)) return html;

    if (!/<body[^>]*>/i.test(html) && /<main[^>]*class=["'][^"']*global-main/i.test(html)) {
        return normalizeMissingBodyWrapper(html);
    }

    const header = extractBlock(html, /<header>[\s\S]*?<\/header>/i);
    const footer = extractBlock(html, /<footer class="global-footer">[\s\S]*?<\/footer>/i);
    const main = extractBlock(html, /<main[^>]*class=["'][^"']*global-main[^>]*>[\s\S]*?<\/main>/i);
    if (!header || !footer) return html;

    const headerIdx = html.indexOf(header);
    const mainCloseBeforeHeader = html.slice(0, headerIdx).search(/<\/main>/i);

    if (main && headerIdx >= 0 && html.indexOf(main) > headerIdx) {
        return rebuildWithHeaderMainFooter(html);
    }

    if (mainCloseBeforeHeader < 0) return html;

    const plpRe =
        /<atomic-search-interface[^>]*\bid=["']plp["'][\s\S]*?<\/atomic-search-interface>/i;
    const plpStart = html.search(plpRe);
    if (plpStart < 0 || plpStart >= headerIdx) return rebuildWithHeaderMainFooter(html);

    let mainInner = html.slice(plpStart, headerIdx).replace(/<\/main>\s*$/i, '').trim();
    const headOpen = html.match(/<head[^>]*>/i);
    const headStart = headOpen ? html.indexOf(headOpen[0]) + headOpen[0].length : 0;
    let headInner = html.slice(headStart, plpStart).trim().replace(/<\/head>\s*$/i, '').trim();
    const tail = extractTailAfterFooter(html, footer);
    const doctype = html.match(/<!DOCTYPE[^>]*>/i)?.[0] || '<!DOCTYPE html>';
    const htmlOpen = html.match(/<html[^>]*>/i)?.[0] || '<html lang="en">';

    return `${doctype}${htmlOpen}
<head>
${headInner}
</head>
<body class="default-device bodyclass loaded" id="main">
${header}
<main class="global-main">
<div class="main-content site-body">
${mainInner}
</div>
</main>
${footer}
${tail}
</body>
</html>`;
}

/**
 * Inject snippets before </head>, or right after <head> when </head> is missing.
 */
function injectBeforeHeadClose(html, injection) {
    if (/<\/head>/i.test(html)) {
        return html.replace(/<\/head>/i, `${injection}\n</head>`);
    }
    if (/<head[^>]*>/i.test(html)) {
        return html.replace(/<head([^>]*)>/i, `<head$1>\n${injection}`);
    }
    if (/<body[^>]*>/i.test(html)) {
        return html.replace(/<body([^>]*)>/i, `<body$1>\n${injection}`);
    }
    return injection + html;
}

const OUTLET_HERO = `<div class="billboard-minor-hero container">
<div class="container">
<h1>The Brother Outlet - Same Quality. Better Prices.</h1>
<div>
<h2 class="richTextTealiumTracker" componentdetails="E5AEA575-C412-47DE-81BA-BFCCC22699EA|Billboard Minor Hero">Curated deals on last-chance items - get it while you can!</h2>
</div>
</div>
</div>`;

function injectOutletHeroIfMissing(html, pageRel) {
    if (!/outlet\/index\.html$/i.test(pageRel)) return html;
    if (/billboard-minor-hero/i.test(html)) return html;
    return html.replace(
        /(<main[^>]*class=["'][^"']*global-main[^>]*>[\s\S]*?<div class="main-content[^"]*"[^>]*>)/i,
        `$1\n${OUTLET_HERO}\n`
    );
}

module.exports = {
    needsStructureNormalization,
    normalizeMalformedPageHtml,
    injectBeforeHeadClose,
    stripDuplicateHeaderFromHead,
    stripEmptySearchHubPlp,
    injectOutletHeroIfMissing,
};
