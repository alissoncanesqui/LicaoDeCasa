CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', ''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.coroinhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coroinhas TO authenticated;
GRANT ALL ON public.coroinhas TO service_role;
ALTER TABLE public.coroinhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coroinhas read" ON public.coroinhas FOR SELECT TO authenticated USING (true);

CREATE TABLE public.missas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  horario time NOT NULL,
  titulo text NOT NULL DEFAULT 'Missa',
  local text,
  vagas integer NOT NULL DEFAULT 6,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.missas TO authenticated;
GRANT ALL ON public.missas TO service_role;
ALTER TABLE public.missas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "missas read" ON public.missas FOR SELECT TO authenticated USING (true);

CREATE TABLE public.inscricoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  missa_id uuid NOT NULL REFERENCES public.missas(id) ON DELETE CASCADE,
  coroinha_id uuid NOT NULL REFERENCES public.coroinhas(id) ON DELETE CASCADE,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  presente boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (missa_id, coroinha_id)
);
GRANT SELECT, INSERT, DELETE ON public.inscricoes TO authenticated;
GRANT ALL ON public.inscricoes TO service_role;
ALTER TABLE public.inscricoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inscricoes read" ON public.inscricoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "inscricoes insert own" ON public.inscricoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = criado_por);
CREATE POLICY "inscricoes delete own" ON public.inscricoes FOR DELETE TO authenticated USING (auth.uid() = criado_por);

CREATE OR REPLACE FUNCTION public.check_vagas()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  limite integer;
  usados integer;
BEGIN
  SELECT vagas INTO limite FROM public.missas WHERE id = NEW.missa_id;
  SELECT count(*) INTO usados FROM public.inscricoes WHERE missa_id = NEW.missa_id;
  IF limite IS NOT NULL AND usados >= limite THEN
    RAISE EXCEPTION 'Esta missa já atingiu o limite de vagas';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER inscricoes_check_vagas BEFORE INSERT ON public.inscricoes
FOR EACH ROW EXECUTE FUNCTION public.check_vagas();