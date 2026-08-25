(function () {
  'use strict';

  var PARAM = 'acompia_journey';
  var params = new URLSearchParams(window.location.search);
  var journeyId = params.get(PARAM);

  if (!journeyId) {
    journeyId = window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : 'journey-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  window.acompiaPostHogBootstrap = {
    distinctID: journeyId
  };

  if (params.has(PARAM) && window.history && typeof window.history.replaceState === 'function') {
    params.delete(PARAM);
    var cleanQuery = params.toString();
    var cleanUrl = window.location.pathname + (cleanQuery ? '?' + cleanQuery : '') + window.location.hash;
    window.history.replaceState(window.history.state, '', cleanUrl);
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

    var url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (_) {
      return;
    }

    if (url.origin !== window.location.origin) return;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    url.searchParams.set(PARAM, journeyId);
    link.href = url.toString();
  }, true);
})();
