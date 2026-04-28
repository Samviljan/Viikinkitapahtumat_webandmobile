import React, { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import AdminEventEditDialog from "@/components/AdminEventEditDialog";
import AdminMerchantsPanel from "@/components/AdminMerchantsPanel";
import AdminGuildsPanel from "@/components/AdminGuildsPanel";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminNewsletterPanel from "@/components/admin/AdminNewsletterPanel";
import AdminSubscribersPanel from "@/components/admin/AdminSubscribersPanel";
import AdminWeeklyReportPanel from "@/components/admin/AdminWeeklyReportPanel";
import AdminSyncPanel from "@/components/admin/AdminSyncPanel";
import AdminEventRow from "@/components/admin/AdminEventRow";
import AdminUsersPanel from "@/components/admin/AdminUsersPanel";

const STATUSES = ["pending", "approved", "rejected", "all"];

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const { t, lang } = useI18n();
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

  const load = useCallback(
    async (s = status) => {
      try {
        const [list, st] = await Promise.all([
          api.get("/admin/events", { params: { status: s } }),
          api.get("/admin/stats"),
        ]);
        setItems(list.data || []);
        setStats(st.data);
      } catch (e) {
        toast.error(t("admin.load_error"));
      }
    },
    [status, t]
  );

  useEffect(() => {
    if (user && user.role === "admin") load(status);
  }, [user, status, load]);

  if (loading) return <div className="p-10 text-viking-stone">...</div>;
  if (!user || user.role !== "admin") return <Navigate to="/admin/login" replace />;

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
    <section className="mx-auto max-w-7xl px-4 sm:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-overline mb-2">{user.email}</div>
          <h1 className="font-serif text-4xl text-viking-bone">{t("admin.dashboard")}</h1>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <AdminStatCard label={t("admin.pending")} value={stats.pending} accent="ember" />
          <AdminStatCard label={t("admin.approved")} value={stats.approved} accent="gold" />
          <AdminStatCard label={t("admin.rejected")} value={stats.rejected} accent="stone" />
          <AdminStatCard label={t("admin.subscribers")} value={stats.subscribers || 0} accent="gold" />
        </div>
      )}

      <AdminNewsletterPanel />
      <AdminSubscribersPanel />
      <AdminWeeklyReportPanel />
      <AdminSyncPanel />

      <Tabs value={status} onValueChange={setStatus} className="w-full">
        <TabsList
          data-testid="admin-status-tabs"
          className="bg-viking-surface border border-viking-edge rounded-sm p-1 mb-6"
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
          <TabsContent key={s} value={s}>
            {items.length === 0 ? (
              <div className="carved-card rounded-sm p-10 text-center text-viking-stone" data-testid="admin-empty">
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
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="mt-12">
        <AdminUsersPanel />
      </div>

      <div className="mt-12">
        <AdminMerchantsPanel />
        <AdminGuildsPanel />
      </div>

      <AdminEventEditDialog
        event={editingEvent}
        open={!!editingEvent}
        onOpenChange={(o) => !o && setEditingEvent(null)}
        onSaved={() => load()}
      />
    </section>
  );
}
