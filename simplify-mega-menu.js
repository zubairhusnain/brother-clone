/**
 * Flatten mega menu: each top item links to the first real URL in its submenu.
 */
const fs = require('fs');
const path = require('path');

/** Default home nav (first ./ link inside each mega panel, in DOM order). */
const HOME_SIMPLE_NAV = [
    ['Products', './printers-fax/index.html'],
    ['Supplies', './product/2022/02/08/14/09/fh221/index.html'],
    ['Support', './contact-us/index.html'],
    ['Inspiration', './social-media-hub/index.html'],
    ['Special Offers', './supplies/subscription-info/index.html'],
    ['Certified Refurbished Products', './refurbished-printers-scanners-sewing-machines/index.html'],
    ['Product Registration', './product-registration/index.html'],
    ['Outlet', './outlet/index.html'],
];

function findNextLiOpen(html, pos) {
    let i = pos;
    while (i < html.length) {
        const idx = html.indexOf('<li', i);
        if (idx === -1) return -1;
        if (html[idx + 3] === '/') {
            i = idx + 4;
            continue;
        }
        const ch = html[idx + 3];
        if (ch === ' ' || ch === '>' || ch === '\n' || ch === '\r' || ch === '\t') {
            return idx;
        }
        i = idx + 3;
    }
    return -1;
}

function extractTopLevelLis(ulInner) {
    const items = [];
    let pos = 0;
    while (pos < ulInner.length) {
        const liStart = findNextLiOpen(ulInner, pos);
        if (liStart === -1) break;
        const liTagEnd = ulInner.indexOf('>', liStart);
        let depth = 1;
        let p = liTagEnd + 1;
        while (depth > 0 && p < ulInner.length) {
            const openLi = findNextLiOpen(ulInner, p);
            const closeLi = ulInner.indexOf('</li>', p);
            if (closeLi === -1) break;
            if (openLi !== -1 && openLi < closeLi) {
                depth++;
                p = openLi + 3;
            } else {
                depth--;
                p = closeLi + 5;
            }
        }
        items.push(ulInner.slice(liStart, p));
        pos = p;
    }
    return items;
}

function findFirstNavHref(html) {
    const re = /<a\s[^>]*href="(\.\/[^"#]+)"[^>]*>/i;
    const m = re.exec(html);
    return m ? m[1] : null;
}

function extractDivBlock(html, startIndex) {
    if (!html.slice(startIndex).startsWith('<div')) return '';
    let depth = 0;
    let i = startIndex;
    while (i < html.length) {
        if (html.slice(i, i + 4) === '<div') {
            depth++;
            i = html.indexOf('>', i) + 1;
        } else if (html.slice(i, i + 6) === '</div>') {
            depth--;
            i += 6;
            if (depth === 0) return html.slice(startIndex, i);
        } else {
            i++;
        }
    }
    return html.slice(startIndex);
}

function getParentLinkLabel(liHtml) {
    const m = liHtml.match(/Link Text \| ([^|]+) \|/);
    return m ? m[1].trim() : null;
}

function simplifyMenuItem(liHtml) {
    const subStart = liHtml.indexOf('<div class="sub-menu">');
    const label = getParentLinkLabel(liHtml);
    let firstHref = null;

    if (subStart !== -1) {
        const subMenuHtml = extractDivBlock(liHtml, subStart);
        firstHref = findFirstNavHref(subMenuHtml);
    }

    const parentMatch = liHtml.match(/<a\s([^>]*?)href="([^"]*)"([^>]*>)/);
    if (!parentMatch) return liHtml;

    const href =
        firstHref || (parentMatch[2] && parentMatch[2] !== '#' ? parentMatch[2] : null);
    if (!href) return liHtml;

    let head = subStart !== -1 ? liHtml.slice(0, subStart).trimEnd() : liHtml.replace(/<div class="sub-menu">[\s\S]*$/,'').trimEnd();

    head = head.replace(/<a\s([^>]*?)href="[^"]*"([^>]*>)/, (_, before, after) => {
        let attrs = `${before}href="${href}"${after}`;
        attrs = attrs.replace(/\srole="button"/gi, '');
        attrs = attrs.replace(/\sdata-target="[^"]*"/gi, '');
        attrs = attrs.replace(/\saria-expanded="[^"]*"/gi, '');
        return `<a ${attrs}`;
    });

    head = head.replace(/\s*class="([^"]*)"/, (_, classes) => {
        const next = classes
            .split(/\s+/)
            .filter((c) => c && c !== 'has-dropdown')
            .concat(['menu-block-item'])
            .filter((c, i, a) => a.indexOf(c) === i)
            .join(' ');
        return ` class="${next}"`;
    });
    head = head.replace(/\saria-expanded="false"/gi, '');
    if (!head.includes('role="menuitem"')) {
        head = head.replace('<li ', '<li role="menuitem" ');
    }
    return `${head}</li>`;
}

