/**
 * Compact admin diagnostic: shows EXPO_ACCESS_TOKEN status + count of users
 * that have registered an Expo push token. If 0, push messages can't reach
 * anyone — the card explains why and how to test.
 */
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

export default function AdminPushHealthCard() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/admin/push/health").then((r) => setData(r.data)).catch(() => {});
  }, []);

  async function sendTest() {
    setBusy(true);
    try {
      const { data: r } = await api.post("/admin/push/test");
      if ((r.recipients ?? 0) === 0) {
        toast.error(t("admin.push.test_no_token"));
      } else {
        toast.success(
          (t("admin.push.test_sent") || "")
            .replace("{n}", String(r.recipients || 0)),
        );
      }
    } catch {
      toast.error(t("account.error_generic"));
    } finally {
      setBusy(false);
    }
  }

  if (!data) return null;
  const healthy =
    data.expo_access_token_set && (data.users_with_push_token ?? 0) > 0;
  const Icon = healthy ? Bell : BellOff;

  return (
    <div
      className="carved-card rounded-sm p-5 flex flex-col gap-4"
      data-testid="admin-push-health"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`h-10 w-10 rounded-sm border flex items-center justify-center shrink-0 ${
              healthy
                ? "border-viking-gold/50 text-viking-gold bg-viking-gold/5"
                : "border-viking-ember/60 text-viking-ember bg-viking-ember/10"
            }`}
          >
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <div className="font-rune text-xs uppercase tracking-wider text-viking-bone">
              {t("admin.push.title")}
            </div>
            <div className="text-[11px] text-viking-stone mt-0.5">
              {t("admin.push.token_set")}:{" "}
              <span
                className={
                  data.expo_access_token_set ? "text-viking-gold" : "text-viking-ember"
                }
                data-testid="admin-push-token-status"
              >
                {data.expo_access_token_set ? t("admin.push.yes") : t("admin.push.no")}
              </span>
              {" · "}
              {t("admin.push.users_with_token")}:{" "}
              <span
                className={
                  (data.users_with_push_token ?? 0) > 0
                    ? "text-viking-gold"
                    : "text-viking-ember"
                }
                data-testid="admin-push-token-count"
              >
                {data.users_with_push_token ?? 0}
              </span>
            </div>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={sendTest}
          data-testid="admin-push-test-btn"
          className="border-viking-gold/50 text-viking-gold hover:bg-viking-gold/10 shrink-0"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
          {t("admin.push.test_btn")}
        </Button>
      </div>
      {!healthy ? (
        <p className="text-[11px] text-viking-stone leading-relaxed border-t border-viking-edge pt-3">
          {t("admin.push.empty_help")}
        </p>
      ) : null}
    </div>
  );
}
