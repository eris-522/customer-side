/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { ScrollToTop } from "./components/ScrollToTop";
import { CMSProvider } from "./context/CMSContext";
import { supabase } from "./utils/supabase";

// Lazy-load secondary routes to drastically reduce initial bundle size and Vercel bandwidth consumption
const MenuPage = lazy(() => import("./pages/MenuPage"));
const PackagesPage = lazy(() => import("./pages/PackagesPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const FAQsPage = lazy(() => import("./pages/FAQsPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const MyInquiriesPage = lazy(() => import("./pages/MyInquiriesPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));

function RouteLoadingFallback() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
      <span className="text-sm font-medium text-amber-500/80 tracking-widest uppercase">Loading...</span>
    </div>
  );
}

function AuthRoutingHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const isRecovery =
      window.location.hash.includes("type=recovery") ||
      window.location.search.includes("type=recovery") ||
      sessionStorage.getItem("supabase_recovery_mode") === "true";

    const isSignup =
      window.location.hash.includes("type=signup") ||
      window.location.search.includes("type=signup") ||
      window.location.search.includes("confirmed=true") ||
      sessionStorage.getItem("supabase_email_confirmed") === "true";

    if (isRecovery && location.pathname !== "/auth") {
      navigate(`/auth?mode=reset${window.location.hash}`, { replace: true });
    } else if (isSignup && location.pathname !== "/auth") {
      navigate(`/auth?mode=login&confirmed=true${window.location.hash}`, { replace: true });
    }

    let isCancelled = false;
    let profileChannel: any = null;

    // Check if the current user profile is inactive or archived
    const verifyUserActiveStatus = async () => {
      const { data } = await supabase.auth.getUser();
      if (isCancelled || !data?.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", data.user.id)
        .maybeSingle();

      if (isCancelled) return;

      const statusLower = (profile?.status || "").toLowerCase().trim();
      if (statusLower === "inactive") {
        await supabase.auth.signOut();
        if (location.pathname !== "/auth") {
          navigate("/auth?mode=login&deactivated=true", { replace: true });
        }
      } else if (statusLower === "archived") {
        await supabase.auth.signOut();
        if (location.pathname !== "/auth") {
          navigate("/auth?mode=login&archived=true", { replace: true });
        }
      } else {
        // Subscribe to real-time status updates on this user's profile row
        if (!profileChannel) {
          profileChannel = supabase
            .channel(`profile-status-guard-${data.user.id}`)
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "profiles",
                filter: `id=eq.${data.user.id}`,
              },
              async (payload: any) => {
                const newStatus = (payload.new?.status || "").toLowerCase().trim();
                if (newStatus === "inactive") {
                  await supabase.auth.signOut();
                  navigate("/auth?mode=login&deactivated=true", { replace: true });
                } else if (newStatus === "archived") {
                  await supabase.auth.signOut();
                  navigate("/auth?mode=login&archived=true", { replace: true });
                }
              }
            )
            .subscribe();
        }
      }
    };

    verifyUserActiveStatus();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        try {
          sessionStorage.setItem("supabase_recovery_mode", "true");
        } catch {}
        if (location.pathname !== "/auth") {
          navigate("/auth?mode=reset", { replace: true });
        }
      } else if (event === "SIGNED_IN") {
        verifyUserActiveStatus();
      }
    });

    return () => {
      isCancelled = true;
      subscription.unsubscribe();
      if (profileChannel) {
        supabase.removeChannel(profileChannel);
      }
    };
  }, [location.pathname, navigate]);

  return null;
}

export default function App() {
  return (
    <CMSProvider>
      <Router>
        <AuthRoutingHandler />
        <ScrollToTop />
        <div className="flex flex-col min-h-screen bg-rich-black">
          <Navbar />
          <main className="flex-grow">
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/packages" element={<PackagesPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/faqs" element={<FAQsPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/booking" element={<BookingPage />} />
                <Route path="/my-inquiries" element={<MyInquiriesPage />} />
                <Route path="/terms" element={<TermsPage />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </Router>
    </CMSProvider>
  );
}
