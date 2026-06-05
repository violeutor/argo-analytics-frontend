'use client';

import { createClient } from '@supabase/supabase-js';

// AUTH-01: Supabase client für Frontend-Auth.
// NEXT_PUBLIC_* Vars sind auf Vercel gesetzt — anon key ist by design öffentlich.
// Security liegt in RLS + Backend-Middleware, nicht im Key.
// service_role key und JWT_SECRET bleiben ausschließlich in Render-Env-Vars.

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnon);
