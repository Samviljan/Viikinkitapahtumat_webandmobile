import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "@/components/PageHero";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ExternalLink, Hammer, Heart, Star } from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL || "";

function imgSrc(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API}${url}`;
}

function FavoriteButton({ merchantId, isFavorite, onToggle, testid }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(merchantId, !isFavorite);
      }}
      aria-pressed={isFavorite}
      data-testid={testid}
      className="absolute top-3 right-3 rounded-full bg-viking-shadow/80 backdrop-blur-sm p-2 hover:bg-viking-shadow transition-colors"
    >
      <Heart
        size={16}
        className={isFavorite ? "fill-viking-ember text-viking-ember" : "text-viking-bone"}
      />
    </button>
  );
}

function MerchantCard({ s, isFavorite, onToggleFavorite, canFavorite, testid }) {
  const { t } = useI18n();
  const isUserCard = !!s.is_user_card;
  const detailHref = isUserCard ? `/shops/${s.id}` : null;
  const externalHref = !isUserCard ? (s.url || null) : null;

  const inner = (
    <div className="flex flex-col h-full">
      {isUserCard && s.image_url && (
        <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-viking-shadow/40 mb-3">
          <img
            src={imgSrc(s.image_url)}
            alt={s.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {s.featured && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-viking-gold">
                <Star size={10} className="fill-viking-gold" /> {t("shops.featured_title")}
              </span>
            )}
          </div>
          <h3 className="font-serif text-lg text-viking-bone group-hover:text-viking-gold leading-tight">
            {s.name}
          </h3>
          {s.description && (
            <p className="text-xs text-viking-stone mt-1.5 line-clamp-3">{s.description}</p>
          )}
        </div>
        {!isUserCard && s.url && (
          <ExternalLink size={14} className="text-viking-gold flex-shrink-0 mt-1" />
        )}
      </div>
      {isUserCard && (
        <span className="mt-3 text-xs text-viking-gold/80 hover:text-viking-gold inline-flex items-center gap-1">
          {t("shops.view_details")} →
        </span>
      )}
    </div>
  );

  const className =
    "relative carved-card rounded-sm p-5 hover:border-viking-gold/40 transition-colors group";

  return (
    <div className="relative">
      {canFavorite && isUserCard && (
        <FavoriteButton
          merchantId={s.id}
          isFavorite={isFavorite}
          onToggle={onToggleFavorite}
          testid={`${testid}-fav`}
        />
      )}
      {detailHref ? (
        <Link to={detailHref} data-testid={testid} className={className}>
          {inner}
        </Link>
      ) : (
        <a
          href={externalHref || "#"}
          target={externalHref ? "_blank" : undefined}
          rel="noopener noreferrer"
          data-testid={testid}
          className={className}
        >
          {inner}
        </a>
      )}
    </div>
  );
}

export default function Shops() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    api.get("/merchants").then((r) => setItems(r.data || [])).catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (user && user.id) {
      setFavorites(user.favorite_merchant_ids || []);
    } else {
      setFavorites([]);
    }
  }, [user]);

  const toggleFavorite = async (merchantId, becomeFavorite) => {
    if (!user || !user.id) {
      toast.error("Kirjaudu sisään käyttääksesi suosikkeja");
      return;
    }
    try {
      const { data } = becomeFavorite
        ? await api.post(`/users/me/favorite-merchants/${merchantId}`)
        : await api.delete(`/users/me/favorite-merchants/${merchantId}`);
      setFavorites(data.merchant_ids || []);
    } catch {
      toast.error(t("merchant_card.save_failed"));
    }
  };

  const featured = useMemo(() => items.filter((m) => m.featured), [items]);
  const gear = useMemo(() => items.filter((m) => m.category === "gear" && !m.featured), [items]);
  const smiths = useMemo(() => items.filter((m) => m.category === "smith" && !m.featured), [items]);

  const canFavorite = !!(user && user.id);
  const favSet = useMemo(() => new Set(favorites), [favorites]);

  return (
    <>
      <PageHero eyebrow="ᚲᚨᚢᛈᛈᚨ" title={t("shops.title")} sub={t("shops.sub")} />

      <section className="mx-auto max-w-6xl px-4 sm:px-8 py-12 space-y-14">
        {featured.length > 0 && (
          <div data-testid="merchants-featured-section">
            <div className="flex items-center gap-2 mb-5">
              <Star size={18} className="text-viking-gold fill-viking-gold" />
              <h3 className="font-serif text-2xl text-viking-bone">{t("shops.featured_title")}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map((s) => (
                <MerchantCard
                  key={s.id}
                  s={s}
                  isFavorite={favSet.has(s.id)}
                  onToggleFavorite={toggleFavorite}
                  canFavorite={canFavorite}
                  testid={`featured-${s.id}`}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="font-serif text-2xl text-viking-bone mb-5">{t("shops.gear_title")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gear.map((s) => (
              <MerchantCard
                key={s.id}
                s={s}
                isFavorite={favSet.has(s.id)}
                onToggleFavorite={toggleFavorite}
                canFavorite={canFavorite}
                testid={`shop-${s.id}`}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-5">
            <Hammer size={18} className="text-viking-ember" />
            <h3 className="font-serif text-2xl text-viking-bone">{t("shops.smiths_title")}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {smiths.map((s) => (
              <MerchantCard
                key={s.id}
                s={s}
                isFavorite={favSet.has(s.id)}
                onToggleFavorite={toggleFavorite}
                canFavorite={canFavorite}
                testid={`smith-${s.id}`}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
