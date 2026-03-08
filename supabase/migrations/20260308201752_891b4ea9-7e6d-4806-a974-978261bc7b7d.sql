CREATE POLICY "Organisers can delete fight slots"
ON public.fight_slots FOR DELETE
USING (has_role(auth.uid(), 'organiser'::app_role));