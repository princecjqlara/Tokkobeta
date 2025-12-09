'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Users, Tag, MessageSquare, RefreshCw, TrendingUp, Clock } from 'lucide-react';
import { Page } from '@/types';

interface Stats {
    totalContacts: number;
    totalTags: number;
    totalCampaigns: number;
    recentContacts: number;
}

export default function DashboardPage() {
    const { data: session } = useSession();
    const [pages, setPages] = useState<Page[]>([]);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [stats, setStats] = useState<Stats>({
        totalContacts: 0,
        totalTags: 0,
        totalCampaigns: 0,
        recentContacts: 0
    });
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        fetchPages();
    }, []);

    useEffect(() => {
        if (selectedPageId) {
            fetchStats();
        }
    }, [selectedPageId]);

    const fetchPages = async () => {
        try {
            const res = await fetch('/api/pages');
            const data = await res.json();
            setPages(data.pages || []);
            if (data.pages?.length > 0) {
                setSelectedPageId(data.pages[0].id);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching pages:', error);
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        if (!selectedPageId) return;

        try {
            // Fetch contacts count
            const contactsRes = await fetch(`/api/pages/${selectedPageId}/contacts?pageSize=1`);
            const contactsData = await contactsRes.json();

            // Fetch tags count
            const tagsRes = await fetch(`/api/tags?scope=page&pageId=${selectedPageId}&pageSize=1`);
            const tagsData = await tagsRes.json();

            // Fetch campaigns count
            const campaignsRes = await fetch(`/api/campaigns?pageId=${selectedPageId}&pageSize=1`);
            const campaignsData = await campaignsRes.json();

            setStats({
                totalContacts: contactsData.total || 0,
                totalTags: tagsData.total || 0,
                totalCampaigns: campaignsData.total || 0,
                recentContacts: 0 // You could calculate this from last 7 days
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleSync = async () => {
        if (!selectedPageId || syncing) return;

        setSyncing(true);
        try {
            const res = await fetch(`/api/pages/${selectedPageId}/sync`, {
                method: 'POST'
            });
            const data = await res.json();

            if (data.success) {
                await fetchStats();
            }
        } catch (error) {
            console.error('Error syncing:', error);
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner w-8 h-8"></div>
            </div>
        );
    }

    if (pages.length === 0) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="card p-12 text-center">
                    <div className="w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <MessageSquare className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Welcome to Tokko!</h2>
                    <p className="text-gray-400 mb-8">
                        Connect your first Facebook Page to get started with contact management and messaging.
                    </p>
                    <a
                        href="/dashboard/connect"
                        className="btn btn-primary px-8 py-3"
                    >
                        Connect Facebook Page
                    </a>
                </div>
            </div>
        );
    }

    const selectedPage = pages.find(p => p.id === selectedPageId);

    return (
        <div className="page-enter">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                    <p className="text-gray-400 mt-1">
                        Welcome back, {session?.user?.name?.split(' ')[0] || 'User'}!
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <select
                        value={selectedPageId || ''}
                        onChange={(e) => setSelectedPageId(e.target.value)}
                        className="select py-2 px-4"
                    >
                        {pages.map((page) => (
                            <option key={page.id} value={page.id}>
                                {page.name}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="btn btn-primary"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-indigo-400" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{stats.totalContacts.toLocaleString()}</p>
                    <p className="text-sm text-gray-400">Total Contacts</p>
                </div>

                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                            <Tag className="w-6 h-6 text-purple-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{stats.totalTags.toLocaleString()}</p>
                    <p className="text-sm text-gray-400">Tags Created</p>
                </div>

                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-pink-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{stats.totalCampaigns.toLocaleString()}</p>
                    <p className="text-sm text-gray-400">Campaigns</p>
                </div>

                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-green-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">
                        {selectedPage ? 'Active' : '-'}
                    </p>
                    <p className="text-sm text-gray-400">Page Status</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <a href="/dashboard/contacts" className="card card-hover p-6 block">
                    <h3 className="text-lg font-semibold text-white mb-2">Manage Contacts</h3>
                    <p className="text-sm text-gray-400">View, filter, and manage your page contacts.</p>
                </a>

                <a href="/dashboard/tags" className="card card-hover p-6 block">
                    <h3 className="text-lg font-semibold text-white mb-2">Manage Tags</h3>
                    <p className="text-sm text-gray-400">Create and organize tags for your contacts.</p>
                </a>

                <a href="/dashboard/campaigns" className="card card-hover p-6 block">
                    <h3 className="text-lg font-semibold text-white mb-2">Create Campaign</h3>
                    <p className="text-sm text-gray-400">Send bulk messages to your audience.</p>
                </a>
            </div>
        </div>
    );
}
