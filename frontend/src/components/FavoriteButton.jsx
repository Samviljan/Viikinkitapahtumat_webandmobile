import React from "react";
import { Star } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useFavorites } from "@/lib/favorites";

export default function FavoriteButton({ eventId, size = 16, variant = "icon" }) {
  const { t } = useI18n();
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(eventId);
  const label = fav ? t("fav.remove") : t("fav.add");

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    toggle(eventId);
  }

  if (variant === "label") {
    return (
      <button
        type="button"
        data-testid={`fav-toggle-${eventId}`}
        data-state={fav ? "on" : "off"}
        onClick={onClick}
        aria-label={label}
        title={label}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border font-rune text-[10px] tracking-[0.2em] uppercase transition-colors ${
          fav
            ? "border-viking-gold text-viking-gold bg-viking-gold/10"
            : "border-viking-edge text-viking-stone hover:border-viking-gold hover:text-viking-gold"
        }`}
      >
        <Star size={size} className={fav ? "fill-viking-gold" : ""} />
        {fav ? t("fav.saved") : t("fav.save")}
      </button>
    );
  }

  return (
    <button
      type="button"
      data-testid={`fav-toggle-${eventId}`}
      data-state={fav ? "on" : "off"}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-sm border backdrop-blur-sm transition-colors ${
        fav
          ? "border-viking-gold text-viking-gold bg-viking-bg/70"
          : "border-viking-edge/70 text-viking-bone bg-viking-bg/60 hover:text-viking-gold hover:border-viking-gold"
      }`}
    >
      <Star size={size} className={fav ? "fill-viking-gold" : ""} />
    </button>
  );
}
