-- Isolated test fixture only: never run in production.
UPDATE servers SET archived_at=NULL WHERE id=1;
INSERT INTO public.channels(name) VALUES ('général'), ('présentations'), ('projets'), ('hors-sujet') ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.join_onde_lobby() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 INSERT INTO public.memberships(server_id,user_id) VALUES(1,NEW.id) ON CONFLICT DO NOTHING;
 RETURN NEW;
END;
$$;
