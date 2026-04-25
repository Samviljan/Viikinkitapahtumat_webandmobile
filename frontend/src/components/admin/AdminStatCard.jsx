import React from "react";

const ACCENT = {
  ember: "text-viking-ember",
  gold: "text-viking-gold",
  stone: "text-viking-stone",
};

export default function AdminStatCard({ label, value, accent }) {
  return (
    <div className="carved-card rounded-sm p-5">
      <div className="text-overline mb-1">{label}</div>
      <div className={`font-serif text-4xl ${ACCENT[accent] || ACCENT.stone}`}>
        {value}
      </div>
    </div>
  );
}
