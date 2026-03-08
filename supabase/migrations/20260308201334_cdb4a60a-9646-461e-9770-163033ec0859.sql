CREATE POLICY "Organisers and gym owners can delete tickets"
ON public.tickets FOR DELETE
USING (has_role(auth.uid(), 'organiser'::app_role) OR has_role(auth.uid(), 'gym_owner'::app_role));