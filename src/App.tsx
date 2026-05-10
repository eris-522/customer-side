/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from "./utils/supabase";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import MenuPage from "./pages/MenuPage";
import PackagesPage from "./pages/PackagesPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import AuthPage from "./pages/AuthPage";
import BookingPage from "./pages/BookingPage";
import MyInquiriesPage from "./pages/MyInquiriesPage";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { ScrollToTop } from "./components/ScrollToTop";

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen bg-rich-black">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/packages" element={<PackagesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/my-inquiries" element={<MyInquiriesPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
