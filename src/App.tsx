/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { ScrollToTop } from "./components/ScrollToTop";
import { CMSProvider } from "./context/CMSContext";

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

export default function App() {
  return (
    <CMSProvider>
      <Router>
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
