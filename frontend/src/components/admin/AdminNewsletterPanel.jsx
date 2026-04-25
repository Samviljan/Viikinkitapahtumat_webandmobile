import React, { useState } from "react";
import DOMPurify from "dompurify";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Mail, Send, Eye } from "lucide-react";
import { toast } from "sonner";

export default function AdminNewsletterPanel() {
  const { t } = useI18n();
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState(null);

  async function loadPreview() {
    try {
      const { data } = await api.get("/admin/newsletter/preview");
      setPreview(data);
      setPreviewOpen(true);
    } catch {
      toast.error(t("admin.action_error"));
    }
  }

  async function sendNow() {
    if (!window.confirm(t("admin.newsletter_confirm"))) return;
    setSending(true);
    try {
      const { data } = await api.post("/admin/newsletter/send");
      toast.success(`${t("admin.newsletter_sent")}: ${data.sent}/${data.recipients}`);
    } catch {
      toast.error(t("admin.action_error"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="carved-card rounded-sm p-6 sm:p-8 mb-10" data-testid="newsletter-panel">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-viking-gold/50 text-viking-gold flex-shrink-0">
            <Mail size={18} />
          </span>
          <div>
            <h3 className="font-serif text-2xl text-viking-bone">{t("admin.newsletter_title")}</h3>
            <p className="text-sm text-viking-stone mt-1 max-w-2xl">
              {t("admin.newsletter_sub")}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            data-testid="newsletter-preview-btn"
            onClick={loadPreview}
            className="border-viking-edge text-viking-bone hover:border-viking-gold hover:text-viking-gold rounded-sm font-rune text-[10px]"
          >
            <Eye size={12} className="mr-2" />
            {t("admin.newsletter_preview")}
          </Button>
          <Button
            data-testid="newsletter-send-btn"
            disabled={sending}
            onClick={sendNow}
            className="bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-[10px] ember-glow"
          >
            <Send size={12} className="mr-2" />
            {sending ? "..." : t("admin.newsletter_send_now")}
          </Button>
        </div>
      </div>

      {previewOpen && preview && (
        <div className="mt-6 border-t border-viking-edge pt-5">
          <div className="text-overline mb-2">{preview.subject}</div>
          <div className="text-xs text-viking-stone mb-3">
            {t("admin.newsletter_count")}: {preview.count}
          </div>
          <div
            className="bg-viking-bg rounded-sm p-2 max-h-[420px] overflow-auto border border-viking-edge"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(preview.html) }}
          />
        </div>
      )}
    </div>
  );
}
