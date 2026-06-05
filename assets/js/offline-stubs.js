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

  var SCMS_CACHE_BASE = '/brother-clone/brother_offline/assets/misc/scms/';

  function scmsSkuCacheKey(modelSku) {
    if (!modelSku) return '';
    return String(modelSku).replace(/-/g, '').toUpperCase();
  }

  function scmsPlansCacheUrl(modelSku) {
    var key = scmsSkuCacheKey(modelSku);
    return key ? SCMS_CACHE_BASE + key + '.json' : '';
  }

  function readModelSkuFromBody(body) {
    if (!body) return '';
    if (typeof body === 'string') {
      var match = body.match(/modelSku=([^&]+)/i);
      if (match) return decodeURIComponent(match[1].replace(/\+/g, ' '));
      return '';
    }
    if (typeof body === 'object') {
      return body.modelSku || body.modelsku || '';
    }
    return '';
  }

  function loadScmsPlans(modelSku) {
    var url = scmsPlansCacheUrl(modelSku);
    if (!url) return Promise.resolve(null);
    return fetch(url)
      .then(function (res) {
        return res && res.ok ? res.json() : null;
      })
      .catch(function () {
        return null;
      });
  }

  function hideSubscriptionPlansLoader() {
    document.querySelectorAll('.plans-loader-container').forEach(function (el) {
      el.style.setProperty('display', 'none', 'important');
    });
    document.querySelectorAll('._000-allwrap-wrapper').forEach(function (el) {
      el.style.removeProperty('display');
    });
  }

  function resolveMediaUrl(img) {
    if (!img) return '';
    if (Array.isArray(img)) img = img[0] || '';
    if (typeof img !== 'string') return '';
    if (img.indexOf('http://') === 0 || img.indexOf('https://') === 0) return img;
    if (img.indexOf('//') === 0) return 'https:' + img;
    if (img.indexOf('/-/media') === 0 || img.indexOf('/~/media') === 0) {
      return 'https://www.brother-usa.com' + img.replace(/^\/~/, '/');
    }
    var m = img.match(/https?:\/\/[^"' )]+/i);
    return m ? m[0] : '';
  }

  function extractImage(raw) {
    if (!raw) return '';
    var img =
      raw.ec_images ||
      raw.ec_prd_productimage ||
      raw.ec_prd_primaryimage ||
      raw.thumbnailurl ||
      '';
    return resolveMediaUrl(img);
  }

  function productHref(res, raw) {
    var sku = (raw.ec_prd_productcatalogsku || raw.ec_name || res.title || '').toString();
    if (res.clickUri && res.clickUri.indexOf('http') === 0) return res.clickUri;
    if (sku) return 'https://www.brother-usa.com/products/' + sku.toLowerCase();
    return '#';
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function bulletList(raw) {
    var bullets = [];
    ['ec_prd_bulletz32xfeaturez32x1', 'ec_prd_bulletz32xfeaturez32x2', 'ec_prd_bulletz32xfeaturez32x3'].forEach(
      function (field) {
        var val = raw[field];
        if (!val) return;
        if (Array.isArray(val)) bullets = bullets.concat(val);
        else bullets.push(val);
      }
    );
    if (!bullets.length) return '';
    return (
      '<ul class="feature-list-wrapper">' +
      bullets
        .map(function (b) {
          return '<li>' + esc(b) + '</li>';
        })
        .join('') +
      '</ul>'
    );
  }

  function formatPrice(price) {
    if (price == null || price === '' || Number(price) === 0) return '';
    return '$' + Number(price).toFixed(2);
  }

  function buildOutletCard(res) {
    var raw = res.raw || {};
    var title = raw.ec_name || res.title || '';
    var features = raw.ec_prd_productfeatures || '';
    var price = raw.ec_prd_productcataloglistprice;
    var href = productHref(res, raw);
    var image = extractImage(raw);
    var reviews = raw.ec_prd_productcatalogtotalreviewcount;
    var rating = raw.ec_prd_productcatalogaverageoverallratingpercentile;
    var ratingText =
      reviews && rating
        ? '★ ' + (Number(rating) / 20).toFixed(1) + ' (' + reviews + ' reviews)'
        : '';
    var hidePrice = raw.ec_prd_hidez32xproductz32xprice === '1';
    var priceHtml =
      !hidePrice && price != null && price !== '' && Number(price) > 0
        ? '<div class="result-price">' + formatPrice(price) + '</div>'
        : '';

    return (
      '<div class="offline-result-root result-root with-sections display-grid density-compact image-small">' +
      '<div class="result-image-wrap">' +
      (image
        ? '<img src="' + esc(image) + '" alt="' + esc(title) + '" loading="lazy">'
        : '') +
      '</div>' +
      '<div class="result-title"><a href="' + esc(href) + '">' + esc(title) + '</a></div>' +
      '<div class="result-meta">' +
      (features ? '<div class="product-features">' + esc(features) + '</div>' : '') +
      bulletList(raw) +
      '<a class="details-link-wrapper result-link-list" href="' +
      esc(href) +
      '">View Details</a>' +
      '</div>' +
      '<div class="result-price-block">' +
      priceHtml +
      '</div>' +
      '<div class="result-actions">' +
      (ratingText ? '<div class="result-rating">' + esc(ratingText) + '</div>' : '') +
      '<a class="details-link-wrapper result-link-grid" href="' +
      esc(href) +
      '">View Details</a>' +
      '<a class="janus-btn-green janus-addtocart-btn" href="' +
      esc(href) +
      '">View Product</a>' +
      '</div></div>'
    );
  }

  function renderOfflineFacets(searchRoot, facets) {
    if (!facets || !facets.length) return;
    var facetSection = searchRoot.querySelector('atomic-layout-section[section="facets"]');
    if (!facetSection || facetSection.querySelector('.offline-facet-panel')) return;

    var html = facets
      .map(function (facet) {
        var label =
          facet.facetId === 'ec_prd_productcatalogisrefurb'
            ? 'Condition'
            : facet.field === 'ec_prd_productcatalogsubcategoriz122xation'
              ? 'Product Category'
              : facet.field || 'Filter';
        var items = (facet.values || [])
          .map(function (v) {
            return (
              '<li><label><input type="checkbox" disabled> <span>' +
              esc(v.value) +
              '</span> <span class="facet-count">(' +
              (v.numberOfResults || 0) +
              ')</span></label></li>'
            );
          })
          .join('');
        return '<div class="offline-facet-panel"><h4>' + esc(label) + '</h4><ul>' + items + '</ul></div>';
      })
      .join('');

    var wrap = document.createElement('div');
    wrap.className = 'offline-facets-host';
    wrap.innerHTML = html;
    facetSection.appendChild(wrap);
    facetSection.style.setProperty('display', 'block', 'important');
  }

  function renderOfflinePager(searchRoot, total, pageSize, page) {
    var pages = Math.max(1, Math.ceil(total / pageSize));
    if (pages <= 1) return;
    var pagination = searchRoot.querySelector('atomic-layout-section[section="pagination"]');
    if (!pagination || pagination.querySelector('.offline-plp-pager')) return;

    var pager = document.createElement('div');
    pager.className = 'offline-plp-pager';
    pager.setAttribute('role', 'navigation');
    pager.setAttribute('aria-label', 'Pagination');

    for (var i = 1; i <= pages; i++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = String(i);
      if (i === page) btn.className = 'active';
      btn.disabled = i === page;
      pager.appendChild(btn);
    }
    pagination.appendChild(pager);
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
      if (url.indexOf('/api/sitecore/SCMS/GetAllPlansForModel') !== -1) {
        var initBody = init && init.body;
        var modelSku = readModelSkuFromBody(initBody);
        return loadScmsPlans(modelSku).then(function (data) {
          return new Response(JSON.stringify(data || { products: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      }
      if (url.indexOf('/api/sitecore/SCMS/GetAllModels') !== -1) {
        return Promise.resolve(
          new Response(JSON.stringify({ models: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
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
  window.loadGloballink = window.loadGloballink || function () {};
  window.Coveo = window.Coveo || {
    SearchEndpoint: { configureCloudV2: function () {} },
    init: function () {},
    $: function () {
      return {
        on: function () {},
        find: function () {
          return { length: 0, on: function () {} };
        },
      };
    },
    $$: function () {
      return {
        on: function () {},
        find: function () {
          return { length: 0, on: function () {} };
        },
      };
    },
  };

  function hydrateLazyImages() {
    document.querySelectorAll('img[data-src], img[data-lazy], img[loading="lazy"]').forEach(function (img) {
      var src = img.getAttribute('data-src') || img.getAttribute('data-lazy');
      if (src && !img.getAttribute('src')) img.setAttribute('src', src);
      if (img.loading === 'lazy' && img.getBoundingClientRect().top < window.innerHeight + 400) {
        img.loading = 'eager';
      }
    });
    document.querySelectorAll('.billboard-text-overlay-hero > img.img-responsive').forEach(function (img) {
      if (img.getAttribute('src') && img.naturalWidth === 0) img.loading = 'eager';
    });
  }

  function loadGloballinkSnapshot() {
    var area = document.getElementById('globallink-load-area');
    if (!area || area.children.length > 0) return;
    if (!document.querySelector('link[href*="globallink.css"]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/brother-clone/brother_offline/assets/css/globallink.css';
      document.head.appendChild(link);
    }
    var url = '/brother-clone/brother_offline/assets/misc/globallink-en.snapshot.html';
    fetch(url)
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        if (html && html.length > 100) {
          area.innerHTML = html;
          hydrateLazyImages();
        }
      })
      .catch(function () {});
  }

  function plpNeedsFallback(searchRoot) {
    if (!searchRoot) return false;
    var hub = searchRoot.getAttribute('search-hub') || '';
    if (!hub.trim()) return false;
    if (searchRoot.querySelector('.offline-plp-results-host')) return false;
    return searchRoot.querySelectorAll('atomic-result').length === 0;
  }

  function renderCoveoFallback() {
    var searchRoot = document.querySelector('atomic-search-interface#plp');
    if (!plpNeedsFallback(searchRoot)) return;

    fetch(coveoCacheUrl())
      .then(function (r) { return (r && r.ok) ? r.json() : null; })
      .then(function (data) {
        var results = data && data.results;
        if (!results || !results.length) return;

        document.querySelectorAll('.offline-coveo-fallback-grid, .offline-plp-results-host').forEach(function (el) {
          el.remove();
        });

        var total = data.totalCountFiltered || data.totalCount || results.length;
        var pageSize = 12;
        var page = 1;
        var start = (page - 1) * pageSize;
        var pageResults = results.slice(start, start + pageSize);
        var shown = pageResults.length;
        var cards = pageResults.map(buildOutletCard).join('');

        var resultsSection = searchRoot.querySelector('atomic-layout-section[section="results"]');
        var resultList = searchRoot.querySelector('atomic-result-list');
        var host = document.createElement('div');
        host.className = 'offline-plp-results-host';
        host.innerHTML = cards;

        if (resultsSection) {
          if (resultList) resultList.style.setProperty('display', 'none', 'important');
          resultsSection.insertBefore(host, resultsSection.firstChild);
        } else if (resultList) {
          resultList.appendChild(host);
        } else {
          host.className += ' offline-coveo-fallback-grid';
          var mainHost =
            document.querySelector('main .main-content') ||
            document.querySelector('main .site-body') ||
            searchRoot.parentElement;
          mainHost.appendChild(host);
        }

        searchRoot.classList.add('atomic-search-interface-search-executed');
        searchRoot.style.removeProperty('display');
        searchRoot.style.setProperty('min-height', 'auto', 'important');

        var layout = searchRoot.querySelector('atomic-search-layout');
        if (layout) layout.style.setProperty('display', 'grid', 'important');

        var header = searchRoot.querySelector('.list-header-section');
        if (header) {
          var existing = header.querySelector('.offline-query-summary-text');
          if (existing) existing.remove();
          var summary = document.createElement('div');
          summary.className = 'offline-query-summary-text';
          summary.textContent =
            'Results ' + (start + 1) + '-' + (start + shown) + ' of ' + total;
          header.insertBefore(summary, header.firstChild);
        }

        renderOfflineFacets(searchRoot, data.facets);
        renderOfflinePager(searchRoot, total, pageSize, page);
        hydrateLazyImages();
      })
      .catch(function () {});
  }

  function installScmsAjaxStub() {
    var jq = window.jQuery || window.$;
    if (!jq || !jq.ajax || jq.ajax.__offlineScmsStubbed) return false;
    var nativeAjax = jq.ajax;
    var stubbedAjax = function (url, options) {
      var settings = options || {};
      if (typeof url === 'object') {
        settings = url;
        url = settings.url;
      } else if (url) {
        settings.url = url;
      }

      var targetUrl = settings.url || '';
      if (targetUrl.indexOf('/api/sitecore/SCMS/GetAllPlansForModel') !== -1) {
        var modelSku = readModelSkuFromBody(settings.data);
        var request = loadScmsPlans(modelSku).then(function (data) {
          return data || { products: [] };
        });
        var promise = jq.Deferred();
        request
          .then(function (data) {
            promise.resolve(data, 'success', { status: 200 });
          })
          .catch(function () {
            promise.reject({ status: 404 }, 'error', 'Not Found');
          });
        var jqPromise = promise.promise();
        if (settings.success) jqPromise.done(settings.success);
        if (settings.error) jqPromise.fail(settings.error);
        if (settings.complete) jqPromise.always(settings.complete);
        return jqPromise;
      }
      if (targetUrl.indexOf('/api/sitecore/SCMS/GetAllModels') !== -1) {
        var modelsPromise = jq.Deferred();
        modelsPromise.resolve({ models: [] }, 'success', { status: 200 });
        var modelsJqPromise = modelsPromise.promise();
        if (settings.success) modelsJqPromise.done(settings.success);
        if (settings.error) modelsJqPromise.fail(settings.error);
        if (settings.complete) modelsJqPromise.always(settings.complete);
        return modelsJqPromise;
      }
      return nativeAjax.apply(this, arguments);
    };
    stubbedAjax.__offlineScmsStubbed = true;
    jq.ajax = stubbedAjax;
    return true;
  }

  function watchSubscriptionPlansGrid() {
    if (!document.querySelector('#plansContainer')) return;
    var observer = new MutationObserver(function () {
      if (document.querySelector('#plansContainer ._0100-pricing-card')) {
        hideSubscriptionPlansLoader();
      }
    });
    var target = document.querySelector('#plansContainer') || document.body;
    observer.observe(target, { childList: true, subtree: true });
    if (document.querySelector('#plansContainer ._0100-pricing-card')) {
      hideSubscriptionPlansLoader();
    }
  }

  (function ensureScmsAjaxStub() {
    if (!installScmsAjaxStub()) setTimeout(ensureScmsAjaxStub, 50);
  })();

  document.addEventListener('DOMContentLoaded', function () {
    hydrateLazyImages();
    loadGloballinkSnapshot();
    installScmsAjaxStub();
    watchSubscriptionPlansGrid();
    setTimeout(hydrateLazyImages, 500);
    setTimeout(renderCoveoFallback, 2000);
    setTimeout(renderCoveoFallback, 5000);
    setTimeout(renderCoveoFallback, 9000);

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
  });
})();
