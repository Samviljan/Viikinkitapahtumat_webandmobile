/**
 * Aggregate attendance counts shown to merchants & organizers (and admins).
 *
 * Privacy: only counts of `reenactor` and `fighter` profiles are exposed —
 * NEVER nicknames, emails, or any PII. Other roles see nothing.
 */
import React, { useEffect, useState } from "react";
import { Users, Swords, ShieldHalf } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function EventStats({ eventId }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState(null);

  const types = user?.user_types || [];
  const canSee = !!user && (user.role === "admin" || types.includes("merchant") || types.includes("organizer"));

  useEffect(() => {
    if (!canSee) return;
    api
      .get(`/events/${eventId}/stats`)
      .then((r) => setStats(r.data))
      .catch(() => setStats(null));
  }, [canSee, eventId]);

  if (!canSee || !stats) return null;

  return (
    <div
      className="mt-4 p-4 border border-viking-edge rounded-sm bg-viking-surface/40"
      data-testid="event-stats"
    >
      <div className="text-overline mb-3 flex items-center gap-2">
        <Users size={12} /> {t("stats.title")}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={ShieldHalf} value={stats.reenactors} label={t("stats.reenactors")} />
        <Stat icon={Swords} value={stats.fighters} label={t("stats.fighters")} />
        <Stat icon={Users} value={stats.total} label={t("stats.total")} />
      </div>
      <p className="mt-3 text-[11px] text-viking-stone italic leading-relaxed">
        {t("stats.privacy_note")}
      </p>
    </div>
  );
}

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="text-center p-3 rounded-sm border border-viking-edge bg-viking-surface2/30">
      <Icon size={14} className="text-viking-gold mx-auto mb-2" />
      <div className="text-2xl font-serif text-viking-bone">{value}</div>
      <div className="text-[10px] text-viking-stone uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  );
}
