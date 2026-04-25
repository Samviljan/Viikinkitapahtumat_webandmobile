import React, { useEffect, useState, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, X, Trash2, Calendar, MapPin, User, ExternalLink, Mail, Send, Eye } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["pending", "approved", "rejected", "all"];

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const { t, lang } = useI18n();
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (s = status) => {
      setBusy(true);
      try {
        const [list, st] = await Promise.all([
          api.get("/admin/events", { params: { status: s } }),
          api.get("/admin/stats"),
        ]);
        setItems(list.data || []);
        setStats(st.data);
      } catch (e) {
        toast.error(t("admin.load_error"));
      } finally {
        setBusy(false);
      }
    },
    [status]
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
          <StatCard label={t("admin.pending")} value={stats.pending} accent="ember" />
          <StatCard label={t("admin.approved")} value={stats.approved} accent="gold" />
          <StatCard label={t("admin.rejected")} value={stats.rejected} accent="stone" />
          <StatCard label={t("admin.subscribers")} value={stats.subscribers || 0} accent="gold" />
        </div>
      )}

      <NewsletterPanel />
      <WeeklyReportPanel />

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
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

function NewsletterPanel() {
  const { t } = useI18n();
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState(null);

  async function loadPreview() {
    try {
      const { data } = await api.get("/admin/newsletter/preview");
      setPreview(data);
      setPreviewOpen(true);
    } catch {
      toast.error(t("admin.action_error"));
    }
  }

  async function sendNow() {
    if (!window.confirm(t("admin.newsletter_confirm"))) return;
    setSending(true);
    try {
      const { data } = await api.post("/admin/newsletter/send");
      toast.success(`${t("admin.newsletter_sent")}: ${data.sent}/${data.recipients}`);
    } catch {
      toast.error(t("admin.action_error"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="carved-card rounded-sm p-6 sm:p-8 mb-10" data-testid="newsletter-panel">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-viking-gold/50 text-viking-gold flex-shrink-0">
            <Mail size={18} />
          </span>
          <div>
            <h3 className="font-serif text-2xl text-viking-bone">{t("admin.newsletter_title")}</h3>
            <p className="text-sm text-viking-stone mt-1 max-w-2xl">
              {t("admin.newsletter_sub")}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            data-testid="newsletter-preview-btn"
            onClick={loadPreview}
            className="border-viking-edge text-viking-bone hover:border-viking-gold hover:text-viking-gold rounded-sm font-rune text-[10px]"
          >
            <Eye size={12} className="mr-2" />
            {t("admin.newsletter_preview")}
          </Button>
          <Button
            data-testid="newsletter-send-btn"
            disabled={sending}
            onClick={sendNow}
            className="bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-[10px] ember-glow"
          >
            <Send size={12} className="mr-2" />
            {sending ? "..." : t("admin.newsletter_send_now")}
          </Button>
        </div>
      </div>

      {previewOpen && preview && (
        <div className="mt-6 border-t border-viking-edge pt-5">
          <div className="text-overline mb-2">{preview.subject}</div>
          <div className="text-xs text-viking-stone mb-3">
            {t("admin.newsletter_count")}: {preview.count}
          </div>
          <div
            className="bg-viking-bg rounded-sm p-2 max-h-[420px] overflow-auto border border-viking-edge"
            dangerouslySetInnerHTML={{ __html: preview.html }}
          />
        </div>
      )}
    </div>
  );
}

function WeeklyReportPanel() {
  const { t } = useI18n();
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState(null);

  async function loadPreview() {
    try {
      const { data } = await api.get("/admin/weekly-report/preview");
      setPreview(data);
      setPreviewOpen(true);
    } catch {
      toast.error(t("admin.action_error"));
    }
  }

  async function sendNow() {
    if (!window.confirm(t("admin.weekly_confirm"))) return;
    setSending(true);
    try {
      const { data } = await api.post("/admin/weekly-report/send");
      toast.success(`${t("admin.action_ok")}: ${data.to}`);
    } catch {
      toast.error(t("admin.action_error"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="carved-card rounded-sm p-6 sm:p-8 mb-10" data-testid="weekly-report-panel">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-viking-gold/50 text-viking-gold flex-shrink-0">
            <Mail size={18} />
          </span>
          <div>
            <h3 className="font-serif text-2xl text-viking-bone">{t("admin.weekly_title")}</h3>
            <p className="text-sm text-viking-stone mt-1 max-w-2xl">{t("admin.weekly_sub")}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            data-testid="weekly-preview-btn"
            onClick={loadPreview}
            className="border-viking-edge text-viking-bone hover:border-viking-gold hover:text-viking-gold rounded-sm font-rune text-[10px]"
          >
            <Eye size={12} className="mr-2" />
            {t("admin.weekly_preview")}
          </Button>
          <Button
            data-testid="weekly-send-btn"
            disabled={sending}
            onClick={sendNow}
            className="bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-[10px] ember-glow"
          >
            <Send size={12} className="mr-2" />
            {sending ? "..." : t("admin.weekly_send_now")}
          </Button>
        </div>
      </div>

      {previewOpen && preview && (
        <div className="mt-6 border-t border-viking-edge pt-5">
          <div className="text-overline mb-2">{preview.subject}</div>
          <div
            className="bg-viking-bg rounded-sm p-2 max-h-[420px] overflow-auto border border-viking-edge"
            dangerouslySetInnerHTML={{ __html: preview.html }}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }) {  const accentColor = {
    ember: "text-viking-ember",
    gold: "text-viking-gold",
    stone: "text-viking-stone",
  }[accent];
  return (
    <div className="carved-card rounded-sm p-5">
      <div className="text-overline mb-1">{label}</div>
      <div className={`font-serif text-4xl ${accentColor}`}>{value}</div>
    </div>
  );
}

function AdminEventRow({ ev, lang, t, onApprove, onReject, onDelete }) {
  return (
    <div
      data-testid={`admin-row-${ev.id}`}
      className="carved-card rounded-sm p-5 flex flex-col lg:flex-row gap-4 lg:items-center"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`font-rune text-[9px] px-2 py-0.5 rounded-sm border ${
              ev.status === "pending"
                ? "border-viking-ember/50 text-viking-ember"
                : ev.status === "approved"
                ? "border-viking-gold/50 text-viking-gold"
                : "border-viking-edge text-viking-stone"
            }`}
          >
            {t(`admin.${ev.status}`)}
          </span>
          <span className="font-rune text-[9px] text-viking-stone">{t(`cats.${ev.category}`)}</span>
        </div>
        <h3 className="font-serif text-xl text-viking-bone">{pickLocalized(ev, lang, "title")}</h3>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-viking-stone">
          <span className="flex items-center gap-1.5">
            <Calendar size={12} className="text-viking-gold" />
            {ev.start_date}
            {ev.end_date && ` – ${ev.end_date}`}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin size={12} className="text-viking-gold" />
            {ev.location}
          </span>
          <span className="flex items-center gap-1.5">
            <User size={12} className="text-viking-gold" />
            {ev.organizer}
          </span>
          {ev.link && (
            <a
              href={ev.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-viking-gold hover:underline"
            >
              <ExternalLink size={12} /> link
            </a>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {ev.status !== "approved" && (
          <Button
            size="sm"
            data-testid={`approve-${ev.id}`}
            onClick={onApprove}
            className="bg-viking-forest hover:bg-emerald-900 text-viking-bone rounded-sm font-rune text-[10px]"
          >
            <Check size={12} className="mr-1" />
            {t("admin.approve")}
          </Button>
        )}
        {ev.status !== "rejected" && (
          <Button
            size="sm"
            data-testid={`reject-${ev.id}`}
            onClick={onReject}
            variant="outline"
            className="border-viking-edge text-viking-stone hover:text-viking-ember hover:border-viking-ember rounded-sm font-rune text-[10px]"
          >
            <X size={12} className="mr-1" />
            {t("admin.reject")}
          </Button>
        )}
        <Button
          size="sm"
          data-testid={`delete-${ev.id}`}
          onClick={onDelete}
          variant="outline"
          className="border-viking-edge text-viking-ember hover:bg-viking-ember hover:text-viking-bone rounded-sm font-rune text-[10px]"
        >
          <Trash2 size={12} />
        </Button>
        <Link
          to={`/events/${ev.id}`}
          target="_blank"
          className="font-rune text-[10px] text-viking-stone hover:text-viking-gold self-center pl-1"
        >
          ↗
        </Link>
      </div>
    </div>
  );
}
