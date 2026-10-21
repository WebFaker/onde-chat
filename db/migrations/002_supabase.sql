-- Supabase-only identity and access adapter. Replace this file when changing provider.
CREATE FUNCTION public.current_profile_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT profile_id FROM public.identity_links
  WHERE provider = 'supabase' AND subject = (SELECT auth.uid())::text
$$;
CREATE FUNCTION public.handle_new_identity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE profile uuid; display_name text;
BEGIN
  display_name := NEW.raw_user_meta_data->>'name';
  IF display_name IS NULL OR display_name !~ '^[[:alnum:]_-]{2,24}$' THEN
    RAISE EXCEPTION 'Invalid display name';
  END IF;
  INSERT INTO public.profiles(name) VALUES(display_name) RETURNING id INTO profile;
  INSERT INTO public.identity_links(provider, subject, profile_id)
  VALUES('supabase', NEW.id::text, profile);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_identity();
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.identity_links FROM anon, authenticated;
REVOKE ALL ON public.profiles, public.channels, public.messages FROM anon, authenticated;
GRANT SELECT ON public.profiles, public.channels, public.messages TO authenticated;
GRANT INSERT ON public.channels, public.messages TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated
USING (public.current_profile_id() IS NOT NULL);
CREATE POLICY channels_read ON public.channels FOR SELECT TO authenticated
USING (public.current_profile_id() IS NOT NULL);
CREATE POLICY channels_create ON public.channels FOR INSERT TO authenticated
WITH CHECK (public.current_profile_id() IS NOT NULL AND name ~ '^[[:alnum:]_-]{2,32}$');
CREATE POLICY messages_read ON public.messages FOR SELECT TO authenticated
USING (public.current_profile_id() IS NOT NULL);
CREATE POLICY messages_create ON public.messages FOR INSERT TO authenticated
WITH CHECK (user_id = public.current_profile_id());
REVOKE EXECUTE ON FUNCTION public.handle_new_identity() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_profile_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;
