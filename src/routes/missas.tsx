import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDispositivoId } from "@/lib/dispositivo";
import { AppShell, diaSemana, formatarData, formatarHora } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/missas")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Missas disponíveis — Escala de Coroinhas" },
      {
        name: "description",
        content: "Escolha a missa e inscreva seus filhos coroinhas nas vagas disponíveis.",
      },
      { property: "og:title", content: "Missas disponíveis — Escala de Coroinhas" },
      { property: "og:description", content: "Inscreva seus filhos nas missas da paróquia." },
    ],
  }),
  component: MissasPage,
});

type Inscricao = {
  id: string;
  missa_id: string;
  coroinha_id: string;
  dispositivo_id: string | null;
};

function MissasPage() {
  const queryClient = useQueryClient();
  const [aberta, setAberta] = useState<string | null>(null);

  const hoje = new Date().toISOString().slice(0, 10);
  const agora = new Date();

  const { data, isLoading } = useQuery({
    queryKey: ["missas-abertas"],
    queryFn: async () => {
      const [missas, coroinhas, inscricoes] = await Promise.all([
        supabase.from("missas").select("*").gte("data", hoje).order("data").order("horario"),
        supabase.from("coroinhas").select("*").eq("ativo", true).order("nome"),
        supabase.from("inscricoes").select("id, missa_id, coroinha_id, dispositivo_id"),
      ]);
      if (missas.error) throw missas.error;
      if (coroinhas.error) throw coroinhas.error;
      if (inscricoes.error) throw inscricoes.error;
      return {
        missas: missas.data.filter(
          (m) => new Date(`${m.data}T${m.horario}`).getTime() > agora.getTime(),
        ),
        coroinhas: [...coroinhas.data].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
        inscricoes: inscricoes.data as Inscricao[],
        dispositivoId: getDispositivoId(),
      };
    },
  });


  const inscrever = useMutation({
    mutationFn: async (input: { missaId: string; coroinhaId: string }) => {
      const { error } = await supabase.from("inscricoes").insert({
        missa_id: input.missaId,
        coroinha_id: input.coroinhaId,
        dispositivo_id: getDispositivoId(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscrição confirmada");
      queryClient.invalidateQueries({ queryKey: ["missas-abertas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inscricoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscrição cancelada");
      queryClient.invalidateQueries({ queryKey: ["missas-abertas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="Missas disponíveis"
      subtitle="Escolha a celebração e marque os coroinhas da sua família."
    >
      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {data && data.missas.length === 0 && (
        <p className="surface-card p-6 text-sm text-muted-foreground">
          Nenhuma missa cadastrada para os próximos dias.
        </p>
      )}

      <div className="space-y-3">
        {data?.missas.map((missa) => {
          const daMissa = data.inscricoes.filter((i) => i.missa_id === missa.id);
          const restantes = missa.vagas - daMissa.length;
          const expandida = aberta === missa.id;
          return (
            <article key={missa.id} className="surface-card overflow-hidden">
              <button
                type="button"
                onClick={() => setAberta(expandida ? null : missa.id)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <div>
                  <p className="text-xs font-medium tracking-wide text-accent-foreground/70 uppercase">
                    {diaSemana(missa.data)}
                  </p>
                  <h2 className="font-display text-xl font-semibold">
                    {formatarData(missa.data)} · {formatarHora(missa.horario)}
                  </h2>
                  <p className="text-sm text-muted-foreground">{missa.local ?? "—"}</p>
                </div>
                <span

                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    restantes > 0
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {restantes > 0 ? `${restantes} vaga(s)` : "Lotada"}
                </span>
              </button>

              {expandida && (
                <div className="border-t border-border bg-muted/40 p-5">
                  <p className="mb-3 text-sm font-medium">Selecione os coroinhas</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {data.coroinhas.map((c) => {
                      const insc = daMissa.find((i) => i.coroinha_id === c.id);
                      const meu = insc?.dispositivo_id === data.dispositivoId;
                      const bloqueado = (!insc && restantes <= 0) || (insc && !meu);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm ${
                            bloqueado ? "opacity-50" : "cursor-pointer"
                          }`}
                        >
                          <Checkbox
                            checked={Boolean(insc)}
                            disabled={Boolean(bloqueado)}
                            onCheckedChange={(checked) => {
                              if (checked) inscrever.mutate({ missaId: missa.id, coroinhaId: c.id });
                              else if (insc) cancelar.mutate(insc.id);
                            }}
                          />
                          <span className="flex-1">{c.nome}</span>
                          {insc && !meu && (
                            <span className="text-xs text-muted-foreground">já inscrito</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {data.coroinhas.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum coroinha cadastrado ainda. Fale com a coordenação.
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4"
                    onClick={() => setAberta(null)}
                  >
                    Fechar
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
