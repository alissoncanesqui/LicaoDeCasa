ALTER TABLE public.inscricoes ADD COLUMN IF NOT EXISTS dispositivo_id text;
ALTER TABLE public.inscricoes ALTER COLUMN criado_por DROP NOT NULL;

GRANT SELECT ON public.missas TO anon;
GRANT SELECT ON public.coroinhas TO anon;
GRANT SELECT, INSERT, DELETE ON public.inscricoes TO anon;

DROP POLICY IF EXISTS "missas read anon" ON public.missas;
CREATE POLICY "missas read anon" ON public.missas FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "coroinhas read anon" ON public.coroinhas;
CREATE POLICY "coroinhas read anon" ON public.coroinhas FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "inscricoes read anon" ON public.inscricoes;
CREATE POLICY "inscricoes read anon" ON public.inscricoes FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "inscricoes insert anon" ON public.inscricoes;
CREATE POLICY "inscricoes insert anon" ON public.inscricoes FOR INSERT TO anon WITH CHECK (dispositivo_id IS NOT NULL);

DROP POLICY IF EXISTS "inscricoes delete anon" ON public.inscricoes;
CREATE POLICY "inscricoes delete anon" ON public.inscricoes FOR DELETE TO anon USING (dispositivo_id IS NOT NULL);