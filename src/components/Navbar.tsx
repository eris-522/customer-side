import { motion, AnimatePresence } from "motion/react";
import { Menu as MenuIcon, X, Bell, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { NotificationCenter } from "./NotificationCenter";
import { AnnouncementBanner } from "./AnnouncementBanner";

export const navLinks = [
  { name: "Home", href: "/" },
  { name: "Menu", href: "/menu" },
  { name: "Packages", href: "/packages" },
  { name: "About", href: "/about" },
  { name: "FAQs", href: "/faqs" },
  { name: "Contact", href: "/contact" },
  { name: "Book", href: "/booking" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('read_notifs') || '[]');
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  });
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthPage = location.pathname === "/auth";
  const mode = new URLSearchParams(location.search).get("mode");

  const desktopNotifRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedDesktop = desktopNotifRef.current?.contains(target);
      const clickedMobile = mobileNotifRef.current?.contains(target);

      if (!clickedDesktop && !clickedMobile) {
        setIsNotifOpen(false);
      }
    };

    if (isNotifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotifOpen]);

  const getNotifKey = (b: any) => {
    if (b.notifKey) return b.notifKey;
    if (b.notifType === "logistics") {
      const travelFee = Number(b.logistics_info?.travelFee) || 0;
      const haulingFee = Number(b.logistics_info?.haulingFee) || 0;
      const logTimestamp = b.logistics_info?.updated_at || "";
      return `${b.id}-logistics-${travelFee}-${haulingFee}${logTimestamp ? `-${logTimestamp}` : ""}`;
    }
    return `${b.id}-${b.status}`;
  };
  const unreadCount = notifications.filter((b: any) => !readIds.includes(getNotifKey(b))).length;

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

    if (window.location.hash.includes("type=recovery") && window.location.pathname !== "/auth") {
      navigate(`/auth?mode=reset${window.location.hash}`, { replace: true });
    }

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/auth") {
          navigate("/auth?mode=reset", { replace: true });
        }
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription?.unsubscribe();
    };
  }, []);

  // Fetch updates related to the user's booking statuses
  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, status, cancelled_by, cancellation_reason, event_date, created_at, logistics_info, food_allergies, dish_substitutions, modification_requests, final_balance_status')
        .eq('user_id', user.id);
      
      if (data) {
        // Filter out bookings cancelled by the customer so they don't receive a notification for their own action
        const normalizedData = data.map((b: any) => {
          let logInfo = b.logistics_info;
          if ((!logInfo || Object.keys(logInfo).length === 0) && typeof b.food_allergies === 'string' && b.food_allergies.includes('__PAYMENT_METADATA__:')) {
            try {
              const parsed = JSON.parse(b.food_allergies.split('__PAYMENT_METADATA__:')[1]);
              if (parsed?.logistics) logInfo = parsed.logistics;
              else if (parsed?.logistics_info) logInfo = parsed.logistics_info;
            } catch {}
          }
          return { ...b, logistics_info: logInfo };
        });

        const expandedNotifications: any[] = [];

        normalizedData.forEach((b: any) => {
          const isCustomerCancelled = b.status === 'Cancelled' && b.cancelled_by === 'Customer';
          const isStatusNotif =
            !isCustomerCancelled &&
            ['Confirmed', 'Accepted', 'Approved', 'Cancelled', 'Declined', 'Rejected'].includes(b.status);

          if (isStatusNotif) {
            const statusTime =
              b.logistics_info?.confirmed_at ||
              b.created_at;
            expandedNotifications.push({
              ...b,
              notifType: 'status',
              notifKey: `${b.id}-${b.status}`,
              notifTimestamp: statusTime,
            });
          }

          const travelFee = Number(b.logistics_info?.travelFee) || 0;
          const haulingFee = Number(b.logistics_info?.haulingFee) || 0;
          const logTimestamp = b.logistics_info?.updated_at || '';
          const hasLogisticsUpdate = Boolean(logTimestamp || travelFee > 0 || haulingFee > 0);

          if (hasLogisticsUpdate && !isCustomerCancelled) {
            expandedNotifications.push({
              ...b,
              notifType: 'logistics',
              notifKey: `${b.id}-logistics-${travelFee}-${haulingFee}${logTimestamp ? `-${logTimestamp}` : ''}`,
              notifTimestamp: logTimestamp || b.created_at,
            });
          }

          // Check for dish substitutions sent by Coordinator
          if (Array.isArray(b.dish_substitutions) && b.dish_substitutions.length > 0 && !isCustomerCancelled) {
            b.dish_substitutions.forEach((sub: any) => {
              const subKey = `${b.id}-sub-${sub.id || sub.substituted_at || sub.original_dish}`;
              expandedNotifications.push({
                ...b,
                notifType: 'substitution',
                notifKey: subKey,
                notifTimestamp: sub.substituted_at || b.created_at,
                original_dish: sub.original_dish,
                replacement_dish: sub.replacement_dish,
                subReason: sub.reason,
                subNote: sub.client_note,
              });
            });
          }

          // Check for modification requests reviewed/acknowledged or reverted by Coordinator
          if (Array.isArray(b.modification_requests) && b.modification_requests.length > 0 && !isCustomerCancelled) {
            b.modification_requests.forEach((mod: any) => {
              if (mod.status === 'Approved' || mod.status === 'Rejected') {
                const modKey = `${b.id}-mod-${mod.id}-${mod.status}`;
                expandedNotifications.push({
                  ...b,
                  notifType: 'modification',
                  notifKey: modKey,
                  notifTimestamp: mod.reviewed_at || mod.created_at || b.created_at,
                  modStatus: mod.status,
                  modReason: mod.review_note || '',
                });
              }
            });
          }

          // Check for final balance verification by Coordinator
          if (b.final_balance_status === 'Verified' && !isCustomerCancelled) {
            expandedNotifications.push({
              ...b,
              notifType: 'balance_verified',
              notifKey: `${b.id}-balance-verified`,
              notifTimestamp: b.logistics_info?.updated_at || b.created_at,
            });
          }
        });

        // Sort primarily by the most recent update so new confirmations sit at the top
        const sorted = expandedNotifications.sort((a: any, b: any) => {
          const timeA = new Date(a.notifTimestamp || a.created_at || 0).getTime();
          const timeB = new Date(b.notifTimestamp || b.created_at || 0).getTime();
          return timeB - timeA;
        });
        setNotifications(sorted);
      }
    };
    fetchNotifications();

    // Fast lightweight polling (6s) when visible so Admin updates reflect even if WebSocket reconnects
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    }, 6000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };
    const handleLocalBookingSync = () => fetchNotifications();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleLocalBookingSync);
    window.addEventListener('customerBookingsUpdated', handleLocalBookingSync);

    // Real-time subscription to catch instant Admin updates or status changes
    const channelName = `user-bookings-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` }, () => {
        fetchNotifications();
        window.dispatchEvent(new CustomEvent('bookingsRealtimeUpdated'));
      })
      .subscribe();

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleLocalBookingSync);
      window.removeEventListener('customerBookingsUpdated', handleLocalBookingSync);
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
  };

  const handleDismissNotif = (id: string) => {
    setReadIds(prev => {
      if (prev.includes(id)) return prev;
      const newIds = [...prev, id];
      localStorage.setItem('read_notifs', JSON.stringify(newIds));
      return newIds;
    });
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex flex-col pointer-events-none">
        <div className="pointer-events-auto w-full">
          <AnnouncementBanner />
        </div>
        <nav 
          className={`w-full transition-all duration-500 h-16 flex items-center pointer-events-auto ${
            isScrolled ? "glass-card border-b border-white/10 shadow-md backdrop-blur-md" : "bg-transparent"
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
                    <div className="relative inline-block align-middle mr-2 mt-1" ref={desktopNotifRef}>
                      <button onClick={handleNotifClick} className="text-white/70 hover:text-gold-400 transition-colors relative flex items-center justify-center p-2">
                        <Bell size={20} />
                        {unreadCount > 0 && (
                          <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                      <NotificationCenter 
                        isOpen={isNotifOpen} 
                        onClose={() => setIsNotifOpen(false)} 
                        notifications={notifications} 
                        unreadCount={unreadCount} 
                        readIds={readIds}
                        onDismiss={handleDismissNotif}
                      />
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
                  <div className="flex items-center gap-4 ml-4">
                    <Link
                      to="/auth?mode=login"
                      className={`text-base tracking-wide font-bold transition-colors ${
                        isLoginActive
                          ? "gold-gradient text-black px-6 py-2 shadow-lg"
                          : "text-white/90 hover:text-gold-400"
                      }`}
                    >
                      Login
                    </Link>
                    <Link
                      to="/auth?mode=signup"
                      className={`text-base tracking-wide font-bold transition-all ${
                        isSignupActive
                          ? "gold-gradient text-black px-6 py-2 shadow-lg hover:brightness-110"
                          : "text-white/90 hover:text-gold-400"
                      }`}
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </motion.div>
            </div>

            <div className="flex items-center gap-5 lg:hidden">
              {user && (
                <div className="relative" ref={mobileNotifRef}>
                  <button onClick={handleNotifClick} className="text-gold-400 transition-colors relative flex items-center justify-center p-1">
                    <Bell size={22} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  <NotificationCenter 
                    isOpen={isNotifOpen} 
                    onClose={() => setIsNotifOpen(false)} 
                    notifications={notifications} 
                    unreadCount={unreadCount} 
                    readIds={readIds}
                    onDismiss={handleDismissNotif}
                  />
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
      </header>

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
