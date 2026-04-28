/**
 * Admin stats dashboard panel.
 *
 * Visualises three datasets:
 *   1. KPI overview (`/api/admin/stats/overview`) — users, paid users,
 *      RSVPs, push devices, 30-day messaging rollup.
 *   2. Recent paid-messaging audit log (`/api/admin/stats/messages`).
 *   3. Top events by attendance (`/api/admin/stats/top-events`).
 */
import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Users,
  Bell,
  Mail,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function AdminStatsPanel() {
  const { t } = useI18n();
  const [overview, setOverview] = useState(null);
  const [messages, setMessages] = useState([]);
  const [topEvents, setTopEvents] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/admin/stats/overview").then((r) => setOverview(r.data)),
      api.get("/admin/stats/messages?limit=20").then((r) => setMessages(r.data || [])),
      api.get("/admin/stats/top-events?limit=10").then((r) => setTopEvents(r.data || [])),
    ]).catch(() => {});
  }, []);

  if (!overview) {
    return (
      <div className="carved-card rounded-sm p-6 text-viking-stone text-xs">
        <span className="font-rune">…</span>
      </div>
    );
  }

  const m30 = overview.messages_30d || {};
  const r30 = overview.reminders_30d || {};
  const pushDelivery =
    (m30.recipients ?? 0) > 0
      ? Math.round(((m30.sent_push ?? 0) / (m30.recipients || 1)) * 100)
      : null;

  return (
    <div className="space-y-6" data-testid="admin-stats-panel">
      <div className="flex items-center gap-3">
        <BarChart3 size={18} className="text-viking-gold" />
        <h2 className="font-serif text-xl text-viking-bone">{t("admin.stats.title")}</h2>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI
          icon={Users}
          label={t("admin.stats.users")}
          value={overview.users_total}
          sub={`${overview.users_paid} ${t("admin.stats.paid")}`}
        />
        <KPI
          icon={Bell}
          label={t("admin.stats.push_devices")}
          value={overview.push_devices}
        />
        <KPI
          icon={MessageSquare}
          label={t("admin.stats.rsvps")}
          value={overview.rsvps_total}
        />
        <KPI
          icon={TrendingUp}
          label={t("admin.stats.msgs_30d")}
          value={m30.messages || 0}
          sub={
            pushDelivery !== null ? `${pushDelivery}% ${t("admin.stats.push_delivery")}` : undefined
          }
        />
      </div>

      {/* 30-day messaging rollup */}
      <div className="carved-card rounded-sm p-6" data-testid="stats-30d">
        <h3 className="font-serif text-base text-viking-bone mb-4">
          {t("admin.stats.last_30d")}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <Mini icon={Bell} value={m30.sent_push || 0} label={t("admin.stats.push_sent")} />
          <Mini icon={Mail} value={m30.sent_email || 0} label={t("admin.stats.email_sent")} />
          <Mini
            icon={Bell}
            value={r30.push?.sent || 0}
            label={t("admin.stats.reminders_push")}
          />
          <Mini
            icon={Mail}
            value={r30.email?.sent || 0}
            label={t("admin.stats.reminders_email")}
          />
        </div>
      </div>

      {/* Top events */}
      <div className="carved-card rounded-sm p-6" data-testid="stats-top-events">
        <h3 className="font-serif text-base text-viking-bone mb-4">
          {t("admin.stats.top_events")}
        </h3>
        {topEvents.length === 0 ? (
          <p className="text-xs text-viking-stone italic">—</p>
        ) : (
          <ol className="space-y-2">
            {topEvents.map((ev, idx) => (
              <li
                key={ev.event_id}
                data-testid={`top-event-${ev.event_id}`}
                className="flex items-center justify-between gap-3 p-3 border border-viking-edge rounded-sm hover:border-viking-gold/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-viking-gold font-serif text-lg w-7 text-right">
                    {idx + 1}.
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm text-viking-bone truncate">{ev.title}</div>
                    <div className="text-[11px] text-viking-stone truncate">
                      {ev.start_date}
                      {ev.location ? ` · ${ev.location}` : ""}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-serif text-viking-gold">{ev.attendees}</div>
                  <div className="text-[10px] text-viking-stone uppercase tracking-wider">
                    {t("admin.stats.attendees")}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Message audit log */}
      <div className="carved-card rounded-sm p-6" data-testid="stats-messages">
        <h3 className="font-serif text-base text-viking-bone mb-4">
          {t("admin.stats.message_history")}
        </h3>
        {messages.length === 0 ? (
          <p className="text-xs text-viking-stone italic">—</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-overline border-b border-viking-edge">
                  <th className="text-left py-2 pr-3">{t("admin.stats.col_when")}</th>
                  <th className="text-left py-2 pr-3">{t("admin.stats.col_sender")}</th>
                  <th className="text-left py-2 pr-3">{t("admin.stats.col_event")}</th>
                  <th className="text-left py-2 pr-3">{t("admin.stats.col_subject")}</th>
                  <th className="text-right py-2 pl-3">Push</th>
                  <th className="text-right py-2 pl-3">Email</th>
                  <th className="text-right py-2 pl-3">{t("admin.stats.col_recipients")}</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr
                    key={m.created_at + m.event_id}
                    className="border-b border-viking-edge/40"
                  >
                    <td className="py-2 pr-3 text-viking-stone">
                      {(m.created_at || "").slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="py-2 pr-3 text-viking-bone">{m.sender_label}</td>
                    <td className="py-2 pr-3 text-viking-bone truncate max-w-[180px]">
                      {m.event_title}
                    </td>
                    <td className="py-2 pr-3 text-viking-bone truncate max-w-[200px]">
                      {m.subject}
                    </td>
                    <td className="py-2 pl-3 text-right text-viking-gold">{m.sent_push}</td>
                    <td className="py-2 pl-3 text-right text-viking-gold">{m.sent_email}</td>
                    <td className="py-2 pl-3 text-right text-viking-bone">{m.recipients}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, sub }) {
  return (
    <div className="carved-card rounded-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-overline">{label}</span>
        <Icon size={14} className="text-viking-gold" />
      </div>
      <div className="text-3xl font-serif text-viking-bone">{value}</div>
      {sub ? <div className="text-[11px] text-viking-stone mt-1">{sub}</div> : null}
    </div>
  );
}

function Mini({ icon: Icon, value, label }) {
  return (
    <div className="p-3 border border-viking-edge rounded-sm">
      <Icon size={14} className="text-viking-gold mx-auto mb-1" />
      <div className="text-2xl font-serif text-viking-bone">{value}</div>
      <div className="text-[10px] text-viking-stone uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  );
}
