'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    LayoutDashboard,
    Users,
    Tag,
    MessageSquare,
    Settings,
    LogOut,
    ChevronDown,
    Plus,
    MessageCircle
} from 'lucide-react';
import { Page } from '@/types';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [pages, setPages] = useState<Page[]>([]);
    const [selectedPage, setSelectedPage] = useState<Page | null>(null);
    const [showPageDropdown, setShowPageDropdown] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
    }, [status, router]);

    useEffect(() => {
        if (session) {
            fetchPages();
        }
    }, [session]);

    const fetchPages = async () => {
        try {
            const res = await fetch('/api/pages');
            const data = await res.json();
            setPages(data.pages || []);
            if (data.pages?.length > 0 && !selectedPage) {
                setSelectedPage(data.pages[0]);
            }
        } catch (error) {
            console.error('Error fetching pages:', error);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <div className="spinner w-8 h-8"></div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    const navItems = [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/dashboard/contacts', icon: Users, label: 'Contacts' },
        { href: '/dashboard/tags', icon: Tag, label: 'Tags' },
        { href: '/dashboard/campaigns', icon: MessageSquare, label: 'Campaigns' },
        { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex">
            {/* Sidebar */}
            <aside className="w-64 bg-[#0d0d12] border-r border-[#2a2a3a] flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b border-[#2a2a3a]">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <MessageCircle className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold gradient-text">Tokko</span>
                    </Link>
                </div>

                {/* Page Selector */}
                <div className="p-4 border-b border-[#2a2a3a]">
                    <div className="relative">
                        <button
                            onClick={() => setShowPageDropdown(!showPageDropdown)}
                            className="w-full flex items-center justify-between p-3 bg-[#1a1a24] rounded-xl text-left hover:bg-[#22222e] transition-colors"
                        >
                            <span className="text-sm text-white truncate">
                                {selectedPage?.name || 'Select Page'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPageDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showPageDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a24] border border-[#2a2a3a] rounded-xl shadow-xl z-50 overflow-hidden">
                                {pages.map((page) => (
                                    <button
                                        key={page.id}
                                        onClick={() => {
                                            setSelectedPage(page);
                                            setShowPageDropdown(false);
                                        }}
                                        className={`w-full p-3 text-left text-sm hover:bg-[#22222e] transition-colors ${selectedPage?.id === page.id ? 'text-indigo-400 bg-indigo-500/10' : 'text-white'
                                            }`}
                                    >
                                        {page.name}
                                    </button>
                                ))}
                                <Link
                                    href="/dashboard/connect"
                                    className="flex items-center gap-2 p-3 text-sm text-indigo-400 hover:bg-[#22222e] border-t border-[#2a2a3a]"
                                    onClick={() => setShowPageDropdown(false)}
                                >
                                    <Plus className="w-4 h-4" />
                                    Connect New Page
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500'
                                        : 'text-gray-400 hover:text-white hover:bg-[#1a1a24]'
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Menu */}
                <div className="p-4 border-t border-[#2a2a3a]">
                    <div className="flex items-center gap-3 mb-4">
                        {session.user?.image && (
                            <img
                                src={session.user.image}
                                alt={session.user.name || 'User'}
                                className="w-10 h-10 rounded-full"
                            />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {session.user?.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                                {session.user?.email}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:text-white hover:bg-[#1a1a24] rounded-xl transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="p-8">
                    {/* Pass selectedPage to children via context or props */}
                    {children}
                </div>
            </main>
        </div>
    );
}
