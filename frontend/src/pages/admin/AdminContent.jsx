import React from "react";
import AdminMerchantsPanel from "@/components/AdminMerchantsPanel";
import AdminGuildsPanel from "@/components/AdminGuildsPanel";

export default function AdminContent() {
  return (
    <div className="space-y-8" data-testid="admin-content-page">
      <AdminMerchantsPanel />
      <AdminGuildsPanel />
    </div>
  );
}
