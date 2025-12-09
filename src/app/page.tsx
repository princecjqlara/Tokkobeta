'use client';

import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Facebook, MessageCircle, Users, Tag, Zap, Shield, Sparkles, Loader2 } from 'lucide-react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  // Handle popup sign in
  const handleFacebookLogin = async () => {
    setIsLoading(true);

    // Open popup for authentication
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      '/api/auth/signin/facebook?callbackUrl=/dashboard',
      'facebook-login',
      `width=${width},height=${height},left=${left},top=${top},popup=true`
    );

    // Check if popup was blocked
    if (!popup) {
      // Fallback to redirect if popup blocked
      signIn('facebook', { callbackUrl: '/dashboard' });
      return;
    }

    // Poll to check if popup closed and user authenticated
    const checkAuth = setInterval(async () => {
      try {
        if (popup.closed) {
          clearInterval(checkAuth);
          setIsLoading(false);
          // Refresh the page to check authentication
          window.location.reload();
        }
      } catch {
        // Popup might be on different origin, just wait
      }
    }, 500);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/10 blur-3xl"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
          <div className="text-center">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <span className="text-4xl font-bold gradient-text">Tokko</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Manage Your Facebook Page
              <br />
              <span className="gradient-text">Like a Pro</span>
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
              Sync contacts, create tags, and send bulk messages to your audience.
              All in one powerful, easy-to-use dashboard.
            </p>

            {/* CTA Button - Now opens popup */}
            <button
              onClick={handleFacebookLogin}
              disabled={isLoading}
              className="btn bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold px-8 py-4 text-lg rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-blue-500/30 flex items-center gap-3 mx-auto disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Facebook className="w-6 h-6" />
                  Get Started with Facebook
                </>
              )}
            </button>

            <p className="text-sm text-gray-500 mt-4">
              Free to use • No credit card required
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Everything You Need
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Powerful features to help you manage your Facebook Page contacts and messaging efficiently.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="card card-hover p-8">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-6">
              <Users className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Contact Sync</h3>
            <p className="text-gray-400">
              Automatically sync all your Facebook Page contacts. Keep your contact list always up to date.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="card card-hover p-8">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6">
              <Tag className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Smart Tagging</h3>
            <p className="text-gray-400">
              Organize contacts with custom tags. Filter and segment your audience for targeted messaging.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="card card-hover p-8">
            <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center mb-6">
              <MessageCircle className="w-6 h-6 text-pink-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Bulk Messaging</h3>
            <p className="text-gray-400">
              Send personalized messages to thousands of contacts at once. Save time and reach more people.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="card card-hover p-8">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Real-time Webhooks</h3>
            <p className="text-gray-400">
              Instant updates when new messages arrive. Never miss a conversation with your audience.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="card card-hover p-8">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-6">
              <Shield className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Multi-User Access</h3>
            <p className="text-gray-400">
              Collaborate with your team. Multiple users can manage the same pages seamlessly.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="card card-hover p-8">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Business Support</h3>
            <p className="text-gray-400">
              Manage multiple pages under one business. Share tags and contacts across your organization.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#2a2a3a] py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p>© 2024 Tokko. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
