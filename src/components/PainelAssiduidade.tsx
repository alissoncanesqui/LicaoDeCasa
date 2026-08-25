import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { alternarAtivoCoroinha, estatisticasAssiduidade } from "@/lib/coord.functions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const VERDE = "hsl(152 45% 38%)";
const VERMELHO = "hsl(2 68% 48%)";
const CINZA = "hsl(30 8% 70%)";

function cor(pct: number | null, minimo: number) {
  if (pct === null) return CINZA;
  return pct >= minimo ? VERDE : VERMELHO;
}

export function PainelAssiduidade() {
  const queryClient = useQueryClient();
  const [minimoTexto, setMinimoTexto] = useState("80");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const minimo = Number(minimoTexto) || 0;
  
  const estatisticas = useServerFn(estatisticasAssiduidade);
  const stats = useQuery({
    queryKey: ["coord-assiduidade", inicio, fim],
    queryFn: () => estatisticas({ data: { inicio, fim } }),
    retry: false,
    throwOnError: false,
  });
  const alternar = useServerFn(alternarAtivoCoroinha);

  const mut = useMutation({
    mutationFn: (v: { id: string; ativo: boolean }) => alternar({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.ativo ? "Coroinha reativado" : "Coroinha suspenso");
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const todas = stats.data ?? [];
  
  const linhas = useMemo(
    () => (selecionados.length === 0 ? todas : todas.filter((l) => selecionados.includes(l.id))),
    [todas, selecionados],
  );

  const handleSelect = (id: string) => {
    if (id === "todos") {
      setSelecionados([]);
      return;
    }
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const resumo = useMemo(() => {
    let acima = 0;
    let abaixo = 0;
    let sem = 0;
    linhas.forEach((l) => {
      if (l.percentual === null) sem += 1;
      else if (l.percentual >= minimo) acima += 1;
      else abaixo += 1;
    });
    const comPct = linhas.filter((l) => l.percentual !== null);
    const media = comPct.length
      ? Math.round(comPct.reduce((s, l) => s + (l.percentual ?? 0), 0) / comPct.length)
      : 0;
    return { acima, abaixo, sem, media };
  }, [linhas, minimo]);

  if (stats.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando assiduidade…</p>;
  }

  return (
    <div className="space-y-5">
      <div className="surface-card space-y-4 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="min-pct">Presença mínima exigida (%)</Label>
            <Input
              id="min-pct"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              className="w-32"
              value={minimoTexto}
              onChange={(e) => setMinimoTexto(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ass-inicio">Início (Opcional)</Label>
            <Input
              id="ass-inicio"
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ass-fim">Fim (Opcional)</Label>
            <Input id="ass-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
          
          <div className="space-y-1.5 relative">
            <Label>Coroinha (Opcional)</Label>
            <div
              className="flex h-10 w-56 items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm cursor-pointer shadow-sm hover:bg-accent/50"
              onClick={() => setDropdownAberto(!dropdownAberto)}
            >
              <span className="truncate">
                {selecionados.length === 0 ? "Todos os coroinhas" : `${selecionados.length} selecionado(s)`}
              </span>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50"><path d="M4.18179 6.18181C4.35753 6.00608 4.64245 6.00608 4.81819 6.18181L7.49999 8.86362L10.1818 6.18181C10.3575 6.00608 10.6424 6.00608 10.8182 6.18181C10.9939 6.35755 10.9939 6.64247 10.8182 6.81821L7.81819 9.81821C7.73379 9.9026 7.61934 9.95001 7.49999 9.95001C7.38064 9.95001 7.26618 9.9026 7.18179 9.81821L4.18179 6.81821C4.00605 6.64247 4.00605 6.35755 4.18179 6.18181Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
            </div>
            
            {dropdownAberto && (
              <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-card p-1 shadow-md">
                <div className="max-h-60 overflow-y-auto space-y-1 p-1">
                  <div
                    className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                    onClick={() => handleSelect("todos")}
                  >
                    <input 
                      type="checkbox" 
                      checked={selecionados.length === 0} 
                      readOnly 
                      className="mr-2 pointer-events-none" 
                    />
                    Todos os coroinhas
                  </div>
                  {todas.map((c) => (
                    <div
                      key={c.id}
                      className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                      onClick={() => handleSelect(c.id)}
                    >
                      <input 
                        type="checkbox" 
                        checked={selecionados.includes(c.id)} 
                        readOnly 
                        className="mr-2 pointer-events-none" 
                      />
                      {c.nome}
                    </div>
                  ))}
                </div>
                <div className="border-t border-border mt-1 p-1">
                  <Button size="sm" className="w-full" onClick={() => setDropdownAberto(false)}>
                    OK
                  </Button>
                </div>
              </div>
            )}
          </div>

          {selecionados.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelecionados([])} className="mb-0.5">
              Limpar filtro
            </Button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-1.5">
            <span className="inline-block size-2.5 rounded-full" style={{ background: VERDE }} />
            Acima do mínimo: <strong>{resumo.acima}</strong>
          </span>
          <span className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-1.5">
            <span className="inline-block size-2.5 rounded-full" style={{ background: VERMELHO }} />
            Abaixo do mínimo: <strong>{resumo.abaixo}</strong>
          </span>
          <span className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-1.5">
            <span className="inline-block size-2.5 rounded-full" style={{ background: CINZA }} />
            Sem registros: <strong>{resumo.sem}</strong>
          </span>
          <span className="rounded-md bg-muted/60 px-3 py-1.5">
            Média geral: <strong>{resumo.media}%</strong>
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {linhas.length === 0 && (
          <p className="surface-card p-5 text-sm text-muted-foreground">
            Nenhum coroinha encontrado para o filtro selecionado.
          </p>
        )}
        {linhas.map((l) => {
          const c = cor(l.percentual, minimo);
          const abaixo = l.percentual !== null && l.percentual < minimo;
          return (
            <div key={l.id} className="surface-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-48">
                  <p className="font-display text-base font-semibold">
                    {l.nome}
                    {!l.ativo && (
                      <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        suspenso
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {l.escaladas} escalas · {l.presencas} presenças · {l.faltas} faltas
                    {l.pendentes > 0 ? ` · ${l.pendentes} sem registro` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-display text-2xl font-semibold" style={{ color: c }}>
                    {l.percentual === null ? "—" : `${l.percentual}%`}
                  </span>
                  <Button
                    size="sm"
                    variant={l.ativo ? (abaixo ? "destructive" : "outline") : "default"}
                    onClick={() => mut.mutate({ id: l.id, ativo: !l.ativo })}
                  >
                    {l.ativo ? "Suspender coroinha" : "Reativar"}
                  </Button>
                </div>
              </div>

              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${l.percentual ?? 0}%`, background: c }}
                />
              </div>

              {l.ultimas.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs text-muted-foreground">Últimas 5 missas:</span>
                  {l.ultimas.slice(-5).map((u, i) => (
                    <span
                      key={i}
                      title={`${u.data} — ${u.presente ? "presente" : "faltou"}`}
                      className="inline-block size-4 rounded-sm"
                      style={{ background: u.presente ? VERDE : VERMELHO }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
