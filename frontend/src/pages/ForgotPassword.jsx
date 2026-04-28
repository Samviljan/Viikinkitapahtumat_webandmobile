import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, ChevronLeft } from "lucide-react";

const fieldClass =
  "bg-viking-surface border-viking-edge rounded-sm text-viking-bone placeholder:text-viking-stone focus:border-viking-ember focus:ring-viking-ember";

export default function ForgotPassword() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      // Always 200; backend never reveals whether the address exists.
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md carved-card rounded-sm p-8 sm:p-10" data-testid="forgot-card">
        <div className="flex items-center gap-3 mb-7">
          <div className="h-10 w-10 rounded-sm border border-viking-gold/50 flex items-center justify-center text-viking-gold">
            <Mail size={18} />
          </div>
          <div>
            <div className="text-overline">{t("account.my_account")}</div>
            <h1 className="font-serif text-2xl text-viking-bone">{t("account.forgot_title")}</h1>
          </div>
        </div>

        {submitted ? (
          <div data-testid="forgot-success" className="space-y-4">
            <p className="text-sm text-viking-bone leading-relaxed">
              {t("account.forgot_sent")}
            </p>
            <p className="text-xs text-viking-stone leading-relaxed">
              {t("account.forgot_sent_help")}
            </p>
            <Link
              to="/login"
              data-testid="goto-login"
              className="inline-flex items-center gap-2 text-xs font-rune text-viking-gold hover:text-viking-bone transition-colors"
            >
              <ChevronLeft size={12} /> {t("account.back_to_login")}
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-viking-stone mb-6 leading-relaxed">
              {t("account.forgot_sub")}
            </p>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-overline">{t("account.email")}</Label>
                <Input
                  type="email"
                  required
                  data-testid="forgot-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                data-testid="forgot-submit"
                className="w-full bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-xs h-12 ember-glow"
              >
                {loading ? "..." : t("account.forgot_send")}
              </Button>
            </form>
            <div className="mt-7 pt-5 border-t border-viking-edge/60 text-center">
              <Link
                to="/login"
                className="text-xs font-rune text-viking-gold hover:text-viking-bone transition-colors"
              >
                <ChevronLeft size={12} className="inline mr-1" />
                {t("account.back_to_login")}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
