import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bookmark, Trash2, Copy, Check, Search, Download, Edit3, MapPin, Tag, Calendar, ExternalLink } from 'lucide-react';
import { SavedResource } from '../types';

interface SavedResourcesSectionProps {
  savedResources: SavedResource[];
  onRemoveResource: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onClearAll: () => void;
  onSelectCategoryFilter?: (cat: string) => void;
}

export const SavedResourcesSection: React.FC<SavedResourcesSectionProps> = ({
  savedResources,
  onRemoveResource,
  onUpdateNotes,
  onClearAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [allCopied, setAllCopied] = useState(false);

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(savedResources.map(r => r.category).filter(Boolean))) as string[]];

  const filteredResources = savedResources.filter(r => {
    const matchesCategory = selectedCategory === 'All' || r.category === selectedCategory;
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.notes && r.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.zipCode && r.zipCode.includes(searchQuery));
    return matchesCategory && matchesSearch;
  });

  const handleCopy = (resource: SavedResource) => {
    const textToCopy = `Resource: ${resource.title}\n${resource.category ? `Category: ${resource.category}\n` : ''}${resource.zipCode ? `Location/ZIP: ${resource.zipCode}\n` : ''}${resource.notes ? `Personal Notes: ${resource.notes}\n` : ''}\nDetails:\n${resource.content}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(resource.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportAll = () => {
    if (savedResources.length === 0) return;
    const exportText = savedResources.map((r, idx) => (
      `=== ${idx + 1}. ${r.title} ===\n` +
      `Category: ${r.category || 'General'}\n` +
      `Saved: ${new Date(r.savedAt).toLocaleString()}\n` +
      (r.zipCode ? `ZIP: ${r.zipCode}\n` : '') +
      (r.notes ? `Notes: ${r.notes}\n` : '') +
      `\nDetails:\n${r.content}\n`
    )).join('\n----------------------------------------\n\n');

    navigator.clipboard.writeText(exportText);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2500);
  };

  const handleStartEditingNotes = (r: SavedResource) => {
    setEditingNotesId(r.id);
    setNotesDraft(r.notes || '');
  };

  const handleSaveNotes = (id: string) => {
    onUpdateNotes(id, notesDraft.trim());
    setEditingNotesId(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
            <Bookmark className="w-5 h-5 fill-blue-600 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-base flex items-center gap-2">
              Saved Resources
              <span className="text-xs bg-blue-600 text-white font-medium px-2 py-0.5 rounded-full">
                {savedResources.length}
              </span>
            </h2>
            <p className="text-xs text-gray-500">Persists for your current session</p>
          </div>
        </div>

        {savedResources.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportAll}
              title="Copy all saved resources"
              className="px-2.5 py-1 text-xs bg-white hover:bg-gray-100 text-gray-700 font-medium rounded border border-gray-200 flex items-center gap-1 transition"
            >
              {allCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
              {allCopied ? 'Copied All' : 'Copy All'}
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all saved resources?')) {
                  onClearAll();
                }
              }}
              title="Clear all saved resources"
              className="p-1 text-gray-400 hover:text-red-600 rounded transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Search & Category Filter (if items exist) */}
      {savedResources.length > 0 && (
        <div className="p-3 border-b border-gray-100 bg-white space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved resources..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {categories.length > 2 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-full whitespace-nowrap text-xs transition ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content list */}
      <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[300px]">
        {savedResources.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
              <Bookmark className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">No Saved Resources Yet</h3>
            <p className="text-xs text-gray-500 max-w-xs leading-relaxed mb-4">
              When Tom provides housing, treatment centers, recovery meetings, or job listings, click the{' '}
              <span className="inline-flex items-center font-medium text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                <Bookmark className="w-3 h-3 inline mr-1" /> Save
              </span>{' '}
              button on the message to keep it here for fast access.
            </p>
            <div className="text-xs bg-gray-50 border border-dashed border-gray-200 rounded-lg p-3 text-left w-full max-w-xs space-y-1">
              <span className="font-medium text-gray-700 block">💡 Quick Tips:</span>
              <p className="text-gray-500">• Save multiple clinics or shelter contacts</p>
              <p className="text-gray-500">• Add personal notes like intake hours or bus routes</p>
              <p className="text-gray-500">• Copy everything at once with "Copy All"</p>
            </div>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs">
            No saved resources match your search or filter.
          </div>
        ) : (
          filteredResources.map((resource) => (
            <div
              key={resource.id}
              className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-xs hover:border-blue-200 transition group flex flex-col gap-2"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 group-hover:text-blue-700 transition leading-snug">
                    {resource.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-gray-500">
                    {resource.category && (
                      <span className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                        <Tag className="w-3 h-3" />
                        {resource.category}
                      </span>
                    )}
                    {resource.zipCode && (
                      <span className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {resource.zipCode}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-0.5 text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {new Date(resource.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopy(resource)}
                    title="Copy resource details"
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                  >
                    {copiedId === resource.id ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => onRemoveResource(resource.id)}
                    title="Remove from saved"
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card Markdown Content */}
              <div className="bg-gray-50 rounded-md p-2.5 text-xs text-gray-800 overflow-x-auto max-h-48 overflow-y-auto border border-gray-100">
                <div className="prose prose-xs prose-blue max-w-none">
                  <ReactMarkdown>{resource.content}</ReactMarkdown>
                </div>
              </div>

              {/* Personal Notes Section */}
              <div className="pt-1 text-xs">
                {editingNotesId === resource.id ? (
                  <div className="space-y-1.5 bg-yellow-50/60 p-2 rounded-md border border-yellow-200">
                    <label className="text-[11px] font-medium text-yellow-900 block">Personal Note:</label>
                    <textarea
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="e.g., Called intake, appointment at 9am, ask for Sarah..."
                      rows={2}
                      className="w-full text-xs p-1.5 bg-white border border-yellow-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setEditingNotesId(null)}
                        className="px-2 py-0.5 text-[11px] text-gray-600 hover:bg-gray-100 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveNotes(resource.id)}
                        className="px-2 py-0.5 text-[11px] bg-yellow-600 hover:bg-yellow-700 text-white rounded font-medium"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-gray-500 bg-gray-50/50 hover:bg-gray-100/60 px-2 py-1 rounded transition">
                    <span className="text-[11px] truncate flex-1 mr-2">
                      {resource.notes ? (
                        <span className="text-gray-700 font-medium italic">
                          📝 {resource.notes}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">No personal notes added</span>
                      )}
                    </span>
                    <button
                      onClick={() => handleStartEditingNotes(resource)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5 shrink-0"
                    >
                      <Edit3 className="w-3 h-3" />
                      {resource.notes ? 'Edit Note' : 'Add Note'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
