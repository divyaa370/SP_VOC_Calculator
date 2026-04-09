import { supabase } from "../lib/supabaseClient";

export const AuthService = {
  async signUp({ email, password, username }: { email: string; password: string; username: string }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });
    if (error) throw error;
    return data;
  },

  async signIn({ email, password }: { email: string; password: string }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    // scope: 'global' invalidates all active sessions server-side, not just the current device.
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  onAuthStateChange(callback: (session: unknown) => void) {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return () => subscription.subscription.unsubscribe();
  },

  async resetPassword(email: string) {
    const redirectTo = `${import.meta.env.VITE_APP_URL ?? window.location.origin}/update-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },
};
