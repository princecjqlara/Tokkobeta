import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

// DELETE /api/pages/[pageId]/contacts/bulk - Bulk delete contacts
export async function DELETE(
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
        const body = await request.json();
        const { contactIds } = body;

        if (!contactIds?.length) {
            return NextResponse.json(
                { error: 'Bad Request', message: 'No contact IDs provided' },
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

        // Delete contact_tags first (cascade should handle this but being explicit)
        await supabase
            .from('contact_tags')
            .delete()
            .in('contact_id', contactIds);

        // Delete campaign_recipients
        await supabase
            .from('campaign_recipients')
            .delete()
            .in('contact_id', contactIds);

        // Delete contacts
        const { error } = await supabase
            .from('contacts')
            .delete()
            .in('id', contactIds)
            .eq('page_id', pageId);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            deletedCount: contactIds.length
        });
    } catch (error) {
        console.error('Error deleting contacts:', error);
        return NextResponse.json(
            { error: 'Failed to delete contacts', message: (error as Error).message },
            { status: 500 }
        );
    }
}
