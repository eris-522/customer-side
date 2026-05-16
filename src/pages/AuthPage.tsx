import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ChevronLeft,
  ShieldQuestion,
  Phone,
} from "lucide-react";
import { supabase } from "../utils/supabase";

// Helper function to calculate edit distance between two strings
const getLevenshteinDistance = (a: string, b: string): number => {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const arr = [];
  for (let i = 0; i <= b.length; i++) {
    arr[i] = [i];
    for (let j = 1; j <= a.length; j++) {
      arr[i][j] =
        i === 0
          ? j
          : Math.min(
              arr[i - 1][j] + 1,
              arr[i][j - 1] + 1,
              arr[i - 1][j - 1] + (a[j - 1] === b[i - 1] ? 0 : 1),
            );
    }
  }
  return arr[b.length][a.length];
};

const validateEmailFormat = (email: string): string => {
  const trimmed = email.trim();
  if (!trimmed) return "";

  // Enforce common, valid Top-Level Domains (TLDs) to block joke/invalid ones
  const emailRegex =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|net|org|edu|gov|ph|co|uk|us|ca|au|nz|sg|in|io|me|tv|app|dev|tech)$/i;
  if (!emailRegex.test(trimmed)) {
    return "Please enter a valid email address (e.g., @gmail.com, @yahoo.com).";
  }

  // Smart typo detection for major email providers using Levenshtein distance
  const domain = trimmed.split("@")[1]?.toLowerCase();
  if (domain) {
    // Whitelist valid domains that are intentionally spelled similarly to major ones to prevent false positives
    const exactMatches = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "ymail.com",
      "mail.com",
      "email.com",
      "live.com",
      "icloud.com",
      "yahoo.com.ph",
    ];
    const providersToCheck = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
    ];

    if (!exactMatches.includes(domain)) {
      for (const provider of providersToCheck) {
        // If the distance is 2 or less, it's highly likely a typo (e.g., "gemail.cum" -> "gmail.com" is distance 2)
        if (getLevenshteinDistance(domain, provider) <= 2) {
          return `Did you mean @${provider}? Please check your email domain for typos.`;
        }
      }
    }
  }

  return "";
};

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Security question fields
  const [securityAnswer, setSecurityAnswer] = useState("");

  // Forgot password flow
  const [forgotPasswordStep, setForgotPasswordStep] = useState<
    "none" | "email" | "question" | "reset"
  >("none");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryAnswer, setRecoveryAnswer] = useState("");
  const [fetchedAnswer, setFetchedAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<React.ReactNode>("");
  const [emailError, setEmailError] = useState("");
  const [recoveryEmailError, setRecoveryEmailError] = useState("");

  useEffect(() => {
    // Listen for password recovery redirect from email links
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setForgotPasswordStep("reset");
        setIsLogin(true);
      }
    });

    const init = async () => {
      // Check if we are currently in a recovery flow
      if (window.location.hash.includes("type=recovery")) {
        setForgotPasswordStep("reset");
        return;
      }

      // If already signed in, skip auth page
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        navigate("/booking");
        return;
      }
    };

    init();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    // Update display mode whenever the URL parameters change
    const mode = searchParams.get("mode");
    setIsLogin(mode !== "signup");
    setForgotPasswordStep("none");
    setEmailError("");
    setRecoveryEmailError("");
  }, [searchParams]);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (forgotPasswordStep === "email") {
        const currentRecoveryEmail = recoveryEmail.trim();
        const emailValidationErr = validateEmailFormat(currentRecoveryEmail);
        if (emailValidationErr) {
          setError(emailValidationErr);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("security_answer")
          .eq("email", currentRecoveryEmail)
          .single();

        if (error || !data) {
          setError("Account not found.");
        } else if (!data.security_answer) {
          setError("No security question set up for this account.");
        } else {
          setFetchedAnswer(data.security_answer);
          setForgotPasswordStep("question");
        }
      } else if (forgotPasswordStep === "question") {
        if (recoveryAnswer.toLowerCase().trim() === fetchedAnswer) {
          // Send the recovery email instead of skipping directly to reset
          const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
            redirectTo: `${window.location.origin}/auth?mode=login`,
          });

          if (error) {
            setError(`Failed to send reset email: ${error.message}`);
          } else {
            setMessage("Security answer correct! We've sent a password reset link to your email. Please click the link to continue.");
          }
        } else {
          setError("Incorrect answer.");
        }
      } else if (forgotPasswordStep === "reset") {
        // After clicking the email link, a recovery session is established, allowing updateUser to succeed.
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) {
          setError(
            `Supabase Error: ${error.message}. (Please ensure you clicked the reset link from your email.)`,
          );
        } else {
          setMessage("Password reset successful. You can now log in.");
          await supabase.auth.signOut(); // Sign out the recovery session
          setForgotPasswordStep("none");
          setIsLogin(true);
          setSearchParams({ mode: "login" });
          setRecoveryEmail("");
          setRecoveryAnswer("");
          setNewPassword("");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const currentEmail = email.trim();

    try {
      const emailValidationErr = validateEmailFormat(currentEmail);
      if (emailValidationErr) {
        setError(emailValidationErr);
        return;
      }

      if (isLogin) {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: currentEmail,
          password: password,
        });

        if (error) {
          setError(error.message);
        } else if (authData.user) {
          // Check if the user's account has been archived by the admin
          const { data: profile } = await supabase
            .from("profiles")
            .select("status")
            .eq("id", authData.user.id)
            .single();

          if (profile?.status === "Archived") {
            await supabase.auth.signOut();
            setError(
              <span>
                Your account has been archived. Please contact support at{" "}
                <a href="mailto:rpcateringsupport@gmail.com" className="underline hover:text-red-300 transition-colors">
                  rpcateringsupport@gmail.com
                </a>{" "}
                or +63 921 469 7142.
              </span>
            );
            return;
          }

          setMessage("Login successful.");
          setEmail("");
          setPassword("");
          navigate("/booking");
        }
      } else {
        if (!fullName.trim()) {
          setError("Full name is required.");
          return;
        }

        if (!/^[a-zA-Z\s]+$/.test(fullName)) {
          setError("Full name must not contain special characters or numbers.");
          return;
        }

        if (phoneNumber.length !== 10) {
          setError("Phone number must be exactly 10 digits.");
          return;
        }

        // Security answer validation: must contain at least one number and one special character
        const hasNumber = /[0-9]/.test(securityAnswer);
        const hasSpecialChar = /[^a-zA-Z0-9\s]/.test(securityAnswer);
        if (!hasNumber || !hasSpecialChar) {
          setError(
            "Security answer must contain at least one number and one special character.",
          );
          return;
        }

        // Validate that the base word is a recognized color
        const lettersOnly = securityAnswer
          .replace(/[^a-zA-Z]/g, "")
          .toLowerCase();
        const validColors = [
          "red",
          "blue",
          "green",
          "yellow",
          "orange",
          "purple",
          "pink",
          "brown",
          "black",
          "white",
          "gray",
          "grey",
          "silver",
          "gold",
          "cyan",
          "magenta",
          "maroon",
          "olive",
          "teal",
          "navy",
          "indigo",
          "violet",
          "peach",
          "crimson",
          "coral",
          "lavender",
          "turquoise",
          "aquamarine",
          "beige",
          "khaki",
          "plum",
          "orchid",
          "salmon",
        ];

        // Support optional prefixes for compound colors (e.g., "lightblue" -> "blue")
        let colorToMatch = lettersOnly;
        const colorPrefixes = [
          "light",
          "dark",
          "pale",
          "deep",
          "bright",
          "neon",
          "hot",
          "pastel",
        ];
        for (const prefix of colorPrefixes) {
          if (colorToMatch.startsWith(prefix)) {
            colorToMatch = colorToMatch.slice(prefix.length);
            break; // Only strip one prefix
          }
        }

        if (
          !validColors.includes(colorToMatch) &&
          !validColors.includes(lettersOnly)
        ) {
          setError(
            "Security answer must be a valid color (e.g., 'red', 'light blue') combined with a number and special character (e.g., Blue1!).",
          );
          return;
        }

        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email: currentEmail,
            password: password,
          },
        );

        if (authError) {
          setError(authError.message);
        } else if (authData.user) {
          // Sync display name to profiles table (BookingPage reads `profiles.name`)
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
              {
                id: authData.user.id,
                name: fullName,
                email: currentEmail,
                security_answer: securityAnswer.toLowerCase().trim(),
                phone_number: phoneNumber ? `+63${phoneNumber}` : "",
              },
              { onConflict: "id" },
            );

          if (profileError) {
            setError(`Error saving profile: ${profileError.message}`);
            return;
          }

          setMessage(
            "Registration successful! You can now log in to book your event.",
          );
          setIsLogin(true);
          setSearchParams({ mode: "login" });
          setPassword("");
          setPhoneNumber("");
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
          className="inline-flex items-center gap-2 text-base tracking-wide text-white/80 hover:text-gold-400 transition-colors mb-12 font-bold"
        >
          <ChevronLeft size={14} /> Back to Home
        </Link>

        <div className="glass-card border border-white/10 p-10 md:p-12 relative">
          <div className="absolute top-0 left-0 w-1 h-12 bg-gold-400" />

          <div className="mb-10">
            <h1 className="text-4xl font-serif mb-2">
              {forgotPasswordStep !== "none"
                ? "Reset"
                : isLogin
                  ? "Welcome"
                  : "Create"}{" "}
              <span className="italic gold-text-gradient">
                {forgotPasswordStep !== "none"
                  ? "Password"
                  : isLogin
                    ? "Back"
                    : "Account"}
              </span>
            </h1>
            <p className="text-base text-white/80 font-semibold">
              {forgotPasswordStep !== "none"
                ? "Recover your account access securely."
                : isLogin
                  ? "Sign in to manage your bookings."
                  : "Join us for exquisite event planning."}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {forgotPasswordStep === "none" ? (
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
                  <>
                    <div className="space-y-2">
                      <label className="text-base text-white/80 font-bold ml-1">
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
                          className="w-full bg-white/5 border border-white/10 px-12 py-4 text-lg focus:outline-none focus:border-gold-400/50 transition-all placeholder:text-white/40"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-base text-white/80 font-bold ml-1">
                        Phone number
                      </label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                          <span role="img" aria-label="Philippines">
                            🇵🇭
                          </span>
                          <span className="text-white/60 font-medium group-focus-within:text-gold-400 transition-colors">
                            +63
                          </span>
                        </div>
                        <input
                          type="tel"
                          placeholder="917 123 4567"
                          value={phoneNumber}
                          onChange={(e) => {
                            const val = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 10);
                            setPhoneNumber(val);
                          }}
                          required={!isLogin}
                          className="w-full bg-white/5 border border-white/10 pl-24 pr-4 py-4 text-lg focus:outline-none focus:border-gold-400/50 transition-all placeholder:text-white/40"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-base text-white/80 font-bold ml-1">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail
                      className={`absolute left-4 top-1/2 -translate-y-1/2 ${emailError ? "text-red-400" : "text-white/20 group-focus-within:text-gold-400"} transition-colors`}
                      size={16}
                    />
                    <input
                      type="email"
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) {
                          const err = validateEmailFormat(e.target.value);
                          if (!err) setEmailError("");
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value) {
                          setEmailError(validateEmailFormat(e.target.value));
                        } else {
                          setEmailError("");
                        }
                      }}
                      required
                      className={`w-full bg-white/5 border ${emailError ? "border-red-500/50 focus:border-red-500/50" : "border-white/10 focus:border-gold-400/50"} px-12 py-4 text-lg focus:outline-none transition-all placeholder:text-white/40`}
                    />
                  </div>
                  {emailError && (
                    <p className="text-red-400 text-sm mt-1 ml-1">
                      {emailError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-base text-white/80 font-bold">
                      Password
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => {
                          setForgotPasswordStep("email");
                          setError("");
                          setMessage("");
                          setEmailError("");
                          setRecoveryEmailError("");
                        }}
                        className="text-sm tracking-wide text-gold-400/80 hover:text-gold-400 font-bold transition-colors"
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
                      className="w-full bg-white/5 border border-white/10 px-12 py-4 text-lg focus:outline-none focus:border-gold-400/50 transition-all placeholder:text-white/40"
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-base text-white/80 font-bold ml-1 flex flex-col gap-1">
                      <span>
                        Security Question: What is your favorite color?
                      </span>
                      <span className="text-sm text-gold-400/90 normal-case tracking-normal">
                        Must be a valid color (e.g. red, light blue), including
                        at least one number and one special character.
                      </span>
                    </label>
                    <div className="relative group">
                      <ShieldQuestion
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-400 transition-colors"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Your Answer"
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                        required={!isLogin}
                        className="w-full bg-white/5 border border-white/10 px-12 py-4 text-lg focus:outline-none focus:border-gold-400/50 transition-all placeholder:text-white/40"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-base text-center font-medium">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-base text-center font-medium">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !!emailError}
                  className="w-full gold-gradient text-black py-4 font-bold tracking-wide text-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing..." : isLogin ? "Sign In" : "Register"}{" "}
                  <ArrowRight size={14} />
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
                onSubmit={handleForgotSubmit}
              >
                {forgotPasswordStep === "email" && (
                  <div className="space-y-2">
                    <label className="text-base text-white/80 font-bold ml-1">
                      Account Email
                    </label>
                    <div className="relative group">
                      <Mail
                        className={`absolute left-4 top-1/2 -translate-y-1/2 ${recoveryEmailError ? "text-red-400" : "text-white/20 group-focus-within:text-gold-400"} transition-colors`}
                        size={16}
                      />
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={recoveryEmail}
                        onChange={(e) => {
                          setRecoveryEmail(e.target.value);
                          if (recoveryEmailError) {
                            const err = validateEmailFormat(e.target.value);
                            if (!err) setRecoveryEmailError("");
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value) {
                            setRecoveryEmailError(
                              validateEmailFormat(e.target.value),
                            );
                          } else {
                            setRecoveryEmailError("");
                          }
                        }}
                        required
                        className={`w-full bg-white/5 border ${recoveryEmailError ? "border-red-500/50 focus:border-red-500/50" : "border-white/10 focus:border-gold-400/50"} px-12 py-4 text-lg focus:outline-none transition-all placeholder:text-white/40`}
                      />
                    </div>
                    {recoveryEmailError && (
                      <p className="text-red-400 text-sm mt-1 ml-1">
                        {recoveryEmailError}
                      </p>
                    )}
                  </div>
                )}

                {forgotPasswordStep === "question" && (
                  <div className="space-y-2">
                    <label className="text-base text-white/80 font-bold ml-1 flex flex-col gap-1">
                      <span>
                        Security Question: What is your favorite color?
                      </span>
                      <span className="text-sm text-gold-400/90 normal-case tracking-normal">
                        Hint: Your answer includes a number and special
                        character.
                      </span>
                    </label>
                    <div className="relative group">
                      <ShieldQuestion
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-400 transition-colors"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Your Answer"
                        value={recoveryAnswer}
                        onChange={(e) => setRecoveryAnswer(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 px-12 py-4 text-lg focus:outline-none focus:border-gold-400/50 transition-all placeholder:text-white/40"
                      />
                    </div>
                  </div>
                )}

                {forgotPasswordStep === "reset" && (
                  <div className="space-y-2">
                    <label className="text-base text-white/80 font-bold ml-1">
                      New Password
                    </label>
                    <div className="relative group">
                      <Lock
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-400 transition-colors"
                        size={16}
                      />
                      <input
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 px-12 py-4 text-lg focus:outline-none focus:border-gold-400/50 transition-all placeholder:text-white/40"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-base text-center font-medium">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-base text-center font-medium">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    (forgotPasswordStep === "email" && !!recoveryEmailError)
                  }
                  className="w-full gold-gradient text-black py-4 font-bold tracking-wide text-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? "Processing..."
                    : forgotPasswordStep === "reset"
                      ? "Update Password"
                      : "Next"}{" "}
                  <ArrowRight size={14} />
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-10 pt-10 border-t border-white/5 text-center">
            {forgotPasswordStep !== "none" ? (
              <button
                onClick={() => {
                  setForgotPasswordStep("none");
                  setSearchParams({ mode: "login" });
                  setError("");
                  setMessage("");
                  setEmailError("");
                  setRecoveryEmailError("");
                }}
                className="text-lg tracking-wide text-gold-400 font-bold hover:text-white transition-colors"
              >
                Back to Sign In
              </button>
            ) : (
              <>
                <p className="text-base text-white/80 font-semibold mb-2">
                  {isLogin ? "Don't have an account?" : "Already a member?"}
                </p>
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setSearchParams({ mode: isLogin ? "signup" : "login" });
                    setError("");
                    setMessage("");
                    setEmailError("");
                    setRecoveryEmailError("");
                  }}
                  className="text-lg tracking-wide text-gold-400 font-bold hover:text-white transition-colors"
                >
                  {isLogin ? "Create Account" : "Back to Sign In"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
