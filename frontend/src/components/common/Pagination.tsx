import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

export interface PaginationProps {
  currentPage: number; // 1-indexed
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  className = '',
  itemLabel = 'bản ghi'
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Safe bounds check
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const fromIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const toIndex = Math.min(safePage * pageSize, totalItems);

  // Generate visible page numbers with smart ellipsis
  const getPageNumbers = (): (number | 'ellipsis-prev' | 'ellipsis-next')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis-prev' | 'ellipsis-next')[] = [];
    pages.push(1);

    const leftBoundary = Math.max(2, safePage - 1);
    const rightBoundary = Math.min(totalPages - 1, safePage + 1);

    if (leftBoundary > 2) {
      pages.push('ellipsis-prev');
    }

    for (let i = leftBoundary; i <= rightBoundary; i++) {
      pages.push(i);
    }

    if (rightBoundary < totalPages - 1) {
      pages.push('ellipsis-next');
    }

    pages.push(totalPages);
    return pages;
  };

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== safePage) {
      onPageChange(page);
    }
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-3 sm:px-6 bg-slate-50/70 border-t border-slate-200 rounded-b-2xl ${className}`}
    >
      {/* Left: Summary info & Page size selector */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span>
          Hiển thị{' '}
          <strong className="font-bold text-slate-900">
            {fromIndex} - {toIndex}
          </strong>{' '}
          trong tổng số{' '}
          <strong className="font-bold text-slate-900">{totalItems}</strong>{' '}
          {itemLabel}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
            <label htmlFor="page-size-select" className="text-slate-500 whitespace-nowrap">
              Cỡ trang:
            </label>
            <select
              id="page-size-select"
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1); // Always reset to page 1 on page size change
              }}
              className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer shadow-2xs"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Pagination Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          onClick={() => handlePageClick(1)}
          disabled={safePage <= 1}
          aria-label="Trang đầu"
          title="Trang đầu"
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 disabled:cursor-not-allowed transition cursor-pointer"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => handlePageClick(safePage - 1)}
          disabled={safePage <= 1}
          aria-label="Trang trước"
          title="Trang trước"
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 disabled:cursor-not-allowed transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (p === 'ellipsis-prev' || p === 'ellipsis-next') {
              return (
                <span
                  key={`${p}-${idx}`}
                  className="px-2 py-1 text-slate-400 text-xs font-semibold select-none"
                >
                  ...
                </span>
              );
            }

            const isActive = p === safePage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => handlePageClick(p)}
                aria-label={`Trang ${p}`}
                aria-current={isActive ? 'page' : undefined}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => handlePageClick(safePage + 1)}
          disabled={safePage >= totalPages}
          aria-label="Trang sau"
          title="Trang sau"
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 disabled:cursor-not-allowed transition cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => handlePageClick(totalPages)}
          disabled={safePage >= totalPages}
          aria-label="Trang cuối"
          title="Trang cuối"
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 disabled:cursor-not-allowed transition cursor-pointer"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
