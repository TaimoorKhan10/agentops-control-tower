import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { TopBar } from "@/components/layout/TopBar";
import { TracesContent } from "./TracesContent";

export const metadata: Metadata = {
  title: "Traces",
};

export default function TracesPage() {
  return (
    <PageShell>
      <TopBar
        title="Traces"
        description="All AI runs — RAG queries, agent executions, and LLM calls"
      />
      <TracesContent />
    </PageShell>
  );
}
