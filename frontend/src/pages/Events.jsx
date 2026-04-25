import React, { useEffect, useState } from "react";
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
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

const ICAL_PATH = "/api/events.ics";

const CATS = ["all", "market", "battle", "course", "festival", "meetup", "other"];

export default function Events() {
  const { t } = useI18n();
  const [events, setEvents] = useState([]);
  const [cat, setCat] = useState("all");
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

  return (
    <>
      <PageHero eyebrow={t("nav.events")} title={t("events.title")} sub={t("events.sub")} />

      <section className="mx-auto max-w-7xl px-4 sm:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
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
        </div>

        <Tabs defaultValue="calendar" className="w-full">
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
            <EventCalendar events={events} />
            {loaded && events.length === 0 && (
              <div className="mt-6 carved-card rounded-sm p-8 text-center text-viking-stone">
                {t("events.empty")}
              </div>
            )}
          </TabsContent>

          <TabsContent value="list">
            {loaded && events.length === 0 ? (
              <div className="carved-card rounded-sm p-10 text-center text-viking-stone">
                {t("events.empty")}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </>
  );
}
