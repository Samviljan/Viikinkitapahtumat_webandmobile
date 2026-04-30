import React from "react";
import AdminMerchantsPanel from "@/components/AdminMerchantsPanel";
import AdminGuildsPanel from "@/components/AdminGuildsPanel";
import AdminMerchantCardsPanel from "@/components/admin/AdminMerchantCardsPanel";

export default function AdminContent() {
  return (
    <div className="space-y-8" data-testid="admin-content-page">
      <AdminMerchantCardsPanel />
      <AdminMerchantsPanel />
      <AdminGuildsPanel />
    </div>
  );
}
