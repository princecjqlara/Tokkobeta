import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getPageConversations, getUserProfile } from '@/lib/facebook';

// POST /api/facebook/connect - Connect a Facebook page
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Please sign in' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { fbPageId, name, accessToken } = body;

        if (!fbPageId || !name || !accessToken) {
            return NextResponse.json(
                { error: 'Bad Request', message: 'Missing required fields' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Check if page already exists
        let { data: existingPage } = await supabase
            .from('pages')
            .select('id')
            .eq('fb_page_id', fbPageId)
            .single();

        let pageId: string;

        if (existingPage) {
            // Update access token
            await supabase
                .from('pages')
                .update({
                    access_token: accessToken,
                    name,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingPage.id);

            pageId = existingPage.id;
        } else {
            // Create new page
            const { data: newPage, error: pageError } = await supabase
                .from('pages')
                .insert({
                    fb_page_id: fbPageId,
                    name,
                    access_token: accessToken
                })
                .select('id')
                .single();

            if (pageError) throw pageError;
            pageId = newPage.id;
        }

        // Link user to page (upsert to avoid duplicates)
        await supabase
            .from('user_pages')
            .upsert({
                user_id: session.user.id,
                page_id: pageId
            }, {
                onConflict: 'user_id,page_id'
            });

        // Trigger initial sync in background
        await syncContactsForPage(pageId, fbPageId, accessToken, supabase);

        return NextResponse.json({
            success: true,
            pageId,
            message: 'Page connected successfully'
        });
    } catch (error) {
        console.error('Error connecting Facebook page:', error);
        return NextResponse.json(
            { error: 'Failed to connect page', message: (error as Error).message },
            { status: 500 }
        );
    }
}

// Helper function to sync contacts
async function syncContactsForPage(
    pageId: string,
    fbPageId: string,
    accessToken: string,
    supabase: ReturnType<typeof getSupabaseAdmin>
) {
    try {
        const conversations = await getPageConversations(fbPageId, accessToken);

        for (const conversation of conversations) {
            // Get participant that isn't the page
            const participant = conversation.participants.data.find(
                p => p.id !== fbPageId
            );

            if (!participant) continue;

            try {
                // Try to get profile info
                const profile = await getUserProfile(participant.id, accessToken);

                // Upsert contact
                await supabase
                    .from('contacts')
                    .upsert({
                        page_id: pageId,
                        psid: participant.id,
                        name: profile.name || participant.name,
                        profile_pic: profile.profile_pic,
                        last_interaction_at: conversation.updated_time,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'page_id,psid'
                    });
            } catch (profileError) {
                // If profile fetch fails, still create contact with basic info
                await supabase
                    .from('contacts')
                    .upsert({
                        page_id: pageId,
                        psid: participant.id,
                        name: participant.name,
                        last_interaction_at: conversation.updated_time,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'page_id,psid'
                    });
            }
        }
    } catch (error) {
        console.error('Error syncing contacts:', error);
    }
}
