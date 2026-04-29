/**
 * Admin-only user profile inspector. Opens as a modal dialog.
 *
 * Pass either:
 *   - `userId`  → fetches GET /api/admin/users/{id} and shows full profile
 *                 + the list of events the user has RSVP'd to.
 *
 * Surfaces: profile picture, email, nickname, role, user_types, country,
 * association, merchant/organizer name, paid messaging flag, fighter card
 * & equipment passport links (admins can open them via the existing
 * `?t=<jwt>` query-param fallback), and the RSVPs list.
 */
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  User,
  MapPin,
  Building2,
  ShieldCheck,
  Calendar,
  ExternalLink,
  FileText,
  Crown,
  Loader2,
  Megaphone,
  Bell,
} from "lucide-react";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { api } from "@/lib/api";
import { resolveImageUrl } from "@/lib/images";
import { flagFor, COUNTRY_NAMES } from "@/lib/countries";

function fullDocUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  // Stored URLs already include the /api/ prefix (e.g.
  // /api/uploads/profile-docs/abc.pdf), so we only need to prepend the
  // backend host. Cookie auth (httpOnly) carries through automatically on
  // same-origin <a target="_blank"> links.
  const host = process.env.REACT_APP_BACKEND_URL || "";
  return `${host}${url}`;
}

