/**
 * Event merchants strip — shows merchant cards whose owner has RSVPed
 * to this event. Public, no auth required. Hides itself if no merchants
 * are present (so adminless events stay clean).
 *
 * Mirrors the layout of MerchantList paid cards but compact.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Hammer, Store, Star } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const API = process.env.REACT_APP_BACKEND_URL || "";

function imgSrc(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API}${url}`;
}

export default function EventMerchants({ eventId }) {
  const { t } = useI18n();
  const [merchants, setMerchants] = useState(null);

  useEffect(() => {
    if (!eventId) return;
    api
      .get(`/events/${eventId}/merchants`)
      .then((r) => setMerchants(Array.isArray(r.data) ? r.data : []))
      .catch(() => setMerchants([]));
  }, [eventId]);

  if (!merchants || merchants.length === 0) return null;

  return (
    <section
      className="mt-6 pt-6 border-t border-viking-edge"
      data-testid="event-merchants"
    >
      <h2 className="text-xs uppercase tracking-[0.2em] text-viking-gold font-semibold mb-3">
        {t("events.merchants_present") || "Kauppiaita paikalla"}
      </h2>
      <p className="text-xs text-viking-stone italic mb-4">
        {t("events.merchants_present_help") ||
          "Nämä kauppiaat ovat ilmoittaneet osallistuvansa tähän tapahtumaan."}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {merchants.map((m) => {
          const Icon = m.category === "smith" ? Hammer : Store;
          const src = imgSrc(m.image_url);
          return (
            <Link
              key={m.id}
              to={`/shops/${m.id}`}
              data-testid={`event-merchant-${m.id}`}
              className="group flex gap-3 items-start p-3 rounded-sm border border-viking-edge bg-viking-shadow/40 hover:border-viking-gold/60 hover:bg-viking-shadow/70 transition-colors"
            >
              {src ? (
                <img
                  src={src}
                  alt=""
                  className="w-16 h-16 object-cover rounded-sm flex-shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="w-16 h-16 rounded-sm flex-shrink-0 flex items-center justify-center bg-viking-shadow/60 border border-viking-edge">
                  <Icon size={24} className="text-viking-gold" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  {m.featured && (
                    <Star size={11} className="text-viking-gold flex-shrink-0" />
                  )}
                  <span className="font-serif text-viking-bone leading-tight truncate group-hover:text-viking-gold transition-colors">
                    {m.name}
                  </span>
                </div>
                {m.description && (
                  <p className="text-[11px] text-viking-stone line-clamp-2 leading-snug">
                    {m.description}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
