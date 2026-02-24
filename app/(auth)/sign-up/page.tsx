"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, ArrowRight, Users, Bus } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "passenger" | "driver";

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>("passenger");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    try {
      const result = await signUp.email({
        name,
        email,
        password,
        // @ts-expect-error – additional fields
        role,
        phone,
        callbackURL: role === "driver" ? "/driver" : "/passenger",
      });

      if (result.error) {
        setError(result.error.message ?? "Sign up failed. Please try again.");
        return;
      }

      router.push(role === "driver" ? "/driver" : "/passenger");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create an account</h2>
        <p className="text-muted-foreground mt-1">Join the smart transit network today</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Role selector */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">I am a</Label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "passenger", label: "Passenger", desc: "Track buses & plan trips", icon: Users },
              { value: "driver", label: "Driver", desc: "Navigate & report issues", icon: Bus },
            ] as const).map(({ value, label, desc, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 rounded-xl border-2 transition-all text-left",
                  role === value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-border/80 hover:bg-muted/40"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", role === value ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-sm font-medium", role === value ? "text-primary" : "")}>{label}</span>
                </div>
                <span className="text-xs text-muted-foreground leading-tight">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm font-medium">Full name</Label>
          <Input
            id="name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-10"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-10"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-sm font-medium">
            Phone <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-10"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="h-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Admin accounts are set up by the system administrator.</p>
        </div>

        <Button type="submit" className="w-full h-10 gap-2" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>Create Account <ArrowRight className="h-4 w-4" /></>
          )}
        </Button>
      </form>

      <div className="text-sm text-center text-muted-foreground space-y-2">
        <p>
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
        <p>
          <Link href="/" className="hover:text-foreground transition-colors">
            ← Back to live map
          </Link>
        </p>
      </div>
    </div>
  );
}
