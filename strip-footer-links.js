/**
 * Footer cleanup for offline Brother pages:
 * - Default: remove external hrefs inside <footer> only
 * - --labels: also remove listed link labels (intended for home page)
 */
const fs = require('fs');
const path = require('path');

/** Visible link text to drop from home footer (normalized for matching). */
const HOME_FOOTER_REMOVE_LABELS = new Set(
    [
        'Terms of Sale',
        'Product-Registration',
        'Product Registration',
        'Search Supplies/Accessories',
        'Ordering & Shipping Information',
        'Ordering & Account FAQs',
        'View Order Status',
        'Warranty & Extended Warranty Information',
        'Recall Information',
        'Return Policy',
        'Scam Protection Notice',
        'Security Support Information',
        'Contact Brother',
        'Social Media Hub',
        'Stitching Sewcial Blog',
        'Brother Crafts Blog',
        'Exclusive Discounts',
        'Student Discount',
        'Corporate Social Responsibility',
        'Diversity, Equity, and Inclusion',
        'Corporate News',
        'Careers',
        'Software Developer Program',
        'Dealer Support Portal',
        'Site Map',
        'Accessibility Statement',
        'Do Not Sell My Personal Information',
    ].map(normalizeFooterLabel)
);

function normalizeFooterLabel(s) {
    if (!s) return '';
    return s
        .replace(/&amp;/gi, '&')
        .replace(/&#0*39;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

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
    const m = fragment.match(/<a\b[^>]*\shref=["']([^"']*)["']/i);
    return m ? m[1] : null;
}

function getAnchorText(fragment) {
    const m = fragment.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i);
    if (!m) return '';
    return normalizeFooterLabel(m[1].replace(/<[^>]+>/g, ''));
}

function getFooterNavLabel(fragment) {
    const m = fragment.match(/\|\s*home\s*\|\s*([^|]+?)\s*\|/i);
    return m ? normalizeFooterLabel(m[1]) : '';
}

function shouldRemoveLi(inner, { removeExternal, removeLabels }) {
    if (removeExternal) {
        const href = getFirstAnchorHref(inner);
        if (href && isExternalHref(href)) return true;
    }
    if (!removeLabels) return false;

    const text = getAnchorText(inner);
    if (text && HOME_FOOTER_REMOVE_LABELS.has(text)) return true;

    const navLabel = getFooterNavLabel(inner);
    if (navLabel && HOME_FOOTER_REMOVE_LABELS.has(navLabel)) return true;

    return false;
}

/** Remove one <li> at a time so we never span multiple footer columns. */
function stripFooterRegion(footerHtml, options = { removeExternal: true, removeLabels: false }) {
    let result = footerHtml.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (match, inner) => {
        return shouldRemoveLi(inner, options) ? '' : match;
    });

    if (options.removeExternal) {
        result = result.replace(
            /<a\b(?=[^>]*\shref=["'](?:https?:|\/\/)[^"']*["'])[^>]*>[\s\S]*?<\/a>/gi,
            ''
        );
    }

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

function stripFooterLinks(html, options = { removeExternal: true, removeLabels: false }) {
    const slice = getFooterSlice(html);
    if (!slice) return html;
    return slice.before + stripFooterRegion(slice.footer, options) + slice.after;
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

function runOnFile(filePath, options) {
    const html = fs.readFileSync(filePath, 'utf8');
    if (!html.includes('global-footer') && !html.includes('footer-content')) {
        return false;
    }
    const out = stripFooterLinks(html, options);
    if (out === html) return false;
    fs.writeFileSync(filePath, out);
    return true;
}

function run(argv) {
    const args = argv.slice(2);
    const removeLabels = args.includes('--labels');
    const paths = args.filter((a) => !a.startsWith('--'));
    const options = { removeExternal: true, removeLabels };

    const root = path.resolve(paths[0] || __dirname);
    const stat = fs.statSync(root);

    const mode = removeLabels ? 'external + listed labels' : 'external links only';

    if (stat.isFile()) {
        if (runOnFile(root, options)) {
            console.log(`Removed footer links (${mode}):`, root);
        } else {
            console.log(`No footer links removed (${mode}):`, root);
        }
        return;
    }

    const files = walkHtmlFiles(root);
    let changed = 0;
    for (const file of files) {
        if (runOnFile(file, options)) {
            changed++;
            console.log(`Removed footer links (${mode}):`, path.relative(root, file));
        }
    }
    console.log(`Done. Updated ${changed} of ${files.length} HTML files.`);
}

if (require.main === module) {
    run(process.argv);
}

module.exports = {
    stripFooterLinks,
    stripFooterRegion,
    HOME_FOOTER_REMOVE_LABELS,
    isExternalHref,
    normalizeFooterLabel,
    run,
};
