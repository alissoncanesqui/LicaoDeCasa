import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDispositivoId } from "@/lib/dispositivo";
import { AppShell, diaSemana, formatarData, formatarHora } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/minhas-inscricoes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Minhas inscrições — Escala de Coroinhas" },
      {
        name: "description",
        content: "Veja em quais missas seus filhos estão escalados e cancele quando precisar.",
      },
      { property: "og:title", content: "Minhas inscrições — Escala de Coroinhas" },
      { property: "og:description", content: "Acompanhe as missas dos seus coroinhas." },
    ],
  }),
  component: MinhasInscricoes,
});

function MinhasInscricoes() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["minhas-inscricoes"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("inscricoes")
        .select("id, presente, funcao, coroinhas(nome), missas(data, horario, titulo, local)")
        .eq("dispositivo_id", getDispositivoId());

      if (error) throw error;
      const agora = Date.now();
      return (rows ?? [])
        .filter(
          (r) => r.missas && new Date(`${r.missas.data}T${r.missas.horario}`).getTime() > agora,
        )
        .sort((a, b) =>
          `${a.missas?.data}${a.missas?.horario}`.localeCompare(
            `${b.missas?.data}${b.missas?.horario}`,
          ),
        );

    },
  });

  const cancelar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inscricoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscrição cancelada");
      queryClient.invalidateQueries({ queryKey: ["minhas-inscricoes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <AppShell
      title="Minhas inscrições"
      subtitle="Todas as missas em que seus coroinhas estão escalados."
    >
      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {data && data.length === 0 && (
        <p className="surface-card p-6 text-sm text-muted-foreground">
          Você ainda não inscreveu ninguém. Vá até a página de missas para começar.
        </p>
      )}

      <div className="space-y-3">
        {data?.map((i) => {
          const passada = (i.missas?.data ?? "") < hoje;
          return (
            <div
              key={i.id}
              className="surface-card flex flex-wrap items-center justify-between gap-3 p-5"
            >
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {i.missas ? diaSemana(i.missas.data) : ""}
                </p>
                <h2 className="font-display text-lg font-semibold">{i.coroinhas?.nome}</h2>
                <p className="text-sm text-muted-foreground">
                  {i.missas
                    ? `${formatarData(i.missas.data)} · ${formatarHora(i.missas.horario)}${i.missas.local ? ` — ${i.missas.local}` : ""}`
                    : ""}
                </p>
                {i.funcao && (
                  <span className="mt-1.5 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                    Função: {i.funcao}
                  </span>
                )}

              </div>
              <div className="flex items-center gap-3">
                {!passada && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => {
                      if (window.confirm(`Tem certeza que deseja cancelar a inscrição de ${i.coroinhas?.nome} nesta missa?`)) {
                        cancelar.mutate(i.id);
                      }
                    }}
                  >
                    Cancelar inscrição
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
