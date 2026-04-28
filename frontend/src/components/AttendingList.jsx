/**
 * Profile sub-section: list of events the user has marked as attending.
 * Loaded lazily from `/api/users/me/attending`. Each card shows the event
 * title, date, location, and the user's notification preferences for it.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Mail, Bell, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function AttendingList() {
  const { t, lang } = useI18n();
  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get("/users/me/attending")
      .then((r) => setEvents(r.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  return (
    <section className="carved-card rounded-sm p-7" data-testid="profile-attending">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-serif text-lg text-viking-bone flex items-center gap-2">
            <CalendarCheck size={18} className="text-viking-gold" />
            {t("attending.title")}
          </h2>
          <p className="text-xs text-viking-stone mt-1">{t("attending.help")}</p>
        </div>
        <span className="text-overline">
          {events.length} {t("attending.events_count")}
        </span>
      </div>

      {events.length === 0 ? (
        <p
          data-testid="attending-empty"
          className="text-sm text-viking-stone italic py-6 text-center"
        >
          {t("attending.empty")}
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <Link
              key={ev.id}
              to={`/events/${ev.id}`}
              data-testid={`attending-event-${ev.id}`}
              className="block p-4 border border-viking-edge rounded-sm hover:border-viking-gold/60 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-overline mb-1">
                    {fmtDate(ev.start_date, ev.end_date, lang)}
                  </div>
                  <h3 className="font-serif text-base text-viking-bone group-hover:text-viking-gold truncate">
                    {ev[`title_${lang}`] || ev.title_fi || ev.title}
                  </h3>
                  {ev.location ? (
                    <p className="text-xs text-viking-stone mt-1 truncate">
                      {ev.location}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {ev.attendance?.notify_email ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-viking-gold/90">
                        <Mail size={11} /> {t("attend.notify_email")}
                      </span>
                    ) : null}
                    {ev.attendance?.notify_push ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-viking-gold/90">
                        <Bell size={11} /> {t("attend.notify_push")}
                      </span>
                    ) : null}
                  </div>
                </div>
                <ArrowUpRight
                  size={14}
                  className="text-viking-stone group-hover:text-viking-gold mt-1"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function fmtDate(start, end, lang) {
  if (!start) return "";
  try {
    const d = new Date(start);
    const opts = { day: "numeric", month: "short" };
    const a = d.toLocaleDateString(lang || "fi", opts);
    if (end && end !== start) {
      const e = new Date(end);
      const b = e.toLocaleDateString(lang || "fi", opts);
      return `${a} – ${b}`;
    }
    return a;
  } catch {
    return start;
  }
}
