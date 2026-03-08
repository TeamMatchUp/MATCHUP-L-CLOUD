
-- Add new permission tiers to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'gym_owner';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin';
