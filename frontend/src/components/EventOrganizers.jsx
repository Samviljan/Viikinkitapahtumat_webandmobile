/**
 * Public list of approved organizers for this event. Hides itself if
 * none. Each row shows full name + obfuscated email + phone (so users
 * can reach the organizer with a question).
 */
import React, { useEffect, useState } from "react";
import { ShieldCheck, Mail, Phone } from "lucide-react";
import { api } from "@/lib/api";

export default function EventOrganizers({ eventId }) {
  const [list, setList] = useState(null);

  useEffect(() => {
    if (!eventId) return;
    api
      .get(`/events/${eventId}/organizers`)
      .then((r) => setList(Array.isArray(r.data) ? r.data : []))
      .catch(() => setList([]));
  }, [eventId]);

  if (!list || list.length === 0) return null;

  return (
    <section
      className="mt-6 pt-6 border-t border-viking-edge"
      data-testid="event-organizers"
    >
      <h2 className="text-xs uppercase tracking-[0.2em] text-viking-gold font-semibold mb-3">
        Tapahtuman järjestäjät
      </h2>
      <div className="space-y-2">
        {list.map((o) => (
          <div
            key={o.user_id}
            data-testid={`event-organizer-${o.user_id}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 rounded-sm border border-viking-edge bg-viking-shadow/40"
          >
            <ShieldCheck size={14} className="text-viking-gold flex-shrink-0" />
            <span className="font-serif text-viking-bone">{o.full_name}</span>
            {o.email ? (
              <a
                href={`mailto:${o.email}`}
                className="flex items-center gap-1 text-xs text-viking-stone hover:text-viking-gold transition-colors"
              >
                <Mail size={11} />
                {o.email}
              </a>
            ) : null}
            {o.phone ? (
              <a
                href={`tel:${o.phone}`}
                className="flex items-center gap-1 text-xs text-viking-stone hover:text-viking-gold transition-colors"
              >
                <Phone size={11} />
                {o.phone}
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
