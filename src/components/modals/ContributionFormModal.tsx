import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertContributionSchema } from "../../../shared/schema.ts";

interface ContributionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
}

export default function ContributionFormModal({ isOpen, onClose, eventId }: ContributionFormModalProps) {
  const [formData, setFormData] = useState({
    contributorName: "",
    contributorPhone: "",
    amount: "",
    paymentMethod: "",
    paymentDetails: "",
    comments: "",
  });
  
  const { toast } = useToast();
 

  const submitContributionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const contributionData = insertContributionSchema.parse({
        ...data,
        eventId,
        amount: data.amount,
      });
      await apiRequest("POST", `/api/events/${eventId}/contributions`, contributionData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your contribution request has been submitted successfully!",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit contribution request",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitContributionMutation.mutate(formData);
  };

  const handleClose = () => {
    setFormData({
      contributorName: "",
      contributorPhone: "",
      amount: "",
      paymentMethod: "",
      paymentDetails: "",
      comments: "",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-900">Submit Your Contribution</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Full Name *</Label>
              <Input 
                id="name"
                type="text" 
                value={formData.contributorName}
                onChange={(e) => setFormData(prev => ({ ...prev, contributorName: e.target.value }))}
                placeholder="Your full name" 
                required
                data-testid="input-contributor-name"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">Contact Number</Label>
              <Input 
                id="phone"
                type="tel" 
                value={formData.contributorPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, contributorPhone: e.target.value }))}
                placeholder="+91 98765 43210"
                data-testid="input-contributor-phone"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">Contribution Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">₹</span>
              <Input 
                id="amount"
                type="number" 
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="pl-8"
                placeholder="500" 
                min="1" 
                required
                data-testid="input-contribution-amount"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</Label>
            <Select value={formData.paymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}>
              <SelectTrigger data-testid="select-payment-method">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="paymentDetails" className="block text-sm font-medium text-gray-700 mb-2">Payment Details</Label>
            <Textarea 
              id="paymentDetails"
              rows={3} 
              value={formData.paymentDetails}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentDetails: e.target.value }))}
              placeholder="Transaction ID, reference number, or any additional details"
              data-testid="textarea-payment-details"
            />
          </div>

          <div>
            <Label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">Comments (Optional)</Label>
            <Textarea 
              id="comments"
              rows={2} 
              value={formData.comments}
              onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
              placeholder="Any message or comments"
              data-testid="textarea-comments"
            />
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start">
              <i className="fas fa-info-circle text-blue-500 mt-0.5 mr-3"></i>
              <div>
                <p className="text-sm text-blue-800 font-medium mb-1">Please Note:</p>
                <p className="text-sm text-blue-700">Your contribution request will be reviewed by the event managers before being added to the total fund. You'll be able to see the status in your contribution history.</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <Button 
              type="button" 
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              data-testid="button-cancel-contribution"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={submitContributionMutation.isPending || !formData.paymentMethod}
              className="flex-1 bg-green-600 text-white hover:bg-green-700"
              data-testid="button-submit-contribution"
            >
              {submitContributionMutation.isPending ? "Submitting..." : "Submit Contribution"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
