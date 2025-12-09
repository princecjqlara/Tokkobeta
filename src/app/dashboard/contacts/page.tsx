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
    User
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

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

    const handleSelectAll = () => {
        if (selectedIds.size === contacts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(contacts.map(c => c.id)));
        }
    };

    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkAddTags = async () => {
        if (selectedIds.size === 0 || selectedTagIds.size === 0) return;

        setActionLoading(true);
        try {
            await fetch(`/api/pages/${selectedPageId}/contacts/bulk-add-tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contactIds: Array.from(selectedIds),
                    tagIds: Array.from(selectedTagIds)
                })
            });

            setShowAddTagsModal(false);
            setSelectedTagIds(new Set());
            await fetchContacts();
        } catch (error) {
            console.error('Error adding tags:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkRemoveTags = async () => {
        if (selectedIds.size === 0 || selectedTagIds.size === 0) return;

        setActionLoading(true);
        try {
            await fetch(`/api/pages/${selectedPageId}/contacts/bulk-remove-tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contactIds: Array.from(selectedIds),
                    tagIds: Array.from(selectedTagIds)
                })
            });

            setShowRemoveTagsModal(false);
            setSelectedTagIds(new Set());
            await fetchContacts();
        } catch (error) {
            console.error('Error removing tags:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkMessage = async () => {
        if (selectedIds.size === 0 || !messageText.trim()) return;

        setActionLoading(true);
        try {
            await fetch('/api/facebook/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pageId: selectedPageId,
                    contactIds: Array.from(selectedIds),
                    messageText: messageText.trim()
                })
            });

            setShowMessageModal(false);
            setMessageText('');
            setSelectedIds(new Set());
        } catch (error) {
            console.error('Error sending messages:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        setActionLoading(true);
        try {
            await fetch(`/api/pages/${selectedPageId}/contacts/bulk`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contactIds: Array.from(selectedIds)
                })
            });

            setShowDeleteModal(false);
            setSelectedIds(new Set());
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
                            setSelectedIds(new Set());
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
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 border-l border-[#2a2a3a] pl-4">
                            <span className="text-sm text-gray-400">
                                {selectedIds.size} selected
                            </span>
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

            {/* Table */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th className="w-12">
                                <input
                                    type="checkbox"
                                    checked={contacts.length > 0 && selectedIds.size === contacts.length}
                                    onChange={handleSelectAll}
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
                                <tr key={contact.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(contact.id)}
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
                    Select tags to add to {selectedIds.size} contact(s).
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
                    Select tags to remove from {selectedIds.size} contact(s).
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
                    Send a message to {selectedIds.size} contact(s).
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
                    Are you sure you want to delete {selectedIds.size} contact(s)? This action cannot be undone.
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
