-- Add online status to agent_wallets table
ALTER TABLE agent_wallets ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;
ALTER TABLE agent_wallets ADD COLUMN IF NOT EXISTS last_online_at timestamp with time zone;

-- Ensure RLS (if applicable) allows updates
-- CREATE POLICY "Agents can update their own status" ON agent_wallets FOR UPDATE USING (phone = auth.jwt() ->> 'phone'); 
-- (Skipping strict RLS policy creation for this demo as we use phone directly)
