import React from "react";
import "@/index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Events from "@/pages/Events";
import EventDetail from "@/pages/EventDetail";
import Submit from "@/pages/Submit";
import About from "@/pages/About";
import Courses from "@/pages/Courses";
import Guilds from "@/pages/Guilds";
import Shops from "@/pages/Shops";
import Swordfighting from "@/pages/Swordfighting";
import Contact from "@/pages/Contact";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";

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
              <Route path="/submit" element={<Submit />} />
              <Route path="/about" element={<About />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/guilds" element={<Guilds />} />
              <Route path="/shops" element={<Shops />} />
              <Route path="/swordfighting" element={<Swordfighting />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route
                path="*"
                element={
                  <div className="text-center py-32 text-viking-stone">404</div>
                }
              />
            </Routes>
          </Layout>
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
