/**
 * Offline stubs for APIs and analytics that break layout when they 404.
 */
(function () {
  function pageCacheKey() {
    var p = window.location.pathname || '';
    var idx = p.indexOf('/brother_offline/');
    if (idx !== -1) p = p.slice(idx + '/brother_offline/'.length);
    p = p.replace(/^\/+/, '');
    if (!p || p === 'index.html') p = 'home';
    p = p.replace(/\/index\.html$/i, '');
    return p.replace(/[^a-zA-Z0-9._-]/g, '__');
  }

  function coveoCacheUrl() {
    var base = '/brother-clone/brother_offline/assets/misc/coveo/';
    return base + pageCacheKey() + '.json';
  }

  function extractImage(raw) {
    if (!raw) return '';
    var img = raw.ec_images || raw.ec_prd_productimage || raw.ec_prd_primaryimage || '';
    if (Array.isArray(img)) img = img[0] || '';
    if (typeof img === 'string' && img.indexOf('http') !== -1) return img;
    var m = typeof img === 'string' && img.match(/https?:\/\/[^"' )]+/i);
    return m ? m[0] : '';
  }

  if (typeof window.fetch === 'function') {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (url.indexOf('/rest/search/v2') !== -1 && url.indexOf('coveo.com') !== -1) {
        return nativeFetch(coveoCacheUrl())
          .then(function (res) {
            if (res && res.ok) return res;
            return new Response(
              JSON.stringify({
                totalCountFiltered: 0,
                totalCount: 0,
                duration: 0,
                results: [],
                searchUid: 'offline-cache'
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          })
          .catch(function () {
            return new Response(
              JSON.stringify({
                totalCountFiltered: 0,
                totalCount: 0,
                duration: 0,
                results: [],
                searchUid: 'offline-cache'
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          });
      }
      if (
        url.indexOf('/api/CoveoAuth/') !== -1 ||
        url.indexOf('/api/cxa/BrotherCart/GetTealiumProductID') !== -1 ||
        url.indexOf('/api/cxa/BrotherAccessories/') !== -1
      ) {
        const body = url.indexOf('CoveoAuth') !== -1 ? 'offline-token' : '{"product_sku":[],"product_id":[]}';
        return Promise.resolve(
          new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
      }
      return nativeFetch(input, init);
    };
  }

  window.utag = window.utag || {};
  window.utag.view = window.utag.view || function () {};
  window.utag.link = window.utag.link || function () {};
  window.utag.DB = window.utag.DB || function () {};
  window.utag.data = window.utag.data || window.utag_data || {};
  window.fbq = window.fbq || function () {};
  window.piSetCookie = window.piSetCookie || function () {};
  window.piTracker = window.piTracker || function () {};
  window.piResponse = window.piResponse || function () {};
  window.piAId = window.piAId || '';
  window.piCId = window.piCId || '';
  window.piHostname = window.piHostname || 'go.pardot.com';
  window._sf_async_config = window._sf_async_config || {};

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.brother-offline-search').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = form.querySelector('input[name="q"]');
        var q = input && input.value ? input.value.trim() : '';
        if (q) {
          window.location.href =
            'https://www.brother-usa.com/search#q=' + encodeURIComponent(q);
        }
      });
    });

    // Some pages call slick() on missing nodes and throw, which aborts
    // later ready handlers (including product section setup). Guard that.
    function installSlickGuard() {
      var jq = window.jQuery || window.$;
      if (!jq || !jq.fn || !jq.fn.slick || jq.fn.slick.__offlineGuarded) return false;
      var nativeSlick = jq.fn.slick;
      var guarded = function () {
        if (!this || this.length === 0) return this;
        try {
          return nativeSlick.apply(this, arguments);
        } catch (e) {
          return this;
        }
      };
      guarded.__offlineGuarded = true;
      jq.fn.slick = guarded;
      return true;
    }
    if (!installSlickGuard()) {
      var tries = 0;
      var timer = setInterval(function () {
        tries += 1;
        if (installSlickGuard() || tries > 40) clearInterval(timer);
      }, 150);
    }

    setTimeout(function () {
      var searchRoot = document.querySelector('atomic-search-interface');
      if (!searchRoot || document.querySelector('.offline-coveo-fallback-grid')) return;
      if (searchRoot.shadowRoot) return;

      fetch(coveoCacheUrl())
        .then(function (r) { return (r && r.ok) ? r.json() : null; })
        .then(function (data) {
          var results = data && data.results;
          if (!results || !results.length) return;
          var host = searchRoot.parentElement || searchRoot;
          var grid = document.createElement('div');
          grid.className = 'offline-coveo-fallback-grid';
          var cards = results.slice(0, 12).map(function (res) {
            var raw = res.raw || {};
            var title = raw.ec_name || res.title || '';
            var price = raw.ec_prd_productcataloglistprice || '';
            var href = res.clickUri || res.uri || '#';
            var image = extractImage(raw);
            return (
              '<a class="offline-coveo-card" href="' + href + '">' +
              (image ? '<img loading="lazy" src="' + image + '" alt="">' : '') +
              '<h3>' + title + '</h3>' +
              (price ? '<p>$' + price + '</p>' : '') +
              '</a>'
            );
          }).join('');
          grid.innerHTML = cards;
          if (!document.getElementById('offline-coveo-fallback-style')) {
            var s = document.createElement('style');
            s.id = 'offline-coveo-fallback-style';
            s.textContent = '.offline-coveo-fallback-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin:24px 0}.offline-coveo-card{text-decoration:none;color:#111;border:1px solid #eee;padding:12px;border-radius:8px;background:#fff}.offline-coveo-card img{width:100%;height:170px;object-fit:contain;background:#fff}.offline-coveo-card h3{font-size:14px;line-height:1.3;margin:8px 0;min-height:36px}.offline-coveo-card p{margin:0;font-weight:700}';
            document.head.appendChild(s);
          }
          host.appendChild(grid);
        })
        .catch(function () {});
    }, 3500);
  });
})();
