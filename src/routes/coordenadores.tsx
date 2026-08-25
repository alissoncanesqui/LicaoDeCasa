import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  coordDados,
  coordLogin,
  coordLogout,
  coordStatus,
  definirFuncao,
  excluirCoroinha,
  excluirMissa,
  listarEscala,
  listarInscricoesMissa,
  marcarPresenca,
  salvarCoroinha,
  salvarMissa,
  substituirCoroinha,
  removerDaEscala,
} from "@/lib/coord.functions";
import { FUNCOES, LOCAIS } from "@/lib/funcoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { diaSemana, formatarData, formatarHora } from "@/components/AppShell";
import { PainelAssiduidade } from "@/components/PainelAssiduidade";



export const Route = createFileRoute("/coordenadores")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Coordenação — Escala de Coroinhas" },
      {
        name: "description",
        content:
          "Área protegida para cadastrar missas e coroinhas, controlar assiduidade e exportar a escala.",
      },
      { property: "og:title", content: "Coordenação — Escala de Coroinhas" },
      { property: "og:description", content: "Gestão da escala de coroinhas da paróquia." },
    ],
  }),
  component: Coordenadores,
});

const ABAS = [
  { id: "missas", label: "Cadastro de missas" },
  { id: "coroinhas", label: "Cadastro de coroinhas" },
  { id: "presenca", label: "Registrar presença" },
  { id: "assiduidade", label: "Assiduidade" },
  { id: "escala", label: "Escala & exportação" },
] as const;


type Aba = (typeof ABAS)[number]["id"];

