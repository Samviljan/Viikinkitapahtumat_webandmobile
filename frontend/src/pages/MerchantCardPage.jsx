import React from "react";
import { Link, Navigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import MerchantCardEditor from "@/components/MerchantCardEditor";

/**
 * Standalone /profile/merchant-card page that wraps the existing
 * MerchantCardEditor. Profile no longer renders the editor inline — it links
 * here instead, giving the editor more room and a clearer mental model
 * (separate page = separate paid feature).
 */
export default function MerchantCardPage() {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  if (loading) return null;
  if (!user || !user.id) return <Navigate to="/login" replace />;
  // No merchant_card sub-doc at all → user shouldn't be on this page.
  // Send them back to /profile where the activation CTA lives.
  if (!user.merchant_card) return <Navigate to="/profile" replace />;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-8 py-10">
      <Link
        to="/profile"
        data-testid="merchant-card-back-to-profile"
        className="inline-flex items-center gap-1 text-sm text-viking-stone hover:text-viking-gold mb-6"
      >
        <ChevronLeft size={16} /> {t("merchant_card.back_to_profile")}
      </Link>
      <MerchantCardEditor />
    </div>
  );
}
