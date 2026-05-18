import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { TopBar } from "@/components/layout/TopBar";
import { ReviewsContent } from "./ReviewsContent";

export const metadata: Metadata = {
  title: "Review Queue",
};

export default function ReviewsPage() {
  return (
    <PageShell>
      <TopBar
        title="Review Queue"
        description="Human review verdicts and pending traces awaiting assessment"
      />
      <ReviewsContent />
    </PageShell>
  );
}
