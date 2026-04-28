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
  const [merchantName, setMerchantName] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [consentOrganizer, setConsentOrganizer] = useState(false);
  const [consentMerchant, setConsentMerchant] = useState(false);
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
    if (types.includes("merchant") && !merchantName.trim()) {
      setError(t("account.merchant_name_help"));
      return;
    }
    if (types.includes("organizer") && !organizerName.trim()) {
      setError(t("account.organizer_name_help"));
      return;
    }
    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        nickname: nickname.trim(),
        user_types: types,
        merchant_name: types.includes("merchant") ? merchantName.trim() : null,
        organizer_name: types.includes("organizer") ? organizerName.trim() : null,
        consent_organizer_messages: consentOrganizer,
        consent_merchant_offers: consentMerchant,
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

          {types.includes("merchant") && (
            <div className="space-y-2" data-testid="register-merchant-name-block">
              <Label className="text-overline">{t("account.merchant_name_label")}</Label>
              <Input
                type="text"
                required
                data-testid="register-merchant-name"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className={fieldClass}
              />
              <p className="text-[11px] text-viking-stone italic">
                {t("account.merchant_name_help")}
              </p>
            </div>
          )}

          {types.includes("organizer") && (
            <div className="space-y-2" data-testid="register-organizer-name-block">
              <Label className="text-overline">{t("account.organizer_name_label")}</Label>
              <Input
                type="text"
                required
                data-testid="register-organizer-name"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                className={fieldClass}
              />
              <p className="text-[11px] text-viking-stone italic">
                {t("account.organizer_name_help")}
              </p>
            </div>
          )}

          {/* Marketing consents — opt-in (off by default). */}
          <ConsentBlock
            t={t}
            organizer={consentOrganizer}
            merchant={consentMerchant}
            onChange={(field, val) => {
              if (field === "organizer") setConsentOrganizer(val);
              else setConsentMerchant(val);
            }}
            testIdPrefix="register"
          />

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

export function ConsentBlock({ t, organizer, merchant, onChange, testIdPrefix }) {
  return (
    <div
      className="space-y-3 pt-5 border-t border-viking-edge/60"
      data-testid={`${testIdPrefix}-consents`}
    >
      <div>
        <Label className="text-overline">{t("account.consents_title")}</Label>
        <p className="text-[11px] text-viking-stone italic mt-1 leading-relaxed">
          {t("account.consents_help")}
        </p>
      </div>
      <ConsentRow
        active={organizer}
        onChange={() => onChange("organizer", !organizer)}
        label={t("account.consent_organizer_messages")}
        testId={`${testIdPrefix}-consent-organizer`}
      />
      <ConsentRow
        active={merchant}
        onChange={() => onChange("merchant", !merchant)}
        label={t("account.consent_merchant_offers")}
        testId={`${testIdPrefix}-consent-merchant`}
      />
    </div>
  );
}

function ConsentRow({ active, onChange, label, testId }) {
  return (
    <button
      type="button"
      onClick={onChange}
      data-testid={testId}
      className={`w-full flex items-start gap-3 p-3 rounded-sm border text-left transition-colors ${
        active
          ? "border-viking-gold/60 bg-viking-gold/10"
          : "border-viking-edge hover:border-viking-gold/40"
      }`}
    >
      <span
        className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-sm border flex items-center justify-center ${
          active ? "border-viking-gold bg-viking-gold/20" : "border-viking-edge"
        }`}
      >
        {active && <Check size={10} className="text-viking-gold" />}
      </span>
      <span className={`text-xs leading-relaxed ${active ? "text-viking-bone" : "text-viking-stone"}`}>
        {label}
      </span>
    </button>
  );
}
