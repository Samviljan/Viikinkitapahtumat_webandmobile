/**
 * Admin overview — top-level KPI cards + quick links into the sub-sections.
 * Replaces the cluttered "everything-on-one-page" dashboard.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import AdminStatCard from "@/components/admin/AdminStatCard";

export default function AdminOverview() {
  const { t } = useI18n();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api
      .get("/admin/stats")
      .then((r) => setStats(r.data))
      .catch(() => toast.error(t("admin.load_error")));
  }, [t]);

  const quickLinks = [
    { to: "/admin/events", label: t("admin.nav.events"), help: t("admin.overview.events_help") },
    { to: "/admin/users", label: t("admin.nav.users"), help: t("admin.overview.users_help") },
    { to: "/admin/messages", label: t("admin.nav.messages"), help: t("admin.overview.messages_help") },
    { to: "/admin/newsletter", label: t("admin.nav.newsletter"), help: t("admin.overview.newsletter_help") },
  ];

  return (
    <div className="space-y-8" data-testid="admin-overview">
      {stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <AdminStatCard label={t("admin.pending")} value={stats.pending} accent="ember" />
          <AdminStatCard label={t("admin.approved")} value={stats.approved} accent="gold" />
          <AdminStatCard label={t("admin.rejected")} value={stats.rejected} accent="stone" />
          <AdminStatCard label={t("admin.subscribers")} value={stats.subscribers || 0} accent="gold" />
        </div>
      ) : null}

      <div>
        <h2 className="font-serif text-base text-viking-bone mb-3">
          {t("admin.overview.quick_links")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {quickLinks.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              data-testid={`admin-quicklink-${q.to.split("/").pop()}`}
              className="carved-card rounded-sm p-4 hover:border-viking-gold/50 transition-colors flex items-start justify-between gap-3 group"
            >
              <div>
                <div className="font-rune text-xs uppercase tracking-wider text-viking-bone mb-1">
                  {q.label}
                </div>
                <p className="text-xs text-viking-stone leading-relaxed">{q.help}</p>
              </div>
              <ArrowRight
                size={16}
                className="text-viking-stone group-hover:text-viking-gold shrink-0 mt-0.5 transition-colors"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
