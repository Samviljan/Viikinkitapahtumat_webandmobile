/**
 * Admin events sub-page: tabs for pending / approved / rejected / all.
 * Carved out of the legacy AdminDashboard.
 */
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdminEventEditDialog from "@/components/AdminEventEditDialog";
import AdminEventRow from "@/components/admin/AdminEventRow";
import AdminEventAttendeesDialog from "@/components/admin/AdminEventAttendeesDialog";
import AdminUserProfileDialog from "@/components/admin/AdminUserProfileDialog";

const STATUSES = ["pending", "approved", "rejected", "all"];

export default function AdminEvents() {
  const { t, lang } = useI18n();
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [attendeesEvent, setAttendeesEvent] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null);

  const load = useCallback(
    async (s = status) => {
      try {
        const { data } = await api.get("/admin/events", { params: { status: s } });
        setItems(data || []);
      } catch {
        toast.error(t("admin.load_error"));
      }
    },
    [status, t],
  );

  useEffect(() => {
    load(status);
  }, [status, load]);

  async function setEventStatus(id, newStatus) {
    try {
      await api.patch(`/admin/events/${id}`, { status: newStatus });
      toast.success(t("admin.action_ok"));
      load();
    } catch {
      toast.error(t("admin.action_error"));
    }
  }
  async function remove(id) {
    if (!window.confirm(t("admin.confirm_delete"))) return;
    try {
      await api.delete(`/admin/events/${id}`);
      toast.success(t("admin.action_ok"));
      load();
    } catch {
      toast.error(t("admin.action_error"));
    }
  }

  return (
    <div className="space-y-6" data-testid="admin-events-page">
      <Tabs value={status} onValueChange={setStatus} className="w-full">
        <TabsList
          data-testid="admin-status-tabs"
          className="bg-viking-surface border border-viking-edge rounded-sm p-1"
        >
          {STATUSES.map((s) => (
            <TabsTrigger
              key={s}
              value={s}
              data-testid={`admin-tab-${s}`}
              className="font-rune text-xs data-[state=active]:bg-viking-ember data-[state=active]:text-viking-bone rounded-sm px-5"
            >
              {t(`admin.${s}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUSES.map((s) => (
          <TabsContent key={s} value={s} className="mt-6">
            {items.length === 0 ? (
              <div
                className="carved-card rounded-sm p-10 text-center text-viking-stone"
                data-testid="admin-empty"
              >
                {t("admin.no_events")}
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((ev) => (
                  <AdminEventRow
                    key={ev.id}
                    ev={ev}
                    lang={lang}
                    t={t}
                    onApprove={() => setEventStatus(ev.id, "approved")}
                    onReject={() => setEventStatus(ev.id, "rejected")}
                    onDelete={() => remove(ev.id)}
                    onEdit={() => setEditingEvent(ev)}
                    onShowAttendees={() => setAttendeesEvent(ev)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <AdminEventEditDialog
        event={editingEvent}
        open={!!editingEvent}
        onOpenChange={(o) => !o && setEditingEvent(null)}
        onSaved={() => load()}
      />

      <AdminEventAttendeesDialog
        event={attendeesEvent}
        open={!!attendeesEvent}
        onOpenChange={(o) => !o && setAttendeesEvent(null)}
        onPickUser={(uid) => setProfileUserId(uid)}
      />

      <AdminUserProfileDialog
        userId={profileUserId}
        open={!!profileUserId}
        onOpenChange={(o) => !o && setProfileUserId(null)}
      />
    </div>
  );
}
