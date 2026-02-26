import { createClient } from '@supabase/supabase-js';

// ค่าเหล่านี้จะถูกดึงมาจากไฟล์ .env.local อัตโนมัติ
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);