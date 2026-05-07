import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { Mail, Lock, User, ArrowRight, ChevronLeft } from "lucide-react";
import { supabase } from "../utils/supabase";

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      // If already signed in, skip auth page
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        navigate("/booking");
        return;
      }

      // Support query param mode=login|signup for the toggle button
      const mode = searchParams.get("mode");
      setIsLogin(mode !== "signup");
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) {
          setError(error.message);
        } else {
          setMessage("Login successful.");
          setEmail("");
          setPassword("");
          navigate("/booking");
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) {
          setError(error.message);
        } else {
          setMessage(
            "Registration successful! You can now log in to book your event.",
          );
          setIsLogin(true);
          setPassword("");
        }
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-rich-black flex items-center justify-center p-6 pt-24 font-sans text-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gold-400 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-gold-400 blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-gold-400 transition-colors mb-12 font-bold"
        >
          <ChevronLeft size={14} /> Back to Home
        </Link>

        <div className="glass-card border border-white/10 p-10 md:p-12 relative">
          <div className="absolute top-0 left-0 w-1 h-12 bg-gold-400" />

          <div className="mb-10">
            <h1 className="text-4xl font-serif mb-2">
              {isLogin ? "Welcome" : "Create"}{" "}
              <span className="italic gold-text-gradient">
                {isLogin ? "Back" : "Account"}
              </span>
            </h1>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-semibold">
              {isLogin
                ? "Sign in to manage your bookings."
                : "Join us for exquisite event planning."}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={isLogin ? "login" : "signup"}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
              onSubmit={handleSubmit}
            >
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold ml-1">
                    Full Name
                  </label>
                  <div className="relative group">
                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-400 transition-colors"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required={!isLogin}
                      className="w-full bg-white/5 border border-white/10 px-12 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all placeholder:text-white/10"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold ml-1">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-400 transition-colors"
                    size={16}
                  />
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 px-12 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all placeholder:text-white/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">
                    Password
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      className="text-[8px] uppercase tracking-[0.2em] text-gold-400/60 hover:text-gold-400 font-bold transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-400 transition-colors"
                    size={16}
                  />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 px-12 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all placeholder:text-white/10"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                  {error}
                </div>
              )}
              {message && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs text-center">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full gold-gradient text-black py-4 font-bold tracking-[0.3em] uppercase text-[10px] hover:brightness-110 transition-all flex items-center justify-center gap-2 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : isLogin ? "Sign In" : "Register"}{" "}
                <ArrowRight size={14} />
              </button>
            </motion.form>
          </AnimatePresence>

          <div className="mt-10 pt-10 border-t border-white/5 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-semibold mb-2">
              {isLogin ? "Don't have an account?" : "Already a member?"}
            </p>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setMessage("");
              }}
              className="text-[11px] uppercase tracking-[0.3em] text-gold-400 font-bold hover:text-white transition-colors"
            >
              {isLogin ? "Create Account" : "Back to Sign In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
