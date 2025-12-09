import { NextAuthOptions } from 'next-auth';
import FacebookProvider from 'next-auth/providers/facebook';
import { getSupabaseAdmin } from './supabase';

export const authOptions: NextAuthOptions = {
    providers: [
        FacebookProvider({
            clientId: process.env.FACEBOOK_CLIENT_ID!,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: 'email,public_profile,pages_show_list,pages_messaging,pages_read_engagement,pages_manage_metadata'
                }
            }
        })
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === 'facebook') {
                const supabase = getSupabaseAdmin();

                // Upsert user in database
                const { error } = await supabase
                    .from('users')
                    .upsert({
                        email: user.email,
                        name: user.name,
                        image: user.image,
                        facebook_id: account.providerAccountId,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'email'
                    });

                if (error) {
                    console.error('Error upserting user:', error);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token;
                token.facebookId = account.providerAccountId;
            }
            return token;
        },
        async session({ session, token }) {
            // Get user from database
            const supabase = getSupabaseAdmin();
            const { data: user } = await supabase
                .from('users')
                .select('id')
                .eq('email', session.user?.email)
                .single();

            return {
                ...session,
                accessToken: token.accessToken as string,
                user: {
                    ...session.user,
                    id: user?.id,
                    facebookId: token.facebookId as string
                }
            };
        }
    },
    pages: {
        signIn: '/',
        error: '/'
    },
    session: {
        strategy: 'jwt'
    }
    ,
    debug: process.env.NEXTAUTH_DEBUG === 'true',
    logger: {
        error(code, metadata) {
            console.error('NextAuth error', code, metadata);
        }
    }
};

// Extended session type
declare module 'next-auth' {
    interface Session {
        accessToken?: string;
        user: {
            id?: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            facebookId?: string;
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        accessToken?: string;
        facebookId?: string;
    }
}