function Coordenadores() {
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ["coord-status"], queryFn: () => coordStatus() });
  const [aba, setAba] = useState<Aba>("missas");
  const login = useServerFn(coordLogin);
  const logout = useServerFn(coordLogout);
  const [senha, setSenha] = useState("");

  const [entrando, setEntrando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true);
    try {
      const res = await login({ data: { password: senha } });
      if (res.ok) {
        setSenha("");
        await queryClient.invalidateQueries();
      } else {
        toast.error("Senha incorreta");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível entrar");
    } finally {
      setEntrando(false);
    }
  }

  if (status.isLoading) {
    return <div className="p-10 text-sm text-muted-foreground">Carregando…</div>;
  }

  if (!status.data?.unlocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
        <Link to="/" className="font-display text-2xl font-semibold text-primary">
          Escala de Coroinhas
        </Link>
        <form onSubmit={entrar} className="surface-card mt-6 w-full max-w-sm space-y-4 p-6">
          <div>
            <h1 className="font-display text-xl font-semibold">Área dos coordenadores</h1>
            <p className="mt-1 text-sm text-muted-foreground">Informe a senha de acesso.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha-coord">Senha</Label>
            <Input
              id="senha-coord"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={entrando}>
            {entrando ? "Entrando…" : "Entrar"}
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/">Voltar para o início</Link>
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="hero-gradient text-primary-foreground">
        <div className="mx-auto w-full max-w-5xl px-5 pt-6 pb-10">
          <div className="flex items-center justify-between">
            <Link to="/" className="font-display text-lg font-semibold">
              Escala de Coroinhas
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-white/15"
              onClick={async () => {
                await logout({});
                queryClient.invalidateQueries();
              }}
            >
              Sair da coordenação
            </Button>
          </div>
          <h1 className="mt-8 font-display text-3xl font-semibold">Coordenação</h1>
        </div>
      </header>

      <nav className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-3 py-2 text-sm">
          {ABAS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`rounded-md px-3 py-2 font-medium whitespace-nowrap transition-colors ${
                aba === a.id
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-5xl px-5 py-8">
        {aba === "missas" && <TelaMissas />}
        {aba === "coroinhas" && <TelaCoroinhas />}
        {aba === "presenca" && <TelaAssiduidade />}
        {aba === "assiduidade" && <PainelAssiduidade />}
        {aba === "escala" && <TelaEscala />}

      </main>
    </div>
  );
}

function useDados() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["coord-dados"],
    queryFn: () => coordDados(),
    retry: false,
    throwOnError: false,
  });

  useEffect(() => {
    if (query.data?.locked) {
      void queryClient.invalidateQueries({ queryKey: ["coord-status"] });
    }
  }, [query.data?.locked, queryClient]);

  return query;
}

function TelaMissas() {
  const queryClient = useQueryClient();
  const dados = useDados();
  const salvar = useServerFn(salvarMissa);
  const excluir = useServerFn(excluirMissa);
  const vazio = { id: "", data: "", horario: "", local: LOCAIS[0] as string, vagas: "6" };
  const [form, setForm] = useState(vazio);

  const mut = useMutation({
    mutationFn: async () => {
      await salvar({
        data: {
          ...(form.id ? { id: form.id } : {}),
          data: form.data,
          horario: form.horario,
          local: form.local,
          vagas: Number(form.vagas || 0),
        },
      });
    },
    onSuccess: () => {
      toast.success("Missa salva");
      setForm(vazio);
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form
        className="surface-card h-fit space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
      >
        <h2 className="font-display text-lg font-semibold">
          {form.id ? "Editar missa" : "Nova missa"}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Data</Label>
            <Input
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Horário</Label>
            <Input
              type="time"
              value={form.horario}
              onChange={(e) => setForm({ ...form, horario: e.target.value })}
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Local</Label>
          <select
            value={form.local}
            onChange={(e) => setForm({ ...form, local: e.target.value })}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
            required
          >
            {LOCAIS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Vagas</Label>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={form.vagas}
            onChange={(e) => setForm({ ...form, vagas: e.target.value })}
            required
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            Salvar
          </Button>
          {form.id && (
            <Button type="button" variant="outline" onClick={() => setForm(vazio)}>
              Cancelar
            </Button>
          )}
        </div>
      </form>


      <div className="space-y-3">
        {dados.data?.missas.map((m) => (
          <div key={m.id} className="surface-card flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-display text-base font-semibold">
                {formatarData(m.data)} · {formatarHora(m.horario)}
              </p>
              <p className="text-sm text-muted-foreground">
                {m.local ?? "—"} · {m.vagas} vagas
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm({
                    id: m.id,
                    data: m.data,
                    horario: m.horario.slice(0, 5),
                    local: m.local ?? LOCAIS[0],
                    vagas: String(m.vagas),
                  })
                }
              >

                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (window.confirm("Tem certeza que deseja excluir esta missa? Todas as inscrições atreladas a ela também serão removidas.")) {
                    await excluir({ data: { id: m.id } });
                    toast.success("Missa excluída");
                    queryClient.invalidateQueries();
                  }
                }}
              >
                Excluir
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TelaCoroinhas() {
  const queryClient = useQueryClient();
  const dados = useDados();
  const salvar = useServerFn(salvarCoroinha);
  const excluir = useServerFn(excluirCoroinha);
  const [form, setForm] = useState({ id: "", nome: "", observacoes: "", ativo: true });

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form
        className="surface-card h-fit space-y-4 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await salvar({
              data: {
                ...(form.id ? { id: form.id } : {}),
                nome: form.nome,
                observacoes: form.observacoes,
                ativo: form.ativo,
              },
            });
            toast.success("Coroinha salvo");
            setForm({ id: "", nome: "", observacoes: "", ativo: true });
            queryClient.invalidateQueries();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao salvar");
          }
        }}
      >
        <h2 className="font-display text-lg font-semibold">
          {form.id ? "Editar coroinha" : "Novo coroinha"}
        </h2>
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Observações</Label>
          <Input
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            placeholder="Responsável, telefone, turma…"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <span className="text-sm">Ativo</span>
          <Switch
            checked={form.ativo}
            onCheckedChange={(v) => setForm({ ...form, ativo: v })}
          />
        </div>
        <Button type="submit" className="w-full">
          Salvar
        </Button>
      </form>

      <div className="space-y-3">
        {dados.data?.coroinhas.map((c) => (
          <div key={c.id} className="surface-card flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-display text-base font-semibold">{c.nome}</p>
              <p className="text-sm text-muted-foreground">
                {c.observacoes || "—"} {c.ativo ? "" : "· inativo"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm({
                    id: c.id,
                    nome: c.nome,
                    observacoes: c.observacoes ?? "",
                    ativo: c.ativo,
                  })
                }
              >
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (window.confirm(`Tem certeza que deseja excluir permanentemente o cadastro de: ${c.nome}?`)) {
                    await excluir({ data: { id: c.id } });
                    toast.success("Coroinha excluído");
                    queryClient.invalidateQueries();
                  }
                }}
              >
                Excluir
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TelaAssiduidade() {
  const queryClient = useQueryClient();
  const dados = useDados();
  const [missaId, setMissaId] = useState("");
  const listar = useServerFn(listarInscricoesMissa);
  const marcar = useServerFn(marcarPresenca);

  const inscricoes = useQuery({
    queryKey: ["coord-inscricoes", missaId],
    queryFn: () => listar({ data: { missaId } }),
    enabled: Boolean(missaId) && dados.data?.locked === false,
    retry: false,
    throwOnError: false,
  });

  return (
    <div className="space-y-5">
      <div className="surface-card p-5">
        <Label htmlFor="missa-sel">Selecione a missa</Label>
        <select
          id="missa-sel"
          value={missaId}
          onChange={(e) => setMissaId(e.target.value)}
          className="mt-2 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
        >
          <option value="">— escolha —</option>
          {dados.data?.missas.map((m) => (
            <option key={m.id} value={m.id}>
              {formatarData(m.data)} {formatarHora(m.horario)} — {m.local ?? "—"}
            </option>
          ))}
        </select>
      </div>

      {missaId && (
        <div className="space-y-2">
          {inscricoes.data?.length === 0 && (
            <p className="surface-card p-5 text-sm text-muted-foreground">
              Nenhum coroinha inscrito nesta missa.
            </p>
          )}
          {inscricoes.data?.map((i) => (
            <div key={i.id} className="surface-card flex items-center justify-between gap-3 p-4">
              <span className="font-medium">{i.nome}</span>
              <div className="flex gap-2">
                {[
                  { valor: true, label: "Presente" },
                  { valor: false, label: "Faltou" },
                ].map((op) => (
                  <Button
                    key={op.label}
                    size="sm"
                    variant={i.presente === op.valor ? "default" : "outline"}
                    onClick={async () => {
                      await marcar({
                        data: { id: i.id, presente: i.presente === op.valor ? null : op.valor },
                      });
                      queryClient.invalidateQueries({ queryKey: ["coord-inscricoes", missaId] });
                    }}
                  >
                    {op.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TelaEscala() {
  const queryClient = useQueryClient();
  const dados = useDados();
  const hoje = new Date().toISOString().slice(0, 10);
  
  const [inicio, setInicio] = useState(hoje);
  const [fim, setFim] = useState(""); 
  
  const listar = useServerFn(listarEscala);
  const setFuncao = useServerFn(definirFuncao);
  const substituir = useServerFn(substituirCoroinha);
  const remover = useServerFn(removerDaEscala);
  
  const escala = useQuery({
    queryKey: ["coord-escala", inicio, fim],
    queryFn: () => listar({ data: { inicio: inicio || hoje, fim: fim || "2099-12-31" } }),
    enabled: dados.data?.locked === false,
    retry: false,
    throwOnError: false,
  });

  const coroinhas = [...(dados.data?.coroinhas ?? [])].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );

  async function exportar() {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Escala");
    ws.columns = [
      { header: "Data", key: "data", width: 14 },
      { header: "Horário", key: "hora", width: 10 },
      { header: "Local", key: "local", width: 34 },
      { header: "Coroinha", key: "coroinha", width: 26 },
      { header: "Função", key: "funcao", width: 20 },
    ];
    const head = ws.getRow(1);
    head.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
    head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6B1F2E" } };
    head.alignment = { vertical: "middle" };

    const PALETA = [
      "FFFDECEF",
      "FFEAF3EC",
      "FFFDF6E3",
      "FFEAF0F8",
      "FFF3ECF8",
      "FFFBEEE3",
    ];

    (escala.data?.missas ?? []).forEach((m, idx) => {
      const cor = PALETA[idx % PALETA.length]!;
      const insc = escala.data!.inscricoes.filter((i) => i.missa_id === m.id);
      const base = {
        data: formatarData(m.data),
        hora: formatarHora(m.horario),
        local: m.local ?? "",
      };
      const linhas =
        insc.length === 0
          ? [{ ...base, coroinha: "(sem inscritos)", funcao: "" }]
          : insc.map((i) => ({ ...base, coroinha: i.nome, funcao: i.funcao ?? "" }));

      const primeira = ws.rowCount + 1;
      linhas.forEach((l, i) => {
        const row = ws.addRow(l);
        row.eachCell((cell) => {
          cell.font = { name: "Arial" };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: cor } };
          cell.border = {
            top: { style: i === 0 ? "medium" : "hair", color: { argb: "FFBFB5A8" } },
            bottom: {
              style: i === linhas.length - 1 ? "medium" : "hair",
              color: { argb: "FFBFB5A8" },
            },
            left: { style: "hair", color: { argb: "FFBFB5A8" } },
            right: { style: "hair", color: { argb: "FFBFB5A8" } },
          };
        });
        if (i > 0) {
          row.getCell("data").value = "";
          row.getCell("hora").value = "";
          row.getCell("local").value = "";
        }
      });
      const ultima = ws.rowCount;
      if (ultima > primeira) {
        ws.mergeCells(primeira, 1, ultima, 1);
        ws.mergeCells(primeira, 2, ultima, 2);
        ws.mergeCells(primeira, 3, ultima, 3);
      }
      for (const col of [1, 2, 3]) {
        ws.getCell(primeira, col).alignment = { vertical: "middle", horizontal: col === 3 ? "left" : "center" };
      }
    });


    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = { from: "A1", to: "E1" };

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `escala-coroinhas-${inicio || "todas"}-a-${fim || "futuras"}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }


  async function atualizar() {
    await queryClient.invalidateQueries({ queryKey: ["coord-escala"] });
  }

  return (
    <div className="space-y-5">
      <div className="surface-card flex flex-wrap items-end gap-4 p-5">
        <div className="space-y-1.5">
          <Label>Início</Label>
          <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Fim (Opcional)</Label>
          <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        </div>
        <Button onClick={exportar}>Exportar para Excel</Button>
      </div>

      <div className="space-y-3">
        {escala.data?.missas.length === 0 && (
          <p className="surface-card p-5 text-sm text-muted-foreground">
            Nenhuma missa nesse período.
          </p>
        )}
        {escala.data?.missas.map((m) => {
          const insc = escala.data.inscricoes.filter((i) => i.missa_id === m.id);
          const ocupados = insc.map((i) => i.coroinha_id);
          return (
            <div key={m.id} className="surface-card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-semibold">
                  {formatarData(m.data)} · {formatarHora(m.horario)}
                </h3>
                <span className="text-sm text-muted-foreground">
                  {insc.length}/{m.vagas}
                  {m.local ? ` — ${m.local}` : ""} · {diaSemana(m.data)}
                </span>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {insc.map((i) => (
                  <li
                    key={i.id}
                    className="flex flex-wrap items-center gap-2 rounded-md bg-muted/60 px-3 py-2"
                  >
                    <span className="min-w-32 font-medium">{i.nome}</span>
                    <select
                      value={i.funcao ?? ""}
                      onChange={async (e) => {
                        await setFuncao({
                          data: { id: i.id, funcao: e.target.value || null },
                        });
                        toast.success("Função atualizada");
                        await atualizar();
                      }}
                      className="rounded-md border border-input bg-card px-2 py-1.5 text-sm"
                    >
                      <option value="">Sem função</option>
                      {FUNCOES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2 items-center">
                      <select
                        value=""
                        onChange={async (e) => {
                          if (!e.target.value) return;
                          await substituir({
                            data: { id: i.id, novoCoroinhaId: e.target.value },
                          });
                          toast.success("Coroinha substituído — sem impacto na assiduidade");
                          await atualizar();
                        }}
                        className="rounded-md border border-input bg-card px-2 py-1.5 text-sm"
                      >
                        <option value="">Substituir coroinha…</option>
                        {coroinhas
                          .filter((c) => !ocupados.includes(c.id))
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                      </select>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 px-2.5"
                        onClick={async () => {
                          if (window.confirm(`Tem certeza que deseja remover ${i.nome} desta missa?`)) {
                            await remover({ data: { id: i.id } });
                            toast.success("Coroinha removido da escala");
                            await atualizar();
                          }
                        }}
                      >
                        Excluir
                      </Button>
                    </div>
                  </li>
                ))}
                {insc.length === 0 && <li className="text-muted-foreground">Sem inscritos</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
