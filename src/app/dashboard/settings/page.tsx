'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { User, Building, Trash2, Plus, Users } from 'lucide-react';
import { Page } from '@/types';

export default function SettingsPage() {
    const { data: session } = useSession();
    const [pages, setPages] = useState<Page[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        try {
            const res = await fetch('/api/pages');
            const data = await res.json();
            setPages(data.pages || []);
        } catch (error) {
            console.error('Error fetching pages:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-enter max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Settings</h1>
                <p className="text-gray-400 mt-1">
                    Manage your account and connected pages
                </p>
            </div>

            {/* Profile Section */}
            <div className="card p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Profile
                </h2>
                <div className="flex items-center gap-4">
                    {session?.user?.image && (
                        <img
                            src={session.user.image}
                            alt={session.user.name || 'Profile'}
                            className="w-16 h-16 rounded-full"
                        />
                    )}
                    <div>
                        <p className="text-lg font-medium text-white">{session?.user?.name}</p>
                        <p className="text-gray-400">{session?.user?.email}</p>
                    </div>
                </div>
            </div>

            {/* Connected Pages Section */}
            <div className="card p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Building className="w-5 h-5" />
                        Connected Pages
                    </h2>
                    <a href="/dashboard/connect" className="btn btn-primary py-2 px-4 text-sm">
                        <Plus className="w-4 h-4" />
                        Connect Page
                    </a>
                </div>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="spinner w-6 h-6"></div>
                    </div>
                ) : pages.length === 0 ? (
                    <div className="text-center py-8">
                        <Building className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400">No pages connected yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pages.map((page) => (
                            <div
                                key={page.id}
                                className="flex items-center justify-between p-4 bg-[#1a1a24] rounded-xl"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#1877F2]/20 rounded-lg flex items-center justify-center">
                                        <Building className="w-5 h-5 text-[#1877F2]" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{page.name}</p>
                                        <p className="text-xs text-gray-500">ID: {page.fb_page_id}</p>
                                    </div>
                                </div>
                                <span className="badge badge-success">Connected</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Webhook Info */}
            <div className="card p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Webhook Configuration
                </h2>
                <p className="text-gray-400 text-sm mb-4">
                    Configure your Facebook App webhook to receive real-time updates:
                </p>
                <div className="bg-[#1a1a24] p-4 rounded-xl">
                    <div className="mb-3">
                        <label className="block text-xs text-gray-500 mb-1">Callback URL</label>
                        <code className="text-sm text-indigo-400 break-all">
                            {process.env.NEXT_PUBLIC_VERCEL_URL || 'https://your-domain.com'}/api/facebook/webhook
                        </code>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Verify Token</label>
                        <code className="text-sm text-indigo-400">
                            {process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ? '••••••••' : 'Not configured'}
                        </code>
                    </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                    Subscribe to &quot;messages&quot; and &quot;messaging_postbacks&quot; events in your Facebook App settings.
                </p>
            </div>

            {/* Danger Zone */}
            <div className="card p-6 border-red-500/30">
                <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Danger Zone
                </h2>
                <p className="text-gray-400 text-sm mb-4">
                    These actions are irreversible. Please be careful.
                </p>
                <button className="btn btn-danger" disabled>
                    Delete Account
                </button>
                <p className="text-xs text-gray-500 mt-2">
                    Contact support to delete your account.
                </p>
            </div>
        </div>
    );
}
