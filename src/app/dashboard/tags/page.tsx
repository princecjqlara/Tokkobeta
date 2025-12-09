'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Tag as TagIcon } from 'lucide-react';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import { Tag, Page, PaginatedResponse } from '@/types';

const TAG_COLORS = [
    '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e',
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6'
];

export default function TagsPage() {
    const { data: session } = useSession();
    const [pages, setPages] = useState<Page[]>([]);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [total, setTotal] = useState(0);

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

    // Form state
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [tagName, setTagName] = useState('');
    const [tagColor, setTagColor] = useState(TAG_COLORS[0]);
    const [tagOwnerType, setTagOwnerType] = useState<'user' | 'page'>('page');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchPages();
    }, []);

    useEffect(() => {
        if (selectedPageId || session?.user?.id) {
            fetchTags();
        }
    }, [selectedPageId, page, pageSize, session]);

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

    const fetchTags = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                scope: 'all',
                ...(selectedPageId && { pageId: selectedPageId })
            });

            const res = await fetch(`/api/tags?${params}`);
            const data: PaginatedResponse<Tag> = await res.json();

            setTags(data.items || []);
            setTotal(data.total || 0);
        } catch (error) {
            console.error('Error fetching tags:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedIds.size === tags.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(tags.map(t => t.id)));
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

    const handleCreate = async () => {
        if (!tagName.trim()) return;

        setActionLoading(true);
        try {
            const ownerId = tagOwnerType === 'page' ? selectedPageId : session?.user?.id;

            await fetch('/api/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: tagName.trim(),
                    color: tagColor,
                    ownerType: tagOwnerType,
                    ownerId,
                    pageId: selectedPageId
                })
            });

            setShowCreateModal(false);
            setTagName('');
            setTagColor(TAG_COLORS[0]);
            await fetchTags();
        } catch (error) {
            console.error('Error creating tag:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleEdit = async () => {
        if (!editingTag || !tagName.trim()) return;

        setActionLoading(true);
        try {
            await fetch('/api/tags', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingTag.id,
                    name: tagName.trim(),
                    color: tagColor
                })
            });

            setShowEditModal(false);
            setEditingTag(null);
            setTagName('');
            await fetchTags();
        } catch (error) {
            console.error('Error updating tag:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!editingTag) return;

        setActionLoading(true);
        try {
            await fetch(`/api/tags?id=${editingTag.id}`, {
                method: 'DELETE'
            });

            setShowDeleteModal(false);
            setEditingTag(null);
            await fetchTags();
        } catch (error) {
            console.error('Error deleting tag:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        setActionLoading(true);
        try {
            await fetch('/api/tags/bulk', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tagIds: Array.from(selectedIds)
                })
            });

            setShowBulkDeleteModal(false);
            setSelectedIds(new Set());
            await fetchTags();
        } catch (error) {
            console.error('Error bulk deleting tags:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const openEditModal = (tag: Tag) => {
        setEditingTag(tag);
        setTagName(tag.name);
        setTagColor(tag.color);
        setShowEditModal(true);
    };

    const openDeleteModal = (tag: Tag) => {
        setEditingTag(tag);
        setShowDeleteModal(true);
    };

    const getOwnerTypeLabel = (tag: Tag) => {
        switch (tag.owner_type) {
            case 'user': return 'Personal';
            case 'page': return 'Page';
            case 'business': return 'Business';
            default: return tag.owner_type;
        }
    };

    return (
        <div className="page-enter">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Tags</h1>
                    <p className="text-gray-400 mt-1">
                        Create and manage tags to organize your contacts
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
                        onClick={() => {
                            setTagName('');
                            setTagColor(TAG_COLORS[0]);
                            setTagOwnerType('page');
                            setShowCreateModal(true);
                        }}
                        className="btn btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        Create Tag
                    </button>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
                <div className="card p-4 mb-6 flex items-center gap-4">
                    <span className="text-sm text-gray-400">
                        {selectedIds.size} tag(s) selected
                    </span>
                    <button
                        onClick={() => setShowBulkDeleteModal(true)}
                        className="btn btn-danger py-1.5 px-3 text-sm"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Selected
                    </button>
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="btn btn-ghost py-1.5 px-3 text-sm"
                    >
                        Clear Selection
                    </button>
                </div>
            )}

            {/* Tags Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="spinner w-8 h-8"></div>
                </div>
            ) : tags.length === 0 ? (
                <div className="card p-12 text-center">
                    <TagIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No tags yet</h3>
                    <p className="text-gray-400 mb-6">
                        Create your first tag to start organizing contacts.
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        Create Tag
                    </button>
                </div>
            ) : (
                <>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="w-12">
                                        <input
                                            type="checkbox"
                                            checked={tags.length > 0 && selectedIds.size === tags.length}
                                            onChange={handleSelectAll}
                                            className="checkbox"
                                        />
                                    </th>
                                    <th>Tag</th>
                                    <th>Type</th>
                                    <th>Created</th>
                                    <th className="w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tags.map((tag) => (
                                    <tr key={tag.id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(tag.id)}
                                                onChange={() => handleSelect(tag.id)}
                                                className="checkbox"
                                            />
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className="w-4 h-4 rounded-full"
                                                    style={{ backgroundColor: tag.color }}
                                                ></span>
                                                <span className="font-medium text-white">{tag.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${tag.owner_type === 'user' ? 'badge-primary' :
                                                    tag.owner_type === 'page' ? 'badge-success' :
                                                        'badge-warning'
                                                }`}>
                                                {getOwnerTypeLabel(tag)}
                                            </span>
                                        </td>
                                        <td className="text-gray-400 text-sm">
                                            {new Date(tag.created_at).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openEditModal(tag)}
                                                    className="btn btn-ghost p-2"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(tag)}
                                                    className="btn btn-ghost p-2 text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

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
                </>
            )}

            {/* Create Tag Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Create Tag"
            >
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Tag Name
                        </label>
                        <input
                            type="text"
                            value={tagName}
                            onChange={(e) => setTagName(e.target.value)}
                            placeholder="Enter tag name"
                            className="input"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Color
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {TAG_COLORS.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => setTagColor(color)}
                                    className={`w-8 h-8 rounded-lg transition-all ${tagColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#12121a]' : ''
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Tag Type
                        </label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setTagOwnerType('page')}
                                className={`flex-1 p-3 rounded-lg text-center transition-colors ${tagOwnerType === 'page'
                                        ? 'bg-indigo-600/20 border border-indigo-500 text-white'
                                        : 'bg-[#1a1a24] text-gray-400 hover:bg-[#22222e]'
                                    }`}
                            >
                                <p className="font-medium">Page Tag</p>
                                <p className="text-xs mt-1 text-gray-500">Shared with all page users</p>
                            </button>
                            <button
                                onClick={() => setTagOwnerType('user')}
                                className={`flex-1 p-3 rounded-lg text-center transition-colors ${tagOwnerType === 'user'
                                        ? 'bg-indigo-600/20 border border-indigo-500 text-white'
                                        : 'bg-[#1a1a24] text-gray-400 hover:bg-[#22222e]'
                                    }`}
                            >
                                <p className="font-medium">Personal Tag</p>
                                <p className="text-xs mt-1 text-gray-500">Only visible to you</p>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => setShowCreateModal(false)}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!tagName.trim() || actionLoading}
                        className="btn btn-primary"
                    >
                        {actionLoading ? 'Creating...' : 'Create Tag'}
                    </button>
                </div>
            </Modal>

            {/* Edit Tag Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingTag(null);
                }}
                title="Edit Tag"
            >
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Tag Name
                        </label>
                        <input
                            type="text"
                            value={tagName}
                            onChange={(e) => setTagName(e.target.value)}
                            placeholder="Enter tag name"
                            className="input"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Color
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {TAG_COLORS.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => setTagColor(color)}
                                    className={`w-8 h-8 rounded-lg transition-all ${tagColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#12121a]' : ''
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => {
                            setShowEditModal(false);
                            setEditingTag(null);
                        }}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleEdit}
                        disabled={!tagName.trim() || actionLoading}
                        className="btn btn-primary"
                    >
                        {actionLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </Modal>

            {/* Delete Tag Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setEditingTag(null);
                }}
                title="Delete Tag"
            >
                <p className="text-gray-400 mb-6">
                    Are you sure you want to delete the tag &quot;{editingTag?.name}&quot;?
                    This will remove it from all contacts.
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => {
                            setShowDeleteModal(false);
                            setEditingTag(null);
                        }}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={actionLoading}
                        className="btn btn-danger"
                    >
                        {actionLoading ? 'Deleting...' : 'Delete Tag'}
                    </button>
                </div>
            </Modal>

            {/* Bulk Delete Modal */}
            <Modal
                isOpen={showBulkDeleteModal}
                onClose={() => setShowBulkDeleteModal(false)}
                title="Delete Tags"
            >
                <p className="text-gray-400 mb-6">
                    Are you sure you want to delete {selectedIds.size} tag(s)?
                    This will remove them from all contacts.
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => setShowBulkDeleteModal(false)}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleBulkDelete}
                        disabled={actionLoading}
                        className="btn btn-danger"
                    >
                        {actionLoading ? 'Deleting...' : 'Delete Tags'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
