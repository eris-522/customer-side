import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: window.sessionStorage,
  },
});

if (typeof window !== 'undefined') {
  // Capture recovery or confirmation token in URL immediately before Supabase cleans it up
  if (
    window.location.hash.includes('type=recovery') ||
    window.location.search.includes('type=recovery')
  ) {
    try {
      sessionStorage.setItem('supabase_recovery_mode', 'true');
    } catch {}
  } else if (
    window.location.hash.includes('type=signup') ||
    window.location.search.includes('type=signup') ||
    window.location.search.includes('confirmed=true')
  ) {
    try {
      sessionStorage.setItem('supabase_email_confirmed', 'true');
    } catch {}
  }

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      try {
        sessionStorage.setItem('supabase_recovery_mode', 'true');
      } catch {}
      if (window.location.pathname !== '/auth') {
        window.location.replace('/auth?mode=reset');
      }
    }
  });
}
