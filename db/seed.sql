INSERT INTO public.channels(name) VALUES ('général'), ('présentations'), ('projets'), ('hors-sujet') ON CONFLICT DO NOTHING;
