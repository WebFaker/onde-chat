-- A stable application identity, independent of Better Auth's own IDs.
CREATE FUNCTION public.create_chat_profile() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE profile uuid;
BEGIN
  IF NEW.name !~ '^[[:alnum:]_-]{2,24}$' THEN
    RAISE EXCEPTION 'Invalid display name';
  END IF;
  INSERT INTO public.profiles(name) VALUES(NEW.name) RETURNING id INTO profile;
  INSERT INTO public.identity_links(provider,subject,profile_id)
    VALUES('better-auth',NEW.id,profile);
  RETURN NEW;
END;
$$;
CREATE TRIGGER create_chat_profile AFTER INSERT ON public."user"
FOR EACH ROW EXECUTE FUNCTION public.create_chat_profile();
REVOKE ALL ON FUNCTION public.create_chat_profile() FROM PUBLIC;
