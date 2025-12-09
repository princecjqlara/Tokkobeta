import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyWebhookSignature } from '@/lib/facebook';

// GET /api/facebook/webhook - Verify webhook
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const verifyToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('Webhook verified');
        return new NextResponse(challenge, { status: 200 });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// POST /api/facebook/webhook - Receive webhook events
export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const signature = request.headers.get('x-hub-signature-256') || '';
        const appSecret = process.env.FACEBOOK_APP_SECRET!;

        // Verify signature in production
        if (process.env.NODE_ENV === 'production' && appSecret) {
            if (!verifyWebhookSignature(body, signature, appSecret)) {
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        }

        const data = JSON.parse(body);
        const supabase = getSupabaseAdmin();

        // Process messaging events
        if (data.object === 'page') {
            for (const entry of data.entry) {
                const pageId = entry.id;

                // Get our page record
                const { data: page } = await supabase
                    .from('pages')
                    .select('id, access_token')
                    .eq('fb_page_id', pageId)
                    .single();

                if (!page) continue;

                // Process messaging events
                if (entry.messaging) {
                    for (const event of entry.messaging) {
                        const senderId = event.sender?.id;

                        // Skip if sender is the page itself
                        if (senderId === pageId) continue;

                        // Upsert contact
                        await supabase
                            .from('contacts')
                            .upsert({
                                page_id: page.id,
                                psid: senderId,
                                last_interaction_at: new Date(event.timestamp).toISOString(),
                                updated_at: new Date().toISOString()
                            }, {
                                onConflict: 'page_id,psid'
                            });
                    }
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
