/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { ScrollToTop } from "./components/ScrollToTop";
import { CMSProvider } from "./context/CMSContext";
import { ThemeProvider } from "./context/ThemeContext";
import { supabase } from "./utils/supabase";
import {
  getSessionUser,
  checkAccountStatus,
  setCachedAccountStatus,
  clearSessionGuardCache,
} from "./utils/sessionGuard";

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
  const pathnameRef = useRef(location.pathname);
  const navigateRef = useRef(navigate);

  useEffect(() => {
    pathnameRef.current = location.pathname;
    navigateRef.current = navigate;

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
  }, [location.pathname, navigate]);

  // Mount auth & profile status guard ONCE across the entire SPA session
  // instead of re-querying Auth/Postgres and tearing down WebSockets on every route change.
  useEffect(() => {
    let isCancelled = false;
    let profileChannel: ReturnType<typeof supabase.channel> | null = null;
    let subscribedUserId: string | null = null;

    const cleanupProfileChannel = () => {
      if (profileChannel) {
        const ch = profileChannel;
        profileChannel = null;
        subscribedUserId = null;
        supabase.removeChannel(ch);
      }
    };

    const verifyUserActiveStatus = async () => {
      const user = await getSessionUser();
      if (isCancelled || !user) return;

      const statusLower = await checkAccountStatus(user.id);
      if (isCancelled) return;

      if (statusLower === "inactive") {
        clearSessionGuardCache(user.id);
        await supabase.auth.signOut();
        if (pathnameRef.current !== "/auth") {
          navigateRef.current("/auth?mode=login&deactivated=true", { replace: true });
        }
      } else if (statusLower === "archived") {
        clearSessionGuardCache(user.id);
        await supabase.auth.signOut();
        if (pathnameRef.current !== "/auth") {
          navigateRef.current("/auth?mode=login&archived=true", { replace: true });
        }
      } else if (subscribedUserId !== user.id) {
        cleanupProfileChannel();
        subscribedUserId = user.id;
        profileChannel = supabase
          .channel(`profile-status-guard-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "profiles",
              filter: `id=eq.${user.id}`,
            },
            async (payload: any) => {
              const newStatus = (payload.new?.status || "").toLowerCase().trim();
              setCachedAccountStatus(user.id, newStatus);
              if (newStatus === "inactive") {
                clearSessionGuardCache(user.id);
                await supabase.auth.signOut();
                navigateRef.current("/auth?mode=login&deactivated=true", { replace: true });
              } else if (newStatus === "archived") {
                clearSessionGuardCache(user.id);
                await supabase.auth.signOut();
                navigateRef.current("/auth?mode=login&archived=true", { replace: true });
              }
            },
          )
          .subscribe();
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
        if (pathnameRef.current !== "/auth") {
          navigateRef.current("/auth?mode=reset", { replace: true });
        }
      } else if (event === "SIGNED_IN") {
        setTimeout(() => {
          if (!isCancelled) {
            verifyUserActiveStatus();
          }
        }, 0);
      } else if (event === "SIGNED_OUT") {
        clearSessionGuardCache();
        cleanupProfileChannel();
      }
    });

    return () => {
      isCancelled = true;
      subscription.unsubscribe();
      cleanupProfileChannel();
    };
  }, []);

  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <CMSProvider>
        <Router>
          <AuthRoutingHandler />
          <ScrollToTop />
          <div className="flex flex-col min-h-screen bg-rich-black transition-colors duration-300">
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
    </ThemeProvider>
  );
}
