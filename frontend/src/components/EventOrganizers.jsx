/**
 * Public list of approved organizers for this event. Hides itself if
 * none. Shows only the organizer's full name (as a public "nickname").
 * Clicking the name opens a contact form that routes the message to
 * the organizer's real email server-side — the address itself is
 * never exposed on the public event page.
 */
import React, { useEffect, useState } from "react";
import { ShieldCheck, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import ContactOrganizerDialog from "@/components/ContactOrganizerDialog";

export default function EventOrganizers({ eventId }) {
  const [list, setList] = useState(null);
  const [contactTarget, setContactTarget] = useState(null);

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
          <button
            key={o.user_id}
            type="button"
            onClick={() => setContactTarget(o)}
            data-testid={`event-organizer-${o.user_id}`}
            className="group w-full flex items-center justify-between gap-3 p-3 rounded-sm border border-viking-edge bg-viking-shadow/40 hover:border-viking-gold/60 hover:bg-viking-shadow/70 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-viking-gold flex-shrink-0" />
              <span className="font-serif text-viking-bone group-hover:text-viking-gold transition-colors">
                {o.full_name}
              </span>
            </div>
            <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-viking-stone group-hover:text-viking-gold transition-colors">
              <MessageSquare size={11} />
              Lähetä viesti
            </span>
          </button>
        ))}
      </div>
      <ContactOrganizerDialog
        open={!!contactTarget}
        onOpenChange={(v) => !v && setContactTarget(null)}
        eventId={eventId}
        organizerUserId={contactTarget?.user_id}
        organizerName={contactTarget?.full_name}
      />
    </section>
  );
}
