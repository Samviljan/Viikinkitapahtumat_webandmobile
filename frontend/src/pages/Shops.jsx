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
    <>
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
      <div className="flex items-start justify-between gap-3 flex-1">
        <div className="min-w-0 flex-1">
          {s.featured && (
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-viking-gold mb-1">
              <Star size={10} className="fill-viking-gold" /> {t("shops.featured_title")}
            </div>
          )}
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
    </>
  );

  // `flex` on the anchor itself (not on a child div) so the carved-card box
  // grows with its content. Wrapping `relative` div is just to host the
  // absolutely-positioned FavoriteButton (a `<button>` cannot be nested
  // inside an `<a>` for a11y reasons).
  const className =
    "relative carved-card rounded-sm p-5 hover:border-viking-gold/40 transition-colors group flex flex-col h-full";

  return (
    <div className="relative h-full">
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

  // Sorting rules for the public Shops page:
  //   - PAID user merchant cards sort BEFORE legacy admin-curated entries
  //     within their category.
  //   - Within the paid tier, FEATURED cards sort first, then by name.
  //   - Within the legacy tier, original API order (alphabetical) is kept.
  // We split each category list into `paid` + `others` so the UI can render
  // them with separate sub-headers ("★ Premium" + "Muut") and a divider.
  // A top hero strip also lists ALL paid merchants regardless of category.
  const sortPaid = (list) =>
    list.slice().sort((a, b) => {
      const aFeat = a.featured ? 1 : 0;
      const bFeat = b.featured ? 1 : 0;
      if (aFeat !== bFeat) return bFeat - aFeat;
      return (a.name || "").localeCompare(b.name || "");
    });

  const splitByTier = (cat) => {
    const inCat = items.filter((m) => m.category === cat);
    return {
      paid: sortPaid(inCat.filter((m) => m.is_user_card)),
      others: inCat.filter((m) => !m.is_user_card),
    };
  };

  const gear = useMemo(() => splitByTier("gear"), [items]);
  const smiths = useMemo(() => splitByTier("smith"), [items]);
  const featuredAll = useMemo(
    () => sortPaid(items.filter((m) => m.is_user_card)),
    [items],
  );

  const canFavorite = !!(user && user.id);
  const favSet = useMemo(() => new Set(favorites), [favorites]);

  const renderCategorySection = (titleKey, list, testidPrefix, icon) => {
    if (list.paid.length === 0 && list.others.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-2 mb-5">
          {icon}
          <h3 className="font-serif text-2xl text-viking-bone">{t(titleKey)}</h3>
        </div>
        {list.paid.length > 0 ? (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Star size={12} className="fill-viking-gold text-viking-gold" />
              <span className="text-overline text-viking-gold">
                {t("shops.premium_title")}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.paid.map((s) => (
                <MerchantCard
                  key={s.id}
                  s={s}
                  isFavorite={favSet.has(s.id)}
                  onToggleFavorite={toggleFavorite}
                  canFavorite={canFavorite}
                  testid={`${testidPrefix}-${s.id}`}
                />
              ))}
            </div>
          </div>
        ) : null}
        {list.paid.length > 0 && list.others.length > 0 ? (
          <div className="border-t border-viking-edge/60 my-6" />
        ) : null}
        {list.others.length > 0 ? (
          <div>
            {list.paid.length > 0 ? (
              <div className="mb-3">
                <span className="text-overline text-viking-stone">
                  {t("shops.others_title")}
                </span>
              </div>
            ) : null}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.others.map((s) => (
                <MerchantCard
                  key={s.id}
                  s={s}
                  isFavorite={favSet.has(s.id)}
                  onToggleFavorite={toggleFavorite}
                  canFavorite={canFavorite}
                  testid={`${testidPrefix}-${s.id}`}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <PageHero eyebrow="ᚲᚨᚢᛈᛈᚨ" title={t("shops.title")} sub={t("shops.sub")} />

      <section className="mx-auto max-w-6xl px-4 sm:px-8 py-12 space-y-14">
        {/* Top hero: featured/premium merchants across all categories */}
        {featuredAll.length > 0 ? (
          <div data-testid="featured-strip" className="carved-card rounded-sm p-6 sm:p-8 border-viking-gold/40">
            <div className="flex items-center gap-2 mb-2">
              <Star size={14} className="fill-viking-gold text-viking-gold" />
              <span className="text-overline text-viking-gold">
                {t("shops.featured_title")}
              </span>
            </div>
            <p className="text-sm text-viking-stone mb-5 leading-relaxed">
              {t("shops.featured_sub")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredAll.map((s) => (
                <MerchantCard
                  key={`featured-${s.id}`}
                  s={s}
                  isFavorite={favSet.has(s.id)}
                  onToggleFavorite={toggleFavorite}
                  canFavorite={canFavorite}
                  testid={`featured-${s.id}`}
                />
              ))}
            </div>
          </div>
        ) : null}

        {renderCategorySection("shops.gear_title", gear, "shop", null)}
        {renderCategorySection(
          "shops.smiths_title",
          smiths,
          "smith",
          <Hammer size={18} className="text-viking-ember" />,
        )}
      </section>
    </>
  );
}
