/**
 * Remove Coveo Atomic header search widgets that break offline layout
 * (product cards render inline and expand the blue header bar).
 */

function stripStandaloneAtomicSearch(html) {
    let out = html;

    out = out.replace(
        /<atomic-search-interface[^>]*\bid=["']standalone["'][^>]*>[\s\S]*?<\/atomic-search-interface>/gi,
        ''
    );
    out = out.replace(
        /<atomic-search-interface[^>]*\bid=["']standalone["'][^>]*\/>/gi,
        ''
    );
    out = out.replace(
        /<atomic-external[^>]*selector=["']#standalone["'][^>]*>[\s\S]*?<\/atomic-external>/gi,
        ''
    );
    out = out.replace(
        /<script[^>]*type=["']module["'][^>]*src=["'][^"']*assets\/js\/index\.js["'][^>]*><\/script>/gi,
        ''
    );
    out = out.replace(
        /<link[^>]*href=["'][^"']*assets\/css\/index\.css["'][^>]*>/gi,
        ''
    );
    out = out.replace(
        /<script>\s*window\.serverContext[\s\S]*?window\.OrganizationId[\s\S]*?<\/script>/gi,
        ''
    );

    return out;
}

function sanitizeOfflineHeader(headerHtml) {
    return collapseHeaderDropdowns(stripStandaloneAtomicSearch(headerHtml));
}

function collapseHeaderDropdowns(html) {
    return html
        .replace(
            /(<li[^>]*class=["'][^"']*janus-shope-cart-dropdown)\s+open([^"']*["'])/gi,
            '$1$2'
        )
        .replace(
            /(<div[^>]*class=["'][^"']*dropdown[^"']*janus-shope-cart-dropdown)\s+open/gi,
            '$1'
        )
        .replace(
            /(<div[^>]*class=["'][^"']*dropdown-menu[^"']*)\s+show/gi,
            '$1'
        )
        .replace(/(<div[^>]*class=["'][^"']*mobile-menu[^"']*)\s+open/gi, '$1');
}

function sanitizeOfflinePageHtml(html) {
    return collapseHeaderDropdowns(stripStandaloneAtomicSearch(html));
}

module.exports = {
    stripStandaloneAtomicSearch,
    sanitizeOfflineHeader,
    sanitizeOfflinePageHtml,
};
