import Link from "next/link";
import localFont from "next/font/local";
import { Sparkles } from "lucide-react";

const caesar = localFont({
  src: "../../public/fonts/CaesarDressing-Regular.ttf",
});

export default function Navbar() {
  return (
    <header
      className="
        sticky top-0 z-50
        border-b border-slate-200/60 bg-white/70 backdrop-blur
        dark:border-slate-800/60 dark:bg-slate-950/55
      "
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="group inline-flex items-center gap-2">
        
          <h1 className={`${caesar.className} text-3xl tracking-wide leading-none`}>
            <span className="bg-gradient-to-r from-[#00D4FF] to-[#020024] bg-clip-text text-transparent dark:from-[#A7F3FF] dark:via-[#00D4FF] dark:to-[#7C3AED]">
              GAMORAX
            </span>
          </h1>
        </Link>
      </div>

    </header>
  );
}
