import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/hooks/use-toast";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
}

export default function AddExpenseModal({ isOpen, onClose, eventId }: AddExpenseModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    date: "",
    category: "",
    description: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addExpenseMutation = useMutation({
    mutationFn: async (data: { formData: typeof formData; file: File | null }) => {
      const formDataToSend = new FormData();
      
      formDataToSend.append('title', data.formData.title);
      formDataToSend.append('amount', data.formData.amount);
      formDataToSend.append('date', data.formData.date);
      formDataToSend.append('category', data.formData.category);
      formDataToSend.append('description', data.formData.description);
      
      if (data.file) {
        formDataToSend.append('receipt', data.file);
      }

      const response = await fetch(`/api/events/${eventId}/expenses`, {
        method: 'POST',
        body: formDataToSend,
        credentials: 'include',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({
        title: "Success",
        description: "Expense added successfully",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Error",
          description: "Only image files (JPEG, PNG, GIF, WebP) and PDF files are allowed",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById('receipt-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addExpenseMutation.mutate({ formData, file: selectedFile });
  };

  const handleClose = () => {
    setFormData({
      title: "",
      amount: "",
      date: "",
      category: "",
      description: "",
    });
    setSelectedFile(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-900">Add New Expense</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">Expense Title *</Label>
            <Input 
              id="title"
              type="text" 
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Stage Decorations" 
              required
              data-testid="input-expense-title"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">₹</span>
                <Input 
                  id="amount"
                  type="number" 
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="pl-8"
                  placeholder="3500" 
                  min="1" 
                  required
                  data-testid="input-expense-amount"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">Date *</Label>
              <Input 
                id="date"
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
                data-testid="input-expense-date"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger data-testid="select-expense-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="decorations">Decorations</SelectItem>
                <SelectItem value="food">Food & Beverages</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="materials">Materials</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">Description</Label>
            <Textarea 
              id="description"
              rows={3} 
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of the expense"
              data-testid="textarea-expense-description"
            />
          </div>

          <div>
            <Label htmlFor="receipt-upload" className="block text-sm font-medium text-gray-700 mb-2">Receipt Upload</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary hover:bg-blue-50 transition-colors cursor-pointer">
              <input 
                type="file" 
                className="hidden" 
                id="receipt-upload" 
                accept="image/*,.pdf" 
                onChange={handleFileChange}
                data-testid="input-receipt-upload"
              />
              <label htmlFor="receipt-upload" className="cursor-pointer">
                <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                <p className="text-sm text-gray-600">Click to upload receipt or drag and drop</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 10MB</p>
              </label>
            </div>
            {selectedFile && (
              <div className="mt-3">
                <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <i className="fas fa-file text-green-600 mr-3"></i>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900" data-testid="text-selected-filename">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={removeFile}
                    className="text-red-600 hover:text-red-800"
                    data-testid="button-remove-file"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-4 pt-4">
            <Button 
              type="button" 
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              data-testid="button-cancel-expense"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={addExpenseMutation.isPending}
              className="flex-1 bg-primary text-white hover:bg-primary-dark"
              data-testid="button-add-expense"
            >
              {addExpenseMutation.isPending ? "Adding..." : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
