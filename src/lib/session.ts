import { supabase } from '@/lib/supabase';

export async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Chưa đăng nhập');
  return data.session.user.id;
}
