import { motion, AnimatePresence } from "motion/react";
import { Menu as MenuIcon, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";

export const navLinks = [

  { name: "Home", href: "/" },
  { name: "Menu", href: "/menu" },
  { name: "Packages", href: "/packages" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
  { name: "Book", href: "/booking" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthPage = location.pathname === "/auth";
  const mode = new URLSearchParams(location.search).get("mode");

  // Determine which button should have the "active" (gold) style.
  // On the auth page, the active button matches the current mode (login vs signup).
  // On other pages, "Sign Up" is the default primary call-to-action.
  const isLoginActive = isAuthPage && mode !== "signup";
  const isSignupActive = !isAuthPage || (isAuthPage && mode === "signup");


  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;
      setUser(data.user ?? null);
    };

    initAuth();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription?.unsubscribe();
    };
  }, []);


  const handleLogout = async () => {
    const confirmed = window.confirm(
      user?.email
        ? `Log out ${user.email}? This will end your session.`
        : "Are you sure you want to log out? This will end your session.",
    );
    if (!confirmed) return;

    await supabase.auth.signOut();
    navigate("/");
  };



  return (
    <>
      <nav 
        className={`fixed w-full z-50 transition-all duration-500 h-16 flex items-center ${
          isScrolled ? "glass-card border-b border-white/10" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto w-full px-10 flex justify-between items-center">

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link to="/" className="flex flex-col">
              <span className="text-xl font-serif tracking-[0.2em] text-gold-400 font-bold uppercase">ROXAN POLICARPIO</span>
            <span className="text-sm tracking-wide text-gold-300/90 -mt-1 font-semibold">Events & Catering</span>
            </Link>
          </motion.div>

          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link, i) => (
              <motion.div
                key={link.name}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to={link.href}
                className={`text-base tracking-wide font-semibold transition-colors ${
                    location.pathname === link.href ? "text-gold-400" : "text-white/70 hover:text-gold-400"
                  }`}
                >
                  {link.name}
                </Link>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={handleLogout}
                  className="ml-4 px-5 py-2 border border-white/10 text-white/90 text-base tracking-wide font-bold hover:border-gold-400 hover:text-gold-400 transition-all inline-block"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/auth?mode=login"
                  className={`ml-4 px-5 py-2 border text-base tracking-wide font-bold transition-all inline-block ${
                      isLoginActive
                        ? "border-gold-400 text-gold-400 hover:bg-gold-400 hover:text-black"
                      : "border-white/10 text-white/90 hover:border-gold-400 hover:text-gold-400"
                    }`}
                  >
                    Login
                  </Link>
                  <Link
                    to="/auth?mode=signup"
                  className={`ml-4 px-5 py-2 border text-base tracking-wide font-bold transition-all inline-block ${
                      isSignupActive
                        ? "border-gold-400 text-gold-400 hover:bg-gold-400 hover:text-black"
                      : "border-white/10 text-white/90 hover:border-gold-400 hover:text-gold-400"
                    }`}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </motion.div>

          </div>

          <button 
            className="lg:hidden text-gold-400"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <MenuIcon size={20} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            className="fixed inset-0 z-[60] bg-rich-black flex flex-col p-8"
          >
            <div className="flex justify-end">
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gold-400">
                <X size={32} />
              </button>
            </div>
            <div className="flex flex-col space-y-8 mt-12 text-center">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-4xl font-serif gold-text-gradient italic"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}

              {user ? (
                <Link
                  to="/booking"
                  className="text-4xl font-serif text-gold-400 italic"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Booking
                </Link>
              ) : (
                <>
                  <Link
                    to="/auth?mode=login"
                    className={`text-4xl font-serif italic transition-colors ${
                      isLoginActive
                        ? "text-gold-400"
                        : "text-white/70 hover:text-gold-400"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/auth?mode=signup"
                    className={`text-4xl font-serif italic transition-colors ${
                      isSignupActive
                        ? "text-gold-400"
                        : "text-white/70 hover:text-gold-400"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
