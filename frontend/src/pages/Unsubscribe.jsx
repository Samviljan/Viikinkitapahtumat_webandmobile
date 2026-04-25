import React, { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { Check, AlertTriangle } from "lucide-react";

export default function Unsubscribe() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const status = params.get("unsub"); // 'ok' | 'invalid' | null

  useEffect(() => {
    document.title = `${t("newsletter.unsub_title")} — Viikinkitapahtumat`;
  }, [t]);

  const ok = status === "ok";
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div
        className="carved-card rounded-sm p-8 sm:p-10 max-w-md w-full text-center"
        data-testid="unsubscribe-card"
      >
        {ok ? (
          <>
            <Check size={42} className="mx-auto text-viking-gold mb-4" />
            <h1 className="font-serif text-3xl text-viking-bone mb-3">{t("newsletter.unsub_title")}</h1>
            <p className="text-viking-stone leading-relaxed">{t("newsletter.unsub_body")}</p>
          </>
        ) : (
          <>
            <AlertTriangle size={42} className="mx-auto text-viking-ember mb-4" />
            <h1 className="font-serif text-3xl text-viking-bone mb-3">{t("newsletter.unsub_invalid_title")}</h1>
            <p className="text-viking-stone leading-relaxed">{t("newsletter.unsub_invalid_body")}</p>
          </>
        )}
        <Link
          to="/"
          className="inline-block mt-6 font-rune text-xs text-viking-gold border border-viking-gold/50 rounded-sm px-5 py-2.5 hover:bg-viking-gold/10 transition-colors"
        >
          {t("events.back")} →
        </Link>
      </div>
    </div>
  );
}
