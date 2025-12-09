'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import {
    Search,
    Filter,
    RefreshCw,
    Trash2,
    Tag,
    MessageSquare,
    Check,
    X,
    User,
    CheckSquare
} from 'lucide-react';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import { Contact, Tag as TagType, Page, PaginatedResponse } from '@/types';

export default function ContactsPage() {
    const { data: session } = useSession();
    const [pages, setPages] = useState<Page[]>([]);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [tags, setTags] = useState<TagType[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [total, setTotal] = useState(0);

    // Filters
    const [search, setSearch] = useState('');
    const [selectedTagFilter, setSelectedTagFilter] = useState('');

    // Selection - now supports "select all" across pagination
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectAllMode, setSelectAllMode] = useState(false); // true = all matching contacts selected
    const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set()); // IDs to exclude when selectAllMode is true

    // Modals
    const [showAddTagsModal, setShowAddTagsModal] = useState(false);
    const [showRemoveTagsModal, setShowRemoveTagsModal] = useState(false);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Action states
    const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
    const [messageText, setMessageText] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchPages();
    }, []);

    useEffect(() => {
        if (selectedPageId) {
            fetchContacts();
            fetchTags();
        }
    }, [selectedPageId, page, pageSize, search, selectedTagFilter]);

    const fetchPages = async () => {
        try {
            const res = await fetch('/api/pages');
            const data = await res.json();
            setPages(data.pages || []);
            if (data.pages?.length > 0) {
                setSelectedPageId(data.pages[0].id);
            }
        } catch (error) {
            console.error('Error fetching pages:', error);
        }
    };

    const fetchContacts = useCallback(async () => {
        if (!selectedPageId) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                ...(search && { search }),
                ...(selectedTagFilter && { tagId: selectedTagFilter })
            });

            const res = await fetch(`/api/pages/${selectedPageId}/contacts?${params}`);
            const data: PaginatedResponse<Contact> = await res.json();

            setContacts(data.items || []);
            setTotal(data.total || 0);
        } catch (error) {
            console.error('Error fetching contacts:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedPageId, page, pageSize, search, selectedTagFilter]);

    const fetchTags = async () => {
        if (!selectedPageId) return;

        try {
            const res = await fetch(`/api/tags?scope=all&pageId=${selectedPageId}&pageSize=100`);
            const data = await res.json();
            setTags(data.items || []);
        } catch (error) {
            console.error('Error fetching tags:', error);
        }
    };

    // Fetch all contact IDs for bulk operations when selectAllMode is true
    const fetchAllContactIds = async (): Promise<string[]> => {
        if (!selectedPageId) return [];

        try {
            // Fetch all IDs (without pagination limit)
            const params = new URLSearchParams({
                page: '1',
                pageSize: '10000', // Large number to get all
                ...(search && { search }),
                ...(selectedTagFilter && { tagId: selectedTagFilter })
            });

            const res = await fetch(`/api/pages/${selectedPageId}/contacts?${params}`);
            const data: PaginatedResponse<Contact> = await res.json();

            let allIds = data.items.map(c => c.id);

            // Remove excluded IDs
            if (excludedIds.size > 0) {
                allIds = allIds.filter(id => !excludedIds.has(id));
            }

            return allIds;
        } catch (error) {
            console.error('Error fetching all contact IDs:', error);
            return [];
        }
    };

    const handleSync = async () => {
        if (!selectedPageId || syncing) return;

        setSyncing(true);
        try {
            await fetch(`/api/pages/${selectedPageId}/sync`, { method: 'POST' });
            await fetchContacts();
        } catch (error) {
            console.error('Error syncing:', error);
        } finally {
            setSyncing(false);
        }
    };

    // Get effective selection count
    const getSelectionCount = () => {
        if (selectAllMode) {
            return total - excludedIds.size;
        }
        return selectedIds.size;
    };

    // Check if a contact is selected
    const isSelected = (id: string) => {
        if (selectAllMode) {
            return !excludedIds.has(id);
        }
        return selectedIds.has(id);
    };

    // Handle selecting all on current page
    const handleSelectAllOnPage = () => {
        if (selectAllMode) {
            // If in select all mode, toggle to deselect all
            setSelectAllMode(false);
            setExcludedIds(new Set());
            setSelectedIds(new Set());
        } else {
            // Check if all on page are selected
            const allOnPageSelected = contacts.every(c => selectedIds.has(c.id));
            if (allOnPageSelected) {
                // Deselect all on this page
                const newSelected = new Set(selectedIds);
                contacts.forEach(c => newSelected.delete(c.id));
                setSelectedIds(newSelected);
            } else {
                // Select all on this page
                const newSelected = new Set(selectedIds);
                contacts.forEach(c => newSelected.add(c.id));
                setSelectedIds(newSelected);
            }
        }
    };

    // Handle "Select All X contacts" button
    const handleSelectAllAcrossPages = () => {
        setSelectAllMode(true);
        setExcludedIds(new Set());
        setSelectedIds(new Set());
    };

    // Handle individual contact selection
    const handleSelect = (id: string) => {
        if (selectAllMode) {
            // In select all mode, toggle the excluded set
            const newExcluded = new Set(excludedIds);
            if (newExcluded.has(id)) {
                newExcluded.delete(id);
            } else {
                newExcluded.add(id);
            }
            setExcludedIds(newExcluded);

            // If all are excluded, exit select all mode
            if (newExcluded.size >= total) {
                setSelectAllMode(false);
                setExcludedIds(new Set());
            }
        } else {
            const newSelected = new Set(selectedIds);
            if (newSelected.has(id)) {
                newSelected.delete(id);
            } else {
                newSelected.add(id);
            }
            setSelectedIds(newSelected);
        }
    };

    // Clear selection
    const clearSelection = () => {
        setSelectAllMode(false);
        setSelectedIds(new Set());
        setExcludedIds(new Set());
    };

    // Get contact IDs for bulk operation
    const getSelectedContactIds = async (): Promise<string[]> => {
        if (selectAllMode) {
            return await fetchAllContactIds();
        }
        return Array.from(selectedIds);
    };

    const handleBulkAddTags = async () => {
        if (getSelectionCount() === 0 || selectedTagIds.size === 0) return;

        setActionLoading(true);
        try {
            const contactIds = await getSelectedContactIds();

            await fetch(`/api/pages/${selectedPageId}/contacts/bulk-add-tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contactIds,
                    tagIds: Array.from(selectedTagIds)
                })
            });

            setShowAddTagsModal(false);
            setSelectedTagIds(new Set());
            clearSelection();
            await fetchContacts();
        } catch (error) {
            console.error('Error adding tags:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkRemoveTags = async () => {
        if (getSelectionCount() === 0 || selectedTagIds.size === 0) return;

        setActionLoading(true);
        try {
            const contactIds = await getSelectedContactIds();

            await fetch(`/api/pages/${selectedPageId}/contacts/bulk-remove-tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contactIds,
                    tagIds: Array.from(selectedTagIds)
                })
            });

            setShowRemoveTagsModal(false);
            setSelectedTagIds(new Set());
            clearSelection();
            await fetchContacts();
        } catch (error) {
            console.error('Error removing tags:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkMessage = async () => {
        if (getSelectionCount() === 0 || !messageText.trim()) return;

        setActionLoading(true);
        try {
            const contactIds = await getSelectedContactIds();

            await fetch('/api/facebook/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pageId: selectedPageId,
                    contactIds,
                    messageText: messageText.trim()
                })
            });

            setShowMessageModal(false);
            setMessageText('');
            clearSelection();
        } catch (error) {
            console.error('Error sending messages:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (getSelectionCount() === 0) return;

        setActionLoading(true);
        try {
            const contactIds = await getSelectedContactIds();

            await fetch(`/api/pages/${selectedPageId}/contacts/bulk`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contactIds })
            });

            setShowDeleteModal(false);
            clearSelection();
            await fetchContacts();
        } catch (error) {
            console.error('Error deleting contacts:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const toggleTagSelection = (tagId: string) => {
        const newSelected = new Set(selectedTagIds);
        if (newSelected.has(tagId)) {
            newSelected.delete(tagId);
        } else {
            newSelected.add(tagId);
        }
        setSelectedTagIds(newSelected);
    };

    // Check if all on current page are selected
    const allOnPageSelected = contacts.length > 0 && contacts.every(c => isSelected(c.id));

    return (
        <div className="page-enter">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Contacts</h1>
                    <p className="text-gray-400 mt-1">
                        Manage and organize your page contacts
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={selectedPageId || ''}
                        onChange={(e) => {
                            setSelectedPageId(e.target.value);
                            setPage(1);
                            clearSelection();
                        }}
                        className="select py-2 px-4"
                    >
                        {pages.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="btn btn-secondary"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        Sync
                    </button>
                </div>
            </div>

            {/* Filters & Actions Bar */}
            <div className="card p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                                clearSelection();
                            }}
                            className="input pl-10"
                        />
                    </div>

                    {/* Tag Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={selectedTagFilter}
                            onChange={(e) => {
                                setSelectedTagFilter(e.target.value);
                                setPage(1);
                                clearSelection();
                            }}
                            className="select py-2 px-3 w-auto"
                        >
                            <option value="">All Tags</option>
                            {tags.map((tag) => (
                                <option key={tag.id} value={tag.id}>
                                    {tag.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Bulk Actions */}
                    {getSelectionCount() > 0 && (
                        <div className="flex items-center gap-2 border-l border-[#2a2a3a] pl-4">
                            <span className="text-sm text-gray-400">
                                {selectAllMode ? (
                                    <span className="text-indigo-400 font-medium">
                                        All {getSelectionCount()} contacts selected
                                    </span>
                                ) : (
                                    `${getSelectionCount()} selected`
                                )}
                            </span>
                            <button
                                onClick={clearSelection}
                                className="btn btn-ghost py-1 px-2 text-xs"
                            >
                                Clear
                            </button>
                            <button
                                onClick={() => setShowAddTagsModal(true)}
                                className="btn btn-secondary py-1.5 px-3 text-sm"
                            >
                                <Tag className="w-3.5 h-3.5" />
                                Add Tags
                            </button>
                            <button
                                onClick={() => setShowRemoveTagsModal(true)}
                                className="btn btn-secondary py-1.5 px-3 text-sm"
                            >
                                <X className="w-3.5 h-3.5" />
                                Remove Tags
                            </button>
                            <button
                                onClick={() => setShowMessageModal(true)}
                                className="btn btn-primary py-1.5 px-3 text-sm"
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Send Message
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="btn btn-danger py-1.5 px-3 text-sm"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Select All Banner */}
            {selectedIds.size > 0 && !selectAllMode && total > contacts.length && (
                <div className="card p-3 mb-4 bg-indigo-600/10 border-indigo-500/30 flex items-center justify-between">
                    <span className="text-sm text-gray-300">
                        {selectedIds.size} contacts on this page selected.
                    </span>
                    <button
                        onClick={handleSelectAllAcrossPages}
                        className="btn btn-primary py-1.5 px-4 text-sm"
                    >
                        <CheckSquare className="w-4 h-4" />
                        Select all {total} contacts
                    </button>
                </div>
            )}

            {selectAllMode && excludedIds.size > 0 && (
                <div className="card p-3 mb-4 bg-yellow-600/10 border-yellow-500/30">
                    <span className="text-sm text-gray-300">
                        All contacts selected except {excludedIds.size} that you unchecked.
                    </span>
                </div>
            )}

            {/* Table */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th className="w-12">
                                <input
                                    type="checkbox"
                                    checked={allOnPageSelected}
                                    onChange={handleSelectAllOnPage}
                                    className="checkbox"
                                />
                            </th>
                            <th>Contact</th>
                            <th>Tags</th>
                            <th>Last Interaction</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="text-center py-12">
                                    <div className="spinner w-6 h-6 mx-auto"></div>
                                </td>
                            </tr>
                        ) : contacts.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center py-12">
                                    <div className="empty-state">
                                        <User className="empty-state-icon" />
                                        <p className="empty-state-title">No contacts found</p>
                                        <p className="empty-state-description">
                                            Try syncing your page or adjusting your filters.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            contacts.map((contact) => (
                                <tr key={contact.id} className={isSelected(contact.id) ? 'bg-indigo-600/5' : ''}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={isSelected(contact.id)}
                                            onChange={() => handleSelect(contact.id)}
                                            className="checkbox"
                                        />
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            {contact.profile_pic ? (
                                                <img
                                                    src={contact.profile_pic}
                                                    alt={contact.name || 'Contact'}
                                                    className="w-10 h-10 rounded-full"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                                                    <User className="w-5 h-5 text-gray-400" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-white">
                                                    {contact.name || 'Unknown'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    PSID: {contact.psid.slice(0, 8)}...
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-wrap gap-1">
                                            {contact.tags?.slice(0, 3).map((tag) => (
                                                <span
                                                    key={tag.id}
                                                    className="badge"
                                                    style={{
                                                        backgroundColor: `${tag.color}20`,
                                                        color: tag.color
                                                    }}
                                                >
                                                    {tag.name}
                                                </span>
                                            ))}
                                            {(contact.tags?.length || 0) > 3 && (
                                                <span className="badge badge-primary">
                                                    +{(contact.tags?.length || 0) - 3}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="text-gray-400 text-sm">
                                        {contact.last_interaction_at
                                            ? new Date(contact.last_interaction_at).toLocaleDateString()
                                            : 'Never'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                }}
            />

            {/* Add Tags Modal */}
            <Modal
                isOpen={showAddTagsModal}
                onClose={() => {
                    setShowAddTagsModal(false);
                    setSelectedTagIds(new Set());
                }}
                title="Add Tags to Contacts"
            >
                <p className="text-gray-400 mb-4">
                    Select tags to add to {getSelectionCount()} contact(s).
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
                    {tags.map((tag) => (
                        <button
                            key={tag.id}
                            onClick={() => toggleTagSelection(tag.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${selectedTagIds.has(tag.id)
                                ? 'bg-indigo-600/20 border border-indigo-500'
                                : 'bg-[#1a1a24] hover:bg-[#22222e]'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: tag.color }}
                                ></span>
                                <span className="text-white">{tag.name}</span>
                            </span>
                            {selectedTagIds.has(tag.id) && (
                                <Check className="w-4 h-4 text-indigo-400" />
                            )}
                        </button>
                    ))}
                </div>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => {
                            setShowAddTagsModal(false);
                            setSelectedTagIds(new Set());
                        }}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleBulkAddTags}
                        disabled={selectedTagIds.size === 0 || actionLoading}
                        className="btn btn-primary"
                    >
                        {actionLoading ? 'Adding...' : 'Add Tags'}
                    </button>
                </div>
            </Modal>

            {/* Remove Tags Modal */}
            <Modal
                isOpen={showRemoveTagsModal}
                onClose={() => {
                    setShowRemoveTagsModal(false);
                    setSelectedTagIds(new Set());
                }}
                title="Remove Tags from Contacts"
            >
                <p className="text-gray-400 mb-4">
                    Select tags to remove from {getSelectionCount()} contact(s).
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
                    {tags.map((tag) => (
                        <button
                            key={tag.id}
                            onClick={() => toggleTagSelection(tag.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${selectedTagIds.has(tag.id)
                                ? 'bg-red-600/20 border border-red-500'
                                : 'bg-[#1a1a24] hover:bg-[#22222e]'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: tag.color }}
                                ></span>
                                <span className="text-white">{tag.name}</span>
                            </span>
                            {selectedTagIds.has(tag.id) && (
                                <Check className="w-4 h-4 text-red-400" />
                            )}
                        </button>
                    ))}
                </div>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => {
                            setShowRemoveTagsModal(false);
                            setSelectedTagIds(new Set());
                        }}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleBulkRemoveTags}
                        disabled={selectedTagIds.size === 0 || actionLoading}
                        className="btn btn-danger"
                    >
                        {actionLoading ? 'Removing...' : 'Remove Tags'}
                    </button>
                </div>
            </Modal>

            {/* Send Message Modal */}
            <Modal
                isOpen={showMessageModal}
                onClose={() => {
                    setShowMessageModal(false);
                    setMessageText('');
                }}
                title="Send Message"
                size="lg"
            >
                <p className="text-gray-400 mb-4">
                    Send a message to {getSelectionCount()} contact(s).
                </p>
                <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message here..."
                    rows={5}
                    className="input resize-none mb-6"
                />
                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => {
                            setShowMessageModal(false);
                            setMessageText('');
                        }}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleBulkMessage}
                        disabled={!messageText.trim() || actionLoading}
                        className="btn btn-primary"
                    >
                        {actionLoading ? 'Sending...' : 'Send Message'}
                    </button>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete Contacts"
            >
                <p className="text-gray-400 mb-6">
                    Are you sure you want to delete {getSelectionCount()} contact(s)? This action cannot be undone.
                    If these contacts message your page again, they will be recreated.
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => setShowDeleteModal(false)}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleBulkDelete}
                        disabled={actionLoading}
                        className="btn btn-danger"
                    >
                        {actionLoading ? 'Deleting...' : 'Delete Contacts'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
