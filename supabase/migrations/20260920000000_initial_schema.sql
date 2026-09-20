-- =============================================================================
-- Migration: 20260920000000_initial_schema.sql
-- Description: Minimal schema for AI Code Editor with Clerk Auth + Supabase
-- Tables: users, workspaces, conversations
-- =============================================================================

-- Ensure required extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Reusable trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function to extract Clerk User ID from JWT claim 'sub'
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::text;
$$ LANGUAGE sql STABLE;

-- -----------------------------------------------------------------------------
-- 1. USERS (Clerk user ID as primary key)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                             -- Clerk User ID (e.g. 'user_2b...')
  email TEXT,
  github_user_id BIGINT UNIQUE,                    -- Connected GitHub numeric user ID
  github_username TEXT,                            -- Connected GitHub login
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 2. WORKSPACES (User's active/recent repository & branch metadata)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  selected_branch TEXT NOT NULL DEFAULT 'main',
  last_opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_workspaces_user_repo UNIQUE (user_id, repo_owner, repo_name)
);

CREATE TRIGGER set_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 3. CONVERSATIONS (AI chat sessions tied to repository & branch)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  repository TEXT NOT NULL,                        -- e.g. 'owner/repo'
  branch TEXT NOT NULL,                            -- e.g. 'main'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_last_opened ON workspaces(user_id, last_opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_id ON conversations(workspace_id);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = requesting_user_id());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = requesting_user_id());

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (id = requesting_user_id());

-- workspaces policies
CREATE POLICY "Users can view their own workspaces"
  ON workspaces FOR SELECT
  USING (user_id = requesting_user_id());

CREATE POLICY "Users can insert their own workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can update their own workspaces"
  ON workspaces FOR UPDATE
  USING (user_id = requesting_user_id());

CREATE POLICY "Users can delete their own workspaces"
  ON workspaces FOR DELETE
  USING (user_id = requesting_user_id());

-- conversations policies
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (user_id = requesting_user_id());

CREATE POLICY "Users can insert their own conversations"
  ON conversations FOR INSERT
  WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can update their own conversations"
  ON conversations FOR UPDATE
  USING (user_id = requesting_user_id());

CREATE POLICY "Users can delete their own conversations"
  ON conversations FOR DELETE
  USING (user_id = requesting_user_id());
