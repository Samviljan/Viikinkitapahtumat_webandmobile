import React from "react";
import AdminSyncPanel from "@/components/admin/AdminSyncPanel";
import AdminTranslationsPanel from "@/components/admin/AdminTranslationsPanel";

export default function AdminSystem() {
  return (
    <div className="space-y-8" data-testid="admin-system-page">
      <AdminTranslationsPanel />
      <AdminSyncPanel />
    </div>
  );
}
