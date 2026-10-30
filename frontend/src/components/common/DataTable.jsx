import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Inbox
} from 'lucide-react';

export default function DataTable({
  data = [],
  columns = [],
  searchable = true,
  searchKeys = [],
  searchPlaceholder = 'Search records...',
  defaultPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  filterSlot = null,
  actionsSlot = null,
  mobileCardRender = null,
  emptyTitle = 'No records found',
  emptyMessage = 'There are no items matching your current filters or query.',
  emptyAction = null,
  keyExtractor = (item, index) => item.id || index
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Search filter
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.trim().toLowerCase();

    return data.filter(item => {
      if (searchKeys.length > 0) {
        return searchKeys.some(k => {
          const val = typeof k === 'function' ? k(item) : item[k];
          return val ? String(val).toLowerCase().includes(query) : false;
        });
      }
      // Default: inspect all scalar fields
      return Object.values(item).some(val => {
        if (typeof val === 'string' || typeof val === 'number') {
          return String(val).toLowerCase().includes(query);
        }
        return false;
      });
    });
  }, [data, searchQuery, searchKeys]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Pagination
  const totalEntries = sortedData.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedData = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, safePage, pageSize]);

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const startEntry = totalEntries === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endEntry = Math.min(safePage * pageSize, totalEntries);

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Control Strip */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        {searchable && (
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs font-medium text-slate-900 bg-slate-50 placeholder-slate-400 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Filter slot + Actions slot */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 justify-end">
          {filterSlot}
          {actionsSlot}
        </div>
      </div>

      {/* Mobile Card Render (if provided) */}
      {mobileCardRender && (
        <div className="block md:hidden space-y-3">
          {paginatedData.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">{emptyTitle}</h3>
              <p className="text-xs text-slate-500 mt-1">{emptyMessage}</p>
              {emptyAction && (
                <button
                  onClick={emptyAction.onClick}
                  className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  {emptyAction.icon && <emptyAction.icon className="w-4 h-4 mr-1" />}
                  <span>{emptyAction.label}</span>
                </button>
              )}
            </div>
          ) : (
            paginatedData.map((item, idx) => (
              <div key={keyExtractor(item, idx)}>
                {mobileCardRender(item, idx)}
              </div>
            ))
          )}
        </div>
      )}

      {/* Desktop / Standard Table View */}
      <div
        className={`${
          mobileCardRender ? 'hidden md:block' : 'block'
        } bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                {columns.map((col) => {
                  const isSorted = sortColumn === col.key;
                  return (
                    <th
                      key={col.key}
                      onClick={() => col.sortable && handleSort(col.key)}
                      className={`px-4 py-3.5 select-none ${
                        col.sortable
                          ? 'cursor-pointer hover:bg-slate-100 transition-colors'
                          : ''
                      } ${col.headerClassName || ''}`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <span>{col.label}</span>
                        {col.sortable && (
                          <span className="shrink-0 text-slate-400">
                            {isSorted ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">{emptyTitle}</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{emptyMessage}</p>
                    {emptyAction && (
                      <button
                        onClick={emptyAction.onClick}
                        className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
                      >
                        {emptyAction.icon && <emptyAction.icon className="w-4 h-4 mr-1" />}
                        <span>{emptyAction.label}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, idx) => (
                  <tr
                    key={keyExtractor(item, idx)}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3.5 ${col.className || ''}`}
                      >
                        {col.render ? col.render(item, idx) : item[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination & Status Footer */}
      {totalEntries > 0 && (
        <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          {/* Entries summary */}
          <div className="flex items-center space-x-2">
            <span>
              Showing <strong className="text-slate-900">{startEntry}</strong> to{' '}
              <strong className="text-slate-900">{endEntry}</strong> of{' '}
              <strong className="text-slate-900">{totalEntries}</strong> entries
            </span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center space-x-1.5">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:border-blue-600"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Page controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2.5 py-1 text-xs font-bold text-slate-800">
              Page {safePage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

