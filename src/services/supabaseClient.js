// ============================================================
// EDUJADVAL.UZ — Supabase klienti (sozlangan)
// ============================================================
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://faczvlynofpdkcnsvfnc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_GvzEaHVEfQ1SFkKbAlfLIQ_H0ADBmwJ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sozlanganligini tekshirish uchun yordamchi.
// DIQQAT: pastdagi 'SIZNING-...' matnlariga tegmang — ular shunchaki
// "fayl hali to'ldirilmaganmi?" degan belgi sifatida tekshiriladi.
export function isSupabaseConfigured() {
  return (
    !SUPABASE_URL.includes('SIZNING-PROJECT') &&
    !SUPABASE_ANON_KEY.includes('SIZNING_ANON_KEY')
  );
}