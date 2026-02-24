"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ResolveIssueButton({ issueId }: { issueId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function resolve() {
    setLoading(true);
    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Issue marked as resolved.");
      router.refresh();
    } catch {
      toast.error("Failed to resolve issue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-xs h-7 gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
      onClick={resolve}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <CheckCircle2 className="h-3 w-3" />
      )}
      Resolve
    </Button>
  );
}
