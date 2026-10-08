# Bahjah — Orphan Sponsorship Landing Page

Paid-campaign landing page for the **Omani Bahjah Orphan Society (جمعية بهجة العمانية للأيتام)**.
Single goal: turn ad traffic into **monthly orphan sponsors (OMR 25 / month)**.

- Arabic (RTL, default): `/`
- English: `/en/`
- Live (temporary domain): https://lightsteelblue-raven-902597.hostingersite.com/

Every sponsorship button links to the official product page on bahjah.org.om
(`/wp/product/برنامج-كفالة-يتيم/`). This page never takes payments or stores financial data.

## Structure

```
index.html                 Arabic page
en/index.html              English page (same layout, LTR)
assets/css/styles.css      All styles — mobile-first, no framework
assets/js/main.js          UTM persistence, CTA/conversion events, sticky CTA, reveal
assets/img/                Images (WebP) + og-share.jpg (1200×630 social preview)
robots.txt, sitemap.xml    Search engine files (hreflang sitemap)
tracking/bahjah-woocommerce-tracking.php
                           Optional WordPress mu-plugin for bahjah.org.om
                           (payment-page / checkout / completed-sponsorship events)
scripts/set-domain.sh      Switch every absolute URL to the final domain
```

Sections: hero → what sponsorship covers → why monthly + sponsor card → 3 steps →
why Bahjah (facts + awards) → activities & news → FAQ → final CTA.

## Deploy

Push to `main` → Hostinger auto-deploys (usually ~30 s, occasionally up to ~5 min).
Check the live HTML for the new `styles.css?v=` value to confirm.

**Whenever `styles.css` or `main.js` changes, bump its `?v=` value in both HTML files**,
otherwise returning visitors get the old cached file.

## Launch checklist

- [ ] **Connect the final domain** in Hostinger, then run
      `scripts/set-domain.sh https://your-domain` and push.
      The temporary `*.hostingersite.com` domain serves a Hostinger-generated
      `robots.txt` that blocks Googlebot — organic search only works on a real domain.
      (Ad crawlers are not affected.)
- [ ] **Tracking IDs** — fill in `CONFIG` at the top of `assets/js/main.js`:
      `metaPixelId`, `ga4Id`, `googleAdsId` + `googleAdsLabels`, or `gtmId`. Bump `?v=`.
- [ ] **Completed-sponsorship tracking** (optional, on bahjah.org.om): install
      `tracking/bahjah-woocommerce-tracking.php` as a mu-plugin and fill its constants.
- [ ] Submit `https://your-domain/sitemap.xml` in Google Search Console.

## Content rules

All facts, prices and statistics come only from Bahjah's official sources:
bahjah.org.om (home, donations, product page, FAQ, media centre, contact, forms) and the
official profile PDF (`CV-Print-Proof.pdf`). Sources are listed in the page footer.

- Core sponsorship: **OMR 25/month** (the WooCommerce page shows "25,000" due to a unit
  setting — ignore it). Minimum one year, per the profile.
- Other options (35 / 60 / 10 OMR) are from the profile and shown only in the FAQ.
- Statistics are labelled as historical (2023), never as live figures.
- No invented stories, testimonials or impact percentages.

### Images

- `bahjah-orphan-hero-*`, `bahjah-orphan-monthly-support-*`, `bahjah-orphan-education-*`,
  `bahjah-orphan-final-cta-*`, `og-share.jpg` — **illustrative images generated with Higgsfield AI**
  (GPT Image 2.5) for this campaign: hero, monthly-sponsorship, "Imagine" background and final
  CTA background. They do not depict real Bahjah beneficiaries; this is stated in the page footer.
  Prompts required authentic Omani dress/architecture, no flags, no text/logos, no face close-ups.
- All other photos (activities gallery incl. `photo-outing.webp`), award logos and the Bahjah logo —
  Bahjah's official website and profile PDF. `photo-event.webp` is kept in the repo but no longer shown.
- The two news items link to bahjah.org.om's media centre.
