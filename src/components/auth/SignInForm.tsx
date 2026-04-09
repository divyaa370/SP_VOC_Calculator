import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { AuthService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Spinner } from "../ui/Spinner";

const LOCKOUT_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 30_000;

const schema = z.object({
  email: z.string().trim().email("Invalid email address").max(254, "Email too long"),
  password: z.string().min(1, "Password is required").max(128, "Password too long"),
});

type FormData = z.infer<typeof schema>;

export function SignInForm() {
  const navigate = useNavigate();
  const { user, loading: authLoading, enterGuestMode } = useAuth();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  // Rate limiting: tracked in component state only — resets on page load (intentional).
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);

  // Countdown ticker for the lockout display
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

  if (user) {
    return <Navigate to="/app" replace />;
  }

  const onSubmit = async (data: FormData) => {
    if (isLocked) return;
    setLoading(true);
    setServerError("");
    try {
      await AuthService.signIn(data);
      setFailedAttempts(0);
      navigate("/");
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
    <div className="flex items-center justify-center w-screen h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} autoComplete="email" maxLength={254} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                autoComplete="current-password"
                maxLength={128}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {serverError && !isLocked && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}
            {isLocked && (
              <p className="text-sm text-destructive">
                Too many failed attempts. Try again in {lockSecondsLeft}s.
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading || isLocked}>
              {loading ? "Signing in..." : isLocked ? `Locked (${lockSecondsLeft}s)` : "Sign In"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => { enterGuestMode(); navigate("/app"); }}
            >
              Continue as Guest
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="underline">
                Sign up
              </Link>
            </p>

            <p className="text-sm text-center">
              <Link to="/reset-password" className="underline text-muted-foreground">
                Forgot password?
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
