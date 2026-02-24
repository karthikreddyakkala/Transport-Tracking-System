import Link from "next/link";
import { Bus, MapPin, Clock, Bot, Shield } from "lucide-react";

const features = [
  { icon: MapPin, text: "Real-time GPS tracking for every bus" },
  { icon: Clock, text: "AI-powered arrival predictions" },
  { icon: Bot, text: "Natural language transit assistant" },
  { icon: Shield, text: "Role-based access for all users" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col bg-primary text-primary-foreground p-12 relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex flex-col flex-1">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-16">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
              <Bus className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl tracking-tight">TransitTrack</span>
          </Link>

          {/* Headline */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Smart transit for<br />modern cities
            </h1>
            <p className="text-primary-foreground/70 text-lg mb-12 leading-relaxed">
              Real-time bus tracking, AI-powered ETAs, and intelligent route recommendations.
            </p>

            <ul className="space-y-4">
              {features.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-primary-foreground/80 text-sm">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom quote */}
          <p className="text-primary-foreground/40 text-xs">
            Designed for passengers, drivers & administrators
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Bus className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">TransitTrack</span>
          </Link>

          {children}
        </div>
      </div>
    </div>
  );
}
