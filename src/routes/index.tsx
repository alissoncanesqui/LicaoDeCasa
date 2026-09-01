import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  component: DashboardLogistica,
});

type Aba = "Visão Geral" | "Pedro" | "Davi" | "Rotina Fixa";

function DashboardLogistica() {
  const queryClient = useQueryClient();
  const [aba, setAba] = useState<Aba>("Visão Geral");
  const [modalTarefa, setModalTarefa] = useState(false);
  const [modalRotina, setModalRotina] = useState(false);

  const hojeData = new Date();
  const hojeIso = hojeData.toISOString().slice(0, 10);
  const diaSemanaAtual = hojeData.getDay(); // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab

  const formTarefaVazio = { id: "", aluno: "Pedro", tipo: "Lição de Casa", titulo: "", detalhes: "", data_vencimento: hojeIso };
  const formRotinaVazio = { aluno: "Pedro", dia_semana: "1", atividade: "", mochila: "" };
  
  const [formTarefa, setFormTarefa] = useState(formTarefaVazio);
  const [formRotina, setFormRotina] = useState(formRotinaVazio);

  // --- BUSCAS NO BANCO ---
  const { data: tarefas = [], isLoading: loadT } = useQuery({
    queryKey: ["tarefas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tarefas_escola").select("*").order("data_vencimento");
      if (error) throw error;
      return data;
    },
  });

  const { data: rotinas = [], isLoading: loadR } = useQuery({
    queryKey: ["rotinas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rotina_semanal").select("*").order("dia_semana");
      if (error) throw error;
      return data;
    },
  });

  // --- COMANDOS DAS TAREFAS PONTUAIS ---
  const salvarTarefa = useMutation({
    mutationFn: async () => {
      const payload = {
        aluno: formTarefa.aluno,
        tipo: formTarefa.tipo,
        titulo: formTarefa.titulo,
        detalhes: formTarefa.detalhes || null,
        data_vencimento: formTarefa.data_vencimento,
      };
      const { error } = formTarefa.id
        ? await supabase.from("tarefas_escola").update(payload).eq("id", formTarefa.id)
        : await supabase.from("tarefas_escola").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarefa registrada!");
      setModalTarefa(false);
      setFormTarefa(formTarefaVazio);
      queryClient.invalidateQueries({ queryKey: ["tarefas"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const alternarTarefa = useMutation({
    mutationFn: async ({ id, concluida }: { id: string; concluida: boolean }) => {
      const { error } = await supabase.from("tarefas_escola").update({ concluida }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tarefas"] }),
  });

  const excluirTarefa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tarefas_escola").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tarefas"] }),
  });

  // --- COMANDOS DA ROTINA FIXA ---
  const salvarRotina = useMutation({
    mutationFn: async () => {
      const payload = {
        aluno: formRotina.aluno,
        dia_semana: Number(formRotina.dia_semana),
        atividade: formRotina.atividade,
        mochila: formRotina.mochila,
      };
      const { error } = await supabase.from("rotina_semanal").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rotina fixa adicionada!");
      setModalRotina(false);
      setFormRotina(formRotinaVazio);
      queryClient.invalidateQueries({ queryKey: ["rotinas"] });
    },
  });

  const excluirRotina = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rotina_semanal").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rotinas"] }),
  });

  // --- FILTROS DE TELA ---
  const tarefasFiltradas = aba === "Visão Geral" 
    ? tarefas.filter(t => !t.concluida && t.data_vencimento <= hojeIso)
    : tarefas.filter(t => t.aluno === aba);

  const diaAlvo = (diaSemanaAtual === 0 || diaSemanaAtual === 6) ? 1 : diaSemanaAtual;
  const rotinaHoje = rotinas.filter(r => r.dia_semana === diaAlvo);
  
  const nomeDia = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <header className="bg-slate-900 text-white shadow-md">
        <div className="mx-auto w-full max-w-2xl px-5 py-6">
          <h1 className="text-2xl font-bold tracking-tight">Logística Escolar</h1>
          <p className="text-slate-400 text-sm mt-1">Gestão de Mochilas, Tarefas e Eventos</p>
        </div>
      </header>

      <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur overflow-x-auto">
        <div className="mx-auto flex w-full max-w-2xl gap-2 px-3 py-2 text-sm font-medium min-w-[400px]">
          {(["Visão Geral", "Pedro", "Davi", "Rotina Fixa"] as Aba[]).map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={`whitespace-nowrap rounded-md px-3 py-2 transition-colors ${
                aba === a ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-2xl px-5 py-6">
        
        {/* --- TELA VISÃO GERAL --- */}
        {aba === "Visão Geral" && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              Mochila de {nomeDia[diaAlvo]}
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2 mb-8">
              {["Pedro", "Davi"].map(aluno => {
                const rotinaAluno = rotinaHoje.filter(r => r.aluno === aluno);
                return (
                  <div key={aluno} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-t-4 border-t-slate-800">
                    <h3 className="font-bold text-slate-900 mb-3 uppercase tracking-wider text-sm">{aluno}</h3>
                    {rotinaAluno.length === 0 ? (
                      <p className="text-sm text-slate-500">Nenhuma rotina especial hoje.</p>
                    ) : (
                      <ul className="space-y-3">
                        {rotinaAluno.map(r => (
                          <li key={r.id} className="text-sm">
                            <span className="font-semibold block text-slate-700">{r.atividade}:</span>
                            <span className="text-slate-600">🎒 {r.mochila}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
            <hr className="border-slate-200 mb-6" />
          </div>
        )}

        {/* --- TELA DE ROTINA FIXA --- */}
        {aba === "Rotina Fixa" ? (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Quadro de Horários</h2>
              <Button onClick={() => setModalRotina(true)} size="sm" className="bg-slate-900 shadow-sm hover:bg-slate-800">
                + Rotina
              </Button>
            </div>

            {modalRotina && (
              <form className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4" onSubmit={(e) => { e.preventDefault(); salvarRotina.mutate(); }}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-lg">Nova Rotina Fixa</h3>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setModalRotina(false)}>✕ Fechar</Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Aluno</Label>
                    <select value={formRotina.aluno} onChange={(e) => setFormRotina({ ...formRotina, aluno: e.target.value })} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
                      <option value="Pedro">Pedro</option>
                      <option value="Davi">Davi</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Dia da Semana</Label>
                    <select value={formRotina.dia_semana} onChange={(e) => setFormRotina({ ...formRotina, dia_semana: e.target.value })} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
                      <option value="1">Segunda-feira</option>
                      <option value="2">Terça-feira</option>
                      <option value="3">Quarta-feira</option>
                      <option value="4">Quinta-feira</option>
                      <option value="5">Sexta-feira</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Atividade / Aula</Label>
                  <Input required placeholder="Ex: Educação Física" value={formRotina.atividade} onChange={(e) => setFormRotina({ ...formRotina, atividade: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>O que colocar na mochila?</Label>
                  <Input required placeholder="Ex: Uniforme, tênis e garrafa d'água" value={formRotina.mochila} onChange={(e) => setFormRotina({ ...formRotina, mochila: e.target.value })} />
                </div>
                <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={salvarRotina.isPending}>
                  {salvarRotina.isPending ? "Salvando..." : "Adicionar à Rotina"}
                </Button>
              </form>
            )}

            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map(dia => {
                const itensDia = rotinas.filter(r => r.dia_semana === dia);
                if (itensDia.length === 0) return null;
                return (
                  <div key={dia} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-3 bg-slate-100 px-3 py-1.5 rounded inline-block">{nomeDia[dia]}</h3>
                    <ul className="space-y-3">
                      {itensDia.map(r => (
                        <li key={r.id} className="flex justify-between items-start text-sm border-b border-slate-50 pb-2 last:border-0">
                          <div>
                            <span className="font-semibold text-slate-700 block">{r.aluno} - {r.atividade}</span>
                            <span className="text-slate-500">Levar: {r.mochila}</span>
                          </div>
                          <button onClick={() => { if(window.confirm("Excluir rotina?")) excluirRotina.mutate(r.id) }} className="text-red-500 hover:text-red-700 text-xs font-medium ml-2">Excluir</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* --- TELA DE TAREFAS PONTUAIS --- */
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                {aba === "Visão Geral" ? "Tarefas e Eventos Pendentes" : `Demandas de ${aba}`}
              </h2>
              <Button onClick={() => { setFormTarefa({ ...formTarefaVazio, aluno: aba === "Visão Geral" ? "Pedro" : aba as string }); setModalTarefa(true); }} size="sm" className="bg-slate-900 shadow-sm hover:bg-slate-800">
                + Tarefa
              </Button>
            </div>

            {modalTarefa && (
              <form className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4" onSubmit={(e) => { e.preventDefault(); salvarTarefa.mutate(); }}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-lg">Nova Tarefa / Evento</h3>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setModalTarefa(false)}>✕ Fechar</Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Aluno</Label>
                    <select value={formTarefa.aluno} onChange={(e) => setFormTarefa({ ...formTarefa, aluno: e.target.value })} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
                      <option value="Pedro">Pedro</option>
                      <option value="Davi">Davi</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <select value={formTarefa.tipo} onChange={(e) => setFormTarefa({ ...formTarefa, tipo: e.target.value })} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
                      <option value="Lição de Casa">Lição de Casa</option>
                      <option value="Trabalho">Trabalho</option>
                      <option value="Prova">Prova</option>
                      <option value="Evento">Evento</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Matéria / Título</Label>
                  <select
                    required
                    value={formTarefa.titulo}
                    onChange={(e) => setFormTarefa({ ...formTarefa, titulo: e.target.value })}
                    className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  >
                    <option value="">Selecione a matéria...</option>
                    <option value="Português">Português</option>
                    <option value="Matemática">Matemática</option>
                    <option value="Ciências">Ciências</option>
                    <option value="História">História</option>
                    <option value="Geografia">Geografia</option>
                    <option value="Inglês">Inglês</option>
                    <option value="Artes">Artes</option>
                    <option value="Bolodim">Bolodim</option>
                    <option value="Outros">Outros / Evento</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <Label>Detalhes (Opcional)</Label>
                  <Input placeholder="Materiais, páginas do livro..." value={formTarefa.detalhes} onChange={(e) => setFormTarefa({ ...formTarefa, detalhes: e.target.value })} />
                </div>

                <div className="space-y-1.5">
                  <Label>Data de Vencimento / Evento</Label>
                  <Input required type="date" value={formTarefa.data_vencimento} onChange={(e) => setFormTarefa({ ...formTarefa, data_vencimento: e.target.value })} />
                </div>

                <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={salvarTarefa.isPending}>
                  {salvarTarefa.isPending ? "Processando..." : "Salvar no Sistema"}
                </Button>
              </form>
            )}

            {loadT || loadR ? (
              <p className="text-sm text-slate-500">Sincronizando com o banco...</p>
            ) : tarefasFiltradas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
                Nenhuma pendência ou evento para exibir aqui. Tudo em dia!
              </div>
            ) : (
              <div className="space-y-4">
                {tarefasFiltradas.map(t => {
                  const atrasada = !t.concluida && t.data_vencimento < hojeIso;
                  return (
                    <div key={t.id} className={`rounded-xl border p-4 shadow-sm transition-all flex justify-between items-start gap-3 ${t.concluida ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {aba === "Visão Geral" && <span className="text-xs font-bold uppercase text-slate-500">{t.aluno}</span>}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${
                            t.tipo === 'Prova' ? 'bg-red-100 text-red-700 border-red-200' :
                            t.tipo === 'Trabalho' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                            t.tipo === 'Evento' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                            'bg-blue-100 text-blue-700 border-blue-200'
                          }`}>
                            {t.tipo}
                          </span>
                        </div>
                        <h3 className={`font-semibold text-lg ${t.concluida ? 'line-through text-slate-500' : 'text-slate-900'}`}>{t.titulo}</h3>
                        {t.detalhes && <p className="text-sm text-slate-600 mt-1">{t.detalhes}</p>}
                        
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <span className={`font-medium ${atrasada ? 'text-red-600' : 'text-slate-500'}`}>
                            Data: {t.data_vencimento.split('-').reverse().join('/')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-3">
                        <input 
                          type="checkbox" 
                          checked={t.concluida}
                          onChange={() => alternarTarefa.mutate({ id: t.id, concluida: !t.concluida })}
                          className="size-6 rounded border-slate-300 accent-slate-900 cursor-pointer"
                        />
                        {aba !== "Visão Geral" && (
                          <button 
                            onClick={() => {
                              if (window.confirm("Excluir este item?")) excluirTarefa.mutate(t.id);
                            }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium mt-2"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
