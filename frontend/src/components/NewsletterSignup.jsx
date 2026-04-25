import React, { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { api, formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Check } from "lucide-react";

export default function NewsletterSignup({ variant = "card" }) {
  const { t, lang } = useI18n();
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [errMsg, setErrMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!email) return;
    setState("loading");
    setErrMsg("");
    try {
      await api.post("/newsletter/subscribe", { email, lang });
      setState("done");
    } catch (err) {
      setErrMsg(formatApiErrorDetail(err.response?.data?.detail) || "Error");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div
        data-testid="newsletter-success"
        className={
          variant === "card"
            ? "carved-card rounded-sm p-7 sm:p-8 flex items-center gap-4"
            : "flex items-center gap-3 text-viking-bone"
        }
      >
        <Check size={20} className="text-viking-gold flex-shrink-0" />
        <div>
          <p className="font-serif text-lg text-viking-bone">{t("newsletter.success_title")}</p>
          <p className="text-sm text-viking-stone mt-0.5">{t("newsletter.success_body")}</p>
        </div>
      </div>
    );
  }

  const isFooter = variant === "footer";

  return (
    <form
      onSubmit={submit}
      data-testid="newsletter-form"
      className={
        isFooter
          ? "flex flex-col sm:flex-row gap-2 max-w-md"
          : "carved-card rounded-sm p-7 sm:p-10"
      }
    >
      {!isFooter && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-viking-gold/50 text-viking-gold">
              <Mail size={16} />
            </span>
            <div className="text-overline">{t("newsletter.eyebrow")}</div>
          </div>
          <h3 className="font-serif text-3xl text-viking-bone leading-tight mb-2">
            {t("newsletter.title")}
          </h3>
          <p className="text-sm text-viking-stone mb-5 max-w-xl">{t("newsletter.body")}</p>
        </>
      )}

      <div className={isFooter ? "flex flex-col sm:flex-row gap-2 w-full" : "flex flex-col sm:flex-row gap-3"}>
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("newsletter.placeholder")}
          data-testid="newsletter-email"
          className="bg-viking-surface border-viking-edge rounded-sm text-viking-bone placeholder:text-viking-stone focus:border-viking-ember focus:ring-viking-ember h-11 sm:flex-1"
        />
        <Button
          type="submit"
          disabled={state === "loading"}
          data-testid="newsletter-submit"
          className="bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-xs h-11 px-6 ember-glow"
        >
          {state === "loading" ? "..." : t("newsletter.cta")}
        </Button>
      </div>
      {state === "error" && (
        <p className="text-xs text-viking-ember mt-2 font-rune" data-testid="newsletter-error">
          {errMsg}
        </p>
      )}
      {!isFooter && (
        <p className="text-xs text-viking-stone mt-3">{t("newsletter.privacy")}</p>
      )}
    </form>
  );
}
