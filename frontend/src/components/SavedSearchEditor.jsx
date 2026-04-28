/**
 * Profile section: default search filters (radius / categories / countries)
 * that pre-fill the events list when the user is signed in.
 *
 * Saved via PATCH /api/auth/profile { saved_search: {...} }.
 */
import React, { useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const RADIUS_OPTIONS = [null, 25, 50, 100, 250];
const CATEGORY_KEYS = [
  "festival",
  "market",
  "course",
  "fight_western",
  "fight_eastern",
];
const CATEGORY_LABEL = {
  festival: { fi: "Juhla", en: "Festival", sv: "Festival", et: "Festival", pl: "Festiwal" },
  market: { fi: "Markkinat", en: "Market", sv: "Marknad", et: "Turg", pl: "Targi" },
  course: { fi: "Kurssi", en: "Course", sv: "Kurs", et: "Kursus", pl: "Kurs" },
  fight_western: { fi: "Western-taistelu", en: "Western fight", sv: "Western-strid", et: "Western", pl: "Walka western" },
  fight_eastern: { fi: "Eastern-taistelu", en: "Eastern fight", sv: "Eastern-strid", et: "Eastern", pl: "Walka eastern" },
};
const COUNTRY_KEYS = ["fi", "se", "no", "dk", "ee", "lv", "is"];

export default function SavedSearchEditor() {
  const { user, updateProfile } = useAuth();
  const { t, lang } = useI18n();
  const initial = user?.saved_search || {};
  const [radius, setRadius] = useState(initial.radius_km ?? null);
  const [cats, setCats] = useState(initial.categories || []);
  const [countries, setCountries] = useState(initial.countries || []);
  const [saving, setSaving] = useState(false);

  function toggleArr(setter, arr, val) {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  async function save() {
    setSaving(true);
    try {
      await updateProfile({
        saved_search: {
          radius_km: radius,
          categories: cats,
          countries: countries,
        },
      });
      toast.success(t("saved_search.saved"));
    } catch {
      toast.error(t("account.error_generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="carved-card rounded-sm p-7" data-testid="saved-search-section">
      <div className="flex items-center gap-3 mb-5">
        <Search size={18} className="text-viking-gold" />
        <div>
          <h2 className="font-serif text-lg text-viking-bone">{t("saved_search.title")}</h2>
          <p className="text-xs text-viking-stone mt-1">{t("saved_search.help")}</p>
        </div>
      </div>

      {/* Radius */}
      <div className="space-y-2 mb-5">
        <Label className="text-overline">{t("saved_search.radius")}</Label>
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((r) => {
            const active = radius === r;
            return (
              <button
                key={r === null ? "any" : r}
                type="button"
                data-testid={`radius-${r === null ? "any" : r}`}
                onClick={() => setRadius(r)}
                className={`px-3 py-1.5 rounded-sm text-xs font-rune border transition-colors ${
                  active
                    ? "border-viking-gold text-viking-gold bg-viking-gold/10"
                    : "border-viking-edge text-viking-stone hover:border-viking-gold/60"
                }`}
              >
                {r === null ? t("saved_search.any") : `${r} km`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-2 mb-5">
        <Label className="text-overline">{t("saved_search.categories")}</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_KEYS.map((c) => {
            const active = cats.includes(c);
            return (
              <button
                key={c}
                type="button"
                data-testid={`cat-${c}`}
                onClick={() => toggleArr(setCats, cats, c)}
                className={`px-3 py-1.5 rounded-full text-xs font-rune border transition-colors ${
                  active
                    ? "border-viking-gold text-viking-gold bg-viking-gold/10"
                    : "border-viking-edge text-viking-stone hover:border-viking-gold/60"
                }`}
              >
                {t(`categories.${c}`) === `categories.${c}`
                  ? CATEGORY_LABEL[c]?.[lang] || CATEGORY_LABEL[c]?.en || c
                  : t(`categories.${c}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Countries */}
      <div className="space-y-2 mb-6">
        <Label className="text-overline">{t("saved_search.countries")}</Label>
        <div className="flex flex-wrap gap-2">
          {COUNTRY_KEYS.map((c) => {
            const active = countries.includes(c);
            return (
              <button
                key={c}
                type="button"
                data-testid={`country-${c}`}
                onClick={() => toggleArr(setCountries, countries, c)}
                className={`px-3 py-1.5 rounded-sm text-xs font-rune border transition-colors uppercase ${
                  active
                    ? "border-viking-gold text-viking-gold bg-viking-gold/10"
                    : "border-viking-edge text-viking-stone hover:border-viking-gold/60"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <Button
        type="button"
        onClick={save}
        disabled={saving}
        data-testid="saved-search-save"
        className="bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-xs h-10 px-5 ember-glow"
      >
        {saving ? "..." : t("saved_search.save")}
      </Button>
    </section>
  );
}
