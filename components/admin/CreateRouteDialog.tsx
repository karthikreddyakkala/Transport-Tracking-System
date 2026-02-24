"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Loader2, X, GripVertical } from "lucide-react";
import { toast } from "sonner";

const ROUTE_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
];

interface Stop { id: string; name: string; code?: string | null }

export default function CreateRouteDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [selectedStops, setSelectedStops] = useState<Stop[]>([]);
  const [stopSearch, setStopSearch] = useState("");
  const [form, setForm] = useState({ number: "", name: "", description: "", color: ROUTE_COLORS[0] });

  useEffect(() => {
    if (!open) return;
    fetch("/api/stops").then((r) => r.json()).then(setAllStops).catch(() => {});
  }, [open]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function addStop(stop: Stop) {
    if (!selectedStops.find((s) => s.id === stop.id)) {
      setSelectedStops((prev) => [...prev, stop]);
    }
    setStopSearch("");
  }

  function removeStop(stopId: string) {
    setSelectedStops((prev) => prev.filter((s) => s.id !== stopId));
  }

  const filtered = allStops.filter(
    (s) =>
      !selectedStops.find((sel) => sel.id === s.id) &&
      s.name.toLowerCase().includes(stopSearch.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedStops.length < 2) {
      toast.error("A route needs at least 2 stops.");
      return;
    }
    setLoading(true);
    try {
      // 1. Create the route
      const routeRes = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: "active" }),
      });
      if (!routeRes.ok) throw new Error("Route creation failed");
      const route = await routeRes.json();

      // 2. Add stops in order
      await Promise.all(
        selectedStops.map((stop, idx) =>
          fetch("/api/route-stops", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ routeId: route.id, stopId: stop.id, stopOrder: idx, estimatedMinutesFromStart: idx * 5 }),
          })
        )
      );

      toast.success(`Route "${form.name}" created with ${selectedStops.length} stops.`);
      setOpen(false);
      setForm({ number: "", name: "", description: "", color: ROUTE_COLORS[0] });
      setSelectedStops([]);
      router.refresh();
    } catch {
      toast.error("Failed to create route.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1"><Plus className="h-3 w-3" /> Add Route</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Route</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Route Number *</Label>
              <Input placeholder="e.g. 1A" value={form.number} onChange={(e) => set("number", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Route Name *</Label>
              <Input placeholder="e.g. City Center - Airport" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Input placeholder="Optional description" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Route Color</Label>
            <div className="flex gap-2 flex-wrap">
              {ROUTE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  onClick={() => set("color", c)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Add Stops (in order) *</Label>
            <Input
              placeholder="Search stops…"
              value={stopSearch}
              onChange={(e) => setStopSearch(e.target.value)}
            />
            {stopSearch && filtered.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <ScrollArea className="max-h-36">
                  {filtered.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between"
                      onClick={() => addStop(s)}
                    >
                      <span>{s.name}</span>
                      {s.code && <span className="text-xs text-muted-foreground">{s.code}</span>}
                    </button>
                  ))}
                </ScrollArea>
              </div>
            )}
            {stopSearch && filtered.length === 0 && (
              <p className="text-xs text-muted-foreground px-1">No stops found. Create stops first.</p>
            )}

            {selectedStops.length > 0 && (
              <div className="border rounded-lg p-2 space-y-1">
                {selectedStops.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0"
                      style={{ backgroundColor: form.color + "33", color: form.color }}>
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate">{s.name}</span>
                    <button type="button" onClick={() => removeStop(s.id)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Create Route
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
