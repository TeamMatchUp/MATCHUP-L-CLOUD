import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ProposalDetail } from "@/components/proposal/ProposalDetail";

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-3xl mx-auto p-6">No proposal ID supplied.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4 gap-1"
          style={{ color: "#8b909e" }}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <ProposalDetail proposalId={id} />
      </div>
    </div>
  );
}
