-- Migration: create_chat_tables
-- Apply manually via Supabase SQL editor or CLI

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_user_goal ON conversations(user_id, goal_id);
CREATE INDEX idx_conversations_updated ON conversations(user_id, updated_at DESC);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own conversations"
  ON conversations FOR ALL
  USING (auth.uid() = user_id);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content TEXT,
  tool_calls JSONB,
  tool_call_id TEXT,
  tool_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at ASC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own messages"
  ON messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    )
  );
