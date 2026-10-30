import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import { useApp } from '../../context/AppContext';

export default function RecordFeeModal({ isOpen, onClose }) {
  const { recordFeePayment, students, showToast } = useApp();
  const [formData, setFormData] = useState({
    studentName: students[0]?.name || '',
    grade: students[0]?.grade || 'Grade 10',
    type: 'Tuition Fee - Term 2',
    amount: 1450,
    paymentMethod: 'Credit Card',
    notes: 'Paid via administrative cash desk / online gateway'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleStudentChange = (e) => {
    const studentName = e.target.value;
    const selected = students.find(s => s.name === studentName);
    setFormData({
      ...formData,
      studentName,
      grade: selected ? `${selected.grade}-${selected.section}` : formData.grade
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.studentName || !formData.amount) {
      setError('Please select a student and enter a valid payment amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      const selected = students.find(s => s.name === formData.studentName);
      await recordFeePayment({
        ...formData,
        studentId: selected ? selected.id : 'STU-1099',
        amount: Number(formData.amount),
        dueDate: new Date().toISOString().split('T')[0]
      });
      showToast(`Fee payment of ₹${Number(formData.amount).toLocaleString()} recorded successfully!`, 'success');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record fee payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Fee Payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Select Student <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.studentName}
            onChange={handleStudentChange}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
          >
            {students.map(s => (
              <option key={s.id} value={s.name}>
                {s.name} ({s.grade}-{s.section}) - Fee Status: {s.feesStatus}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Fee Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
            >
              <option value="Tuition Fee - Term 2">Tuition Fee - Term 2</option>
              <option value="Laboratory & Technology Fee">Laboratory & Technology Fee</option>
              <option value="Transportation / Bus Fee">Transportation / Bus Fee</option>
              <option value="Annual Sports & Arts Fee">Annual Sports & Arts Fee</option>
              <option value="Examination Fee">Examination Fee</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Amount (₹ INR) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 font-semibold placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Payment Method <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
          >
            <option value="Credit Card">Credit Card</option>
            <option value="Debit Card">Debit Card</option>
            <option value="Bank Transfer">Bank Transfer (ACH / Wire)</option>
            <option value="Cash Counter">Cash Counter</option>
            <option value="Cheque">Bank Cheque</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Receipt Notes / Transaction Reference
          </label>
          <input
            type="text"
            placeholder="e.g. TXN-8932489 or Front Desk Receipt"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 font-semibold placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:space-x-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors text-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 active:bg-blue-800 shadow-xs transition-colors text-center inline-flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
            <span>Record & Issue Receipt</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
