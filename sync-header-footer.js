#!/usr/bin/env node
/**
 * Make header/footer identical to front page for all linked subpages.
 * Preserves each page's main content and rewrites ./ asset paths per depth.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const HOME = path.join(ROOT, 'index.html');
const OFFLINE_BASE = '/brother-clone/brother_offline/';
const { sanitizeOfflineHeader, sanitizeOfflinePageHtml } = require('./lib/sanitize-offline-header.js');
const { normalizeMalformedPageHtml } = require('./lib/normalize-page-html.js');

function getHeaderFooterFromHome() {
  const html = fs.readFileSync(HOME, 'utf8');
  const headerMatch = html.match(/<header>[\s\S]*?<\/header>/i);
  const footerMatch = html.match(/<footer class="global-footer">[\s\S]*?<\/footer>/i);
  if (!headerMatch || !footerMatch) {
    throw new Error('Could not extract header/footer from brother_offline/index.html');
  }
  return {
    header: sanitizeOfflineHeader(headerMatch[0]),
    footer: footerMatch[0],
  };
}

function linkedPages() {
  const html = fs.readFileSync(HOME, 'utf8');
  const re = /href\s*=\s*["'](\.\/[^"'#?]+)["']/gi;
  const out = new Set();
  let m;
  while ((m = re.exec(html))) {
    let p = m[1].slice(2).split('#')[0].split('?')[0];
    if (!p || p.startsWith('assets/')) continue;
    if (/\.(css|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|otf|mjs|aspx)$/i.test(p)) continue;
    if (!p.endsWith('.html')) p = (p.endsWith('/') ? p : `${p}/`) + 'index.html';
    if (p === 'index.html' || p === 'login/index.html') continue;
    out.add(p);
  }
  return [...out].sort();
}

function prefixForPage(pageRel) {
  const depth = pageRel.split('/').length - 1;
  return depth > 0 ? '../'.repeat(depth) : './';
}

function absolutizeHomeFragment(fragment) {
  let out = fragment;
  out = out.replace(/(href|src|action)=["']\.\/([^"']+)["']/gi, (_, attr, rel) => {
    return `${attr}="${OFFLINE_BASE}${rel}"`;
  });
  out = out.replace(/url\((['"]?)\.\/([^)'"]+)\1\)/gi, (_, q, rel) => {
    const qq = q || '';
    return `url(${qq}${OFFLINE_BASE}${rel}${qq})`;
  });
  // Keep root links local to offline clone.
  out = out.replace(/(href|action)=["']\/(?!\/)([^"']*)["']/gi, (_, attr, rel) => {
    if (rel.startsWith('brother-clone/brother_offline/')) return `${attr}="/${rel}"`;
    return `${attr}="${OFFLINE_BASE}${rel}"`;
  });
  return out;
}

function replaceHeaderFooter(pageHtml, header, footer) {
  let out = pageHtml;

  if (/<header>[\s\S]*?<\/header>/i.test(out)) {
    out = out.replace(/<header>[\s\S]*?<\/header>/i, header);
  } else if (/<body[^>]*>/i.test(out)) {
    out = out.replace(/<body([^>]*)>/i, `<body$1>\n${header}`);
  } else if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `</head>\n<body class="default-device bodyclass loaded" id="main">\n${header}`);
  } else if (/<main[^>]*class=["'][^"']*global-main/i.test(out)) {
    out = out.replace(/<main[^>]*class=["'][^"']*global-main[^>]*>/i, (m) => `${header}\n${m}`);
  } else if (/<footer class="global-footer">/i.test(out)) {
    out = out.replace(/<footer class="global-footer">/i, `${header}\n<footer class="global-footer">`);
  } else {
    out = `${header}\n${out}`;
  }

  if (/<footer class="global-footer">[\s\S]*?<\/footer>/i.test(out)) {
    out = out.replace(/<footer class="global-footer">[\s\S]*?<\/footer>/i, footer);
  } else if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `${footer}\n</body>`);
  } else {
    out = `${out}\n${footer}\n</body>\n</html>`;
  }

  if (!/<\/body>/i.test(out)) {
    if (/<\/html>/i.test(out)) {
      out = out.replace(/<\/html>/i, `</body>\n</html>`);
    } else {
      out += '\n</body>\n</html>';
    }
  }

  return out;
}

function run() {
  const { header: homeHeader, footer: homeFooter } = getHeaderFooterFromHome();
  const pages = linkedPages();
  let updated = 0;

  for (const pageRel of pages) {
    const full = path.join(ROOT, pageRel);
    if (!fs.existsSync(full)) continue;
    const before = fs.readFileSync(full, 'utf8');
    const header = absolutizeHomeFragment(homeHeader);
    const footer = absolutizeHomeFragment(homeFooter);
    let after = normalizeMalformedPageHtml(before);
    after = replaceHeaderFooter(after, header, footer);
    after = normalizeMalformedPageHtml(after);
    after = sanitizeOfflinePageHtml(after);
    if (after !== before) {
      fs.writeFileSync(full, after);
      updated++;
      console.log(`synced ${pageRel}`);
    }
  }

  console.log(`\nHeader/footer synced on ${updated}/${pages.length} pages.`);
}

run();
