"use client";

export default function ScrollToContent() {
  return (
    <button
      aria-label="Scroll to learn more"
      onClick={() => document.getElementById("seo-content")?.scrollIntoView({ behavior: "smooth" })}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[3000] flex flex-col items-center gap-1 text-cyan-500/60 hover:text-cyan-400 transition-colors group"
    >
      <span className="text-[9px] uppercase tracking-widest font-mono">About</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 animate-bounce"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}
