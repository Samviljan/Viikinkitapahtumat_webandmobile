import React from "react";
import "@/index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import Layout from "@/components/Layout";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { initAnalytics } from "@/lib/analytics";

// Initialise GA + Consent Mode at module import time, before React renders.
// Doing this in App's useEffect was racy: child useEffects (CookieConsentBanner)
// run BEFORE the parent's useEffect, so trackPageView could fire while
// window.dataLayer was still undefined.
initAnalytics();

import Home from "@/pages/Home";
import Events from "@/pages/Events";
import EventDetail from "@/pages/EventDetail";
import Submit from "@/pages/Submit";import Courses from "@/pages/Courses";
import Favorites from "@/pages/Favorites";
import Guilds from "@/pages/Guilds";
import Shops from "@/pages/Shops";
import Swordfighting from "@/pages/Swordfighting";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Unsubscribe from "@/pages/Unsubscribe";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Profile from "@/pages/Profile";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/submit" element={<Submit />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/guilds" element={<Guilds />} />
              <Route path="/shops" element={<Shops />} />
              <Route path="/swordfighting" element={<Swordfighting />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="*"
                element={
                  <div className="text-center py-32 text-viking-stone">404</div>
                }
              />
            </Routes>
          </Layout>
          <CookieConsentBanner />
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "#1E1815",
                border: "1px solid #352A23",
                color: "#E6D5B8",
                fontFamily: "Outfit, sans-serif",
                borderRadius: "4px",
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
