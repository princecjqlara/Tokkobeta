'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Plus, Send, Trash2, Edit2, Users, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import { Campaign, Page, Contact, PaginatedResponse } from '@/types';

export default function CampaignsPage() {
    const { data: session } = useSession();
    const [pages, setPages] = useState<Page[]>([]);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [total, setTotal] = useState(0);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showContactsModal, setShowContactsModal] = useState(false);

    // Form state
    const [campaignName, setCampaignName] = useState('');
    const [messageText, setMessageText] = useState('');
    const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);

    // Contacts pagination for modal
    const [contactsPage, setContactsPage] = useState(1);
    const [contactsTotal, setContactsTotal] = useState(0);

    useEffect(() => {
        fetchPages();
    }, []);

    useEffect(() => {
        if (selectedPageId) {
            fetchCampaigns();
        }
    }, [selectedPageId, page, pageSize]);

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

    const fetchCampaigns = async () => {
        if (!selectedPageId) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                pageId: selectedPageId
            });

            const res = await fetch(`/api/campaigns?${params}`);
            const data: PaginatedResponse<Campaign> = await res.json();

            setCampaigns(data.items || []);
            setTotal(data.total || 0);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchContacts = async () => {
        if (!selectedPageId) return;

        try {
            const params = new URLSearchParams({
                page: contactsPage.toString(),
                pageSize: '50'
            });

            const res = await fetch(`/api/pages/${selectedPageId}/contacts?${params}`);
            const data: PaginatedResponse<Contact> = await res.json();

            setContacts(data.items || []);
            setContactsTotal(data.total || 0);
        } catch (error) {
            console.error('Error fetching contacts:', error);
        }
    };

    const handleOpenCreateModal = async () => {
        setCampaignName('');
        setMessageText('');
        setSelectedContactIds(new Set());
        setContactsPage(1);
        await fetchContacts();
        setShowCreateModal(true);
    };

    const handleCreate = async () => {
        if (!campaignName.trim() || !messageText.trim() || selectedContactIds.size === 0) return;

        setActionLoading(true);
        try {
            await fetch('/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pageId: selectedPageId,
                    name: campaignName.trim(),
                    messageText: messageText.trim(),
                    contactIds: Array.from(selectedContactIds)
                })
            });

            setShowCreateModal(false);
            await fetchCampaigns();
        } catch (error) {
            console.error('Error creating campaign:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSend = async (campaignId: string) => {
        setSendingCampaignId(campaignId);
        try {
            await fetch(`/api/campaigns/${campaignId}/send`, {
                method: 'POST'
            });
            await fetchCampaigns();
        } catch (error) {
            console.error('Error sending campaign:', error);
        } finally {
            setSendingCampaignId(null);
        }
    };

    const handleDelete = async () => {
        if (!editingCampaign) return;

        setActionLoading(true);
        try {
            await fetch(`/api/campaigns?id=${editingCampaign.id}`, {
                method: 'DELETE'
            });

            setShowDeleteModal(false);
            setEditingCampaign(null);
            await fetchCampaigns();
        } catch (error) {
            console.error('Error deleting campaign:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const toggleContactSelection = (contactId: string) => {
        const newSelected = new Set(selectedContactIds);
        if (newSelected.has(contactId)) {
            newSelected.delete(contactId);
        } else {
            newSelected.add(contactId);
        }
        setSelectedContactIds(newSelected);
    };

    const selectAllContacts = () => {
        if (contacts.every(c => selectedContactIds.has(c.id))) {
            // Deselect all visible
            const newSelected = new Set(selectedContactIds);
            contacts.forEach(c => newSelected.delete(c.id));
            setSelectedContactIds(newSelected);
        } else {
            // Select all visible
            const newSelected = new Set(selectedContactIds);
            contacts.forEach(c => newSelected.add(c.id));
            setSelectedContactIds(newSelected);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft':
                return <span className="badge badge-primary">Draft</span>;
            case 'sending':
                return <span className="badge badge-warning">Sending</span>;
            case 'completed':
                return <span className="badge badge-success">Completed</span>;
            case 'cancelled':
                return <span className="badge badge-danger">Cancelled</span>;
            default:
                return <span className="badge">{status}</span>;
        }
    };

    return (
        <div className="page-enter">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Campaigns</h1>
                    <p className="text-gray-400 mt-1">
                        Create and send bulk messages to your contacts
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={selectedPageId || ''}
                        onChange={(e) => {
                            setSelectedPageId(e.target.value);
                            setPage(1);
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
                        onClick={handleOpenCreateModal}
                        className="btn btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        New Campaign
                    </button>
                </div>
            </div>

            {/* Campaigns List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="spinner w-8 h-8"></div>
                </div>
            ) : campaigns.length === 0 ? (
                <div className="card p-12 text-center">
                    <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No campaigns yet</h3>
                    <p className="text-gray-400 mb-6">
                        Create your first campaign to start messaging your audience.
                    </p>
                    <button
                        onClick={handleOpenCreateModal}
                        className="btn btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        Create Campaign
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid gap-4">
                        {campaigns.map((campaign) => (
                            <div key={campaign.id} className="card p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                                            {getStatusBadge(campaign.status)}
                                        </div>
                                        <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                                            {campaign.message_text}
                                        </p>
                                        <div className="flex items-center gap-6 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-4 h-4" />
                                                {campaign.total_recipients} recipients
                                            </span>
                                            {campaign.status !== 'draft' && (
                                                <span className="flex items-center gap-1">
                                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                                    {campaign.sent_count} sent
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {new Date(campaign.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {campaign.status === 'draft' && (
                                            <button
                                                onClick={() => handleSend(campaign.id)}
                                                disabled={sendingCampaignId === campaign.id}
                                                className="btn btn-primary py-2 px-4"
                                            >
                                                {sendingCampaignId === campaign.id ? (
                                                    <>
                                                        <div className="spinner w-4 h-4"></div>
                                                        Sending...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="w-4 h-4" />
                                                        Send Now
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setEditingCampaign(campaign);
                                                setShowDeleteModal(true);
                                            }}
                                            className="btn btn-ghost p-2 text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
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

            {/* Create Campaign Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Create Campaign"
                size="xl"
            >
                <div className="space-y-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Campaign Name
                        </label>
                        <input
                            type="text"
                            value={campaignName}
                            onChange={(e) => setCampaignName(e.target.value)}
                            placeholder="e.g., Holiday Promotion"
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Message
                        </label>
                        <textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder="Type your message here..."
                            rows={4}
                            className="input resize-none"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-300">
                                Recipients ({selectedContactIds.size} selected)
                            </label>
                            <button
                                onClick={selectAllContacts}
                                className="text-sm text-indigo-400 hover:text-indigo-300"
                            >
                                {contacts.every(c => selectedContactIds.has(c.id))
                                    ? 'Deselect all on page'
                                    : 'Select all on page'}
                            </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto bg-[#1a1a24] rounded-lg border border-[#2a2a3a] divide-y divide-[#2a2a3a]">
                            {contacts.map((contact) => (
                                <button
                                    key={contact.id}
                                    onClick={() => toggleContactSelection(contact.id)}
                                    className={`w-full flex items-center justify-between p-3 transition-colors ${selectedContactIds.has(contact.id)
                                            ? 'bg-indigo-600/10'
                                            : 'hover:bg-[#22222e]'
                                        }`}
                                >
                                    <span className="text-white">{contact.name || 'Unknown'}</span>
                                    {selectedContactIds.has(contact.id) && (
                                        <CheckCircle className="w-4 h-4 text-indigo-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                        {contactsTotal > 50 && (
                            <div className="mt-2 flex justify-between items-center">
                                <span className="text-xs text-gray-500">
                                    Page {contactsPage} of {Math.ceil(contactsTotal / 50)}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setContactsPage(p => Math.max(1, p - 1));
                                            fetchContacts();
                                        }}
                                        disabled={contactsPage === 1}
                                        className="btn btn-ghost py-1 px-2 text-xs"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => {
                                            setContactsPage(p => p + 1);
                                            fetchContacts();
                                        }}
                                        disabled={contactsPage >= Math.ceil(contactsTotal / 50)}
                                        className="btn btn-ghost py-1 px-2 text-xs"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
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
                        disabled={!campaignName.trim() || !messageText.trim() || selectedContactIds.size === 0 || actionLoading}
                        className="btn btn-primary"
                    >
                        {actionLoading ? 'Creating...' : 'Create Campaign'}
                    </button>
                </div>
            </Modal>

            {/* Delete Campaign Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setEditingCampaign(null);
                }}
                title="Delete Campaign"
            >
                <p className="text-gray-400 mb-6">
                    Are you sure you want to delete the campaign &quot;{editingCampaign?.name}&quot;?
                    This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => {
                            setShowDeleteModal(false);
                            setEditingCampaign(null);
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
                        {actionLoading ? 'Deleting...' : 'Delete Campaign'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
