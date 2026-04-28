import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { KeyRound, ChevronLeft } from "lucide-react";

const fieldClass =
  "bg-viking-surface border-viking-edge rounded-sm text-viking-bone placeholder:text-viking-stone focus:border-viking-ember focus:ring-viking-ember";

export default function ResetPassword() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t("account.password_min"));
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        new_password: password,
      });
      setDone(true);
      setTimeout(() => nav("/login"), 2500);
    } catch (err) {
      setError(t("account.reset_error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md carved-card rounded-sm p-8 sm:p-10" data-testid="reset-card">
        <div className="flex items-center gap-3 mb-7">
          <div className="h-10 w-10 rounded-sm border border-viking-gold/50 flex items-center justify-center text-viking-gold">
            <KeyRound size={18} />
          </div>
          <div>
            <div className="text-overline">{t("account.my_account")}</div>
            <h1 className="font-serif text-2xl text-viking-bone">{t("account.reset_title")}</h1>
          </div>
        </div>

        {!token ? (
          <p className="text-sm text-viking-ember" data-testid="reset-no-token">
            {t("account.reset_invalid")}
          </p>
        ) : done ? (
          <div data-testid="reset-success">
            <p className="text-sm text-viking-bone">{t("account.reset_success")}</p>
            <p className="text-xs text-viking-stone mt-3">…</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <p className="text-sm text-viking-stone leading-relaxed">{t("account.reset_sub")}</p>
            <div className="space-y-2">
              <Label className="text-overline">{t("account.new_password")}</Label>
              <Input
                type="password"
                required
                data-testid="reset-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("account.password_min")}
                className={fieldClass}
              />
            </div>
            {error && (
              <p data-testid="reset-error" className="text-sm text-viking-ember font-rune">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading}
              data-testid="reset-submit"
              className="w-full bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-xs h-12 ember-glow"
            >
              {loading ? "..." : t("account.reset_submit")}
            </Button>
          </form>
        )}

        <div className="mt-7 pt-5 border-t border-viking-edge/60 text-center">
          <Link
            to="/login"
            className="text-xs font-rune text-viking-gold hover:text-viking-bone transition-colors"
          >
            <ChevronLeft size={12} className="inline mr-1" />
            {t("account.back_to_login")}
          </Link>
        </div>
      </div>
    </div>
  );
}
