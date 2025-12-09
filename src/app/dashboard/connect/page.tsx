'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Facebook, Check, Loader2, Plus, ExternalLink } from 'lucide-react';
import { FacebookPage } from '@/types';

export default function ConnectPage() {
    const { data: session } = useSession();
    const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [connectedPages, setConnectedPages] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchFacebookPages();
        fetchConnectedPages();
    }, [session]);

    const fetchFacebookPages = async () => {
        if (!session?.accessToken) {
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/facebook/pages');
            const data = await res.json();

            if (data.error) {
                setError(data.message);
            } else {
                setFacebookPages(data.pages || []);
            }
        } catch (error) {
            console.error('Error fetching Facebook pages:', error);
            setError('Failed to load Facebook pages');
        } finally {
            setLoading(false);
        }
    };

    const fetchConnectedPages = async () => {
        try {
            const res = await fetch('/api/pages');
            const data = await res.json();
            const fbPageIds = new Set(data.pages?.map((p: { fb_page_id: string }) => p.fb_page_id) || []);
            setConnectedPages(fbPageIds as Set<string>);
        } catch (error) {
            console.error('Error fetching connected pages:', error);
        }
    };

    const handleConnect = async (page: FacebookPage) => {
        setConnecting(page.id);
        setError(null);

        try {
            const res = await fetch('/api/facebook/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fbPageId: page.id,
                    name: page.name,
                    accessToken: page.access_token
                })
            });

            const data = await res.json();

            if (data.success) {
                setConnectedPages(prev => new Set([...prev, page.id]));
            } else {
                setError(data.message || 'Failed to connect page');
            }
        } catch (error) {
            console.error('Error connecting page:', error);
            setError('Failed to connect page');
        } finally {
            setConnecting(null);
        }
    };

    const handleReauthorize = () => {
        signIn('facebook', { callbackUrl: '/dashboard/connect' });
    };

    if (!session?.accessToken) {
        return (
            <div className="page-enter max-w-2xl mx-auto">
                <div className="card p-12 text-center">
                    <div className="w-20 h-20 bg-[#1877F2]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Facebook className="w-10 h-10 text-[#1877F2]" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Connect Your Facebook Account</h2>
                    <p className="text-gray-400 mb-8">
                        To connect your Facebook Pages, you need to authorize the app with your Facebook account.
                    </p>
                    <button
                        onClick={handleReauthorize}
                        className="btn bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold px-8 py-3 rounded-xl"
                    >
                        <Facebook className="w-5 h-5" />
                        Continue with Facebook
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-enter">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Connect Pages</h1>
                    <p className="text-gray-400 mt-1">
                        Select Facebook Pages to connect with Tokko
                    </p>
                </div>

                <button
                    onClick={handleReauthorize}
                    className="btn btn-secondary"
                >
                    <ExternalLink className="w-4 h-4" />
                    Refresh Permissions
                </button>
            </div>

            {error && (
                <div className="card bg-red-500/10 border-red-500/50 p-4 mb-6">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="spinner w-8 h-8"></div>
                </div>
            ) : facebookPages.length === 0 ? (
                <div className="card p-12 text-center">
                    <div className="w-16 h-16 bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Facebook className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Pages Found</h3>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        We couldn&apos;t find any Facebook Pages associated with your account.
                        Make sure you&apos;re an admin of a Facebook Page and have granted the necessary permissions.
                    </p>
                    <button
                        onClick={handleReauthorize}
                        className="btn btn-primary"
                    >
                        Re-authorize with Facebook
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {facebookPages.map((page) => {
                        const isConnected = connectedPages.has(page.id);
                        const isConnecting = connecting === page.id;

                        return (
                            <div key={page.id} className="card p-6">
                                <div className="flex items-start gap-4 mb-4">
                                    {page.picture?.data?.url ? (
                                        <img
                                            src={page.picture.data.url}
                                            alt={page.name}
                                            className="w-14 h-14 rounded-xl"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 bg-[#1877F2]/20 rounded-xl flex items-center justify-center">
                                            <Facebook className="w-7 h-7 text-[#1877F2]" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-white truncate">{page.name}</h3>
                                        {page.category && (
                                            <p className="text-sm text-gray-500">{page.category}</p>
                                        )}
                                    </div>
                                </div>

                                {isConnected ? (
                                    <button
                                        disabled
                                        className="w-full btn bg-green-600/20 text-green-400 border border-green-600/50 cursor-default"
                                    >
                                        <Check className="w-4 h-4" />
                                        Connected
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleConnect(page)}
                                        disabled={isConnecting}
                                        className="w-full btn btn-primary"
                                    >
                                        {isConnecting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Connecting...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4" />
                                                Connect Page
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Info Section */}
            <div className="mt-12 card p-6 bg-indigo-500/5 border-indigo-500/20">
                <h3 className="font-semibold text-white mb-2">What happens when you connect a page?</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        Your page&apos;s conversation contacts will be synced automatically
                    </li>
                    <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        New contacts from incoming messages will be added via webhook
                    </li>
                    <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        You can create tags and send bulk messages to contacts
                    </li>
                    <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        Other team members can also access this page if added
                    </li>
                </ul>
            </div>
        </div>
    );
}
