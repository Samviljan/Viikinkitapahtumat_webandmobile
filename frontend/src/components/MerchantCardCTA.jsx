/**
 * "Get a merchant card" CTA — appears on /shops below the categories.
 *
 * Visibility rules:
 *   - Anonymous → "Sign in / Register" → /register
 *   - Logged in, no active merchant card → opens an in-app request dialog;
 *     submitted form goes to `merchant_card_requests` collection where
 *     admins can approve with one click (auto-activates the merchant card).
 *   - Logged in WITH active merchant card → hidden entirely.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Store, Check, Mail, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const CATEGORIES = ["gear", "smith", "other"];

function RequestDialog({ open, onClose, onSubmitted }) {
  const { t } = useI18n();
  const [shopName, setShopName] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState("gear");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState(null);

  useEffect(() => {
    if (!open) return;
    api
      .get("/merchant-card-requests/mine")
      .then((r) => {
        const doc = r.data;
        if (doc) {
          setExisting(doc);
          setShopName(doc.shop_name || "");
          setWebsite(doc.website || "");
          setCategory(doc.category || "gear");
          setDescription(doc.description || "");
        } else {
          setExisting(null);
          setShopName("");
          setWebsite("");
          setCategory("gear");
          setDescription("");
        }
      })
      .catch(() => setExisting(null));
  }, [open]);

  const submit = async () => {
    if (!shopName.trim()) {
      toast.error(t("merchant_cta.err_shop_required"));
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/merchant-card-requests", {
        shop_name: shopName.trim(),
        website: website.trim(),
        category,
        description: description.trim(),
      });
      toast.success(t("merchant_cta.submit_success"));
      onSubmitted?.(data);
      onClose();
    } catch {
      toast.error(t("account.error_generic"));
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = existing && existing.status === "pending";
  const isApproved = existing && existing.status === "approved";
  const isRejected = existing && existing.status === "rejected";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-testid="merchant-cta-dialog"
        className="bg-viking-surface border-viking-edge text-viking-bone max-w-lg"
      >
        <DialogTitle className="font-serif text-xl text-viking-bone">
          {t("merchant_cta.dialog_title")}
        </DialogTitle>
        <DialogDescription className="text-viking-stone text-sm">
          {t("merchant_cta.dialog_lead")}
        </DialogDescription>

        {isApproved ? (
          <div
            className="flex items-start gap-2 p-3 rounded-sm border border-viking-gold/40 bg-viking-gold/5 text-sm text-viking-bone"
            data-testid="merchant-cta-status-approved"
          >
            <ShieldCheck size={16} className="text-viking-gold mt-0.5 flex-shrink-0" />
            <span>{t("merchant_cta.status_approved")}</span>
          </div>
        ) : null}
        {isRejected ? (
          <div
            className="flex items-start gap-2 p-3 rounded-sm border border-viking-ember/40 bg-viking-ember/5 text-sm text-viking-bone"
            data-testid="merchant-cta-status-rejected"
          >
            <span>{t("merchant_cta.status_rejected")}</span>
          </div>
        ) : null}
        {isPending ? (
          <div
            className="flex items-start gap-2 p-3 rounded-sm border border-viking-stone/40 bg-viking-shadow/30 text-sm text-viking-bone"
            data-testid="merchant-cta-status-pending"
          >
            <Loader2 size={14} className="text-viking-gold mt-1 flex-shrink-0" />
            <span>{t("merchant_cta.status_pending")}</span>
          </div>
        ) : null}

        <div className="space-y-3 mt-2">
          <div>
            <label className="text-overline text-viking-gold mb-1 block">
              {t("merchant_cta.field_shop")}
            </label>
            <Input
              data-testid="merchant-cta-shop"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              maxLength={200}
              className="bg-viking-shadow/40 border-viking-edge text-viking-bone"
            />
          </div>
          <div>
            <label className="text-overline text-viking-gold mb-1 block">
              {t("merchant_cta.field_category")}
            </label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  data-testid={`merchant-cta-cat-${c}`}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-2 rounded-sm border text-xs font-rune uppercase tracking-wider transition-colors ${
                    category === c
                      ? "border-viking-gold text-viking-gold bg-viking-gold/10"
                      : "border-viking-edge text-viking-stone hover:text-viking-bone"
                  }`}
                >
                  {t(`merchant_cta.cat_${c}`)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-overline text-viking-gold mb-1 block">
              {t("merchant_cta.field_website")}
            </label>
            <Input
              data-testid="merchant-cta-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
              maxLength={500}
              className="bg-viking-shadow/40 border-viking-edge text-viking-bone"
            />
          </div>
          <div>
            <label className="text-overline text-viking-gold mb-1 block">
              {t("merchant_cta.field_desc")}
            </label>
            <Textarea
              data-testid="merchant-cta-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={1500}
              placeholder={t("merchant_cta.field_desc_ph")}
              className="bg-viking-shadow/40 border-viking-edge text-viking-bone"
            />
          </div>
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-viking-edge/60">
          <button
            type="button"
            onClick={onClose}
            data-testid="merchant-cta-cancel"
            className="text-sm text-viking-stone hover:text-viking-bone"
          >
            {t("merchant_cta.cancel")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !shopName.trim() || isApproved}
            data-testid="merchant-cta-submit"
            className="inline-flex items-center gap-2 bg-viking-ember hover:bg-viking-emberHover disabled:opacity-50 text-viking-bone font-rune text-xs h-10 px-5 rounded-sm tracking-wider uppercase ember-glow"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Mail size={14} />
            )}
            {isPending
              ? t("merchant_cta.update_request")
              : t("merchant_cta.send_request")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MerchantCardCTA() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const hasActiveCard = !!(user && user.merchant_card && user.merchant_card.enabled);
  if (hasActiveCard) return null;

  const isAnonymous = !user || !user.role;

  return (
    <>
      <div
        data-testid="merchant-cta"
        className="carved-card rounded-sm p-6 sm:p-8 border-viking-ember/40 bg-viking-shadow/30"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-sm border border-viking-gold/40 flex items-center justify-center text-viking-gold flex-shrink-0">
            <Store size={18} />
          </div>
          <div>
            <div className="text-overline text-viking-gold">
              {t("merchant_cta.eyebrow")}
            </div>
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
          <button
            type="button"
            onClick={() => setOpen(true)}
            data-testid="merchant-cta-request"
            className="inline-flex items-center gap-2 bg-viking-ember hover:bg-viking-emberHover text-viking-bone font-rune text-xs h-11 px-6 rounded-sm tracking-wider uppercase ember-glow"
          >
            <Mail size={14} />
            {t("merchant_cta.cta_request")}
          </button>
        )}
        <p className="text-[11px] text-viking-stone italic mt-4 leading-relaxed">
          {t("merchant_cta.fine_print")}
        </p>
      </div>
      {!isAnonymous ? (
        <RequestDialog open={open} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
