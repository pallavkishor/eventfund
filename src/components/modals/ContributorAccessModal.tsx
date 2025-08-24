import { useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ContributorAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContributorAccessModal({ isOpen, onClose }: ContributorAccessModalProps) {
  const [accessCode, setAccessCode] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode.trim()) {
      const code = accessCode.trim().toUpperCase();
      onClose();
      setLocation(`/event/${code}`);
    } else {
      toast({
        title: "Error",
        description: "Please enter a valid access code",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-900">Access Event</DialogTitle>
        </DialogHeader>

        <p className="text-gray-600 mb-6">Enter the event access code provided by your event manager to view contribution details.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="access-code" className="block text-sm font-medium text-gray-700 mb-2">Event Access Code</Label>
            <Input 
              id="access-code"
              type="text" 
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              className="text-center text-lg font-mono tracking-wider"
              placeholder="TEACH2024" 
              maxLength={20}
              required
              data-testid="input-access-code"
            />
          </div>
          <Button 
            type="submit"
            className="w-full bg-green-600 text-white py-3 hover:bg-green-700 transition-colors font-medium"
            data-testid="button-access-event"
          >
            Access Event
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
