import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { AuthService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

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
      <div className="flex items-center justify-center w-screen h-screen">
        <p className="text-muted-foreground">Validating reset link...</p>
      </div>
    );
  }

  if (tokenInvalid) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Link expired or invalid</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              This password reset link has expired or is no longer valid.
            </p>
            <Link to="/reset-password" className="text-sm underline">
              Request a new reset link
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-screen h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
