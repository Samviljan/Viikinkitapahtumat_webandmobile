/**
 * Two password-management dialogs for the web app.
 *
 *   <ChangeOwnPasswordDialog>     — used in /profile, lets the logged-in
 *                                    user change their own password
 *                                    (requires the current password).
 *   <AdminResetUserPasswordDialog> — used in /admin/users by admins to
 *                                    manually set a new password for any
 *                                    other user. Suggests a strong random
 *                                    password and offers a Copy button.
 *
 * Both share the same minimal Dialog shell to keep the surface small.
 */
import React, { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, KeyRound, Copy, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

/* ------------------------------------------------------------------------- */
/*  Strong-password generator (used by the admin reset dialog)               */
/* ------------------------------------------------------------------------- */
const ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";

function generateStrongPassword(len = 14) {
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => ALPHABET[n % ALPHABET.length]).join("");
}

/* ------------------------------------------------------------------------- */
/*  Change own password                                                       */
/* ------------------------------------------------------------------------- */
export function ChangeOwnPasswordDialog({ open, onOpenChange }) {
  const { t } = useI18n();
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setCurrentPwd("");
      setNewPwd("");
      setConfirm("");
      setShowNew(false);
    }
  }, [open]);

  async function submit(e) {
    e?.preventDefault();
    if (newPwd.length < 8) {
      toast.error(t("password.too_short") || "Salasanan tulee olla vähintään 8 merkkiä");
      return;
    }
    if (newPwd !== confirm) {
      toast.error(t("password.mismatch") || "Salasanat eivät täsmää");
      return;
    }
    setBusy(true);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPwd,
        new_password: newPwd,
      });
      toast.success(t("password.changed_ok") || "Salasana vaihdettu");
      onOpenChange(false);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(
        typeof detail === "string"
          ? detail
          : t("password.change_failed") || "Salasanan vaihto epäonnistui",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-viking-bg border-viking-edge"
        data-testid="change-password-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-viking-bone flex items-center gap-2">
            <KeyRound size={16} className="text-viking-gold" />
            {t("password.change_title") || "Vaihda salasana"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field
            label={t("password.current") || "Nykyinen salasana"}
            type="password"
            value={currentPwd}
            onChange={setCurrentPwd}
            autoFocus
            testId="current-password"
          />
          <FieldWithToggle
            label={t("password.new") || "Uusi salasana"}
            value={newPwd}
            onChange={setNewPwd}
            shown={showNew}
            onToggle={() => setShowNew((s) => !s)}
            testId="new-password"
          />
          <Field
            label={t("password.confirm") || "Vahvista uusi salasana"}
            type={showNew ? "text" : "password"}
            value={confirm}
            onChange={setConfirm}
            testId="confirm-password"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="border-viking-edge text-viking-stone"
            >
              {t("common.cancel") || "Peruuta"}
            </Button>
            <Button
              type="submit"
              disabled={busy || !currentPwd || !newPwd || !confirm}
              data-testid="change-password-submit"
              className="bg-viking-ember hover:bg-viking-ember/90 text-viking-bone"
            >
              {busy && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              {t("password.change_btn") || "Vaihda salasana"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------------- */
/*  Admin: reset another user's password manually                             */
/* ------------------------------------------------------------------------- */
export function AdminResetUserPasswordDialog({ user, open, onOpenChange }) {
  const { t } = useI18n();
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const regen = useCallback(() => setPwd(generateStrongPassword(14)), []);

  useEffect(() => {
    if (open) {
      regen();
      setShow(false);
    } else {
      setPwd("");
    }
  }, [open, regen]);

  async function submit() {
    if (!user) return;
    if (pwd.length < 8) {
      toast.error(t("password.too_short") || "Salasanan tulee olla vähintään 8 merkkiä");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/admin/users/${user.id}/reset-password`, {
        new_password: pwd,
      });
      try {
        await navigator.clipboard.writeText(pwd);
      } catch {
        /* clipboard might be unavailable, continue */
      }
      toast.success(
        (t("password.admin_reset_done") ||
          "Salasana vaihdettu — kopioi se käyttäjälle") + ` (${user.email})`,
      );
      onOpenChange(false);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(
        typeof detail === "string"
          ? detail
          : t("password.change_failed") || "Salasanan vaihto epäonnistui",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(pwd);
      toast.success(t("password.copied") || "Kopioitu leikepöydälle");
    } catch {
      toast.error(t("password.copy_failed") || "Kopiointi epäonnistui");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-viking-bg border-viking-edge"
        data-testid="admin-reset-password-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-viking-bone flex items-center gap-2">
            <KeyRound size={16} className="text-viking-gold" />
            {t("password.admin_reset_title") || "Resetoi käyttäjän salasana"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-viking-stone leading-relaxed">
            {t("password.admin_reset_help") ||
              "Tämä asettaa käyttäjälle uuden salasanan. Toimita uusi salasana käyttäjälle turvallista kanavaa pitkin (esim. tekstiviesti tai henkilökohtaisesti). Käyttäjä voi vaihtaa sen sisäänkirjautumisen jälkeen profiilista."}
          </p>
          {user && (
            <p className="text-sm">
              <span className="text-overline mr-2">
                {t("admin.users.col_email") || "Sähköposti"}
              </span>
              <span className="text-viking-bone font-medium break-all">
                {user.email}
              </span>
            </p>
          )}
          <div>
            <label className="text-overline block mb-1.5">
              {t("password.new") || "Uusi salasana"}
            </label>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Input
                  type={show ? "text" : "password"}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  data-testid="admin-reset-new-password"
                  className="bg-viking-surface2/50 border-viking-edge text-viking-bone font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-viking-stone hover:text-viking-gold"
                  aria-label={show ? "Piilota" : "Näytä"}
                >
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={regen}
                title={t("password.regenerate") || "Luo uusi"}
                className="border-viking-edge text-viking-stone hover:text-viking-gold"
                data-testid="admin-reset-regen"
              >
                <Sparkles size={14} />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={copy}
                title={t("password.copy") || "Kopioi"}
                className="border-viking-edge text-viking-stone hover:text-viking-gold"
                data-testid="admin-reset-copy"
              >
                <Copy size={14} />
              </Button>
            </div>
            <p className="text-[11px] text-viking-stone mt-1.5">
              {t("password.admin_reset_hint") ||
                "Tallennettaessa salasana kopioidaan automaattisesti leikepöydälle."}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="border-viking-edge text-viking-stone"
            >
              {t("common.cancel") || "Peruuta"}
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={busy || pwd.length < 8}
              data-testid="admin-reset-submit"
              className="bg-viking-ember hover:bg-viking-ember/90 text-viking-bone"
            >
              {busy && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              {t("password.admin_reset_btn") || "Aseta salasana"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------------- */
function Field({ label, type = "password", value, onChange, autoFocus, testId }) {
  return (
    <div>
      <label className="text-overline block mb-1.5">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        data-testid={testId}
        className="bg-viking-surface2/50 border-viking-edge text-viking-bone"
      />
    </div>
  );
}

function FieldWithToggle({ label, value, onChange, shown, onToggle, testId }) {
  return (
    <div>
      <label className="text-overline block mb-1.5">{label}</label>
      <div className="relative">
        <Input
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId}
          className="bg-viking-surface2/50 border-viking-edge text-viking-bone pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-viking-stone hover:text-viking-gold"
          aria-label={shown ? "Piilota" : "Näytä"}
        >
          {shown ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}
