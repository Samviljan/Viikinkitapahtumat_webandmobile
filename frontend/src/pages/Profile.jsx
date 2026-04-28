import React, { useEffect, useRef, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LogOut, Check, Shield, Camera, Trash2 } from "lucide-react";
import { ConsentBlock } from "@/pages/Register";
import AttendingList from "@/components/AttendingList";
import SavedSearchEditor from "@/components/SavedSearchEditor";
import ProfileDocField from "@/components/ProfileDocField";
import { api } from "@/lib/api";

const fieldClass =
  "bg-viking-surface border-viking-edge rounded-sm text-viking-bone placeholder:text-viking-stone focus:border-viking-ember focus:ring-viking-ember";

const ALL_TYPES = ["reenactor", "fighter", "merchant", "organizer"];

// ISO-3166 alpha-2 codes valid for the user `country` field.
// Must stay in sync with VALID_COUNTRIES on the backend.
const COUNTRIES = ["FI", "SE", "EE", "NO", "DK", "PL", "DE", "IS", "LV", "LT", "SI", "HR", "UA", "NL", "GB", "IE", "BE", "FR", "ES", "PT", "IT"];

export default function Profile() {
  const { user, loading, updateProfile, logout, refresh } = useAuth();
  const { t } = useI18n();
  const [nickname, setNickname] = useState("");
  const [types, setTypes] = useState([]);
  const [merchantName, setMerchantName] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [associationName, setAssociationName] = useState("");
  const [country, setCountry] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [fighterCardUrl, setFighterCardUrl] = useState("");
  const [equipmentPassportUrl, setEquipmentPassportUrl] = useState("");
  const [consentOrganizer, setConsentOrganizer] = useState(false);
  const [consentMerchant, setConsentMerchant] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user && user.role) {
      setNickname(user.nickname || user.name || "");
      setTypes(user.user_types || []);
      setMerchantName(user.merchant_name || "");
      setOrganizerName(user.organizer_name || "");
      setAssociationName(user.association_name || "");
      setCountry(user.country || "");
      setProfileImageUrl(user.profile_image_url || "");
      setFighterCardUrl(user.fighter_card_url || "");
      setEquipmentPassportUrl(user.equipment_passport_url || "");
      setConsentOrganizer(!!user.consent_organizer_messages);
      setConsentMerchant(!!user.consent_merchant_offers);
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
    if (types.includes("merchant") && !merchantName.trim()) {
      toast.error(t("account.merchant_name_help"));
      return;
    }
    if (types.includes("organizer") && !organizerName.trim()) {
      toast.error(t("account.organizer_name_help"));
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        nickname: nickname.trim(),
        user_types: types,
        merchant_name: types.includes("merchant") ? merchantName.trim() : "",
        organizer_name: types.includes("organizer") ? organizerName.trim() : "",
        association_name: associationName.trim(),
        country: country || "",
        consent_organizer_messages: consentOrganizer,
        consent_merchant_offers: consentMerchant,
      });
      toast.success(t("account.profile_saved"));
    } catch (err) {
      toast.error(t("account.error_generic"));
    } finally {
      setSaving(false);
    }
  }

  async function onPickAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error(t("account.avatar_too_large"));
      e.target.value = "";
      return;
    }
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/uploads/profile-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfileImageUrl(data.url);
      await refresh();
      toast.success(t("account.avatar_saved"));
    } catch (err) {
      toast.error(t("account.error_generic"));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onRemoveAvatar() {
    if (!profileImageUrl) return;
    try {
      await updateProfile({ profile_image_url: "" });
      setProfileImageUrl("");
      toast.success(t("account.avatar_removed"));
    } catch {
      toast.error(t("account.error_generic"));
    }
  }

  const initial = (nickname || user.email || "?").charAt(0).toUpperCase();
  const isAdmin = user.role === "admin";
  const avatarSrc = profileImageUrl
    ? `${process.env.REACT_APP_BACKEND_URL}${profileImageUrl}`
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-8 py-12 sm:py-16">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10" data-testid="profile-header">
        <div className="relative">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            data-testid="profile-avatar-edit"
            className="h-16 w-16 rounded-sm border border-viking-gold/60 bg-viking-gold/10 flex items-center justify-center text-viking-gold font-serif text-2xl overflow-hidden relative group hover:border-viking-gold transition-colors"
            title={t("account.avatar_change")}
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                data-testid="profile-avatar-image"
              />
            ) : (
              <span>{initial}</span>
            )}
            <span className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-viking-bone" />
            </span>
          </button>
          {profileImageUrl && (
            <button
              type="button"
              onClick={onRemoveAvatar}
              data-testid="profile-avatar-remove"
              className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-viking-surface border border-viking-edge text-viking-stone hover:text-viking-ember hover:border-viking-ember transition-colors flex items-center justify-center"
              title={t("account.avatar_remove")}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onPickAvatar}
            className="hidden"
            data-testid="profile-avatar-input"
          />
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

          {types.includes("merchant") && (
            <div className="space-y-2" data-testid="profile-merchant-name-block">
              <Label className="text-overline">{t("account.merchant_name_label")}</Label>
              <Input
                type="text"
                required
                data-testid="profile-merchant-name"
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
            <div className="space-y-2" data-testid="profile-organizer-name-block">
              <Label className="text-overline">{t("account.organizer_name_label")}</Label>
              <Input
                type="text"
                required
                data-testid="profile-organizer-name"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                className={fieldClass}
              />
              <p className="text-[11px] text-viking-stone italic">
                {t("account.organizer_name_help")}
              </p>
            </div>
          )}

          <div className="space-y-2" data-testid="profile-association-block">
            <Label className="text-overline">
              {t("account.association_name_label")}
            </Label>
            <Input
              type="text"
              data-testid="profile-association-name"
              value={associationName}
              onChange={(e) => setAssociationName(e.target.value)}
              className={fieldClass}
              placeholder={t("account.association_name_placeholder")}
            />
            <p className="text-[11px] text-viking-stone italic">
              {t("account.association_name_help")}
            </p>
          </div>

          <div className="space-y-2" data-testid="profile-country-block">
            <Label className="text-overline" htmlFor="profile-country">
              {t("account.country_label")}
            </Label>
            <select
              id="profile-country"
              data-testid="profile-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={`${fieldClass} h-11 w-full px-3 cursor-pointer`}
            >
              <option value="">{t("account.country_none")}</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {t(`account.country_opt_${c}`)}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-viking-stone italic">
              {t("account.country_help")}
            </p>
          </div>

          <div className="pt-4 border-t border-viking-edge/60 space-y-5" data-testid="profile-docs-section">
            <div>
              <h3 className="font-serif text-base text-viking-bone">
                {t("account.docs_title")}
              </h3>
              <p className="text-xs text-viking-stone mt-1">
                {t("account.docs_sub")}
              </p>
            </div>
            <ProfileDocField
              kind="fighter_card"
              field="fighter_card_url"
              labelKey="account.fighter_card_label"
              helpKey="account.fighter_card_help"
              uploadCtaKey="account.fighter_card_upload"
              testIdPrefix="profile-fighter-card"
              url={fighterCardUrl}
              onChange={setFighterCardUrl}
            />
            <ProfileDocField
              kind="equipment_passport"
              field="equipment_passport_url"
              labelKey="account.equipment_passport_label"
              helpKey="account.equipment_passport_help"
              uploadCtaKey="account.equipment_passport_upload"
              testIdPrefix="profile-equipment-passport"
              url={equipmentPassportUrl}
              onChange={setEquipmentPassportUrl}
            />
          </div>

          <ConsentBlock
            t={t}
            organizer={consentOrganizer}
            merchant={consentMerchant}
            onChange={(field, val) => {
              if (field === "organizer") setConsentOrganizer(val);
              else setConsentMerchant(val);
            }}
            testIdPrefix="profile"
          />

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
              {user.paid_messaging_enabled ? (
                <div>
                  <dt className="text-overline mb-1">{t("messaging.feature")}</dt>
                  <dd className="text-viking-gold">{t("messaging.enabled")}</dd>
                </div>
              ) : null}
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

          {(isAdmin || (user.paid_messaging_enabled && (types.includes("merchant") || types.includes("organizer")))) ? (
            <Link to="/messages" data-testid="profile-messages-link">
              <Button
                type="button"
                variant="outline"
                className="w-full border-viking-gold/60 text-viking-gold hover:bg-viking-gold/10 rounded-sm font-rune text-xs h-11"
              >
                {t("messaging.send_link")}
              </Button>
            </Link>
          ) : null}

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

      {/* Below: saved search + attending events */}
      <div className="grid gap-8 mt-10 lg:grid-cols-2">
        <SavedSearchEditor />
        <AttendingList />
      </div>
    </div>
  );
}
