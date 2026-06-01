/**
 * Keep only HTML pages directly linked from index.html; remove other pages
 * and assets not referenced by kept pages (including CSS url() dependencies).
 *
 * Usage:
 *   node prune-unlinked-pages.js --dry-run
 *   node prune-unlinked-pages.js
 *   node prune-unlinked-pages.js --assets-only
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname);
const HOME = path.join(ROOT, 'index.html');

const ASSET_ROOT = path.join(ROOT, 'assets');
const KEEP_ALWAYS = new Set(['index.html', 'home/index.html']);

function normalizePageHref(href) {
    if (!href || !href.startsWith('./')) return null;
    let p = href.split('#')[0].split('?')[0].slice(2);
    if (!p) return 'index.html';
    if (!p.endsWith('.html')) {
        p = p.endsWith('/') ? `${p}index.html` : `${p}/index.html`;
    }
    return p.replace(/\\/g, '/');
}

function isPageHref(href) {
    if (!href.startsWith('./')) return false;
    const p = href.split('#')[0].split('?')[0].slice(2);
    if (!p || p.startsWith('assets/')) return false;
    if (/\.(css|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|otf|mjs)$/i.test(p)) return false;
    return true;
}

function extractDirectLinksFromHome(html) {
    const links = new Set(['index.html']);
    const re = /href\s*=\s*["'](\.\/[^"'#?]+)["']/gi;
    let m;
    while ((m = re.exec(html))) {
        if (!isPageHref(m[1])) continue;
        const norm = normalizePageHref(m[1]);
        if (norm && !norm.startsWith('assets/')) links.add(norm);
    }
    return links;
}

function walkHtmlFiles(dir, files = [], base = dir) {
    for (const name of fs.readdirSync(dir)) {
        if (name === '.git' || name === 'node_modules') continue;
        const full = path.join(dir, name);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            walkHtmlFiles(full, files, base);
        } else if (name.endsWith('.html')) {
            files.push(path.relative(base, full).replace(/\\/g, '/'));
        }
    }
    return files;
}

function resolveToAssetRel(rawPath, contextRel) {
    let p = rawPath.split('#')[0].split('?')[0].trim();
    if (!p || /^data:/i.test(p)) return null;

    if (p.startsWith('./')) p = p.slice(2);
    else if (p.startsWith('../') && contextRel) {
        const base = path.posix.dirname(contextRel);
        p = path.posix.normalize(path.posix.join(base, p));
    }

    if (p.startsWith('/')) p = p.slice(1);
    if (!p.startsWith('assets/')) return null;
    return p.replace(/\\/g, '/');
}

function extractRefsFromContent(content, contextRel) {
    const refs = new Set();

    const attrRe = /(?:src|href|content)\s*=\s*["']([^"'#?]+)["']/gi;
    let m;
    while ((m = attrRe.exec(content))) {
        const rel = resolveToAssetRel(m[1], contextRel);
        if (rel) refs.add(rel);
    }

    const urlRe = /url\(\s*["']?([^"'#?)]+)["']?\s*\)/gi;
    while ((m = urlRe.exec(content))) {
        const rel = resolveToAssetRel(m[1], contextRel);
        if (rel) refs.add(rel);
    }
    return refs;
}

function collectKeptAssets(keepPages) {
    const kept = new Set();
    const cssQueue = [];

    for (const page of keepPages) {
        const full = path.join(ROOT, page);
        if (!fs.existsSync(full)) continue;
        const html = fs.readFileSync(full, 'utf8');
        for (const ref of extractRefsFromContent(html, page)) {
            if (!kept.has(ref)) {
                kept.add(ref);
                if (ref.endsWith('.css')) cssQueue.push(ref);
            }
        }
    }

    while (cssQueue.length) {
        const cssRel = cssQueue.shift();
        const full = path.join(ROOT, cssRel);
        if (!fs.existsSync(full)) continue;
        const css = fs.readFileSync(full, 'utf8');
        for (const ref of extractRefsFromContent(css, cssRel)) {
            if (!kept.has(ref)) {
                kept.add(ref);
                if (ref.endsWith('.css')) cssQueue.push(ref);
            }
        }
    }

    return kept;
}

function walkAssetFiles(dir, relPrefix, files = []) {
    if (!fs.existsSync(dir)) return files;
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const rel = relPrefix ? `${relPrefix}/${name}` : name;
        const stat = fs.statSync(full);
        if (stat.isDirectory()) walkAssetFiles(full, rel, files);
        else files.push(rel);
    }
    return files;
}

function rmDirIfEmpty(dir) {
    if (!fs.existsSync(dir)) return;
    if (!fs.statSync(dir).isDirectory()) return;
    if (fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
        const parent = path.dirname(dir);
        if (parent.startsWith(ROOT) && parent !== ROOT) rmDirIfEmpty(parent);
    }
}

function deletePage(pageRel) {
    const full = path.join(ROOT, pageRel);
    if (!fs.existsSync(full)) return;
    fs.unlinkSync(full);
    rmDirIfEmpty(path.dirname(full));
}

function pruneAssets(keepPages, dryRun) {
    const keptAssets = collectKeptAssets(keepPages);
    const allAssets = walkAssetFiles(ASSET_ROOT, 'assets');
    const removeAssets = allAssets.filter((a) => !keptAssets.has(a));

    console.log(`Assets referenced by kept pages: ${keptAssets.size}`);
    console.log(`Assets to remove: ${removeAssets.length}`);

    if (dryRun) return { keptAssets, removeAssets };

    let deleted = 0;
    for (const a of removeAssets) {
        const full = path.join(ROOT, a);
        if (!fs.existsSync(full)) continue;
        if (!fs.statSync(full).isFile()) continue;
        fs.unlinkSync(full);
        deleted++;
        rmDirIfEmpty(path.dirname(full));
    }
    console.log(`Deleted ${deleted} asset files.`);
    return { keptAssets, removeAssets };
}

function prunePages(dryRun) {
    const homeHtml = fs.readFileSync(HOME, 'utf8');
    const keepPages = extractDirectLinksFromHome(homeHtml);
    for (const p of KEEP_ALWAYS) keepPages.add(p);

    const allPages = walkHtmlFiles(ROOT);
    const removePages = allPages.filter((p) => !keepPages.has(p));

    console.log(`Pages to keep (${keepPages.size}):`);
    [...keepPages].sort().forEach((p) => console.log(`  ${p}`));
    console.log(`\nPages to remove (${removePages.length}):`);
    removePages.sort().forEach((p) => console.log(`  ${p}`));

    if (!dryRun) {
        for (const p of removePages) deletePage(p);
        console.log(`\nDeleted ${removePages.length} pages.`);
    }

    return keepPages;
}

function main() {
    const dryRun = process.argv.includes('--dry-run');
    const assetsOnly = process.argv.includes('--assets-only');

    if (assetsOnly) {
        const keepPages = new Set(walkHtmlFiles(ROOT));
        if (dryRun) {
            pruneAssets(keepPages, true);
            console.log('\n(dry run — no files deleted)');
            return;
        }
        pruneAssets(keepPages, false);
        return;
    }

    const keepPages = prunePages(dryRun);
    console.log('');
    if (dryRun) {
        pruneAssets(keepPages, true);
        console.log('\n(dry run — no files deleted)');
        return;
    }

    pruneAssets(keepPages, false);
}

if (require.main === module) {
    main();
}

module.exports = {
    extractDirectLinksFromHome,
    collectKeptAssets,
    extractRefsFromContent,
    resolveToAssetRel,
};
