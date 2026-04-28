import React, { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { formatApiErrorDetail } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserPlus, Check } from "lucide-react";

const fieldClass =
  "bg-viking-surface border-viking-edge rounded-sm text-viking-bone placeholder:text-viking-stone focus:border-viking-ember focus:ring-viking-ember";

const ALL_TYPES = ["reenactor", "fighter", "merchant", "organizer"];

export default function Register() {
  const { user, register } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [types, setTypes] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user && user.role) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/profile"} replace />;
  }

  function toggleType(tp) {
    setTypes((prev) =>
      prev.includes(tp) ? prev.filter((x) => x !== tp) : [...prev, tp],
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t("account.password_min"));
      return;
    }
    if (!nickname.trim()) {
      setError(t("account.nickname"));
      return;
    }
    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        nickname: nickname.trim(),
        user_types: types,
      });
      nav("/profile");
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) setError(t("account.error_duplicate"));
      else
        setError(
          formatApiErrorDetail(err.response?.data?.detail) ||
            t("account.error_generic"),
        );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md carved-card rounded-sm p-8 sm:p-10" data-testid="register-card">
        <div className="flex items-center gap-3 mb-7">
          <div className="h-10 w-10 rounded-sm border border-viking-gold/50 flex items-center justify-center text-viking-gold">
            <UserPlus size={18} />
          </div>
          <div>
            <div className="text-overline">{t("account.my_account")}</div>
            <h1 className="font-serif text-2xl text-viking-bone">{t("account.register_title")}</h1>
          </div>
        </div>

        <p className="text-sm text-viking-stone mb-6 leading-relaxed">
          {t("account.register_sub")}
        </p>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-overline">{t("account.email")}</Label>
            <Input
              type="email"
              required
              data-testid="register-email"
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
              data-testid="register-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("account.password_min")}
              className={fieldClass}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-overline">{t("account.nickname")}</Label>
            <Input
              type="text"
              required
              data-testid="register-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className={fieldClass}
            />
            <p className="text-[11px] text-viking-stone italic">
              {t("account.nickname_help")}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-overline">{t("account.user_types_label")}</Label>
            <p className="text-[11px] text-viking-stone italic mb-1">
              {t("account.user_types_help")}
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_TYPES.map((tp) => {
                const active = types.includes(tp);
                return (
                  <button
                    type="button"
                    key={tp}
                    data-testid={`register-type-${tp}`}
                    onClick={() => toggleType(tp)}
                    className={`px-3 py-2 rounded-full text-xs font-rune border transition-colors flex items-center gap-1.5 ${
                      active
                        ? "border-viking-gold text-viking-gold bg-viking-gold/10"
                        : "border-viking-edge text-viking-stone hover:border-viking-gold/60"
                    }`}
                  >
                    {active && <Check size={12} />}
                    {t(`account.type_${tp}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p data-testid="register-error" className="text-sm text-viking-ember font-rune">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            data-testid="register-submit"
            className="w-full bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-xs h-12 ember-glow"
          >
            {loading ? "..." : t("account.submit_signup")}
          </Button>
        </form>

        <div className="mt-7 pt-5 border-t border-viking-edge/60 text-center">
          <Link
            to="/login"
            data-testid="goto-login"
            className="text-xs font-rune text-viking-gold hover:text-viking-bone transition-colors"
          >
            {t("account.have_account")}
          </Link>
        </div>
      </div>
    </div>
  );
}
