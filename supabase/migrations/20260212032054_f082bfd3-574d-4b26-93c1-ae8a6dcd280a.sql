
-- Drop the existing permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a restrictive UPDATE policy that prevents email changes
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND email IS NOT DISTINCT FROM (SELECT p.email FROM public.profiles p WHERE p.user_id = auth.uid()));
