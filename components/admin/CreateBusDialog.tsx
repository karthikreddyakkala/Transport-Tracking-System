"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Route { id: string; number: string; name: string }
interface Driver { id: string; name: string }

export default function CreateBusDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [form, setForm] = useState({
    number: "", registrationNumber: "", capacity: "40",
    currentRouteId: "", driverId: "", status: "active",
  });

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/routes").then((r) => r.json()),
      fetch("/api/users?role=driver").then((r) => r.json()).catch(() => []),
    ]).then(([r, d]) => {
      setRoutes(Array.isArray(r) ? r : []);
      setDrivers(Array.isArray(d) ? d : []);
    });
  }, [open]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        number: form.number,
        capacity: parseInt(form.capacity) || 40,
        status: form.status,
      };
      if (form.registrationNumber) payload.registrationNumber = form.registrationNumber;
      if (form.currentRouteId) payload.currentRouteId = form.currentRouteId;
      if (form.driverId) payload.driverId = form.driverId;

      const res = await fetch("/api/buses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      toast.success(`Bus ${form.number} created.`);
      setOpen(false);
      setForm({ number: "", registrationNumber: "", capacity: "40", currentRouteId: "", driverId: "", status: "active" });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create bus.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1"><Plus className="h-3 w-3" /> Add Bus</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Bus</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Bus Number *</Label>
              <Input placeholder="e.g. KA-01-F-1234" value={form.number} onChange={(e) => set("number", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Capacity</Label>
              <Input type="number" placeholder="40" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Registration Number</Label>
            <Input placeholder="Optional" value={form.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Assign Route</Label>
            <Select value={form.currentRouteId} onValueChange={(v) => set("currentRouteId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a route (optional)" />
              </SelectTrigger>
              <SelectContent>
                {routes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    Route {r.number} — {r.name}
                  </SelectItem>
                ))}
                {routes.length === 0 && (
                  <SelectItem value="_none" disabled>No routes yet — create routes first</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Assign Driver</Label>
            <Select value={form.driverId} onValueChange={(v) => set("driverId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a driver (optional)" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
                {drivers.length === 0 && (
                  <SelectItem value="_none" disabled>No drivers registered yet</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Create Bus
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