export default function AdminUserProfileDialog({ userId, open, onOpenChange }) {
  const { t, lang } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    api
      .get(`/admin/users/${userId}`)
      .then((r) => setData(r.data))
      .catch(() => {
        toast.error(t("admin.action_error"));
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
  }, [open, userId, onOpenChange, t]);

  function handleClose(next) {
    onOpenChange(next);
    if (!next) setData(null);
  }

  const u = data;
  const initial = (u?.nickname || u?.email || "?")
    .charAt(0)
    .toUpperCase();
  const profileImg = resolveImageUrl(u?.profile_image_url);
  const fcUrl = fullDocUrl(u?.fighter_card_url);
  const epUrl = fullDocUrl(u?.equipment_passport_url);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="bg-viking-bg border-viking-edge max-w-2xl max-h-[88vh] overflow-y-auto"
        data-testid="admin-user-profile-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-viking-bone flex items-center gap-2">
            <User size={16} className="text-viking-gold" />
            {t("admin.user_profile.title") || "Käyttäjäprofiili"}
          </DialogTitle>
        </DialogHeader>

        {loading || !u ? (
          <div className="py-12 flex items-center justify-center text-viking-stone">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header card */}
            <div className="flex items-start gap-4 p-4 carved-card rounded-sm">
              <div className="w-16 h-16 rounded-full bg-viking-gold/10 border border-viking-gold flex items-center justify-center overflow-hidden shrink-0">
                {profileImg ? (
                  <img
                    src={profileImg}
                    alt=""
                    className="w-full h-full object-cover"
                    data-testid="admin-user-profile-image"
                  />
                ) : (
                  <span className="text-2xl font-serif text-viking-gold">
                    {initial}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif text-lg text-viking-bone truncate">
                    {u.nickname || u.name || u.email}
                  </h3>
                  {u.role === "admin" && (
                    <span className="font-rune text-[9px] px-2 py-0.5 rounded-sm border border-viking-gold/60 text-viking-gold inline-flex items-center gap-1">
                      <Crown size={10} /> ADMIN
                    </span>
                  )}
                  {u.paid_messaging_enabled && (
                    <span className="font-rune text-[9px] px-2 py-0.5 rounded-sm border border-viking-ember/60 text-viking-ember inline-flex items-center gap-1">
                      <Megaphone size={10} /> PAID MSG
                    </span>
                  )}
                </div>
                <p className="text-xs text-viking-stone mt-1 flex items-center gap-1.5">
                  <Mail size={11} />
                  <a
                    href={`mailto:${u.email}`}
                    className="hover:text-viking-gold"
                    data-testid="admin-user-email-link"
                  >
                    {u.email}
                  </a>
                </p>
                <p className="text-[10px] text-viking-stone/70 mt-1 font-mono">
                  id: {u.id}
                </p>
              </div>
            </div>

            {/* Profile fields grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Field
                icon={<MapPin size={12} />}
                label={t("account.country_label") || "Maa"}
                value={
                  u.country
                    ? `${flagFor(u.country)} ${
                        COUNTRY_NAMES[u.country] || u.country
                      }`
                    : "—"
                }
              />
              <Field
                icon={<Building2 size={12} />}
                label={t("account.association_name_label") || "Yhdistys"}
                value={u.association_name || "—"}
              />
              {u.merchant_name && (
                <Field
                  icon={<ShieldCheck size={12} />}
                  label={t("account.merchant_name_label") || "Kauppias"}
                  value={u.merchant_name}
                />
              )}
              {u.organizer_name && (
                <Field
                  icon={<ShieldCheck size={12} />}
                  label={t("account.organizer_name_label") || "Järjestäjä"}
                  value={u.organizer_name}
                />
              )}
            </div>

            {/* User types chips */}
            <div>
              <h4 className="text-overline mb-2">
                {t("admin.users.col_types") || "Käyttäjätyypit"}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(u.user_types || []).length === 0 ? (
                  <span className="text-viking-stone text-xs italic">—</span>
                ) : (
                  u.user_types.map((tp) => (
                    <span
                      key={tp}
                      className="font-rune text-[9px] px-2 py-0.5 rounded-sm border border-viking-gold/40 text-viking-gold uppercase"
                    >
                      {t(`account.type_${tp}`) || tp}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Documents */}
            {(fcUrl || epUrl) && (
              <div>
                <h4 className="text-overline mb-2">
                  {t("admin.user_profile.documents") || "Asiakirjat"}
                </h4>
                <div className="flex flex-col gap-2">
                  {fcUrl && (
                    <a
                      href={fcUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="admin-user-fighter-card"
                      className="flex items-center gap-2 px-3 py-2 border border-viking-edge rounded-sm hover:border-viking-gold/60 transition-colors text-sm text-viking-bone"
                    >
                      <FileText size={14} className="text-viking-gold" />
                      <span className="flex-1">SVTL Taistelijakortti</span>
                      <ExternalLink
                        size={11}
                        className="text-viking-stone"
                      />
                    </a>
                  )}
                  {epUrl && (
                    <a
                      href={epUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="admin-user-equipment-passport"
                      className="flex items-center gap-2 px-3 py-2 border border-viking-edge rounded-sm hover:border-viking-gold/60 transition-colors text-sm text-viking-bone"
                    >
                      <FileText size={14} className="text-viking-gold" />
                      <span className="flex-1">Varustepassi</span>
                      <ExternalLink
                        size={11}
                        className="text-viking-stone"
                      />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* RSVPs */}
            <div data-testid="admin-user-rsvps">
              <h4 className="text-overline mb-2">
                {t("admin.user_profile.rsvps") || "Ilmoittautumiset"}
                <span className="text-viking-stone normal-case ml-2">
                  ({u.rsvps?.length || 0})
                </span>
              </h4>
              {(!u.rsvps || u.rsvps.length === 0) ? (
                <p className="text-xs text-viking-stone italic">
                  {t("admin.user_profile.no_rsvps") ||
                    "Ei vielä ilmoittautumisia."}
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {u.rsvps.map((r) => (
                    <li
                      key={r.event_id}
                      className="flex items-start gap-2 text-sm border-l-2 border-viking-gold/30 pl-3 py-1"
                    >
                      <Calendar
                        size={11}
                        className="text-viking-gold mt-1 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <a
                          href={`/events/${r.event_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-viking-bone hover:text-viking-gold font-medium truncate inline-flex items-center gap-1"
                        >
                          {pickLocalized(r.event, lang, "title") ||
                            r.event.title_fi}
                          <ExternalLink size={9} className="text-viking-stone" />
                        </a>
                        <p className="text-[11px] text-viking-stone mt-0.5">
                          {r.event.start_date}
                          {r.event.location ? ` · ${r.event.location}` : ""}
                          {r.event.country
                            ? ` · ${flagFor(r.event.country)}`
                            : ""}
                          {r.event.status !== "approved"
                            ? ` · [${r.event.status}]`
                            : ""}
                        </p>
                        <div className="flex gap-2 text-[10px] text-viking-stone/80 mt-0.5">
                          {r.notify_email && (
                            <span className="inline-flex items-center gap-0.5">
                              <Mail size={9} /> email
                            </span>
                          )}
                          {r.notify_push && (
                            <span className="inline-flex items-center gap-0.5">
                              <Bell size={9} /> push
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ icon, label, value }) {
  return (
    <div className="space-y-0.5">
      <p className="text-overline flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-viking-bone">{value}</p>
    </div>
  );
}
