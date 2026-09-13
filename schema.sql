-- schema.sql
-- Run this in the Supabase SQL Editor

-- 1. Create Tables

-- Settings table for global configurations like overworld seed
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Insert a default world seed
INSERT INTO public.settings (id, value) VALUES ('world_seed', '12345') ON CONFLICT (id) DO NOTHING;

-- Players table (links to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    hex_x INTEGER, -- overworld Hex X coordinate of the player's base
    hex_y INTEGER, -- overworld Hex Y coordinate of the player's base
    steel NUMERIC DEFAULT 0,
    oil NUMERIC DEFAULT 0,
    troop_counts JSONB DEFAULT '{"soldier": 0, "medic": 0}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Buildings table
CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    type_id TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    x NUMERIC NOT NULL,
    y NUMERIC NOT NULL,
    health NUMERIC NOT NULL,
    construction_started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'idle',
    assigned_troops JSONB DEFAULT '{"soldier": 0, "medic": 0}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Workers/NPCs table
-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- Settings: Anyone can read, no one can write via client
-- Settings: Authenticated users can read, no one can write via client
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.settings;
CREATE POLICY "Enable read access for authenticated users" ON public.settings FOR SELECT USING (auth.role() = 'authenticated');

-- Players: Authenticated users can read, users can only update their own record
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.players;
CREATE POLICY "Enable read access for authenticated users" ON public.players FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.players;
CREATE POLICY "Enable insert for users based on user_id" ON public.players FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.players;
CREATE POLICY "Enable update for users based on user_id" ON public.players FOR UPDATE USING (auth.uid() = id);

-- Buildings: Authenticated users can read, users can only insert/update/delete their own buildings
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.buildings;
CREATE POLICY "Enable read access for authenticated users" ON public.buildings FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.buildings;
CREATE POLICY "Enable insert for authenticated users only" ON public.buildings FOR INSERT WITH CHECK (auth.uid() = player_id);
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.buildings;
CREATE POLICY "Enable update for users based on user_id" ON public.buildings FOR UPDATE USING (auth.uid() = player_id);
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.buildings;
CREATE POLICY "Enable delete for users based on user_id" ON public.buildings FOR DELETE USING (auth.uid() = player_id);

-- Vehicles: Authenticated users can read, users can only insert/update/delete their own vehicles
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.vehicles;
CREATE POLICY "Enable read access for authenticated users" ON public.vehicles FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.vehicles;
CREATE POLICY "Enable insert for authenticated users only" ON public.vehicles FOR INSERT WITH CHECK (auth.uid() = player_id);
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.vehicles;
CREATE POLICY "Enable update for users based on user_id" ON public.vehicles FOR UPDATE USING (auth.uid() = player_id);
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.vehicles;
CREATE POLICY "Enable delete for users based on user_id" ON public.vehicles FOR DELETE USING (auth.uid() = player_id);
