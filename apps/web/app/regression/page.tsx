import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { TopBar } from "@/components/layout/TopBar";
import { RegressionContent } from "./RegressionContent";

export const metadata: Metadata = {
  title: "Regression Tests",
};

export default function RegressionPage() {
  return (
    <PageShell>
      <TopBar
        title="Regression Tests"
        description="A/B prompt comparison cases for regression testing"
      />
      <RegressionContent />
    </PageShell>
  );
}
