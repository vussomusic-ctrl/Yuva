// Auth state for the whole app (ЗАХОД 4 — stage 1).
// Wraps Supabase auth: exposes the current session, the matching `profiles`
// row, and signUp / signIn / signOut. The `profiles` row is created by the
// `on_auth_user_created` DB trigger from signUp metadata — we NEVER insert it
// here (that would duplicate the primary key), we only read/update it.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type UserRole = "user" | "agent";

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  verified: boolean;
  agencyId: string | null;
  isAdmin: boolean;
};

export type SignUpInput = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
};

type AuthResult = { error: string | null };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithPhone: (phone: string, data?: { full_name?: string; email?: string; role?: string }) => Promise<AuthResult>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  verifyPassword: (password: string) => Promise<AuthResult>;
  changePassword: (password: string) => Promise<AuthResult>;
  sendPasswordReset: () => Promise<AuthResult>;
  signOutEverywhere: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const PROFILE_COLUMNS = "id, full_name, avatar_url, phone, role, verified, agency_id, is_admin";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", uid)
      .single();
    if (!data) {
      setProfile(null);
      return;
    }
    // Explicit snake → camel map: every column is named, so a new field can't
    // silently land as undefined (the row is snake_case, Profile is camel for
    // agencyId).
    const row = data as {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      phone: string | null;
      role: UserRole;
      verified: boolean;
      agency_id: string | null;
      is_admin: boolean | null;
    };
    setProfile({
      id: row.id,
      full_name: row.full_name,
      avatar_url: row.avatar_url,
      phone: row.phone,
      role: row.role,
      verified: row.verified,
      agencyId: row.agency_id ?? null,
      isAdmin: row.is_admin ?? false,
    });
  };

  useEffect(() => {
    let active = true;

    // Restore a persisted session on boot.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => {
          if (active) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // React to sign-in / sign-out / token refresh. Keep the callback sync
    // (fire-and-forget the profile load) to avoid the documented deadlock.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user) loadProfile(next.user.id);
      else {
        setProfile(null);
        // Session ended (incl. a global sign-out triggered from another device)
        // → tear down all realtime channels so none survive the socket drop.
        supabase.removeAllChannels();
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp: AuthContextValue["signUp"] = async ({
    fullName,
    email,
    phone,
    password,
    role,
  }) => {
    // Confirm email is OFF → this returns a session immediately. The trigger
    // turns options.data into the profiles row (incl. the chosen account type).
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          role,
        },
      },
    });
    return { error: error?.message ?? null };
  };

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  };

  // Phone OTP: request a code (Supabase generates it → Send SMS Hook → 1sms).
  // `data` (registration: full_name/email/role) → raw_user_meta_data for a NEW
  // user; the handle_new_user trigger writes it into profiles. Ignored on login.
  const signInWithPhone: AuthContextValue["signInWithPhone"] = async (phone, data) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: data ? { data } : undefined,
    });
    return { error: error?.message ?? null };
  };

  // Verify the SMS code → Supabase mints the session (onAuthStateChange catches it).
  const verifyPhoneOtp: AuthContextValue["verifyPhoneOtp"] = async (phone, token) => {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    supabase.removeAllChannels(); // unsubscribe realtime while the socket is still alive
    await supabase.auth.signOut();
  };

  // Re-check the current password (re-auth) before a sensitive change. Same
  // user → the refreshed session is harmless (no logout).
  const verifyPassword: AuthContextValue["verifyPassword"] = async (password) => {
    const email = session?.user?.email;
    if (!email) return { error: "no email" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  // Change the current user's password (logged-in; no email step).
  const changePassword: AuthContextValue["changePassword"] = async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  };

  // Email a password-reset link to the current account's email.
  const sendPasswordReset: AuthContextValue["sendPasswordReset"] = async () => {
    const email = session?.user?.email;
    if (!email) return { error: "no email" };
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message ?? null };
  };

  // Revoke every session (sign out on all devices). onAuthStateChange clears state.
  const signOutEverywhere = async () => {
    supabase.removeAllChannels(); // unsubscribe realtime before the global socket teardown
    await supabase.auth.signOut({ scope: "global" });
  };

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signUp,
        signIn,
        signInWithPhone,
        verifyPhoneOtp,
        signOut,
        verifyPassword,
        changePassword,
        sendPasswordReset,
        signOutEverywhere,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Map a Supabase auth error message to an i18n key (auth.* namespace).
export function authErrorKey(message: string | null): string {
  if (!message) return "auth.errGeneric";
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "auth.errEmailTaken";
  if (m.includes("invalid login credentials")) return "auth.errInvalidCredentials";
  if (m.includes("password")) return "auth.errWeakPassword";
  if (m.includes("email")) return "auth.errInvalidEmail";
  return "auth.errGeneric";
}
