import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ClipboardList, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { diaSemana, formatarData, formatarHora } from "@/components/AppShell";
import { getDispositivoId } from "@/lib/dispositivo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Escala de Coroinhas — Inscrições da paróquia" },
      {
        name: "description",
        content:
          "Inscreva seus filhos nas missas, acompanhe a escala e organize os coroinhas da paróquia.",
      },
      { property: "og:title", content: "Escala de Coroinhas — Inscrições da paróquia" },
      {
        property: "og:description",
        content: "Inscreva seus filhos nas missas e acompanhe a escala da paróquia.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <section className="hero-gradient text-primary-foreground">
        <div className="mx-auto w-full max-w-3xl px-6 py-20 text-center">
          <p className="whitespace-pre-line text-xs tracking-[0.25em] uppercase opacity-70">
            PARÓQUIA NOSSA SENHORA DE FÁTIMA{"\n"}SANTO ANDRÉ - SP
          </p>
          <h1 className="mt-4 font-display text-4xl leading-tight font-semibold sm:text-5xl">
            Escala de Coroinhas
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm opacity-85 sm:text-base">{"\n"}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/missas"
              className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            >
              Inscrever nas missas
            </Link>
            <Link
              to="/minhas-inscricoes"
              className="rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
            >
              Minhas inscrições
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-6 py-14 lg:grid-cols-3">
        <MissasCard />
        <InscricoesCard />
        <Link
          to="/coordenadores"
          className="surface-card block p-5 transition-shadow hover:shadow-md"
        >
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-display text-lg font-semibold">Coordenação</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Área com senha para cadastros, assiduidade e exportação.
          </p>
          <span className="mt-4 inline-block text-sm font-semibold text-primary underline underline-offset-4">
            Entrar com senha
          </span>
        </Link>
      </section>

      <footer className="pb-10 text-center text-xs text-muted-foreground">
        <Link to="/coordenadores" className="underline underline-offset-4">
          Área dos coordenadores
        </Link>
      </footer>
    </div>
  );
}

function futuras<T extends { data: string; horario: string }>(rows: T[]) {
  const agora = Date.now();
  return rows.filter((m) => new Date(`${m.data}T${m.horario}`).getTime() > agora);
}

function MissasCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["home-missas"],
    queryFn: async () => {
      const hoje = new Date().toISOString().slice(0, 10);
      const [missas, inscricoes] = await Promise.all([
        supabase.from("missas").select("*").gte("data", hoje).order("data").order("horario"),
        supabase.from("inscricoes").select("id, missa_id"),
      ]);
      if (missas.error) throw missas.error;
      if (inscricoes.error) throw inscricoes.error;
      return futuras(missas.data).map((m) => ({
        ...m,
        restantes: m.vagas - (inscricoes.data ?? []).filter((i) => i.missa_id === m.id).length,
      }));
    },
  });

  return (
    <div className="surface-card flex flex-col p-5">
      <CalendarDays className="h-5 w-5 text-primary" />
      <h2 className="mt-3 font-display text-lg font-semibold">Missas abertas</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Veja data, horário e vagas disponíveis de cada celebração.
      </p>

      <div className="mt-4 flex-1 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {data?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma missa aberta no momento.</p>
        )}
        {data?.slice(0, 4).map((m) => (
          <div key={m.id} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <p className="font-medium">
              {diaSemana(m.data)} · {formatarData(m.data)} · {formatarHora(m.horario)}
            </p>
            <p className="text-xs text-muted-foreground">
              {m.local ?? "—"} · {m.restantes > 0 ? `${m.restantes} vaga(s)` : "Lotada"}
            </p>
          </div>
        ))}
      </div>

      <Link
        to="/missas"
        className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Inscrever
      </Link>
    </div>
  );
}

function InscricoesCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["home-inscricoes"],
    queryFn: async () => {
      const dispositivo = getDispositivoId();
      if (!dispositivo) return [];
      const { data: rows, error } = await supabase
        .from("inscricoes")
        .select("id, funcao, coroinhas(nome), missas(data, horario, local)")
        .eq("dispositivo_id", dispositivo);
      if (error) throw error;
      return (rows ?? [])
        .filter((r) => r.missas && futuras([r.missas]).length > 0)
        .sort((a, b) =>
          `${a.missas?.data}${a.missas?.horario}`.localeCompare(
            `${b.missas?.data}${b.missas?.horario}`,
          ),
        );
    },
  });

  return (
    <div className="surface-card flex flex-col p-5">
      <ClipboardList className="h-5 w-5 text-primary" />
      <h2 className="mt-3 font-display text-lg font-semibold">Minhas inscrições</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Acompanhe em quais missas seus filhos estão escalados.
      </p>

      <div className="mt-4 flex-1 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {data?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma escala futura por enquanto.</p>
        )}
        {data?.slice(0, 4).map((i) => (
          <div key={i.id} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <p className="font-medium">{i.coroinhas?.nome}</p>
            <p className="text-xs text-muted-foreground">
              {formatarData(i.missas!.data)} · {formatarHora(i.missas!.horario)}
              {i.missas?.local ? ` — ${i.missas.local}` : ""}
              {i.funcao ? ` · ${i.funcao}` : ""}
            </p>
          </div>
        ))}
      </div>

      <Link
        to="/minhas-inscricoes"
        className="mt-4 inline-block rounded-lg border border-border px-4 py-2 text-center text-sm font-semibold transition-colors hover:bg-accent"
      >
        Ver todas
      </Link>
    </div>
  );
}
