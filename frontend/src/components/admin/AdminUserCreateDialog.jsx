/**
 * Modal dialog: "Add admin user" — used from AdminUsersPanel.
 * Calls POST /api/admin/users which creates a user with role="admin".
 */
import React, { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";

export default function AdminUserCreateDialog({ open, onOpenChange, onCreated }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setEmail("");
    setNickname("");
    setPassword("");
    setBusy(false);
  }

  async function submit(e) {
    e.preventDefault();
    if (!email.trim() || !nickname.trim() || password.length < 8) return;
    setBusy(true);
    try {
      const { data } = await api.post("/admin/users", {
        email: email.trim().toLowerCase(),
        nickname: nickname.trim(),
        password,
      });
      toast.success(t("admin.users.create_admin_success"));
      reset();
      onOpenChange(false);
      onCreated?.(data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 409) {
        toast.error(t("account.error_duplicate"));
      } else if (typeof detail === "string") {
        toast.error(detail);
      } else {
        toast.error(t("account.error_generic"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-viking-surface border border-viking-edge text-viking-bone sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-viking-bone">
            {t("admin.users.add_admin_title")}
          </DialogTitle>
          <DialogDescription className="text-xs text-viking-stone">
            {t("admin.users.add_admin_help")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2" data-testid="admin-create-form">
          <div className="space-y-1.5">
            <Label htmlFor="admin-new-email" className="text-overline">
              {t("admin.email")}
            </Label>
            <Input
              id="admin-new-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="admin-create-email"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-new-nick" className="text-overline">
              {t("account.nickname")}
            </Label>
            <Input
              id="admin-new-nick"
              required
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              data-testid="admin-create-nickname"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-new-pw" className="text-overline">
              {t("admin.password")}
            </Label>
            <Input
              id="admin-new-pw"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="admin-create-password"
              autoComplete="new-password"
            />
            <p className="text-[11px] text-viking-stone">
              {t("account.password_min")}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              data-testid="admin-create-cancel"
            >
              {t("admin.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="bg-viking-ember hover:bg-viking-ember/90"
              data-testid="admin-create-submit"
            >
              {busy ? "…" : t("admin.users.add_admin_btn")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
