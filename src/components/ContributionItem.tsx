import { Button } from "@/components/ui/button";
import type { Contribution } from "../../shared/schema.ts";

interface ContributionItemProps {
  contribution: Contribution;
  onApprove: (contributionId: string) => void;
  onReject: (contributionId: string) => void;
  isLoading: boolean;
}

export default function ContributionItem({ contribution, onApprove, onReject, isLoading }: ContributionItemProps) {
  const handleApprove = () => {
    onApprove(contribution.id);
  };

  const handleReject = () => {
    onReject(contribution.id);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200" data-testid={`contribution-item-${contribution.id}`}>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900" data-testid={`contribution-name-${contribution.id}`}>{contribution.contributorName}</h4>
          <span className="text-lg font-bold text-amber-600" data-testid={`contribution-amount-${contribution.id}`}>₹{parseFloat(contribution.amount).toLocaleString()}</span>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <p data-testid={`contribution-method-${contribution.id}`}>Payment Method: {contribution.paymentMethod}</p>
          {contribution.contributorPhone && (
            <p data-testid={`contribution-phone-${contribution.id}`}>Phone: {contribution.contributorPhone}</p>
          )}
          {contribution.paymentDetails && (
            <p data-testid={`contribution-details-${contribution.id}`}>Details: {contribution.paymentDetails}</p>
          )}
          {contribution.comments && (
            <p className="italic" data-testid={`contribution-comments-${contribution.id}`}>"{contribution.comments}"</p>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2" data-testid={`contribution-date-${contribution.id}`}>
          Submitted {new Date(contribution.createdAt!).toLocaleString()}
        </p>
      </div>
      <div className="flex space-x-2 ml-4">
        <Button 
          onClick={handleApprove}
          disabled={isLoading}
          size="sm"
          className="bg-green-600 text-white hover:bg-green-700"
          data-testid={`button-approve-${contribution.id}`}
        >
          Approve
        </Button>
        <Button 
          onClick={handleReject}
          disabled={isLoading}
          size="sm"
          variant="destructive"
          data-testid={`button-reject-${contribution.id}`}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
