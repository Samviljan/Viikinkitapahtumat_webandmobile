import React, { useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function RemindMeButton({ eventId, variant = "default" }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/events/${eventId}/remind`, { email, lang });
      if (data?.already) {
        toast.success(t("remind.already"));
      } else {
        toast.success(t("remind.success"));
      }
      setOpen(false);
      setEmail("");
    } catch (err) {
      toast.error(
        formatApiErrorDetail(err.response?.data?.detail) || t("remind.error")
      );
    } finally {
      setBusy(false);
    }
  }

  function openDialog(e) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  }

  const triggerCls =
    variant === "compact"
      ? "inline-flex h-9 w-9 items-center justify-center rounded-sm border border-viking-edge/70 text-viking-bone bg-viking-bg/60 hover:text-viking-ember hover:border-viking-ember backdrop-blur-sm transition-colors"
      : "inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-viking-ember/60 text-viking-ember hover:bg-viking-ember/10 font-rune text-[10px] tracking-[0.2em] uppercase transition-colors";

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        data-testid={`remind-trigger-${eventId}`}
        aria-label={t("remind.button")}
        title={t("remind.button")}
        className={triggerCls}
      >
        <Bell size={variant === "compact" ? 16 : 14} />
        {variant !== "compact" && t("remind.button")}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          data-testid="remind-dialog"
          className="bg-viking-surface border-viking-edge text-viking-bone max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-viking-bone">
              {t("remind.title")}
            </DialogTitle>
            <DialogDescription className="text-viking-stone">
              {t("remind.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3 mt-2">
            <div>
              <Label className="text-overline">{t("remind.email_label")}</Label>
              <Input
                type="email"
                required
                autoFocus
                data-testid="remind-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-viking-surface border-viking-edge rounded-sm text-viking-bone placeholder:text-viking-stone focus:border-viking-ember focus:ring-viking-ember"
              />
            </div>
            <p className="text-xs text-viking-stone">{t("remind.privacy")}</p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="border-viking-edge text-viking-bone rounded-sm font-rune text-xs"
              >
                {t("admin.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={busy || !email}
                data-testid="remind-submit"
                className="bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-xs ember-glow"
              >
                {busy ? "..." : t("remind.send")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
