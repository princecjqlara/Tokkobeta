import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/pages - Get user's connected pages
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Please sign in' },
                { status: 401 }
            );
        }

        const supabase = getSupabaseAdmin();

        const { data: userPages, error } = await supabase
            .from('user_pages')
            .select(`
        page_id,
        pages (
          id,
          fb_page_id,
          name,
          business_id,
          created_at
        )
      `)
            .eq('user_id', session.user.id);

        if (error) throw error;

        const pages = userPages?.map(up => up.pages) || [];

        return NextResponse.json({ pages });
    } catch (error) {
        console.error('Error fetching pages:', error);
        return NextResponse.json(
            { error: 'Failed to fetch pages', message: (error as Error).message },
            { status: 500 }
        );
    }
}
