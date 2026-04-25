import React from "react";
import { Link } from "react-router-dom";
import { pickLocalized } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  Trash2,
  Calendar,
  MapPin,
  User,
  ExternalLink,
  Pencil,
} from "lucide-react";

const STATUS_CLASS = {
  pending: "border-viking-ember/50 text-viking-ember",
  approved: "border-viking-gold/50 text-viking-gold",
  rejected: "border-viking-edge text-viking-stone",
};

export default function AdminEventRow({
  ev,
  lang,
  t,
  onApprove,
  onReject,
  onDelete,
  onEdit,
}) {
  return (
    <div
      data-testid={`admin-row-${ev.id}`}
      className="carved-card rounded-sm p-5 flex flex-col lg:flex-row gap-4 lg:items-center"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`font-rune text-[9px] px-2 py-0.5 rounded-sm border ${
              STATUS_CLASS[ev.status] || STATUS_CLASS.rejected
            }`}
          >
            {t(`admin.${ev.status}`)}
          </span>
          <span className="font-rune text-[9px] text-viking-stone">
            {t(`cats.${ev.category}`)}
          </span>
        </div>
        <h3 className="font-serif text-xl text-viking-bone">
          {pickLocalized(ev, lang, "title")}
        </h3>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-viking-stone">
          <span className="flex items-center gap-1.5">
            <Calendar size={12} className="text-viking-gold" />
            {ev.start_date}
            {ev.end_date && ` – ${ev.end_date}`}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin size={12} className="text-viking-gold" />
            {ev.location}
          </span>
          <span className="flex items-center gap-1.5">
            <User size={12} className="text-viking-gold" />
            {ev.organizer}
          </span>
          {ev.link && (
            <a
              href={ev.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-viking-gold hover:underline"
            >
              <ExternalLink size={12} /> link
            </a>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          data-testid={`edit-${ev.id}`}
          onClick={onEdit}
          variant="outline"
          className="border-viking-edge text-viking-bone hover:border-viking-gold hover:text-viking-gold rounded-sm font-rune text-[10px]"
        >
          <Pencil size={12} className="mr-1" />
          {t("admin.edit")}
        </Button>
        {ev.status !== "approved" && (
          <Button
            size="sm"
            data-testid={`approve-${ev.id}`}
            onClick={onApprove}
            className="bg-viking-forest hover:bg-emerald-900 text-viking-bone rounded-sm font-rune text-[10px]"
          >
            <Check size={12} className="mr-1" />
            {t("admin.approve")}
          </Button>
        )}
        {ev.status !== "rejected" && (
          <Button
            size="sm"
            data-testid={`reject-${ev.id}`}
            onClick={onReject}
            variant="outline"
            className="border-viking-edge text-viking-stone hover:text-viking-ember hover:border-viking-ember rounded-sm font-rune text-[10px]"
          >
            <X size={12} className="mr-1" />
            {t("admin.reject")}
          </Button>
        )}
        <Button
          size="sm"
          data-testid={`delete-${ev.id}`}
          onClick={onDelete}
          variant="outline"
          className="border-viking-edge text-viking-ember hover:bg-viking-ember hover:text-viking-bone rounded-sm font-rune text-[10px]"
        >
          <Trash2 size={12} />
        </Button>
        <Link
          to={`/events/${ev.id}`}
          target="_blank"
          className="font-rune text-[10px] text-viking-stone hover:text-viking-gold self-center pl-1"
        >
          ↗
        </Link>
      </div>
    </div>
  );
}
