"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Square, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface SimulatorControlProps {
  busIds: string[];
}

export default function SimulatorControl({ busIds }: SimulatorControlProps) {
  const [running, setRunning] = useState(false);
  const [tickCount, setTickCount] = useState(0);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function tick() {
    try {
      const res = await fetch("/api/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // run all active buses
      });
      const data = await res.json();
      setTickCount((c) => c + 1);
      setLastResult(`${data.processed ?? 0} bus(es) updated`);
    } catch {
      setLastResult("Tick failed — check console");
    }
  }

  function startSimulation() {
    if (busIds.length === 0) {
      toast.error(
        "No active buses to simulate. Set a bus status to 'active' first.",
      );
      return;
    }
    setRunning(true);
    setTickCount(0);
    tick(); // immediate first tick
    intervalRef.current = setInterval(tick, 5000);
    toast.success("GPS simulation started — buses moving every 5 seconds");
  }

  function stopSimulation() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
    toast.info("Simulation stopped");
  }

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Left: status */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${running ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"}`}
              />
              <span className="text-sm font-medium">
                {running ? "Simulation running" : "Simulation stopped"}
              </span>
              {running && (
                <Badge variant="outline" className="text-xs">
                  {tickCount} tick{tickCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            {lastResult && (
              <p className="text-xs text-muted-foreground">{lastResult}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {busIds.length} active bus{busIds.length !== 1 ? "es" : ""} ·
              Updates every 5s via browser
            </p>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {!running ? (
              <Button size="sm" className="gap-1.5" onClick={startSimulation}>
                <Play className="h-3 w-3" /> Start Simulation
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-muted-foreground"
                  onClick={tick}
                >
                  <RefreshCw className="h-3 w-3" /> Manual tick
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5"
                  onClick={stopSimulation}
                >
                  <Square className="h-3 w-3 fill-current" /> Stop
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
