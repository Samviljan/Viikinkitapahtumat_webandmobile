import React from "react";
import AdminNewsletterPanel from "@/components/admin/AdminNewsletterPanel";
import AdminSubscribersPanel from "@/components/admin/AdminSubscribersPanel";
import AdminWeeklyReportPanel from "@/components/admin/AdminWeeklyReportPanel";

export default function AdminNewsletter() {
  return (
    <div className="space-y-8" data-testid="admin-newsletter-page">
      <AdminNewsletterPanel />
      <AdminSubscribersPanel />
      <AdminWeeklyReportPanel />
    </div>
  );
}
