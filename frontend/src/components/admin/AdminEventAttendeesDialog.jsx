/**
 * Admin-only attendee list dialog. Shows everyone who has RSVP'd to a given
 * event. Each row is clickable → opens the AdminUserProfileDialog.
 *
 * Usage:
 *   <AdminEventAttendeesDialog
 *     event={ev}
 *     open={!!ev}
 *     onOpenChange={...}
 *     onPickUser={(userId) => setProfileUserId(userId)}
 *   />
 */
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Loader2, Mail, Bell, Crown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { resolveImageUrl } from "@/lib/images";
import { flagFor } from "@/lib/countries";

export default function AdminEventAttendeesDialog({
  event,
  open,
  onOpenChange,
  onPickUser,
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !event) return;
    setLoading(true);
    api
      .get(`/admin/events/${event.id}/attendees`)
      .then((r) => setRows(r.data || []))
      .catch(() => toast.error(t("admin.action_error")))
      .finally(() => setLoading(false));
  }, [open, event, t]);

  function pick(userId) {
    onOpenChange(false);
    onPickUser?.(userId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-viking-bg border-viking-edge max-w-2xl max-h-[88vh] overflow-y-auto"
        data-testid="admin-event-attendees-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-viking-bone flex items-center gap-2">
            <Users size={16} className="text-viking-gold" />
            {t("admin.events.attendees_btn") || "Osallistujat"}
            <span className="text-viking-stone text-xs ml-2">
              ({rows.length})
            </span>
          </DialogTitle>
          {event ? (
            <p className="text-xs text-viking-stone mt-1">
              {event.title_fi || event.title_en}
            </p>
          ) : null}
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-viking-stone">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-viking-stone italic py-6 text-center">
            {t("admin.events.no_attendees") ||
              "Tähän tapahtumaan ei ole vielä ilmoittautunut ketään."}
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((u) => {
              const img = resolveImageUrl(u.profile_image_url);
              const initial = (u.nickname || u.email || "?")
                .charAt(0)
                .toUpperCase();
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    data-testid={`attendee-row-${u.id}`}
                    onClick={() => pick(u.id)}
                    className="w-full flex items-center gap-3 p-3 border border-viking-edge rounded-sm hover:border-viking-gold/60 hover:bg-viking-surface2/30 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-viking-gold/10 border border-viking-gold/40 overflow-hidden shrink-0 flex items-center justify-center">
                      {img ? (
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-viking-gold font-serif">
                          {initial}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-viking-bone text-sm font-medium truncate">
                          {u.nickname || u.name || u.email}
                        </span>
                        {u.role === "admin" && (
                          <Crown
                            size={11}
                            className="text-viking-gold shrink-0"
                          />
                        )}
                        {u.country ? (
                          <span className="text-xs">
                            {flagFor(u.country)}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-viking-stone truncate">
                        {u.email}
                        {u.association_name ? ` · ${u.association_name}` : ""}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(u.user_types || []).map((tp) => (
                          <span
                            key={tp}
                            className="text-[9px] px-1.5 py-0.5 rounded-sm border border-viking-edge text-viking-stone uppercase"
                          >
                            {tp}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {u.notify_email ? (
                        <Mail
                          size={11}
                          className="text-viking-gold/60"
                          aria-label="email reminder"
                        />
                      ) : null}
                      {u.notify_push ? (
                        <Bell
                          size={11}
                          className="text-viking-gold/60"
                          aria-label="push reminder"
                        />
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
