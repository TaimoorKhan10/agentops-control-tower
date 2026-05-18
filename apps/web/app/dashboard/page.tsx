import type { Metadata } from "next";
import { DashboardContent } from "./DashboardContent";
import { PageShell } from "@/components/layout/PageShell";
import { TopBar } from "@/components/layout/TopBar";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <PageShell>
      <TopBar
        title="Dashboard"
        description="Observability overview for all traced AI runs"
      />
      <DashboardContent />
    </PageShell>
  );
}
