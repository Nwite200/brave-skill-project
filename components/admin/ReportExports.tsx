"use client";

import { useState } from "react";
import { Download, FileBarChart, Users, BookOpen, GraduationCap, Wallet } from "lucide-react";

const REPORTS = [
  { type: "revenue", label: "Revenue", description: "Every paid and refunded order with student, course and amounts.", icon: Wallet },
  { type: "students", label: "Students", description: "Registered learners, status, enrolments and certificates.", icon: Users },
  { type: "enrollments", label: "Enrolments", description: "Course access, price paid, progress and completion dates.", icon: BookOpen },
  { type: "certificates", label: "Certificates", description: "Serial numbers, recipients, validity and revocation status.", icon: GraduationCap },
  { type: "courses", label: "Courses", description: "Catalogue performance: price, modules, enrolments, certificates.", icon: FileBarChart },
];

export function ReportExports() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const href = (type: string) => {
    const params = new URLSearchParams({ type });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/admin/reports/export?${params.toString()}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
        <div>
          <label htmlFor="from" className="label">From</label>
          <input id="from" type="date" className="field h-9 w-[160px] text-[11px]" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label htmlFor="to" className="label">To</label>
          <input id="to" type="date" className="field h-9 w-[160px] text-[11px]" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <p className="pb-2 text-[9.5px] text-[#5F6B7E]">Leave blank to export all time. CSV opens in Excel or Google Sheets.</p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => (
          <div key={report.type} className="flex flex-col rounded-xl border border-white/[0.07] bg-[#0A0C15] p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#873BFF]/12 text-[#C9B8FF]"><report.icon size={14} /></span>
            <p className="mt-3 text-[12px] font-semibold text-white">{report.label}</p>
            <p className="mt-1 flex-1 text-[10px] leading-relaxed text-[#7C8AA3]">{report.description}</p>
            <a href={href(report.type)} className="btn btn-ghost btn-sm mt-3 h-8"><Download size={11} /> Download CSV</a>
          </div>
        ))}
      </div>
    </div>
  );
}
