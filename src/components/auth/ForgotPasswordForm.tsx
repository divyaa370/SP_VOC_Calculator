import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { AuthService } from "../../services/authService";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

type FormData = z.infer<typeof schema>;

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
    <div className="flex items-center justify-center w-screen h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                If an account exists for that email, you will receive a password reset link shortly.
              </p>
              <Link to="/signin" className="text-sm underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} autoComplete="email" />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                <Link to="/signin" className="underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
