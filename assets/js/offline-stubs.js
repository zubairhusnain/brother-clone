/**
 * Offline stubs for APIs and analytics that break layout when they 404.
 */
(function () {
  if (typeof window.fetch === 'function') {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
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
  window.utag.data = window.utag.data || window.utag_data || {};

  function hideExclusiveOffers() {
    var selectors = [
      '#mcp-toast-parent-container',
      '#mcp-toast-c',
      '#mcp-toast1',
      '#mcp-utm',
      '.mcp-toast-container',
      '.mcp-card',
      '[id^=\"mcp-toast\"]',
      '[class*=\"mcp-toast\"]'
    ];
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.setAttribute('aria-hidden', 'true');
      });
    });
  }

  function injectHideStyles() {
    if (document.getElementById('offline-hide-exclusive-offers')) return;
    var style = document.createElement('style');
    style.id = 'offline-hide-exclusive-offers';
    style.textContent = [
      '#mcp-toast-parent-container, #mcp-toast-c, #mcp-toast1, #mcp-utm,',
      '.mcp-toast-container, .mcp-card, [id^=\"mcp-toast\"], [class*=\"mcp-toast\"] {',
      '  display: none !important;',
      '  visibility: hidden !important;',
      '  opacity: 0 !important;',
      '  pointer-events: none !important;',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  document.addEventListener('DOMContentLoaded', function () {
    injectHideStyles();
    hideExclusiveOffers();

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

    var observer = new MutationObserver(function () {
      hideExclusiveOffers();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
})();
