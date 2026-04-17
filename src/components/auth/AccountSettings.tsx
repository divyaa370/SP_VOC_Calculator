import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthService } from "../../services/authService";
import { supabase } from "../../lib/supabaseClient";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string().max(128, "Password too long"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

const inputCls = "bg-[#2a2a5a] border-white/15 text-white placeholder:text-gray-500 focus-visible:ring-[#00d4ff]";

export function AccountSettings() {
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setServerError("");
    setSuccessMessage("");

    try {
      await AuthService.updatePassword(data.newPassword);
      // F3.06: invalidate all other active sessions
      await supabase.auth.signOut({ scope: "others" });
      setSuccessMessage("Password updated successfully.");
      reset();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="w-full max-w-md rounded-2xl border p-6 space-y-5"
      style={{ backgroundColor: "#1e1e3f", borderColor: "rgba(255,255,255,0.08)" }}
    >
      <div>
        <h3 className="text-base font-semibold text-white">Change password</h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label className="text-sm text-gray-300" htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            type="password"
            {...register("newPassword")}
            autoComplete="new-password"
            maxLength={128}
            className={inputCls}
          />
          {errors.newPassword && (
            <p className="text-sm text-red-400">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-sm text-gray-300" htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            {...register("confirmPassword")}
            autoComplete="new-password"
            maxLength={128}
            className={inputCls}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-red-400">{serverError}</p>}
        {successMessage && <p className="text-sm text-green-400">{successMessage}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-opacity"
          style={{ background: "linear-gradient(90deg, #00d4ff, #7c3aed)", color: "#fff" }}
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
