// Auth shims — delegates to Supabase session stored by AuthContext.
// Components import from "@/lib/auth"; these wrappers keep paths stable.

import { supabase } from "./supabaseClient";

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  // Identity
  annualIncome?: number;
  // Commute
  homeAddress?: string;
  workAddress?: string;
  commuteDaysPerWeek?: number;
  oneWayCommuteMiles?: number;
  // Fuel & driving
  preferredFuelPrice?: number;
  electricityRate?: number;
  drivingStyle?: "city" | "mixed" | "highway";
  // Insurance
  monthlyInsurancePremium?: number;
  stateOfRegistration?: string;
  // Vehicle defaults
  ownershipHorizonYears?: number;
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    displayName: data.user.user_metadata?.username ?? data.user.email ?? "",
    avatarUrl: data.user.user_metadata?.avatar_url,
  };
}

export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut();
}

export function getUserProfile(userId: string): UserProfile | null {
  try {
    return JSON.parse(localStorage.getItem(`truecost_profile_${userId}`) ?? "null");
  } catch {
    return null;
  }
}

export function saveUserProfile(userId: string, profile: Partial<UserProfile>): void {
  const existing = getUserProfile(userId) ?? { id: userId, email: "" };
  localStorage.setItem(
    `truecost_profile_${userId}`,
    JSON.stringify({ ...existing, ...profile })
  );
}
