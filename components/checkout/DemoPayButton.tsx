"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

export function DemoPayButton({ reference }: { reference: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pay = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payments/demo-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not complete the test payment.");
        setLoading(false);
        return;
      }
      router.replace(data.redirect || `/checkout/success?reference=${reference}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      {error && <p className="mb-3 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11.5px] text-rose-200">{error}</p>}
      <button type="button" onClick={pay} disabled={loading} className="btn btn-primary w-full">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <><ShieldCheck size={15} /> Simulate successful payment</>}
      </button>
    </>
  );
}
