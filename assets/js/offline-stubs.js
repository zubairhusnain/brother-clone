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
  });
})();
