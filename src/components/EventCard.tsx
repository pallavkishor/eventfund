import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import type { EventWithDetails } from "../../shared/schema.ts";

interface EventCardProps {
  event: EventWithDetails;
}

export default function EventCard({ event }: EventCardProps) {
  const [, setLocation] = useLocation();

  const viewEventDetails = () => {
    setLocation(`/events/${event.id}`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`event-card-${event.id}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900" data-testid={`event-title-${event.id}`}>{event.title}</h3>
          <div className="flex space-x-2">
            <button 
              onClick={viewEventDetails}
              className="text-gray-400 hover:text-primary"
              data-testid={`button-edit-${event.id}`}
            >
              <i className="fas fa-edit"></i>
            </button>
            <div className="relative group">
              <button className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-ellipsis-v"></i>
              </button>
            </div>
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <i className="fas fa-calendar w-4 mr-2"></i>
            <span data-testid={`event-date-${event.id}`}>{new Date(event.date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <i className="fas fa-map-marker-alt w-4 mr-2"></i>
            <span data-testid={`event-venue-${event.id}`}>{event.venue}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <i className="fas fa-code w-4 mr-2"></i>
            <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs" data-testid={`event-code-${event.id}`}>{event.accessCode}</span>
          </div>
        </div>
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Total Collected</span>
            <span className="font-semibold text-green-600" data-testid={`event-total-${event.id}`}>₹{parseFloat(event.totalCollected).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-600">Contributors</span>
            <span className="text-sm font-medium" data-testid={`event-contributors-${event.id}`}>{event.contributorsCount}</span>
          </div>
          <button 
            onClick={viewEventDetails}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            data-testid={`button-view-details-${event.id}`}
          >
            View Details
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
