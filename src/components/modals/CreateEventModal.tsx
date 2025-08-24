import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertEventSchema } from "../../../shared/schema.ts";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateEventModal({ isOpen, onClose }: CreateEventModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    venue: "",
    description: "",
    contributionInstructions: "",
    accessCode: "",
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createEventMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const eventData = insertEventSchema.parse({
        ...data,
        date: new Date(data.date),
      });
      await apiRequest("POST", "/api/events", eventData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Success",
        description: "Event created successfully",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    },
  });

  const generateAccessCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setFormData(prev => ({ ...prev, accessCode: code }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEventMutation.mutate(formData);
  };

  const handleClose = () => {
    setFormData({
      title: "",
      date: "",
      time: "",
      venue: "",
      description: "",
      contributionInstructions: "",
      accessCode: "",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-900">Create New Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">Event Title *</Label>
            <Input 
              id="title"
              type="text" 
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Teachers' Day Celebration 2024" 
              required
              data-testid="input-event-title"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">Event Date *</Label>
              <Input 
                id="date"
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
                data-testid="input-event-date"
              />
            </div>
            <div>
              <Label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">Event Time</Label>
              <Input 
                id="time"
                type="time" 
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                data-testid="input-event-time"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">Venue *</Label>
            <Input 
              id="venue"
              type="text" 
              value={formData.venue}
              onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
              placeholder="Main Auditorium" 
              required
              data-testid="input-event-venue"
            />
          </div>

          <div>
            <Label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">Description</Label>
            <Textarea 
              id="description"
              rows={3} 
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the event"
              data-testid="textarea-event-description"
            />
          </div>

          <div>
            <Label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">Contribution Instructions</Label>
            <Textarea 
              id="instructions"
              rows={3} 
              value={formData.contributionInstructions}
              onChange={(e) => setFormData(prev => ({ ...prev, contributionInstructions: e.target.value }))}
              placeholder="Instructions for contributors on how to contribute"
              data-testid="textarea-contribution-instructions"
            />
          </div>

          <div>
            <Label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-2">Access Code</Label>
            <div className="flex space-x-2">
              <Input 
                id="accessCode"
                type="text" 
                value={formData.accessCode}
                onChange={(e) => setFormData(prev => ({ ...prev, accessCode: e.target.value.toUpperCase() }))}
                className="flex-1 font-mono" 
                placeholder="TEACH2024" 
                maxLength={20}
                data-testid="input-access-code"
              />
              <Button 
                type="button" 
                onClick={generateAccessCode}
                variant="outline"
                className="px-4 py-2"
                data-testid="button-generate-code"
              >
                <i className="fas fa-sync-alt"></i>
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Contributors will use this code to access the event</p>
          </div>

          <div className="flex space-x-4 pt-4">
            <Button 
              type="button" 
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createEventMutation.isPending}
              className="flex-1 bg-primary text-white hover:bg-primary-dark"
              data-testid="button-create-event"
            >
              {createEventMutation.isPending ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