function navItemHtml(label, href, forMobile = false) {
    const nav1 = `link tracking | Header | Link Text | ${label} |  |  |  |  | `;
    const nav2 = `component clicks | 56cf4098-bdae-4d5d-8220-4848f60e54d7 | Site Header | home | ${label} |  |  | `;
    const liClass = forMobile ? 'menu-block-item' : 'menu-block-item';
    return `<li role="menuitem" class="${liClass}">
    <a tabindex="0" data-nav="${nav1}" data-nav2="${nav2}" href="${href}">${label}</a>
</li>`;
}

function buildSimpleMenuBlock(items, { roleMenu = true, mobile = false } = {}) {
    const ulClass = roleMenu
        ? 'menu-block clearfix brother-simple-nav'
        : 'menu-block clearfix brother-simple-nav';
    const lines = items.map(([label, href]) => navItemHtml(label, href, mobile));
    if (mobile) {
        lines.push(`<li class="visible-xs-block visible-sm-block">
<a href="./login/index.html" tabindex="0" data-nav="link tracking | Header | Link Text | Login |  |  |  |  | " data-nav2="component clicks | 56cf4098-bdae-4d5d-8220-4848f60e54d7 | Site Header | home | Login |  |  | ">Login</a></li>`);
    }
    return `<ul${roleMenu ? ' role="menu"' : ''} class="${ulClass}">
${lines.join('\n')}
                        </ul>`;
}

function replaceMegaMenuSection(html, items = HOME_SIMPLE_NAV) {
    const megaStart = html.indexOf('<div class="header mega-nav brand-nav">');
    if (megaStart === -1) return html;
    const menuWrapStart = html.indexOf('<div class="menu-wrap">', megaStart);
    const endNoindex = html.indexOf('        <!-- END NOINDEX -->', menuWrapStart);
    if (menuWrapStart === -1 || endNoindex === -1) return html;

    const replacement = `                    <div class="menu-wrap">
                      <div class="container">
                        ${buildSimpleMenuBlock(items, { roleMenu: true })}
                      </div>
                    </div>
                    <div class="mobile-menu">
                      ${buildSimpleMenuBlock(items, { roleMenu: false, mobile: true })}
                    </div>
                  </div>
                </nav>
              </div>
            </div>
          </div>
        </div>

`;

    return html.slice(0, menuWrapStart) + replacement + html.slice(endNoindex);
}

function simplifyDesktopMenu(section) {
    const ulOpen = section.match(/<ul[^>]*class="menu-block[^"]*"[^>]*>/);
    if (!ulOpen) return section;
    const ulStart = section.indexOf(ulOpen[0]);
    const ulInnerStart = ulStart + ulOpen[0].length;
    const ulClose = section.indexOf('</ul>', ulInnerStart);
    if (ulClose === -1) return section;

    const ulInner = section.slice(ulInnerStart, ulClose);
    const items = extractTopLevelLis(ulInner).map(simplifyMenuItem);
    return (
        section.slice(0, ulInnerStart) +
        '\n' +
        items.join('\n') +
        '\n' +
        section.slice(ulClose)
    );
}

function simplifyMegaMenuHtml(html) {
    if (html.includes('brother-simple-nav')) return html;

    const menuBlockStart = html.indexOf('<ul role="menu" class="menu-block clearfix">');
    const mobileStart = html.indexOf('<div class="mobile-menu">', menuBlockStart);
    if (menuBlockStart === -1 || mobileStart === -1) {
        return replaceMegaMenuSection(html);
    }

    let desktopPart = html.slice(menuBlockStart, mobileStart);
    desktopPart = simplifyDesktopMenu(desktopPart);

    const itemCount = (desktopPart.match(/menu-block-item/g) || []).length;
    if (itemCount < 5) {
        return replaceMegaMenuSection(html);
    }

    return (
        html.slice(0, menuBlockStart) +
        desktopPart +
        html.slice(mobileStart)
    );
}

function run(filePath) {
    const resolved = path.resolve(filePath);
    const html = fs.readFileSync(resolved, 'utf8');
    const out = replaceMegaMenuSection(html);
    fs.writeFileSync(resolved, out);
    console.log('Simplified mega menu → flat main nav:', resolved);
}

if (require.main === module) {
    run(process.argv[2] || path.join(__dirname, 'index.html'));
}

module.exports = {
    simplifyMegaMenuHtml,
    replaceMegaMenuSection,
    run,
    HOME_SIMPLE_NAV,
};
