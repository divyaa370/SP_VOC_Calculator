import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { AuthService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

const inputCls = "bg-[#2a2a5a] border-white/15 text-white placeholder:text-gray-500 focus-visible:ring-[#00d4ff]";

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useAuth();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  useEffect(() => {
    if (!sessionLoading && !session) {
      setTokenInvalid(true);
    }
  }, [session, sessionLoading]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setServerError("");
    try {
      await AuthService.updatePassword(data.password);
      navigate("/signin");
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen" style={{ backgroundColor: "#13132b" }}>
        <p className="text-gray-400">Validating reset link...</p>
      </div>
    );
  }

  if (tokenInvalid) {
    return (
      <div className="flex items-center justify-center w-screen h-screen" style={{ backgroundColor: "#13132b" }}>
        <div className="w-full max-w-md rounded-2xl border p-8 space-y-4 text-center" style={{ backgroundColor: "#1e1e3f", borderColor: "rgba(255,255,255,0.08)" }}>
          <h1 className="text-2xl font-black tracking-tight text-white">TrueCost</h1>
          <p className="text-sm font-semibold text-white">Link expired or invalid</p>
          <p className="text-sm text-gray-400">
            This password reset link has expired or is no longer valid.
          </p>
          <Link to="/reset-password" className="text-sm text-[#00d4ff] hover:underline">
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-screen h-screen" style={{ backgroundColor: "#13132b" }}>
      <div className="w-full max-w-md rounded-2xl border p-8 space-y-6" style={{ backgroundColor: "#1e1e3f", borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white">TrueCost</h1>
          <p className="text-sm text-gray-400">Set a new password</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="password" className="text-sm text-gray-300">New password</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              autoComplete="new-password"
              className={inputCls}
            />
            {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirmPassword" className="text-sm text-gray-300">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...register("confirmPassword")}
              autoComplete="new-password"
              className={inputCls}
            />
            {errors.confirmPassword && <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>}
          </div>

          {serverError && <p className="text-sm text-red-400">{serverError}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{ background: "linear-gradient(90deg,#00d4ff,#7c3aed)" }}
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
