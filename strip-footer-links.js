/**
 * Remove external links from the footer region only (keep offline ./ paths).
 */
const fs = require('fs');
const path = require('path');

function isExternalHref(href) {
    if (!href) return false;
    const h = href.trim();
    if (!h || h === '#' || /^javascript:/i.test(h)) return false;
    if (h.startsWith('//')) return true;
    if (/^https?:\/\//i.test(h)) return true;
    if (/^(mailto|tel):/i.test(h)) return true;
    return false;
}

function getFirstAnchorHref(fragment) {
    const m = fragment.match(/<a\b[^>]*\shref=["']([^"']*)["'][^>]*>/i);
    return m ? m[1] : null;
}

/** Remove one <li> at a time so we never span multiple footer columns. */
function stripFooterRegion(footerHtml) {
    let result = footerHtml.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (match, inner) => {
        const href = getFirstAnchorHref(inner);
        return href && isExternalHref(href) ? '' : match;
    });

    // Standalone external anchors (e.g. accessibility icon row, not always in <li>)
    result = result.replace(
        /<a\b(?=[^>]*\shref=["'](?:https?:|\/\/)[^"']*["'])[^>]*>[\s\S]*?<\/a>/gi,
        ''
    );

    return result;
}

function getFooterSlice(html) {
    const markers = [
        '<footer class="global-footer">',
        '<div class="footer">',
        'class="container footer-content"',
    ];
    let start = -1;
    for (const m of markers) {
        const i = html.indexOf(m);
        if (i !== -1 && (start === -1 || i < start)) start = i;
    }
    if (start === -1) return null;

    const footerClose = html.indexOf('</footer>', start);
    const end = footerClose !== -1 ? footerClose + '</footer>'.length : html.length;

    return { start, end, before: html.slice(0, start), footer: html.slice(start, end), after: html.slice(end) };
}

function stripFooterLinks(html) {
    const slice = getFooterSlice(html);
    if (!slice) return html;
    return slice.before + stripFooterRegion(slice.footer) + slice.after;
}

function walkHtmlFiles(dir, files = []) {
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            walkHtmlFiles(full, files);
        } else if (name.endsWith('.html')) {
            files.push(full);
        }
    }
    return files;
}

function runOnFile(filePath) {
    const html = fs.readFileSync(filePath, 'utf8');
    if (!html.includes('global-footer') && !html.includes('footer-content')) {
        return false;
    }
    const out = stripFooterLinks(html);
    if (out === html) return false;
    fs.writeFileSync(filePath, out);
    return true;
}

function run(target) {
    const root = path.resolve(target || __dirname);
    const stat = fs.statSync(root);
    if (stat.isFile()) {
        if (runOnFile(root)) {
            console.log('Removed external footer links:', root);
        } else {
            console.log('No external footer links removed:', root);
        }
        return;
    }
    const files = walkHtmlFiles(root);
    let changed = 0;
    for (const file of files) {
        if (runOnFile(file)) {
            changed++;
            console.log('Removed external footer links:', path.relative(root, file));
        }
    }
    console.log(`Done. Updated ${changed} of ${files.length} HTML files.`);
}

if (require.main === module) {
    run(process.argv[2] || __dirname);
}

module.exports = { stripFooterLinks, isExternalHref, run };
