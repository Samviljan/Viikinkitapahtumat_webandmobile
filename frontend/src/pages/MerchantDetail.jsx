import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { useDocumentSeo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { Globe, Phone, Mail, Calendar, MapPin, ChevronLeft, Heart, Hammer, Store } from "lucide-react";
import { toast } from "sonner";
import { flagFor } from "@/lib/countries";
import { formatDateRange } from "@/components/EventCard";

const API = process.env.REACT_APP_BACKEND_URL || "";

function imgSrc(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API}${url}`;
}

export default function MerchantDetail() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const { user, refresh } = useAuth();
  const [m, setM] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/merchants/${id}`).then((r) => setM(r.data)).catch(() => setError("not_found"));
  }, [id]);

  useDocumentSeo(
    useMemo(() => ({
      title: m ? `${m.name} – Viikinkitapahtumat` : "Kauppias",
      description: m ? (m.description || m.name) : "",
    }), [m]),
  );

  const isFavorite = !!(user && (user.favorite_merchant_ids || []).includes(id));

  const toggleFavorite = async () => {
    if (!user || !user.id) {
      toast.error("Kirjaudu sisään käyttääksesi suosikkeja");
      return;
    }
    setBusy(true);
    try {
      if (isFavorite) await api.delete(`/users/me/favorite-merchants/${id}`);
      else await api.post(`/users/me/favorite-merchants/${id}`);
      await refresh();
    } catch {
      toast.error(t("merchant_card.save_failed"));
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-8 py-20 text-center">
        <p className="text-viking-stone">404</p>
        <Link to="/shops" className="text-viking-gold hover:underline mt-4 inline-block">
          ← {t("shops.title")}
        </Link>
      </div>
    );
  }

  if (!m) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-8 py-20 text-center text-viking-stone">…</div>
    );
  }

  const CategoryIcon = m.category === "smith" ? Hammer : Store;

  return (
    <article className="mx-auto max-w-4xl px-4 sm:px-8 py-10">
      <Link
        to="/shops"
        data-testid="merchant-back-link"
        className="inline-flex items-center gap-1 text-sm text-viking-stone hover:text-viking-gold mb-6"
      >
        <ChevronLeft size={16} /> {t("shops.title")}
      </Link>

      <div className="carved-card rounded-sm overflow-hidden">
        {m.image_url && (
          <div className="aspect-[16/9] sm:aspect-[2/1] bg-viking-shadow/40">
            <img
              src={imgSrc(m.image_url)}
              alt={m.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-viking-gold/80 text-xs uppercase tracking-wider mb-2">
                <CategoryIcon size={14} />
                <span>{t(m.category === "smith" ? "shops.smiths_title" : "shops.gear_title")}</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl text-viking-bone leading-tight">
                {m.name}
              </h1>
            </div>
            {user && user.id && (
              <button
                type="button"
                onClick={toggleFavorite}
                disabled={busy}
                data-testid="merchant-favorite-btn"
                className="rounded-full bg-viking-shadow/80 p-3 hover:bg-viking-shadow transition-colors disabled:opacity-50"
                aria-pressed={isFavorite}
                aria-label={isFavorite ? t("shops.favorite_remove") : t("shops.favorite_add")}
              >
                <Heart
                  size={20}
                  className={isFavorite ? "fill-viking-ember text-viking-ember" : "text-viking-bone"}
                />
              </button>
            )}
          </div>

          {m.description && (
            <p
              data-testid="merchant-description"
              className="text-viking-bone whitespace-pre-line leading-relaxed mb-6"
            >
              {m.description}
            </p>
          )}

          {(m.url || m.phone || m.email) && (
            <div className="border-t border-viking-shadow/60 pt-5 mt-5">
              <h2 className="font-serif text-base text-viking-stone uppercase tracking-wider mb-3">
                {t("shops.contact")}
              </h2>
              <div className="space-y-2 text-sm">
                {m.url && (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="merchant-website"
                    className="flex items-center gap-2 text-viking-gold hover:underline break-all"
                  >
                    <Globe size={14} /> {m.url}
                  </a>
                )}
                {m.phone && (
                  <a
                    href={`tel:${m.phone}`}
                    data-testid="merchant-phone"
                    className="flex items-center gap-2 text-viking-bone hover:text-viking-gold"
                  >
                    <Phone size={14} /> {m.phone}
                  </a>
                )}
                {m.email && (
                  <a
                    href={`mailto:${m.email}`}
                    data-testid="merchant-email"
                    className="flex items-center gap-2 text-viking-bone hover:text-viking-gold break-all"
                  >
                    <Mail size={14} /> {m.email}
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-viking-shadow/60 pt-5 mt-5">
            <h2 className="font-serif text-base text-viking-stone uppercase tracking-wider mb-3">
              {t("shops.events_title")}
            </h2>
            {(m.events || []).length === 0 ? (
              <p className="text-sm text-viking-stone">{t("shops.no_upcoming")}</p>
            ) : (
              <ul className="space-y-2" data-testid="merchant-events-list">
                {m.events.map((ev) => {
                  const title = pickLocalized(ev, "title", lang) || ev.title_fi;
                  return (
                    <li key={ev.id}>
                      <Link
                        to={`/events/${ev.id}`}
                        data-testid={`merchant-event-${ev.id}`}
                        className="flex items-start gap-3 p-3 rounded-sm bg-viking-shadow/30 hover:bg-viking-shadow/60 transition-colors"
                      >
                        <Calendar size={14} className="text-viking-gold mt-1 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-serif text-viking-bone leading-tight">
                            {title}
                          </div>
                          <div className="text-xs text-viking-stone mt-1 flex items-center gap-3 flex-wrap">
                            <span>{formatDateRange(ev.date, ev.date_end)}</span>
                            {ev.location && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin size={11} />
                                {ev.location}
                                {ev.country && (
                                  <span className="ml-1">{flagFor(ev.country)}</span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
