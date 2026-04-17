import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { AuthService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Spinner } from "../ui/Spinner";

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters"),
  email: z.string().trim().email("Invalid email address").max(254, "Email too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
});

type FormData = z.infer<typeof schema>;

const inputCls = "bg-[#2a2a5a] border-white/15 text-white placeholder:text-gray-500 focus-visible:ring-[#00d4ff]";

export function SignUpForm() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (authLoading) return <Spinner />;
  if (user) return <Navigate to="/app" replace />;

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setServerError("");
    try {
      await AuthService.signUp(data);
      navigate("/signin");
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Sign up failed");
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
          <p className="text-sm text-gray-400">Create your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="username" className="text-sm text-gray-300">Username</Label>
            <Input id="username" {...register("username")} autoComplete="username" maxLength={50} className={inputCls} />
            {errors.username && <p className="text-sm text-red-400">{errors.username.message}</p>}
          </div>

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
              autoComplete="new-password"
              maxLength={128}
              className={inputCls}
            />
            {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
          </div>

          {serverError && <p className="text-sm text-red-400">{serverError}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{ background: "linear-gradient(90deg,#00d4ff,#7c3aed)" }}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>

          <p className="text-sm text-center text-gray-400">
            Already have an account?{" "}
            <Link to="/signin" className="text-[#00d4ff] hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
