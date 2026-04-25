import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHero from "@/components/PageHero";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

const CATS = ["market", "battle", "course", "festival", "meetup", "other"];
const fieldClass =
  "bg-viking-surface border-viking-edge rounded-sm text-viking-bone placeholder:text-viking-stone focus:border-viking-ember focus:ring-viking-ember";

export default function Submit() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    title_fi: "",
    title_en: "",
    title_sv: "",
    description_fi: "",
    description_en: "",
    description_sv: "",
    category: "market",
    location: "",
    start_date: "",
    end_date: "",
    organizer: "",
    organizer_email: "",
    link: "",
    image_url: "",
  });

  const update = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.organizer_email) delete payload.organizer_email;
      if (!payload.end_date) delete payload.end_date;
      await api.post("/events", payload);
      setSuccess(true);
      toast.success(t("submit.success"));
      setTimeout(() => nav("/events"), 1800);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || t("submit.error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-32 text-center" data-testid="submit-success">
        <CheckCircle2 size={56} className="mx-auto text-viking-gold mb-6" />
        <h2 className="font-serif text-3xl text-viking-bone mb-3">{t("submit.success")}</h2>
      </div>
    );
  }

  return (
    <>
      <PageHero eyebrow={t("nav.submit")} title={t("submit.title")} sub={t("submit.sub")} />

      <section className="mx-auto max-w-3xl px-4 sm:px-8 py-12">
        <form
          onSubmit={onSubmit}
          data-testid="submit-form"
          className="carved-card rounded-sm p-7 sm:p-10 space-y-6"
        >
          <Field label={t("submit.title_field")} required>
            <Input
              required
              data-testid="field-title-fi"
              value={form.title_fi}
              onChange={update("title_fi")}
              className={fieldClass}
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label={t("submit.title_en")}>
              <Input
                data-testid="field-title-en"
                value={form.title_en}
                onChange={update("title_en")}
                className={fieldClass}
              />
            </Field>
            <Field label={t("submit.title_sv")}>
              <Input
                data-testid="field-title-sv"
                value={form.title_sv}
                onChange={update("title_sv")}
                className={fieldClass}
              />
            </Field>
          </div>

          <Field label={t("submit.desc_field")} required>
            <Textarea
              required
              data-testid="field-desc-fi"
              rows={5}
              value={form.description_fi}
              onChange={update("description_fi")}
              className={fieldClass}
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label={t("submit.desc_en")}>
              <Textarea
                data-testid="field-desc-en"
                rows={4}
                value={form.description_en}
                onChange={update("description_en")}
                className={fieldClass}
              />
            </Field>
            <Field label={t("submit.desc_sv")}>
              <Textarea
                data-testid="field-desc-sv"
                rows={4}
                value={form.description_sv}
                onChange={update("description_sv")}
                className={fieldClass}
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label={t("submit.category")} required>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger data-testid="field-category" className={fieldClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-viking-surface border-viking-edge text-viking-bone">
                  {CATS.map((c) => (
                    <SelectItem
                      key={c}
                      value={c}
                      className="focus:bg-viking-surface2 focus:text-viking-gold"
                    >
                      {t(`cats.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("submit.location")} required>
              <Input
                required
                data-testid="field-location"
                value={form.location}
                onChange={update("location")}
                className={fieldClass}
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label={t("submit.start_date")} required>
              <Input
                required
                data-testid="field-start-date"
                type="date"
                value={form.start_date}
                onChange={update("start_date")}
                className={fieldClass}
              />
            </Field>
            <Field label={t("submit.end_date")}>
              <Input
                data-testid="field-end-date"
                type="date"
                value={form.end_date}
                onChange={update("end_date")}
                className={fieldClass}
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label={t("submit.organizer")} required>
              <Input
                required
                data-testid="field-organizer"
                value={form.organizer}
                onChange={update("organizer")}
                className={fieldClass}
              />
            </Field>
            <Field label={t("submit.organizer_email")}>
              <Input
                type="email"
                data-testid="field-organizer-email"
                value={form.organizer_email}
                onChange={update("organizer_email")}
                className={fieldClass}
              />
            </Field>
          </div>

          <Field label={t("submit.link")}>
            <Input
              data-testid="field-link"
              value={form.link}
              onChange={update("link")}
              placeholder="https://"
              className={fieldClass}
            />
          </Field>

          <Field label={t("submit.image")}>
            <Input
              data-testid="field-image"
              value={form.image_url}
              onChange={update("image_url")}
              placeholder="https://"
              className={fieldClass}
            />
          </Field>

          <Button
            type="submit"
            disabled={submitting}
            data-testid="submit-event-btn"
            className="w-full bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-xs h-12 ember-glow"
          >
            {submitting ? "..." : t("submit.submit_btn")}
          </Button>
        </form>
      </section>
    </>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-2">
      <Label className="text-overline">
        {label} {required && <span className="text-viking-ember">*</span>}
      </Label>
      {children}
    </div>
  );
}
