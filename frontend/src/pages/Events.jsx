import React, { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import EventCard from "@/components/EventCard";
import EventCalendar from "@/components/EventCalendar";
import PageHero from "@/components/PageHero";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CalendarPlus, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { COUNTRY_CODES, COUNTRY_FLAGS, COUNTRY_NAMES } from "@/lib/countries";

const ICAL_PATH = "/api/events.ics";

const CATS = ["all", "market", "training_camp", "course", "festival", "meetup", "other"];

export default function Events() {
  const { t } = useI18n();
  const [events, setEvents] = useState([]);
  const [cat, setCat] = useState("all");
  // Multi-select country filter — empty set = all countries shown
  const [selectedCountries, setSelectedCountries] = useState(() => new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    const params = {};
    if (cat !== "all") params.category = cat;
    api
      .get("/events", { params })
      .then((r) => setEvents(r.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoaded(true));
  }, [cat]);

  // Apply country filter on the client (server already filtered by category).
  // Only show country chips for countries that actually exist in the result set
  // so the filter UI never offers an empty option.
  const presentCountries = useMemo(() => {
    const set = new Set();
    for (const e of events) set.add(e.country || "FI");
    return COUNTRY_CODES.filter((c) => set.has(c));
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (selectedCountries.size === 0) return events;
    return events.filter((e) => selectedCountries.has(e.country || "FI"));
  }, [events, selectedCountries]);

  function toggleCountry(code) {
    setSelectedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  return (
    <>
      <PageHero eyebrow={t("nav.events")} title={t("events.title")} sub={t("events.sub")} />

      <section className="mx-auto max-w-7xl px-4 sm:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-overline">{t("events.filter_category")}</span>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger
                data-testid="filter-category"
                className="w-[180px] bg-viking-surface border-viking-edge rounded-sm text-viking-bone font-rune text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-viking-surface border-viking-edge text-viking-bone">
                {CATS.map((c) => (
                  <SelectItem
                    key={c}
                    value={c}
                    data-testid={`filter-option-${c}`}
                    className="font-rune text-xs focus:bg-viking-surface2 focus:text-viking-gold"
                  >
                    {c === "all" ? t("events.filter_all") : t(`cats.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`${process.env.REACT_APP_BACKEND_URL}${ICAL_PATH}`}
              data-testid="ical-subscribe"
            >
              <Button
                variant="outline"
                className="border-viking-gold/50 text-viking-gold hover:bg-viking-gold/10 hover:text-viking-gold rounded-sm font-rune text-xs h-10"
              >
                <CalendarPlus size={14} className="mr-2" />
                {t("events.ical_subscribe")}
              </Button>
            </a>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    data-testid="ical-info"
                    aria-label={t("events.ical_help_label")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-viking-edge text-viking-stone hover:text-viking-gold hover:border-viking-gold/50 transition-colors"
                  >
                    <Info size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="end"
                  className="max-w-xs bg-viking-surface border border-viking-edge text-viking-bone text-xs leading-relaxed"
                >
                  {t("events.ical_help")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {presentCountries.length > 1 && (
          <div
            data-testid="country-filter-row"
            className="flex flex-wrap items-center gap-2 mb-8"
          >
            <span className="text-overline mr-1">
              {t("events.filter_country")}
            </span>
            {presentCountries.map((code) => {
              const active = selectedCountries.has(code);
              return (
                <button
                  key={code}
                  type="button"
                  data-testid={`country-chip-${code}`}
                  onClick={() => toggleCountry(code)}
                  className={`inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 font-rune text-[10px] tracking-[0.18em] uppercase transition-colors ${
                    active
                      ? "bg-viking-gold/10 border-viking-gold text-viking-gold"
                      : "bg-viking-surface border-viking-edge text-viking-stone hover:border-viking-gold/60 hover:text-viking-bone"
                  }`}
                >
                  <span className="text-base leading-none">
                    {COUNTRY_FLAGS[code]}
                  </span>
                  <span>{COUNTRY_NAMES[code]}</span>
                </button>
              );
            })}
            {selectedCountries.size > 0 && (
              <button
                type="button"
                data-testid="country-chip-clear"
                onClick={() => setSelectedCountries(new Set())}
                className="inline-flex items-center gap-1 ml-1 rounded-sm border border-viking-edge bg-viking-surface px-2.5 py-1.5 font-rune text-[10px] tracking-[0.18em] uppercase text-viking-ember hover:text-viking-bone hover:border-viking-ember"
              >
                <X size={10} /> {t("events.filter_country_all")}
              </button>
            )}
          </div>
        )}        <Tabs defaultValue="calendar" className="w-full">
          <TabsList
            data-testid="events-tabs"
            className="bg-viking-surface border border-viking-edge rounded-sm p-1 mb-8"
          >
            <TabsTrigger
              value="calendar"
              data-testid="tab-calendar"
              className="font-rune text-xs data-[state=active]:bg-viking-ember data-[state=active]:text-viking-bone rounded-sm px-5"
            >
              {t("events.tab_calendar")}
            </TabsTrigger>
            <TabsTrigger
              value="list"
              data-testid="tab-list"
              className="font-rune text-xs data-[state=active]:bg-viking-ember data-[state=active]:text-viking-bone rounded-sm px-5"
            >
              {t("events.tab_list")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <EventCalendar events={filteredEvents} />
            {loaded && filteredEvents.length === 0 && (
              <div className="mt-6 carved-card rounded-sm p-8 text-center text-viking-stone">
                {t("events.empty")}
              </div>
            )}
          </TabsContent>

          <TabsContent value="list">
            {loaded && filteredEvents.length === 0 ? (
              <div className="carved-card rounded-sm p-10 text-center text-viking-stone">
                {t("events.empty")}
              </div>
            ) : (
              <EventsByMonth events={filteredEvents} />
            )}
          </TabsContent>
        </Tabs>
      </section>
    </>
  );
}

function EventsByMonth({ events }) {
  const { t } = useI18n();
  const groups = useMemo(() => {
    const buckets = new Map();
    const sorted = [...(events || [])].sort((a, b) => {
      const ax = a.start_date || "";
      const bx = b.start_date || "";
      return ax.localeCompare(bx);
    });
    for (const ev of sorted) {
      if (!ev.start_date) continue;
      const d = new Date(ev.start_date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!buckets.has(key)) {
        buckets.set(key, { year: d.getFullYear(), month: d.getMonth(), items: [] });
      }
      buckets.get(key).items.push(ev);
    }
    return Array.from(buckets.values());
  }, [events]);

  if (groups.length === 0) return null;

  return (
    <div className="space-y-12" data-testid="events-list-by-month">
      {groups.map((g) => (
        <section key={`${g.year}-${g.month}`} data-testid={`month-${g.year}-${g.month}`}>
          <header className="mb-5 flex items-end gap-4 border-b border-viking-edge/70 pb-3">
            <h2 className="font-serif text-3xl sm:text-4xl text-viking-bone leading-none">
              {t("months")[g.month]}
            </h2>
            <span className="font-rune text-xs text-viking-gold tracking-[0.3em]">
              {g.year}
            </span>
            <span className="ml-auto font-rune text-[10px] text-viking-stone">
              {g.items.length}
            </span>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {g.items.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
