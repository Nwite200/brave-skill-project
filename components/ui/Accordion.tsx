"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

export function Accordion({
  items,
  defaultOpen = 0,
  className = "",
}: {
  items: { question: string; answer: string; category?: string | null }[];
  defaultOpen?: number;
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(defaultOpen);

  return (
    <div className={`divide-y divide-white/[0.07] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.015] ${className}`}>
      {items.map((item, index) => {
        const isOpen = open === index;
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4.5 text-left transition hover:bg-white/[0.02] sm:px-6"
            >
              <span className={`text-[13.5px] font-medium transition ${isOpen ? "text-white" : "text-[#CBD5E6]"}`}>{item.question}</span>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${isOpen ? "border-[#873BFF]/50 bg-[#873BFF]/15 text-white" : "border-white/10 text-[#7C8AA3]"}`}>
                {isOpen ? <Minus size={12} /> : <Plus size={12} />}
              </span>
            </button>
            <div
              className="grid transition-all duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 pr-12 text-[13px] leading-[1.8] text-[#8B98AD] sm:px-6 sm:pr-16">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
