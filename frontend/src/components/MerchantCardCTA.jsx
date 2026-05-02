/**
 * "Get a merchant card" CTA — appears on /shops below the featured strip.
 *
 * Visibility rules:
 *   - Anonymous → "Sign in / Register" → /register
 *   - Logged in, no active merchant card → mailto: admin requesting activation
 *   - Logged in WITH active merchant card → hidden entirely (already a customer)
 */
import React from "react";
import { Link } from "react-router-dom";
import { Store, Check, Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const ADMIN_EMAIL = "admin@viikinkitapahtumat.fi";

export default function MerchantCardCTA() {
  const { t } = useI18n();
  const { user } = useAuth();

  const hasActiveCard = !!(user && user.merchant_card && user.merchant_card.enabled);
  if (hasActiveCard) return null;

  const isAnonymous = !user || !user.role;
  const subject = encodeURIComponent(t("merchant_cta.email_subject"));
  const body = encodeURIComponent(t("merchant_cta.email_body"));
  const mailtoHref = `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;

  return (
    <div
      data-testid="merchant-cta"
      className="carved-card rounded-sm p-6 sm:p-8 border-viking-ember/40 bg-viking-shadow/30"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-sm border border-viking-gold/40 flex items-center justify-center text-viking-gold flex-shrink-0">
          <Store size={18} />
        </div>
        <div>
          <div className="text-overline text-viking-gold">{t("merchant_cta.eyebrow")}</div>
          <h3 className="font-serif text-xl text-viking-bone mt-1">
            {t("merchant_cta.title")}
          </h3>
        </div>
      </div>
      <p className="text-sm text-viking-stone leading-relaxed mb-4">
        {t("merchant_cta.lead")}
      </p>
      <ul className="space-y-2 mb-6 text-sm text-viking-bone">
        {[
          t("merchant_cta.benefit_visibility"),
          t("merchant_cta.benefit_profile"),
          t("merchant_cta.benefit_favorites"),
          t("merchant_cta.benefit_duration"),
        ].map((line, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check size={14} className="text-viking-gold mt-1 flex-shrink-0" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      {isAnonymous ? (
        <Link
          to="/register"
          data-testid="merchant-cta-register"
          className="inline-flex items-center gap-2 bg-viking-ember hover:bg-viking-emberHover text-viking-bone font-rune text-xs h-11 px-6 rounded-sm tracking-wider uppercase ember-glow"
        >
          {t("merchant_cta.cta_register")}
        </Link>
      ) : (
        <a
          href={mailtoHref}
          data-testid="merchant-cta-request"
          className="inline-flex items-center gap-2 bg-viking-ember hover:bg-viking-emberHover text-viking-bone font-rune text-xs h-11 px-6 rounded-sm tracking-wider uppercase ember-glow"
        >
          <Mail size={14} />
          {t("merchant_cta.cta_request")}
        </a>
      )}
      <p className="text-[11px] text-viking-stone italic mt-4">
        {t("merchant_cta.fine_print")}
      </p>
    </div>
  );
}
