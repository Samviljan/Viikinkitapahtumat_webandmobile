import React from "react";
import AdminMerchantsPanel from "@/components/AdminMerchantsPanel";
import AdminGuildsPanel from "@/components/AdminGuildsPanel";
import AdminMerchantCardsPanel from "@/components/admin/AdminMerchantCardsPanel";
import AdminDefaultImagesPanel from "@/components/admin/AdminDefaultImagesPanel";

export default function AdminContent() {
  return (
    <div className="space-y-8" data-testid="admin-content-page">
      <AdminDefaultImagesPanel />
      <AdminMerchantCardsPanel />
      <AdminMerchantsPanel />
      <AdminGuildsPanel />
    </div>
  );
}
