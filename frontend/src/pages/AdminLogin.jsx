import React, { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { formatApiErrorDetail } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const fieldClass =
  "bg-viking-surface border-viking-edge rounded-sm text-viking-bone placeholder:text-viking-stone focus:border-viking-ember focus:ring-viking-ember";

export default function AdminLogin() {
  const { user, login } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user && user.role === "admin") return <Navigate to="/admin" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      nav("/admin");
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (status === 429 && detail?.code === "account_locked") {
        setError(
          t("account.error_locked", { minutes: detail.minutes_left || 60 }),
        );
      } else if (status === 401 && detail?.code === "invalid_credentials") {
        const remaining = detail.attempts_remaining ?? null;
        if (remaining !== null && remaining <= 2) {
          setError(
            t("account.error_invalid_remaining", { remaining }),
          );
        } else {
          setError(t("admin.bad_login"));
        }
      } else {
        setError(formatApiErrorDetail(detail) || t("admin.bad_login"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md carved-card rounded-sm p-8 sm:p-10" data-testid="admin-login-card">
        <div className="flex items-center gap-3 mb-7">
          <div className="h-10 w-10 rounded-sm border border-viking-gold/50 flex items-center justify-center text-viking-gold">
            <Shield size={18} />
          </div>
          <div>
            <div className="text-overline">Ylläpito</div>
            <h1 className="font-serif text-2xl text-viking-bone">{t("admin.login_title")}</h1>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-overline">{t("admin.email")}</Label>
            <Input
              type="email"
              required
              data-testid="login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-overline">{t("admin.password")}</Label>
            <Input
              type="password"
              required
              data-testid="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
            />
          </div>

          {error && (
            <p data-testid="login-error" className="text-sm text-viking-ember font-rune">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            data-testid="login-submit"
            className="w-full bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-xs h-12 ember-glow"
          >
            {loading ? "..." : t("admin.sign_in")}
          </Button>

          <div className="text-center pt-1">
            <Link
              to="/forgot-password"
              data-testid="goto-forgot"
              className="text-[11px] font-rune text-viking-stone hover:text-viking-gold transition-colors"
            >
              {t("account.forgot")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
