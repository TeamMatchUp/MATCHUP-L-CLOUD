-- Clean up all user-related data first
DELETE FROM public.result_verifications;
DELETE FROM public.fight_results;
DELETE FROM public.match_proposals;
DELETE FROM public.fight_slots;
DELETE FROM public.fighter_gym_links;
DELETE FROM public.fighter_records;
DELETE FROM public.fighter_profiles;
DELETE FROM public.notifications;
DELETE FROM public.tickets;
DELETE FROM public.promotions;
DELETE FROM public.events;
DELETE FROM public.gyms;
DELETE FROM public.confirmations;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;