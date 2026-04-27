import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import {
  ANALYTICS_ENABLED,
  hasConsentDecision,
  grantConsent,
  denyConsent,
  trackPageView,
  getConsent,
} from "@/lib/analytics";

/**
 * GDPR-compliant cookie consent banner.
 *
 * Renders only if:
 *  - GA is configured (REACT_APP_GA_MEASUREMENT_ID set), AND
 *  - the user has not yet made a choice (no localStorage entry).
 *
 * Once the user accepts or rejects, the banner stays hidden forever (per
 * browser/storage). User can reopen via the footer "Tietosuoja" → "Muuta evästeasetuksia"
 * link if we expose one (out of scope for v1).
 */
export default function CookieConsentBanner() {
  const { t, lang } = useI18n();
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  // Decide initial visibility once analytics is enabled.
  useEffect(() => {
    if (!ANALYTICS_ENABLED) return;
    setVisible(!hasConsentDecision());
  }, []);

  // Track SPA pageviews after consent is granted.
  useEffect(() => {
    if (!ANALYTICS_ENABLED) return;
    if (getConsent() !== "granted") return;
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  if (!ANALYTICS_ENABLED || !visible) return null;

  const labels = LABELS[lang] || LABELS.fi;

  function accept() {
    grantConsent();
    setVisible(false);
  }
  function reject() {
    denyConsent();
    setVisible(false);
  }

  return (
    <div
      data-testid="cookie-consent-banner"
      className="fixed bottom-0 inset-x-0 z-50 border-t border-viking-edge bg-viking-bg/95 backdrop-blur-sm shadow-[0_-8px_24px_rgba(0,0,0,0.4)]"
      role="dialog"
      aria-live="polite"
      aria-label={labels.title}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm border border-viking-gold/40 text-viking-gold">
            <Cookie size={16} />
          </span>
          <div className="text-xs sm:text-sm text-viking-stone leading-relaxed">
            <p className="text-viking-bone font-rune text-[11px] mb-1 tracking-[0.18em]">
              {labels.title}
            </p>
            <p>
              {labels.body}{" "}
              <Link
                to="/privacy"
                className="text-viking-gold hover:underline whitespace-nowrap"
              >
                {labels.read_more}
              </Link>
            </p>
          </div>
        </div>
        <div className="flex gap-2 self-stretch sm:self-center flex-shrink-0">
          <Button
            data-testid="cookie-reject"
            variant="outline"
            onClick={reject}
            className="border-viking-edge text-viking-bone hover:border-viking-stone hover:text-viking-stone rounded-sm font-rune text-[10px] tracking-[0.16em] h-9 px-4"
          >
            <X size={12} className="mr-1.5" />
            {labels.reject}
          </Button>
          <Button
            data-testid="cookie-accept"
            onClick={accept}
            className="bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-[10px] tracking-[0.16em] h-9 px-4 ember-glow"
          >
            {labels.accept}
          </Button>
        </div>
      </div>
    </div>
  );
}

const LABELS = {
  fi: {
    title: "EVÄSTEET & ANALYTIIKKA",
    body:
      "Käytämme Google Analyticsia ymmärtääksemme miten sivustoa käytetään. Voit hyväksyä seurannan tai jatkaa ilman.",
    accept: "Hyväksy",
    reject: "Hylkää",
    read_more: "Lue lisää",
  },
  en: {
    title: "COOKIES & ANALYTICS",
    body:
      "We use Google Analytics to understand how the site is used. You can accept tracking or continue without it.",
    accept: "Accept",
    reject: "Reject",
    read_more: "Read more",
  },
  sv: {
    title: "COOKIES & ANALYS",
    body:
      "Vi använder Google Analytics för att förstå hur webbplatsen används. Du kan godkänna spårning eller fortsätta utan.",
    accept: "Godkänn",
    reject: "Avböj",
    read_more: "Läs mer",
  },
  et: {
    title: "KÜPSISED & ANALÜÜTIKA",
    body:
      "Kasutame Google Analyticsit, et mõista, kuidas saiti kasutatakse. Võid nõustuda jälgimisega või jätkata ilma.",
    accept: "Nõustu",
    reject: "Keeldu",
    read_more: "Loe rohkem",
  },
  pl: {
    title: "PLIKI COOKIE I ANALITYKA",
    body:
      "Używamy Google Analytics, aby zrozumieć, jak korzysta się ze strony. Możesz zaakceptować śledzenie lub kontynuować bez niego.",
    accept: "Akceptuj",
    reject: "Odrzuć",
    read_more: "Czytaj więcej",
  },
};
