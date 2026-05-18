import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { TopBar } from "@/components/layout/TopBar";
import { EvaluationsContent } from "./EvaluationsContent";

export const metadata: Metadata = {
  title: "Evaluations",
};

export default function EvaluationsPage() {
  return (
    <PageShell>
      <TopBar
        title="Evaluations"
        description="Deterministic quality scores across evaluated AI runs"
      />
      <EvaluationsContent />
    </PageShell>
  );
}
