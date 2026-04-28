import React, { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserCircle2, LogOut, Check, Shield } from "lucide-react";

const fieldClass =
  "bg-viking-surface border-viking-edge rounded-sm text-viking-bone placeholder:text-viking-stone focus:border-viking-ember focus:ring-viking-ember";

const ALL_TYPES = ["reenactor", "fighter", "merchant", "organizer"];

export default function Profile() {
  const { user, loading, updateProfile, logout } = useAuth();
  const { t } = useI18n();
  const [nickname, setNickname] = useState("");
  const [types, setTypes] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && user.role) {
      setNickname(user.nickname || user.name || "");
      setTypes(user.user_types || []);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-viking-stone">
        <span className="font-rune text-xs tracking-widest">…</span>
      </div>
    );
  }
  if (!user || user === false || !user.role) {
    return <Navigate to="/login" replace state={{ from: "/profile" }} />;
  }

  function toggleType(tp) {
    setTypes((prev) =>
      prev.includes(tp) ? prev.filter((x) => x !== tp) : [...prev, tp],
    );
  }

  async function onSave(e) {
    e.preventDefault();
    if (!nickname.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ nickname: nickname.trim(), user_types: types });
      toast.success(t("account.profile_saved"));
    } catch (err) {
      toast.error(t("account.error_generic"));
    } finally {
      setSaving(false);
    }
  }

  const initial = (nickname || user.email || "?").charAt(0).toUpperCase();
  const isAdmin = user.role === "admin";

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-8 py-12 sm:py-16">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10" data-testid="profile-header">
        <div className="h-14 w-14 rounded-sm border border-viking-gold/60 bg-viking-gold/10 flex items-center justify-center text-viking-gold font-serif text-2xl">
          {initial}
        </div>
        <div className="flex-1">
          <div className="text-overline">{t("account.profile")}</div>
          <h1 className="font-serif text-2xl sm:text-3xl text-viking-bone">
            {nickname || user.email}
          </h1>
          <p className="text-xs text-viking-stone mt-1 break-all">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: profile editor */}
        <form
          onSubmit={onSave}
          className="lg:col-span-2 carved-card rounded-sm p-7 space-y-6"
          data-testid="profile-form"
        >
          <div>
            <h2 className="font-serif text-lg text-viking-bone">
              {t("account.profile_title")}
            </h2>
            <p className="text-xs text-viking-stone mt-1">{t("account.profile_sub")}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-overline">{t("account.nickname")}</Label>
            <Input
              type="text"
              required
              data-testid="profile-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className={fieldClass}
            />
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
                    data-testid={`profile-type-${tp}`}
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

          <Button
            type="submit"
            disabled={saving || !nickname.trim()}
            data-testid="profile-save"
            className="bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-xs h-11 px-6 ember-glow"
          >
            {saving ? "..." : t("account.profile_save")}
          </Button>
        </form>

        {/* Right: account info + actions */}
        <aside className="space-y-4">
          <div className="carved-card rounded-sm p-6" data-testid="profile-account-info">
            <h3 className="font-serif text-base text-viking-bone mb-4">
              {t("account.account_info")}
            </h3>
            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-overline mb-1">{t("account.email")}</dt>
                <dd className="text-viking-bone break-all">{user.email}</dd>
              </div>
              <div>
                <dt className="text-overline mb-1">Role</dt>
                <dd className="text-viking-bone">
                  {isAdmin ? t("account.role_admin") : t("account.role_user")}
                </dd>
              </div>
              <div>
                <dt className="text-overline mb-1">Method</dt>
                <dd className="text-viking-bone">
                  {user.has_password === false
                    ? t("account.method_google")
                    : t("account.method_password")}
                </dd>
              </div>
            </dl>
          </div>

          {isAdmin && (
            <Link to="/admin" data-testid="profile-admin-link">
              <Button
                type="button"
                variant="outline"
                className="w-full border-viking-gold/60 text-viking-gold hover:bg-viking-gold/10 rounded-sm font-rune text-xs h-11"
              >
                <Shield size={14} className="mr-2" />
                {t("nav.admin")}
              </Button>
            </Link>
          )}

          <Button
            type="button"
            variant="ghost"
            data-testid="profile-logout"
            onClick={logout}
            className="w-full text-viking-stone hover:text-viking-ember hover:bg-viking-surface2 rounded-sm font-rune text-xs h-11 border border-viking-edge"
          >
            <LogOut size={14} className="mr-2" />
            {t("account.sign_out")}
          </Button>
        </aside>
      </div>
    </div>
  );
}
