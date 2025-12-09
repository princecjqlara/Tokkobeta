import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getPageConversations, getUserProfile } from '@/lib/facebook';

// POST /api/pages/[pageId]/sync - Manual sync contacts
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Please sign in' },
                { status: 401 }
            );
        }

        const { pageId } = await params;
        const supabase = getSupabaseAdmin();

        // Verify user has access to page
        const { data: userPage } = await supabase
            .from('user_pages')
            .select('page_id')
            .eq('user_id', session.user.id)
            .eq('page_id', pageId)
            .single();

        if (!userPage) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'You do not have access to this page' },
                { status: 403 }
            );
        }

        // Get page details
        const { data: page } = await supabase
            .from('pages')
            .select('fb_page_id, access_token')
            .eq('id', pageId)
            .single();

        if (!page) {
            return NextResponse.json(
                { error: 'Not Found', message: 'Page not found' },
                { status: 404 }
            );
        }

        // Fetch conversations from Facebook
        const conversations = await getPageConversations(
            page.fb_page_id,
            page.access_token
        );

        let synced = 0;
        let failed = 0;

        for (const conversation of conversations) {
            const participant = conversation.participants.data.find(
                p => p.id !== page.fb_page_id
            );

            if (!participant) continue;

            try {
                let profilePic: string | undefined;
                let name = participant.name;

                try {
                    const profile = await getUserProfile(participant.id, page.access_token);
                    name = profile.name || name;
                    profilePic = profile.profile_pic;
                } catch {
                    // Profile fetch failed, use basic info
                }

                await supabase
                    .from('contacts')
                    .upsert({
                        page_id: pageId,
                        psid: participant.id,
                        name,
                        profile_pic: profilePic,
                        last_interaction_at: conversation.updated_time,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'page_id,psid'
                    });

                synced++;
            } catch {
                failed++;
            }
        }

        return NextResponse.json({
            success: true,
            synced,
            failed,
            total: conversations.length
        });
    } catch (error) {
        console.error('Error syncing contacts:', error);
        return NextResponse.json(
            { error: 'Failed to sync contacts', message: (error as Error).message },
            { status: 500 }
        );
    }
}
