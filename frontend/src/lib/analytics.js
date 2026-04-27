/**
 * Google Analytics 4 (GA4) wrapper with Consent Mode v2.
 *
 * Behaviour:
 *  - If REACT_APP_GA_MEASUREMENT_ID is not set, this module is a no-op (preview
 *    environments and forks won't accidentally start tracking).
 *  - On first load we set Consent Mode v2 defaults to "denied" for all signals,
 *    which is the GDPR-compliant baseline.
 *  - When the user clicks "Accept" in the cookie banner we call grantConsent(),
 *    which updates analytics_storage to "granted" and (de-facto) starts sending
 *    events to GA4. The choice is persisted in localStorage so the banner does
 *    not reappear.
 *  - "Reject" persists the choice as well; analytics_storage stays "denied" so
 *    no GA cookies are written.
 *
 * Public API:
 *  - initAnalytics(): inject gtag.js + set consent defaults (call once at app boot).
 *  - hasConsentDecision(): true if user already accepted or rejected.
 *  - grantConsent() / denyConsent(): flip the localStorage flag + update gtag.
 *  - trackPageView(path): manual SPA pageview hook, used by useTrackPageviews.
 */

const MEASUREMENT_ID = process.env.REACT_APP_GA_MEASUREMENT_ID;
const CONSENT_KEY = "vk_analytics_consent"; // "granted" | "denied" | null

function pushArgs(...args) {
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(args);
}

function gtag() {
  // GA4 expects unwrapped arguments object; we mimic the official snippet.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

export function getConsent() {
  return localStorage.getItem(CONSENT_KEY);
}

export function hasConsentDecision() {
  const v = getConsent();
  return v === "granted" || v === "denied";
}

export function initAnalytics() {
  if (!MEASUREMENT_ID) return;

  // Set Consent Mode v2 defaults BEFORE loading the script — this is the
  // GDPR-required pattern. Anything tagged in GA4 will respect these flags.
  window.dataLayer = window.dataLayer || [];
  // expose gtag globally for any future code (events, conversions)
  window.gtag = gtag;
  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500,
  });

  // Load gtag.js
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(s);

  gtag("js", new Date());
  // send_page_view: false — we'll send page_view manually on route change so
  // SPA navigations are tracked correctly (see useTrackPageviews).
  gtag("config", MEASUREMENT_ID, { send_page_view: false });

  // If the user has already granted consent on a previous visit, restore it.
  if (getConsent() === "granted") {
    grantConsent({ silent: true });
  }
}

export function grantConsent({ silent = false } = {}) {
  if (!silent) localStorage.setItem(CONSENT_KEY, "granted");
  if (!MEASUREMENT_ID) return;
  gtag("consent", "update", {
    analytics_storage: "granted",
  });
  // Send the initial page view now that consent is granted.
  trackPageView(window.location.pathname + window.location.search);
}

export function denyConsent() {
  localStorage.setItem(CONSENT_KEY, "denied");
  if (!MEASUREMENT_ID) return;
  gtag("consent", "update", {
    analytics_storage: "denied",
  });
}

export function trackPageView(path) {
  if (!MEASUREMENT_ID) return;
  if (getConsent() !== "granted") return;
  gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export const ANALYTICS_ENABLED = Boolean(MEASUREMENT_ID);
