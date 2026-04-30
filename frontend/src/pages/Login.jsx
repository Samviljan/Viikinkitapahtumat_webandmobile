import React, { useState } from "react";
import { useNavigate, useLocation, Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { formatApiErrorDetail } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

const fieldClass =
  "bg-viking-surface border-viking-edge rounded-sm text-viking-bone placeholder:text-viking-stone focus:border-viking-ember focus:ring-viking-ember";

export default function Login() {
  const { user, login } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, route admins to /admin and members to /profile.
  if (user && user.role) {
    const dest = location.state?.from || (user.role === "admin" ? "/admin" : "/profile");
    return <Navigate to={dest} replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await login(email, password);
      const dest =
        location.state?.from || (data.role === "admin" ? "/admin" : "/profile");
      nav(dest);
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
          setError(t("account.error_invalid"));
        }
      } else if (status === 401) {
        setError(t("account.error_invalid"));
      } else {
        setError(
          formatApiErrorDetail(detail) || t("account.error_generic"),
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md carved-card rounded-sm p-8 sm:p-10" data-testid="login-card">
        <div className="flex items-center gap-3 mb-7">
          <div className="h-10 w-10 rounded-sm border border-viking-gold/50 flex items-center justify-center text-viking-gold">
            <LogIn size={18} />
          </div>
          <div>
            <div className="text-overline">{t("account.my_account")}</div>
            <h1 className="font-serif text-2xl text-viking-bone">{t("account.login_title")}</h1>
          </div>
        </div>

        <p className="text-sm text-viking-stone mb-6 leading-relaxed">
          {t("account.login_sub")}
        </p>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-overline">{t("account.email")}</Label>
            <Input
              type="email"
              required
              data-testid="user-login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-overline">{t("account.password")}</Label>
            <Input
              type="password"
              required
              data-testid="user-login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
            />
          </div>

          {error && (
            <p data-testid="user-login-error" className="text-sm text-viking-ember font-rune">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            data-testid="user-login-submit"
            className="w-full bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-xs h-12 ember-glow"
          >
            {loading ? "..." : t("account.submit_signin")}
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

        <div className="mt-7 pt-5 border-t border-viking-edge/60 text-center">
          <Link
            to="/register"
            data-testid="goto-register"
            className="text-xs font-rune text-viking-gold hover:text-viking-bone transition-colors"
          >
            {t("account.no_account")}
          </Link>
        </div>
      </div>
    </div>
  );
}
