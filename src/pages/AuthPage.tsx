import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, User, ArrowRight, ChevronLeft } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

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
              {isLogin ? "Welcome" : "Create"} <span className="italic gold-text-gradient">{isLogin ? "Back" : "Account"}</span>
            </h1>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-semibold">
              {isLogin ? "Sign in to manage your bookings." : "Join us for exquisite event planning."}
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
              onSubmit={(e) => e.preventDefault()}
            >
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold ml-1">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-400 transition-colors" size={16} />
                    <input 
                      type="text" 
                      placeholder="Your Name"
                      className="w-full bg-white/5 border border-white/10 px-12 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all placeholder:text-white/10"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-400 transition-colors" size={16} />
                  <input 
                    type="email" 
                    placeholder="you@email.com"
                    className="w-full bg-white/5 border border-white/10 px-12 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all placeholder:text-white/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">Password</label>
                  {isLogin && (
                    <button className="text-[8px] uppercase tracking-[0.2em] text-gold-400/60 hover:text-gold-400 font-bold transition-colors">Forgot?</button>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-400 transition-colors" size={16} />
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 px-12 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all placeholder:text-white/10"
                  />
                </div>
              </div>

              <button className="w-full gold-gradient text-black py-4 font-bold tracking-[0.3em] uppercase text-[10px] hover:brightness-110 transition-all flex items-center justify-center gap-2 mt-8">
                {isLogin ? "Sign In" : "Register"} <ArrowRight size={14} />
              </button>
            </motion.form>
          </AnimatePresence>

          <div className="mt-10 pt-10 border-t border-white/5 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-semibold mb-2">
              {isLogin ? "Don't have an account?" : "Already a member?"}
            </p>
            <button 
              onClick={() => setIsLogin(!isLogin)}
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
