import React from "react";
import AdminSyncPanel from "@/components/admin/AdminSyncPanel";

export default function AdminSystem() {
  return (
    <div className="space-y-8" data-testid="admin-system-page">
      <AdminSyncPanel />
    </div>
  );
}
