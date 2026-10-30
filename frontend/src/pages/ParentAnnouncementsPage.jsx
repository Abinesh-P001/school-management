import React, { useState, useMemo } from 'react';
import {
  Bell,
  Search,
  Filter,
  CheckCircle2,
  Paperclip,
  Download,
  Calendar,
  AlertTriangle,
  FileText,
  X,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function ParentAnnouncementsPage() {
  const {
    announcements,
    unreadAnnouncementsCount,
    markAnnouncementAsRead,
    showToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((ann) => {
      const matchesSearch =
        ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ann.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' || ann.category === selectedCategory;
      const matchesUnread = !unreadOnly || !ann.is_read;

      return matchesSearch && matchesCategory && matchesUnread;
    });
  }, [announcements, searchQuery, selectedCategory, unreadOnly]);

  const handleOpenDetail = (ann) => {
    setSelectedAnnouncement(ann);
    if (!ann.is_read) {
      markAnnouncementAsRead(ann.id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              School Announcements & Bulletins
            </h1>
            {unreadAnnouncementsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-black">
                {unreadAnnouncementsCount} New
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official institutional notices, exam schedules, events, and emergency announcements.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              unreadOnly
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {unreadOnly ? 'Showing Unread Only' : 'Show Unread Only'}
          </button>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bulletins by title, keyword, or content..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600 transition-all"
          />
        </div>

        {/* Category Selector */}
        <div className="flex items-center space-x-2 shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
          >
            <option value="All">All Categories</option>
            <option value="Academic">Academic</option>
            <option value="Event">Event</option>
            <option value="Emergency">Emergency</option>
            <option value="General">General</option>
          </select>
        </div>
      </div>

      {/* Bulletins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredAnnouncements.map((ann) => (
          <div
            key={ann.id}
            onClick={() => handleOpenDetail(ann)}
            className={`group bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden ${
              !ann.is_read
                ? 'border-blue-300 ring-2 ring-blue-500/10'
                : 'border-slate-200 hover:border-blue-200'
            }`}
          >
            {!ann.is_read && (
              <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-blue-600" title="Unread" />
            )}

            <div>
              {/* Category & Priority Badge */}
              <div className="flex items-center space-x-2 mb-3">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[10px]">
                  {ann.category}
                </span>

                <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                  ann.priority.toLowerCase() === 'urgent'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : ann.priority.toLowerCase() === 'high'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {ann.priority} Priority
                </span>
              </div>

              {/* Title & Content */}
              <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-blue-700 transition-colors line-clamp-2">
                {ann.title}
              </h3>

              <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                {ann.content}
              </p>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(ann.publish_date).toLocaleDateString()}</span>
              </span>

              {ann.attachment_name && (
                <span className="flex items-center space-x-1 text-blue-600 font-bold text-[11px]">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Attachment</span>
                </span>
              )}
            </div>
          </div>
        ))}

        {filteredAnnouncements.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-700 text-sm">No Bulletins Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              No bulletins match your active search terms or category filters.
            </p>
          </div>
        )}
      </div>

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[10px]">
                    {selectedAnnouncement.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                    selectedAnnouncement.priority.toLowerCase() === 'urgent'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : selectedAnnouncement.priority.toLowerCase() === 'high'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {selectedAnnouncement.priority} Priority
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900">
                  {selectedAnnouncement.title}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Issued on {new Date(selectedAnnouncement.publish_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })} by <strong>{selectedAnnouncement.author_name || 'Oakridge Administration'}</strong>
                </p>
              </div>

              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line">
              {selectedAnnouncement.content}
            </div>

            {selectedAnnouncement.attachment_name && (
              <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 text-xs text-slate-800 font-semibold truncate pr-2">
                  <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="truncate">{selectedAnnouncement.attachment_name}</span>
                </div>
                <button
                  onClick={() => showToast(`Downloading ${selectedAnnouncement.attachment_name}...`, 'info')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1 shrink-0 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

