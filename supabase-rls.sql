-- Supabase RLS Policies and User Sync
-- Run this in Supabase SQL Editor

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create a function to sync Supabase Auth users with our users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'VIEWER')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Users table: Users can read their own data, admins can read all
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id);

-- Competitions: Read for authenticated users, write for admins
CREATE POLICY "Authenticated users can view competitions" ON competitions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can create competitions" ON competitions
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update competitions" ON competitions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can delete competitions" ON competitions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- Teams: Read for authenticated users, write for admins
CREATE POLICY "Authenticated users can view teams" ON teams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage teams" ON teams
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- Competition Teams: Read for authenticated users, write for admins
CREATE POLICY "Authenticated users can view competition teams" ON competition_teams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage competition teams" ON competition_teams
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- Venues: Read for authenticated users, write for admins
CREATE POLICY "Authenticated users can view venues" ON venues
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage venues" ON venues
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- Competition Venues: Read for authenticated users, write for admins
CREATE POLICY "Authenticated users can view competition venues" ON competition_venues
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage competition venues" ON competition_venues
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- Fixtures: Read for authenticated users, write for admins
CREATE POLICY "Authenticated users can view fixtures" ON fixtures
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage fixtures" ON fixtures
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- Audit Logs: Read for authenticated users, write for system
CREATE POLICY "Authenticated users can view audit logs" ON audit_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can create audit logs" ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- Function to set admin role for first user
CREATE OR REPLACE FUNCTION public.set_admin_if_first_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users;
  
  IF user_count = 1 THEN
    UPDATE users SET role = 'ADMIN' WHERE id = auth.uid()::text;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
