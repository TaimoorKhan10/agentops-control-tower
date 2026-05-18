import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { TraceDetailContent } from "./TraceDetailContent";

export const metadata: Metadata = {
  title: "Trace Detail",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TraceDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <PageShell>
      <TraceDetailContent id={id} />
    </PageShell>
  );
}
