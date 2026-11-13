import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container-bs flex min-h-[70vh] max-w-lg flex-col items-center justify-center py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#873BFF]/30 bg-[#873BFF]/10 text-[#C9B8FF]"><Compass size={24} /></span>
      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-[#6F7C90]">Error 404</p>
      <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.04em] text-white">Page not found</h1>
      <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-[#8492A6]">
        The page you are looking for may have moved, or the link may be incorrect.
      </p>
      <div className="mt-7 flex gap-2">
        <Link href="/" className="btn btn-primary btn-sm">Back home</Link>
        <Link href="/courses" className="btn btn-ghost btn-sm">Browse courses</Link>
      </div>
    </div>
  );
}
