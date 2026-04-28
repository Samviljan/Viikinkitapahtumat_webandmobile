/**
 * One row in the Profile page for a personal PDF document — supports:
 *   - Upload (input file → POST /api/uploads/profile-doc, kind=...)
 *   - View (opens authed PDF in a new tab via blob URL)
 *   - Remove (PATCH /api/auth/profile { <field>: "" })
 *
 * The PDF endpoint requires auth, so we cannot simply set <a href={url}>:
 * the browser would issue an unauthenticated GET. Instead we fetch the PDF
 * with our axios client (which carries the JWT/cookie) and open the resulting
 * Blob in a new tab.
 */
import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Upload, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function ProfileDocField({
  kind,
  field: _field,
  labelKey,
  helpKey,
  uploadCtaKey,
  testIdPrefix,
  url,
  onChange,
}) {
  const { t } = useI18n();
  const { refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  async function onPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error(t("account.doc_pdf_only"));
      e.target.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error(t("account.doc_too_large"));
      e.target.value = "";
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file);
      const { data } = await api.post("/uploads/profile-doc", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(data.url);
      await refresh();
      toast.success(t("account.doc_saved"));
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : t("account.error_generic"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onView() {
    if (!url) return;
    setBusy(true);
    try {
      const res = await api.get(url.replace(/^\/api/, ""), { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      // Free the object URL after the new tab has had time to load it.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch {
      toast.error(t("account.error_generic"));
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    if (!url) return;
    if (!window.confirm(t("account.doc_confirm_remove"))) return;
    try {
      await api.patch("/auth/profile", { [_field]: "" });
      onChange("");
      await refresh();
      toast.success(t("account.doc_removed"));
    } catch {
      toast.error(t("account.error_generic"));
    }
  }

  const has = !!url;
  return (
    <div className="space-y-2" data-testid={`${testIdPrefix}-block`}>
      <Label className="text-overline">{t(labelKey)}</Label>
      <div className="flex flex-wrap items-center gap-2">
        {has ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onView}
            data-testid={`${testIdPrefix}-view`}
            className="border-viking-gold/50 text-viking-gold hover:bg-viking-gold/10 rounded-sm h-10 px-4 text-xs font-rune uppercase tracking-wider"
          >
            <FileText className="w-3.5 h-3.5 mr-2" />
            {t("account.doc_view")}
            <ExternalLink className="w-3 h-3 ml-2 opacity-70" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          data-testid={`${testIdPrefix}-upload`}
          className="border-viking-edge text-viking-stone hover:text-viking-bone hover:border-viking-gold/60 rounded-sm h-10 px-4 text-xs font-rune uppercase tracking-wider"
        >
          <Upload className="w-3.5 h-3.5 mr-2" />
          {t(has ? "account.doc_replace" : (uploadCtaKey || "account.doc_upload"))}
        </Button>
        {has ? (
          <button
            type="button"
            disabled={busy}
            onClick={onRemove}
            data-testid={`${testIdPrefix}-remove`}
            title={t("account.doc_remove")}
            className="h-10 w-10 rounded-sm border border-viking-edge text-viking-stone hover:text-viking-ember hover:border-viking-ember/60 transition-colors flex items-center justify-center disabled:opacity-30"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={onPick}
          className="hidden"
          data-testid={`${testIdPrefix}-input`}
        />
      </div>
      <p className="text-[11px] text-viking-stone italic">{t(helpKey)}</p>
    </div>
  );
}
