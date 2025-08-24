import { Button } from "@/components/ui/button";
import type { Expense } from "../../shared/schema.ts";

interface ExpenseItemProps {
  expense: Expense;
  onDelete: (expenseId: string) => void;
  isLoading: boolean;
}

export default function ExpenseItem({ expense, onDelete, isLoading }: ExpenseItemProps) {
  const handleViewReceipt = () => {
    if (expense.receiptUrl) {
      window.open(expense.receiptUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality
    console.log('Edit expense:', expense.id);
  };

  const handleDelete = () => {
    onDelete(expense.id);
  };

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg" data-testid={`expense-item-${expense.id}`}>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900" data-testid={`expense-title-${expense.id}`}>{expense.title}</h4>
          <span className="text-lg font-bold text-red-600" data-testid={`expense-amount-${expense.id}`}>₹{parseFloat(expense.amount).toLocaleString()}</span>
        </div>
        {expense.description && (
          <p className="text-sm text-gray-600 mb-2" data-testid={`expense-description-${expense.id}`}>{expense.description}</p>
        )}
        <div className="flex items-center text-xs text-gray-500">
          <i className="fas fa-calendar mr-1"></i>
          <span data-testid={`expense-date-${expense.id}`}>{new Date(expense.date).toLocaleDateString()}</span>
          {expense.receiptUrl && (
            <>
              <span className="mx-2">•</span>
              <i className="fas fa-paperclip mr-1"></i>
              <span>Receipt attached</span>
            </>
          )}
          {expense.category && (
            <>
              <span className="mx-2">•</span>
              <span className="capitalize" data-testid={`expense-category-${expense.id}`}>{expense.category}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex space-x-2 ml-4">
        {expense.receiptUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewReceipt}
            className="text-primary hover:text-primary-dark"
            data-testid={`button-view-receipt-${expense.id}`}
          >
            <i className="fas fa-eye"></i>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEdit}
          className="text-gray-400 hover:text-gray-600"
          data-testid={`button-edit-expense-${expense.id}`}
        >
          <i className="fas fa-edit"></i>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isLoading}
          className="text-red-400 hover:text-red-600"
          data-testid={`button-delete-expense-${expense.id}`}
        >
          <i className="fas fa-trash"></i>
        </Button>
      </div>
    </div>
  );
}
