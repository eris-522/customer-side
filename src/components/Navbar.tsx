import { motion, AnimatePresence } from "motion/react";
import { Menu as MenuIcon, X, Bell, ChevronDown } from "lucide-react";
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
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

  // Helper to format timestamps so the user knows exactly when the update occurred
  const formatNotifDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  // Fetch updates related to the user's booking statuses
  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['Confirmed', 'Accepted', 'Approved', 'Cancelled', 'Declined', 'Rejected']);
      
      if (data) {
        // Sort primarily by the most recent update so new confirmations sit at the top
        const sorted = data.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
        const readIds = JSON.parse(localStorage.getItem('read_notifs') || '[]');
        setNotifications(sorted);
        setUnreadCount(sorted.filter((b: any) => !readIds.includes(b.id)).length);
      }
    };
    fetchNotifications();

    // Real-time subscription to catch instant status changes pushed by the admin
    const channel = supabase
      .channel('user-bookings-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);


  const handleLogoutClick = () => {
    setIsMobileMenuOpen(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleNotifClick = () => {
    setIsNotifOpen(!isNotifOpen);
    if (!isNotifOpen && unreadCount > 0) {
      const readIds = notifications.map(n => n.id);
      localStorage.setItem('read_notifs', JSON.stringify(readIds));
      setUnreadCount(0);
    }
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
                {link.name === "Book" && user ? (
                  <div className="relative group">
                    <Link
                      to="/booking"
                      className={`text-base tracking-wide font-semibold transition-colors flex items-center gap-1 ${
                        location.pathname.includes("/booking") || location.pathname.includes("/my-inquiries") ? "text-gold-400" : "text-white/70 hover:text-gold-400"
                      }`}
                    >
                      Book <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-300" />
                    </Link>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 pt-6 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top translate-y-2 group-hover:translate-y-0 z-50">
                      <div className="glass-card border border-white/10 py-2 w-48 flex flex-col gap-1 shadow-2xl">
                        <Link to="/booking" className="px-4 py-2 text-sm font-semibold tracking-wide text-white/70 hover:text-gold-400 hover:bg-white/5 transition-colors text-left">New Booking</Link>
                        <Link to="/my-inquiries" className="px-4 py-2 text-sm font-semibold tracking-wide text-white/70 hover:text-gold-400 hover:bg-white/5 transition-colors text-left">My Inquiries</Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    to={link.href}
                  className={`text-base tracking-wide font-semibold transition-colors ${
                      location.pathname === link.href ? "text-gold-400" : "text-white/70 hover:text-gold-400"
                    }`}
                  >
                    {link.name}
                  </Link>
                )}
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {user ? (
                <>
                  <div className="relative inline-block align-middle mr-2 mt-1">
                    <button onClick={handleNotifClick} className="text-white/70 hover:text-gold-400 transition-colors relative flex items-center justify-center p-2">
                      <Bell size={20} />
                      {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    <AnimatePresence>
                      {isNotifOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 mt-4 w-80 glass-card border border-white/10 shadow-2xl z-[100] max-h-[400px] overflow-y-auto"
                        >
                          <div className="p-4 border-b border-white/10 sticky top-0 bg-[#070707] z-10 text-left">
                            <h3 className="font-serif text-lg text-gold-400 italic">Notifications</h3>
                          </div>
                          <div className="flex flex-col bg-rich-black text-left">
                            {notifications.length === 0 ? (
                              <div className="p-10 text-center flex flex-col items-center">
                                <Bell className="text-white/10 mb-4" size={32} />
                                <p className="text-white/40 text-sm font-medium">No updates right now.</p>
                              </div>
                            ) : (
                              notifications.map(notif => {
                                const isCancelled = ['Cancelled', 'Declined', 'Rejected'].includes(notif.status);
                                const reason = notif.reason || notif.reject_reason || notif.cancellation_reason || notif.admin_notes;
                                return (
                                  <div key={notif.id} className="p-4 border-b border-white/10 hover:bg-white/5 transition-colors text-left">
                                    <div className="flex justify-between items-start mb-1 gap-2">
                                      <p className="text-sm text-white/90 font-semibold">
                                        Booking for {notif.event_date} was <span className={isCancelled ? "text-red-400" : "text-green-400"}>{notif.status}</span>.
                                      </p>
                                      <span className="text-[10px] text-white/40 whitespace-nowrap mt-1">{formatNotifDate(notif.updated_at || notif.created_at)}</span>
                                    </div>
                                    {isCancelled && reason && (
                                      <p className="text-xs text-white/60 mt-2 bg-red-400/10 p-2 border border-red-400/20 rounded-sm">
                                        <span className="font-bold text-red-400">Reason:</span> {reason}
                                      </p>
                                    )}
                                    {!isCancelled && (notif.status === 'Confirmed' || notif.status === 'Accepted' || notif.status === 'Approved') && (
                                      <p className="text-xs text-white/60 mt-2">
                                        We're excited to host your event! We will be in touch shortly.
                                      </p>
                                    )}
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogoutClick}
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

          <div className="flex items-center gap-5 lg:hidden">
            {user && (
              <div className="relative">
                <button onClick={handleNotifClick} className="text-gold-400 transition-colors relative flex items-center justify-center p-1">
                  <Bell size={22} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {isNotifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-4 w-72 glass-card border border-white/10 shadow-2xl z-[100] max-h-[350px] overflow-y-auto"
                    >
                      <div className="p-4 border-b border-white/10 sticky top-0 bg-[#070707] z-10 text-left">
                        <h3 className="font-serif text-lg text-gold-400 italic">Notifications</h3>
                      </div>
                      <div className="flex flex-col bg-rich-black text-left">
                        {notifications.length === 0 ? (
                          <div className="p-10 text-center flex flex-col items-center">
                            <Bell className="text-white/10 mb-4" size={32} />
                            <p className="text-white/40 text-sm font-medium">No updates right now.</p>
                          </div>
                        ) : (
                          notifications.map(notif => {
                            const isCancelled = ['Cancelled', 'Declined', 'Rejected'].includes(notif.status);
                            const reason = notif.reason || notif.reject_reason || notif.cancellation_reason || notif.admin_notes;
                            return (
                              <div key={notif.id} className="p-4 border-b border-white/10 hover:bg-white/5 transition-colors">
                                <div className="flex justify-between items-start mb-1 gap-2">
                                  <p className="text-sm text-white/90 font-semibold">
                                    Booking for {notif.event_date} was <span className={isCancelled ? "text-red-400" : "text-green-400"}>{notif.status}</span>.
                                  </p>
                                  <span className="text-[10px] text-white/40 whitespace-nowrap mt-1">{formatNotifDate(notif.updated_at || notif.created_at)}</span>
                                </div>
                                {isCancelled && reason && (
                                  <p className="text-xs text-white/60 mt-2 bg-red-400/10 p-2 border border-red-400/20 rounded-sm">
                                    <span className="font-bold text-red-400">Reason:</span> {reason}
                                  </p>
                                )}
                                {!isCancelled && (notif.status === 'Confirmed' || notif.status === 'Accepted' || notif.status === 'Approved') && (
                                  <p className="text-xs text-white/60 mt-2">
                                    We're excited to host your event! We will be in touch shortly.
                                  </p>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <button 
              className="text-gold-400"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <MenuIcon size={24} />
            </button>
          </div>
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
              {navLinks.map((link) => {
                if (link.name === "Book" && user) {
                  return (
                    <div key={link.name} className="flex flex-col space-y-4 items-center">
                      <Link
                        to="/booking"
                        className="text-4xl font-serif text-gold-400 italic"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Book Event
                      </Link>
                      <Link
                        to="/my-inquiries"
                        className="text-2xl font-serif text-white/70 hover:text-gold-400 italic transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        My Inquiries
                      </Link>
                    </div>
                  );
                }
                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="text-4xl font-serif gold-text-gradient italic"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                );
              })}

              {user ? (
                <>
                  <button
                    onClick={handleLogoutClick}
                    className="text-4xl font-serif text-white/70 hover:text-gold-400 italic transition-colors"
                  >
                    Logout
                  </button>
                </>
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

      {/* Custom Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card border border-white/10 p-8 max-w-sm w-full text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gold-400" />
              <h3 className="text-3xl font-serif text-white mb-2 italic">Confirm <span className="gold-text-gradient">Logout</span></h3>
              <p className="text-sm text-white/60 mb-8 font-medium leading-relaxed">
                {user?.email
                  ? `Log out ${user.email}? This will end your current session.`
                  : "Are you sure you want to log out? This will end your current session."}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-all text-sm font-bold tracking-wide"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 py-3 gold-gradient text-black font-bold tracking-wide text-sm hover:brightness-110 transition-all"
                >
                  Log Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
