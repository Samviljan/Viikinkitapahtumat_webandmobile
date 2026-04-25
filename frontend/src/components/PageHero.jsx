import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export default function PageHero({ eyebrow, title, sub, image, ctaTo, ctaLabel, secondaryCtaTo, secondaryCtaLabel }) {
  return (
    <section className="relative overflow-hidden border-b border-viking-edge">
      {image && (
        <div className="absolute inset-0">
          <img src={image} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-viking-bg/80 via-viking-bg/60 to-viking-bg" />
        </div>
      )}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-8 py-20 sm:py-28">
        {eyebrow && <div className="text-overline mb-5">{eyebrow}</div>}
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-viking-bone leading-[1.05] max-w-3xl">
          {title}
        </h1>
        {sub && <p className="mt-6 text-base sm:text-lg text-viking-stone max-w-2xl leading-relaxed">{sub}</p>}
        {(ctaTo || secondaryCtaTo) && (
          <div className="mt-10 flex flex-wrap gap-3">
            {ctaTo && (
              <Link to={ctaTo}>
                <Button
                  data-testid="hero-primary-cta"
                  className="bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm px-7 h-12 font-rune text-xs ember-glow"
                >
                  {ctaLabel}
                </Button>
              </Link>
            )}
            {secondaryCtaTo && (
              <Link to={secondaryCtaTo}>
                <Button
                  variant="outline"
                  data-testid="hero-secondary-cta"
                  className="border-viking-gold/50 text-viking-gold hover:bg-viking-gold/10 hover:text-viking-gold rounded-sm h-12 px-7 font-rune text-xs"
                >
                  {secondaryCtaLabel}
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
