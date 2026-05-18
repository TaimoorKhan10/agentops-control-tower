import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: {
    default: "AgentOps Control Tower",
    template: "%s — AgentOps Control Tower",
  },
  description:
    "Production-grade tracing, evaluation, and observability platform for RAG systems and AI agents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex h-screen overflow-hidden">
        <Sidebar />
        {children}
      </body>
    </html>
  );
}
