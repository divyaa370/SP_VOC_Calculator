import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { AuthService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Spinner } from "../ui/Spinner";

const LOCKOUT_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 30_000;

const schema = z.object({
  email: z.string().trim().email("Invalid email address").max(254, "Email too long"),
  password: z.string().min(1, "Password is required").max(128, "Password too long"),
});

type FormData = z.infer<typeof schema>;

const inputCls = "bg-[#2a2a5a] border-white/15 text-white placeholder:text-gray-500 focus-visible:ring-[#00d4ff]";

export function SignInForm() {
  const navigate = useNavigate();
  const { user, loading: authLoading, enterGuestMode } = useAuth();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);

  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const left = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (left <= 0) { setLockedUntil(null); setLockSecondsLeft(0); }
      else setLockSecondsLeft(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (authLoading) return <Spinner />;
  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (data: FormData) => {
    if (isLocked) return;
    setLoading(true);
    setServerError("");
    try {
      await AuthService.signIn(data);
      setFailedAttempts(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setServerError(
        msg.toLowerCase().includes("invalid") ? "Invalid email or password." : msg || "Sign in failed."
      );
      const next = failedAttempts + 1;
      setFailedAttempts(next);
      if (next >= LOCKOUT_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_DURATION_MS);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center w-screen h-screen" style={{ backgroundColor: "#13132b" }}>
      <div className="w-full max-w-md rounded-2xl border p-8 space-y-6" style={{ backgroundColor: "#1e1e3f", borderColor: "rgba(255,255,255,0.08)" }}>
        {/* Logo */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white">TrueCost</h1>
          <p className="text-sm text-gray-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email" className="text-sm text-gray-300">Email</Label>
            <Input id="email" type="email" {...register("email")} autoComplete="email" maxLength={254} className={inputCls} />
            {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="password" className="text-sm text-gray-300">Password</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              autoComplete="current-password"
              maxLength={128}
              className={inputCls}
            />
            {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
          </div>

          {serverError && !isLocked && <p className="text-sm text-red-400">{serverError}</p>}
          {isLocked && (
            <p className="text-sm text-amber-400">Too many failed attempts. Try again in {lockSecondsLeft}s.</p>
          )}

          <button
            type="submit"
            disabled={loading || isLocked}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{ background: "linear-gradient(90deg,#00d4ff,#7c3aed)" }}
          >
            {loading ? "Signing in..." : isLocked ? `Locked (${lockSecondsLeft}s)` : "Sign In"}
          </button>

          <button
            type="button"
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white border transition-colors hover:bg-white/5"
            style={{ borderColor: "rgba(255,255,255,0.15)" }}
            onClick={() => { enterGuestMode(); navigate("/"); }}
          >
            Continue as Guest
          </button>

          <p className="text-sm text-center text-gray-400">
            Don't have an account?{" "}
            <Link to="/signup" className="text-[#00d4ff] hover:underline">Sign up</Link>
          </p>

          <p className="text-sm text-center">
            <Link to="/reset-password" className="text-gray-500 hover:text-gray-300 underline">Forgot password?</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
