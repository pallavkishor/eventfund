import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { EventWithDetails } from "../../../shared/schema.ts";

interface InviteCoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventWithDetails[];
  selectedEventId?: string;
}

export default function InviteCoManagerModal({ isOpen, onClose, events, selectedEventId }: InviteCoManagerModalProps) {
  const [email, setEmail] = useState("");
  const [eventId, setEventId] = useState(selectedEventId || "");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const inviteCoManagerMutation = useMutation({
    mutationFn: async (data: { email: string; eventId: string }) => {
      await apiRequest("POST", `/api/events/${data.eventId}/invite`, { email: data.email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "invitations"] });
      toast({
        title: "Success",
        description: "Co-manager invitation sent successfully",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send co-manager invitation",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && eventId) {
      inviteCoManagerMutation.mutate({ email: email.trim(), eventId });
    }
  };

  const handleClose = () => {
    setEmail("");
    if (!selectedEventId) {
      setEventId("");
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-900">Invite Co-Manager</DialogTitle>
        </DialogHeader>

        {events.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-calendar-plus text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No events available</h3>
            <p className="text-gray-600 mb-4">You need to create an event first before inviting co-managers.</p>
            <Button onClick={handleClose} variant="outline" data-testid="button-close-no-events">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {!selectedEventId && (
              <div>
                <Label htmlFor="event" className="block text-sm font-medium text-gray-700 mb-2">Select Event *</Label>
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger data-testid="select-event">
                    <SelectValue placeholder="Choose an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address *</Label>
              <Input 
                id="email"
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com" 
                required
                data-testid="input-invite-email"
              />
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start">
                <i className="fas fa-info-circle text-blue-500 mt-0.5 mr-3"></i>
                <div>
                  <p className="text-sm text-blue-800 font-medium mb-1">Invitation Details:</p>
                  <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                    <li>The invitation link will expire in 2 hours</li>
                    <li>Co-managers can approve contributions and manage expenses</li>
                    <li>They'll receive an email with the invitation link</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex space-x-4 pt-4">
              <Button 
                type="button" 
                onClick={handleClose}
                variant="outline"
                className="flex-1"
                data-testid="button-cancel-invite"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={inviteCoManagerMutation.isPending || !email.trim() || !eventId}
                className="flex-1 bg-primary text-white hover:bg-primary-dark"
                data-testid="button-send-invite"
              >
                {inviteCoManagerMutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
