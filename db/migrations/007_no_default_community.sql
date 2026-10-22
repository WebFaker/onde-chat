-- Keep historical data recoverable, but stop enrolling accounts in a shared lobby.
CREATE OR REPLACE FUNCTION public.join_onde_lobby() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 RETURN NEW;
END;
$$;
UPDATE servers SET archived_at=COALESCE(archived_at,now()) WHERE id=1;
