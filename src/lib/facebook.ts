import { FacebookPage, FacebookConversation } from '@/types';

const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v18.0';

// Get user's Facebook pages
export async function getFacebookPages(userAccessToken: string): Promise<FacebookPage[]> {
    const response = await fetch(
        `${FACEBOOK_GRAPH_URL}/me/accounts?fields=id,name,access_token,category,picture&access_token=${userAccessToken}`
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch Facebook pages');
    }

    const data = await response.json();
    return data.data || [];
}

// Get conversations for a page
export async function getPageConversations(
    pageId: string,
    pageAccessToken: string,
    limit: number = 100
): Promise<FacebookConversation[]> {
    const response = await fetch(
        `${FACEBOOK_GRAPH_URL}/${pageId}/conversations?fields=id,participants,updated_time&limit=${limit}&access_token=${pageAccessToken}`
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch conversations');
    }

    const data = await response.json();
    return data.data || [];
}

// Get user profile from PSID
export async function getUserProfile(
    psid: string,
    pageAccessToken: string
): Promise<{ id: string; name: string; profile_pic?: string }> {
    const response = await fetch(
        `${FACEBOOK_GRAPH_URL}/${psid}?fields=id,name,profile_pic&access_token=${pageAccessToken}`
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch user profile');
    }

    return await response.json();
}

// Send message to a contact
export async function sendMessage(
    pageId: string,
    pageAccessToken: string,
    recipientPsid: string,
    messageText: string
): Promise<{ message_id: string }> {
    const response = await fetch(
        `${FACEBOOK_GRAPH_URL}/${pageId}/messages?access_token=${pageAccessToken}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipient: { id: recipientPsid },
                message: { text: messageText },
                messaging_type: 'MESSAGE_TAG',
                tag: 'ACCOUNT_UPDATE'
            })
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to send message');
    }

    return await response.json();
}

// Verify webhook signature
export function verifyWebhookSignature(
    payload: string,
    signature: string,
    appSecret: string
): boolean {
    const crypto = require('crypto');
    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}
