/*
 * Bahjah orphan-sponsorship campaign page
 * - Persists UTM / click IDs from ad URLs and forwards them to the official Bahjah site
 * - Pushes CTA / sponsorship-start events to dataLayer (GTM-ready)
 * - Optional Meta Pixel + Google tag (loaded only when real IDs are configured below)
 * Payment logic is NOT handled here: every conversion CTA links to the official
 * Bahjah WooCommerce product page (Bank Muscat SmartPay checkout).
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * CONFIG — fill these in before launch. Empty string = disabled.
   * ------------------------------------------------------------------ */
  var CONFIG = {
    metaPixelId: '',            // e.g. '123456789012345'
    ga4Id: '',                  // e.g. 'G-XXXXXXXXXX'
    googleAdsId: '',            // e.g. 'AW-123456789'
    googleAdsLabels: {
      sponsorStart: '',         // conversion label for "sponsorship start" click
      contact: ''               // conversion label for phone / WhatsApp click
    },
    gtmId: '',                  // e.g. 'GTM-XXXXXXX' (use instead of, or alongside, the direct tags)
    sponsorshipValue: 25,
    currency: 'OMR',
    officialHost: 'bahjah.org.om',
    campaignPage: 'kafala_lp'
  };

  var ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
                   'gclid', 'gbraid', 'wbraid', 'fbclid', 'ttclid', 'msclkid'];
  var STORE_KEY = 'bahjah_lp_attr';

  window.dataLayer = window.dataLayer || [];
  function push(obj) { window.dataLayer.push(obj); }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  /* ---------------- Attribution (UTM persistence) ---------------- */
  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function writeStore(v) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch (e) { /* storage blocked: still works for this page view */ }
  }

  var params = new URLSearchParams(location.search);
  var current = {};
  ATTR_KEYS.forEach(function (k) { var v = params.get(k); if (v) current[k] = v.slice(0, 200); });

  var store = readStore();
  if (Object.keys(current).length) {
    store.last = current;
    store.last_ts = Date.now();
    if (!store.first) { store.first = current; store.first_ts = store.last_ts; }
    writeStore(store);
  }
  // Params forwarded on outbound links: this visit's params, else last-touch from a previous visit (30 days).
  var THIRTY_DAYS = 30 * 24 * 3600 * 1000;
  var forwardAttr = Object.keys(current).length ? current
    : (store.last && Date.now() - (store.last_ts || 0) < THIRTY_DAYS ? store.last : {});

  function decorate(href, ctaId) {
    try {
      var u = new URL(href, location.href);
      if (u.hostname.indexOf(CONFIG.officialHost) === -1) return href;
      Object.keys(forwardAttr).forEach(function (k) { if (!u.searchParams.has(k)) u.searchParams.set(k, forwardAttr[k]); });
      u.searchParams.set('lp', CONFIG.campaignPage);
      if (ctaId) u.searchParams.set('lp_cta', ctaId);
      return u.toString();
    } catch (e) { return href; }
  }

  document.querySelectorAll('a[href*="' + CONFIG.officialHost + '"]').forEach(function (a) {
    a.href = decorate(a.getAttribute('href'), a.getAttribute('data-cta-id'));
  });

  /* ---------------- Optional tag loading ---------------- */
  function loadScript(src) {
    var s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s);
  }

  if (CONFIG.gtmId) {
    push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    loadScript('https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(CONFIG.gtmId));
  }

  var gtagId = CONFIG.ga4Id || CONFIG.googleAdsId;
  if (gtagId) {
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gtagId));
    gtag('js', new Date());
    if (CONFIG.ga4Id) gtag('config', CONFIG.ga4Id);
    if (CONFIG.googleAdsId) gtag('config', CONFIG.googleAdsId);
  }

  if (CONFIG.metaPixelId) {
    /* Meta Pixel base code */
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', CONFIG.metaPixelId);
    fbq('track', 'PageView');
    fbq('track', 'ViewContent', { content_name: 'برنامج كفالة يتيم', value: CONFIG.sponsorshipValue, currency: CONFIG.currency });
  }

  push({ event: 'lp_view', lp: CONFIG.campaignPage, attribution: forwardAttr });

  /* ---------------- Event tracking ---------------- */
  function track(kind, ctaId, href) {
    var eventId = uuid(); // share with server-side (CAPI) via GTM to deduplicate
    push({ event: 'cta_click', cta_id: ctaId, cta_type: kind, link_url: href, event_id: eventId });

    if (kind === 'sponsor') {
      push({ event: 'sponsorship_start', cta_id: ctaId, value: CONFIG.sponsorshipValue, currency: CONFIG.currency, event_id: eventId });
      if (window.fbq) fbq('track', 'InitiateCheckout', { content_name: 'برنامج كفالة يتيم', value: CONFIG.sponsorshipValue, currency: CONFIG.currency }, { eventID: eventId });
      if (window.gtag) {
        if (CONFIG.ga4Id) gtag('event', 'begin_checkout', { currency: CONFIG.currency, value: CONFIG.sponsorshipValue, items: [{ item_id: '3294', item_name: 'برنامج كفالة يتيم' }], transport_type: 'beacon' });
        if (CONFIG.googleAdsId && CONFIG.googleAdsLabels.sponsorStart) gtag('event', 'conversion', { send_to: CONFIG.googleAdsId + '/' + CONFIG.googleAdsLabels.sponsorStart, value: CONFIG.sponsorshipValue, currency: CONFIG.currency, transport_type: 'beacon' });
      }
    } else if (kind === 'contact' || kind === 'whatsapp') {
      push({ event: 'contact_click', method: kind, cta_id: ctaId, event_id: eventId });
      if (window.fbq) fbq('track', 'Contact', { method: kind }, { eventID: eventId });
      if (window.gtag && CONFIG.googleAdsId && CONFIG.googleAdsLabels.contact) gtag('event', 'conversion', { send_to: CONFIG.googleAdsId + '/' + CONFIG.googleAdsLabels.contact, transport_type: 'beacon' });
    }
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-track]');
    if (!a) return;
    track(a.getAttribute('data-track'), a.getAttribute('data-cta-id') || '', a.href);
  });

  // FAQ engagement
  document.querySelectorAll('.faq details').forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) push({ event: 'faq_open', question: d.querySelector('summary').textContent.trim() });
    });
  });

  // Scroll depth (50 / 90)
  var marks = { 50: false, 90: false };
  window.addEventListener('scroll', function () {
    var h = document.documentElement;
    var pct = (h.scrollTop + window.innerHeight) / h.scrollHeight * 100;
    [50, 90].forEach(function (m) { if (!marks[m] && pct >= m) { marks[m] = true; push({ event: 'scroll_depth', percent: m }); } });
  }, { passive: true });

  /* ---------------- Sticky mobile CTA ---------------- */
  var sticky = document.getElementById('stickyCta');
  var heroCta = document.querySelector('[data-cta-id="hero_primary"]');
  var finalSection = document.getElementById('final');
  if (sticky && heroCta && 'IntersectionObserver' in window) {
    var heroVisible = true, finalVisible = false;
    var update = function () {
      var show = !heroVisible && !finalVisible;
      sticky.classList.toggle('is-visible', show);
      sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
      var link = sticky.querySelector('a'); if (link) link.tabIndex = show ? 0 : -1;
    };
    new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; update(); }).observe(heroCta);
    if (finalSection) new IntersectionObserver(function (en) { finalVisible = en[0].isIntersecting; update(); }, { threshold: 0.25 }).observe(finalSection);
  }

  /* ---------------- Hot-linked official news images ----------------
   * If the official server can't serve the image, hide it and let the branded
   * placeholder show (never substitute a different photo under a news headline). */
  document.querySelectorAll('img[data-hide-on-error]').forEach(function (img) {
    function hide() { img.style.visibility = 'hidden'; }
    img.addEventListener('error', hide);
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) hide();
  });

  /* ---------------- Reveal on scroll + header state ---------------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); ro.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { ro.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  var header = document.getElementById('siteHeader');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 40); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
})();
