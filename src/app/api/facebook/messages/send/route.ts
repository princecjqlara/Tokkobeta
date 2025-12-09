import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendMessage } from '@/lib/facebook';

// POST /api/facebook/messages/send - Send messages to contacts
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
        const { pageId, contactIds, messageText } = body;

        if (!pageId || !contactIds?.length || !messageText) {
            return NextResponse.json(
                { error: 'Bad Request', message: 'Missing required fields' },
                { status: 400 }
            );
        }

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

        // Get page access token
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

        // Get contacts
        const { data: contacts } = await supabase
            .from('contacts')
            .select('id, psid')
            .in('id', contactIds)
            .eq('page_id', pageId);

        if (!contacts?.length) {
            return NextResponse.json(
                { error: 'Not Found', message: 'No valid contacts found' },
                { status: 404 }
            );
        }

        // Send messages
        const results = {
            sent: 0,
            failed: 0,
            errors: [] as { contactId: string; error: string }[]
        };

        for (const contact of contacts) {
            try {
                await sendMessage(
                    page.fb_page_id,
                    page.access_token,
                    contact.psid,
                    messageText
                );
                results.sent++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    contactId: contact.id,
                    error: (error as Error).message
                });
            }
        }

        return NextResponse.json({
            success: true,
            results
        });
    } catch (error) {
        console.error('Error sending messages:', error);
        return NextResponse.json(
            { error: 'Failed to send messages', message: (error as Error).message },
            { status: 500 }
        );
    }
}
