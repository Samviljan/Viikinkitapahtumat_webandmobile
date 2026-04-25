import React, { useState } from "react";
import PageHero from "@/components/PageHero";
import { useI18n } from "@/lib/i18n";
import { Mail, Send, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const fieldClass =
  "bg-viking-surface border-viking-edge rounded-sm text-viking-bone placeholder:text-viking-stone focus:border-viking-ember focus:ring-viking-ember";

const ADMIN_EMAIL = "admin@viikinkitapahtumat.fi";

export default function Contact() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ event_name: "", event_date: "", info: "" });

  const update = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  function copyEmail() {
    navigator.clipboard.writeText(ADMIN_EMAIL);
    setCopied(true);
    toast.success(t("contact.copied"));
    setTimeout(() => setCopied(false), 2000);
  }

  function submit(e) {
    e.preventDefault();
    const subject = encodeURIComponent(form.event_name || t("contact.subject_default"));
    const body = encodeURIComponent(
      `${t("submit.start_date")}: ${form.event_date}\n\n${form.info}`
    );
    window.location.href = `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <>
      <PageHero eyebrow="ᛒᚱᛖᚠ" title={t("contact.title")} sub={t("contact.sub")} />

      <section className="mx-auto max-w-3xl px-4 sm:px-8 py-12 space-y-8">
        {/* Email card */}
        <div
          className="carved-card rounded-sm p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          data-testid="contact-email-card"
        >
          <div className="flex items-center gap-4">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-viking-gold/50 text-viking-gold">
              <Mail size={18} />
            </span>
            <div>
              <div className="text-overline mb-1">{t("contact.email_label")}</div>
              <a
                href={`mailto:${ADMIN_EMAIL}`}
                className="font-serif text-2xl text-viking-bone hover:text-viking-gold"
              >
                {ADMIN_EMAIL}
              </a>
            </div>
          </div>
          <Button
            variant="outline"
            data-testid="contact-copy-email"
            onClick={copyEmail}
            className="border-viking-edge text-viking-bone hover:border-viking-gold hover:text-viking-gold rounded-sm font-rune text-xs"
          >
            {copied ? <Check size={14} className="mr-2" /> : <Copy size={14} className="mr-2" />}
            {copied ? t("contact.copied") : t("contact.copy")}
          </Button>
        </div>

        {/* Form */}
        <form
          onSubmit={submit}
          data-testid="contact-form"
          className="carved-card rounded-sm p-7 sm:p-10 space-y-5"
        >
          <h2 className="font-serif text-2xl text-viking-bone mb-2">{t("contact.form_title")}</h2>
          <p className="text-sm text-viking-stone -mt-2 mb-4">{t("contact.form_sub")}</p>

          <div className="space-y-2">
            <Label className="text-overline">{t("contact.event_name")}</Label>
            <Input
              data-testid="contact-event-name"
              value={form.event_name}
              onChange={update("event_name")}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-overline">{t("contact.event_date")}</Label>
            <Input
              data-testid="contact-event-date"
              value={form.event_date}
              onChange={update("event_date")}
              className={fieldClass}
              placeholder="esim. 12.6.2026"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-overline">{t("contact.info")}</Label>
            <Textarea
              data-testid="contact-info"
              rows={6}
              value={form.info}
              onChange={update("info")}
              className={fieldClass}
            />
          </div>

          <Button
            type="submit"
            data-testid="contact-submit"
            className="w-full bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-xs h-12 ember-glow"
          >
            <Send size={14} className="mr-2" />
            {t("contact.send")}
          </Button>

          <p className="text-xs text-viking-stone pt-2 border-t border-viking-edge/60">
            {t("contact.tip")}
          </p>
        </form>
      </section>
    </>
  );
}
