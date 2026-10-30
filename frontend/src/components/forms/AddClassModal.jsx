import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import { useApp } from '../../context/AppContext';

export default function AddClassModal({ isOpen, onClose }) {
  const { addClass, teachers, showToast } = useApp();
  const [formData, setFormData] = useState({
    name: 'Grade 10',
    section: 'C',
    room: 'Building A - Room 104',
    classTeacher: teachers[0]?.name || 'Dr. Robert Langdon',
    capacity: 35
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.section.trim()) {
      setError('Please provide both Class Name and Section.');
      return;
    }

    try {
      setIsSubmitting(true);
      await addClass({
        ...formData,
        capacity: Number(formData.capacity)
      });
      showToast(`Class ${formData.name} - Section ${formData.section} created successfully!`, 'success');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create class.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Class / Section">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Class / Grade <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
            >
              <option value="Grade 7">Grade 7</option>
              <option value="Grade 8">Grade 8</option>
              <option value="Grade 9">Grade 9</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 11">Grade 11</option>
              <option value="Grade 12">Grade 12</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Section <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. A, B, or C"
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 font-semibold placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Room / Location <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Building B - Room 302"
            value={formData.room}
            onChange={(e) => setFormData({ ...formData, room: e.target.value })}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 font-semibold placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Class Teacher / Mentor <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.classTeacher}
              onChange={(e) => setFormData({ ...formData, classTeacher: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
            >
              {teachers.map(t => (
                <option key={t.id} value={t.name}>{t.name} ({t.department})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Max Seat Capacity <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="10"
              max="60"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 font-semibold placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>
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
            <span>Save Class Section</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
