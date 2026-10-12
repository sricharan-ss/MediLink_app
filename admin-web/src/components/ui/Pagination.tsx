import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}) => {
  if (totalPages <= 1) return null;

  const startItem = totalItems !== undefined && itemsPerPage !== undefined
    ? (currentPage - 1) * itemsPerPage + 1
    : undefined;
  const endItem = totalItems !== undefined && itemsPerPage !== undefined
    ? Math.min(currentPage * itemsPerPage, totalItems)
    : undefined;

  return (
    <div className="flex items-center justify-between px-2 py-3 border-t border-gray-100">
      <div className="text-xs text-[#607D80]">
        {startItem !== undefined && endItem !== undefined && totalItems !== undefined ? (
          <span>
            Showing <span className="font-medium text-[#263238]">{startItem}</span> to{' '}
            <span className="font-medium text-[#263238]">{endItem}</span> of{' '}
            <span className="font-medium text-[#263238]">{totalItems}</span> results
          </span>
        ) : (
          <span>
            Page {currentPage} of {totalPages}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <span className="text-xs font-medium text-gray-700 px-2">
          {currentPage} / {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
