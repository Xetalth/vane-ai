import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VaneAI — Autonomous Canary Guardrail Engine",
  description: "Autonomous self-healing canary release and real-time incident mitigation platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#04070c] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}