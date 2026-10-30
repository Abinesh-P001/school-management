import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  Printer,
  FileSpreadsheet
} from 'lucide-react';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import DataTable from '../components/common/DataTable';
import { useApp } from '../context/AppContext';
import RecordFeeModal from '../components/forms/RecordFeeModal';
import { isUserAdmin } from '../utils/permissions';
import { exportToExcel } from '../utils/excelExport';

export default function FeesPage() {
  const { fees, showToast, schoolInfo, currentUser } = useApp();
  const isAdmin = isUserAdmin(currentUser);
  const [statusFilter, setStatusFilter] = useState('All');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState(null);

  // Financial calculations
  const totalCollected = fees
    .filter(f => f.status === 'Paid')
    .reduce((sum, f) => sum + Number(f.amount), 0);

  const totalPending = fees
    .filter(f => f.status === 'Pending')
    .reduce((sum, f) => sum + Number(f.amount), 0);

  const totalOverdue = fees
    .filter(f => f.status === 'Overdue')
    .reduce((sum, f) => sum + Number(f.amount), 0);

  const filteredFees = useMemo(() => {
    return fees.filter((f) => {
      return statusFilter === 'All' || f.status === statusFilter;
    });
  }, [fees, statusFilter]);

  const handleExportExcel = () => {
    try {
      const formattedData = filteredFees.map((fee) => ({
        'Invoice ID': fee.id,
        'Student ID': fee.studentId,
        'Student Name': fee.studentName,
        'Class / Grade': fee.grade,
        'Fee Category': fee.type,
        'Amount (₹ INR)': fee.amount,
        'Due / Issue Date': fee.dueDate,
        'Payment Status': fee.status,
        'Payment Method': fee.paymentMethod,
        'Cleared Date': fee.paidDate || 'Pending'
      }));

      exportToExcel(formattedData, 'Fee_Invoices_Ledger.xlsx', 'Fee_Ledger');
      showToast(`Exported ${filteredFees.length} fee records to Excel!`, 'success');
    } catch (err) {
      showToast(`Failed to export fee records: ${err.message}`, 'error');
    }
  };

  const columns = [
    {
      key: 'id',
      label: 'Invoice #',
      sortable: true,
      render: (fee) => <span className="font-mono font-bold text-slate-900">{fee.id}</span>
    },
    {
      key: 'studentName',
      label: 'Student',
      sortable: true,
      render: (fee) => (
        <div>
          <p className="font-bold text-slate-900">{fee.studentName}</p>
          <p className="text-[11px] text-slate-500 font-medium">{fee.grade} &bull; {fee.studentId}</p>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Fee Category',
      sortable: true,
      render: (fee) => <span className="font-medium text-slate-800">{fee.type}</span>
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (fee) => (
        <span className="font-mono font-bold text-slate-900 text-xs">
          ₹{Number(fee.amount).toLocaleString()}
        </span>
      )
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      sortable: true,
      render: (fee) => <span className="text-slate-600 font-medium">{fee.dueDate}</span>
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (fee) => <Badge text={fee.status} size="xs" />
    },
    {
      key: 'paymentMethod',
      label: 'Payment Method',
      sortable: true,
      render: (fee) => <span className="text-slate-600 font-medium">{fee.paymentMethod}</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      headerClassName: 'text-right',
      className: 'text-right',
      render: (fee) => (
        <button
          onClick={() => setViewingReceipt(fee)}
          className="px-3 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs transition-colors"
        >
          Receipt
        </button>
      )
    }
  ];

  const renderMobileFeeCard = (fee) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3 hover:border-blue-300 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">{fee.id}</span>
          <h4 className="text-sm font-bold text-slate-900">{fee.studentName}</h4>
          <p className="text-[11px] text-slate-500 font-medium">{fee.grade} &bull; {fee.studentId}</p>
        </div>
        <Badge text={fee.status} size="xs" />
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold block">{fee.type}</span>
          <span className="text-[11px] text-slate-600">Due: {fee.dueDate}</span>
        </div>
        <div className="text-right">
          <span className="text-base font-black text-slate-900 block font-mono">₹{Number(fee.amount).toLocaleString()}</span>
          <span className="text-[10px] text-slate-400 font-medium">{fee.paymentMethod}</span>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100">
        <button
          onClick={() => setViewingReceipt(fee)}
          className="w-full py-1.5 px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs transition-colors text-center"
        >
          View Official Receipt
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Fee Management & Invoicing</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Tuition collections, installment statuses, and payment receipts ledger.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors shadow-xs"
            title="Export Fee Ledger to Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export (.xlsx)</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setIsRecordModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Collected</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-emerald-800 mt-2">₹{totalCollected.toLocaleString()}</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Verified payments cleared this term</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Pending Dues</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-amber-800 mt-2">₹{totalPending.toLocaleString()}</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Scheduled for payment by next week</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Overdue Invoices</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-rose-800 mt-2">₹{totalOverdue.toLocaleString()}</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Automated reminders dispatched</p>
        </div>
      </div>

      {/* Modern DataTable */}
      <DataTable
        data={filteredFees}
        columns={columns}
        searchKeys={['id', 'studentName', 'studentId', 'type']}
        searchPlaceholder="Search invoice #, student name, ID, or fee category..."
        defaultPageSize={10}
        mobileCardRender={renderMobileFeeCard}
        emptyTitle="No Fee Records"
        emptyMessage="No fee invoices or payments match your active filters."
        emptyAction={
          isAdmin
            ? {
                label: 'Record Payment',
                icon: PlusCircle,
                onClick: () => setIsRecordModalOpen(true)
              }
            : null
        }
        filterSlot={
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
            >
              <option value="All">All Invoices</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        }
      />

      {/* Official Receipt Modal */}
      {viewingReceipt && (
        <Modal
          isOpen={!!viewingReceipt}
          onClose={() => setViewingReceipt(null)}
          title="Official Fee Receipt"
        >
          <div className="space-y-4 sm:space-y-5 p-1 sm:p-2">
            {/* Header */}
            <div className="text-center pb-3 sm:pb-4 border-b border-slate-200">
              <span className="text-2xl">🎓</span>
              <h2 className="text-base font-extrabold text-slate-900">{schoolInfo.name}</h2>
              <p className="text-xs text-slate-500 font-medium">{schoolInfo.address}</p>
              <div className="inline-block mt-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                Official Payment Receipt
              </div>
            </div>

            {/* Receipt Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
              <div>
                <span className="text-slate-500 block font-bold">Receipt / Invoice No</span>
                <span className="font-mono font-bold text-slate-900">{viewingReceipt.id}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-bold">Issue / Payment Date</span>
                <span className="font-bold text-slate-900">{viewingReceipt.paidDate || viewingReceipt.dueDate}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-bold">Student Name</span>
                <span className="font-bold text-slate-900">{viewingReceipt.studentName}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-bold">Class / Student ID</span>
                <span className="font-bold text-slate-900">{viewingReceipt.grade} ({viewingReceipt.studentId})</span>
              </div>
            </div>

            {/* Itemized row */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-900 pb-2 border-b border-slate-200">
                <span>Description</span>
                <span>Amount</span>
              </div>
              <div className="flex justify-between text-slate-800 font-medium">
                <span>{viewingReceipt.type}</span>
                <span className="font-mono font-bold">₹{Number(viewingReceipt.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Administrative Technology Levy</span>
                <span className="font-mono font-bold text-slate-500">₹0 (Waived)</span>
              </div>
              <div className="flex justify-between font-black text-base text-blue-900 pt-2 border-t border-slate-200">
                <span>Total Amount</span>
                <span>₹{Number(viewingReceipt.amount).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-700 font-medium pt-2">
              <span>Payment Mode: <strong className="text-slate-900">{viewingReceipt.paymentMethod}</strong></span>
              <span>Status: <Badge text={viewingReceipt.status} size="xs" /></span>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  showToast('Preparing PDF download for receipt...', 'info');
                  setViewingReceipt(null);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center space-x-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Download PDF</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Fee Modal */}
      {isAdmin && <RecordFeeModal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} />}
    </div>
  );
}
