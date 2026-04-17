import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { AuthService } from "../../services/authService";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

type FormData = z.infer<typeof schema>;

const inputCls = "bg-[#2a2a5a] border-white/15 text-white placeholder:text-gray-500 focus-visible:ring-[#00d4ff]";

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await AuthService.resetPassword(data.email);
    } catch {
      // Swallow error — never reveal if email exists
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="flex items-center justify-center w-screen h-screen" style={{ backgroundColor: "#13132b" }}>
      <div className="w-full max-w-md rounded-2xl border p-8 space-y-6" style={{ backgroundColor: "#1e1e3f", borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white">TrueCost</h1>
          <p className="text-sm text-gray-400">Reset your password</p>
        </div>

        {submitted ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-400">
              If an account exists for that email, you will receive a password reset link shortly.
            </p>
            <Link to="/signin" className="text-sm text-[#00d4ff] hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm text-gray-300">Email</Label>
              <Input id="email" type="email" {...register("email")} autoComplete="email" className={inputCls} />
              {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ background: "linear-gradient(90deg,#00d4ff,#7c3aed)" }}
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>

            <p className="text-sm text-center">
              <Link to="/signin" className="text-gray-500 hover:text-gray-300 underline">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
