import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabase } from "@/integrations/supabase/client";

export const APIRoute = createAPIFileRoute("/api/telegram")({
  GET: async () => {
    // 1. Pega a hora do fuso de Brasília
    const agora = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const hora = agora.getHours();
    const deManha = hora < 14; 

    const hojeStr = agora.toISOString().slice(0, 10);
    const amanhaData = new Date(agora); amanhaData.setDate(agora.getDate() + 1);
    const amanhaStr = amanhaData.toISOString().slice(0, 10);
    const doisDiasData = new Date(agora); doisDiasData.setDate(agora.getDate() + 2);
    const doisDiasStr = doisDiasData.toISOString().slice(0, 10);

    // 2. Puxa as tarefas
    const { data: tarefas } = await supabase
      .from("tarefas_escola")
      .select("*")
      .eq("concluida", false)
      .lte("data_vencimento", doisDiasStr)
      .order("data_vencimento");

    // 3. Monta o bloco da Mochila (SÓ ACONTECE DE MANHÃ)
    let textoRotina = "";
    if (deManha) {
      const diaSemana = agora.getDay();
      const diaAlvo = (diaSemana === 0 || diaSemana === 6) ? 1 : diaSemana;
      
      const { data: rotinas } = await supabase.from("rotina_semanal").select("*").eq("dia_semana", diaAlvo);
      
      if (rotinas && rotinas.length > 0) {
        textoRotina += "🎒 *MOCHILA E ROTINA:*\n";
        rotinas.forEach(r => {
          textoRotina += `• ${r.aluno}: ${r.atividade} (Levar: ${r.mochila})\n`;
        });
        textoRotina += "\n";
      }
    }

    // 4. Monta o alerta Andon das Tarefas
    let textoTarefas = "";
    if (tarefas && tarefas.length > 0) {
      textoTarefas += "🚨 *SISTEMA ANDON - TAREFAS:*\n";
      tarefas.forEach(t => {
        let aviso = "";
        if (t.data_vencimento < hojeStr) aviso = "⚠️ *[ATRASADA]*";
        else if (t.data_vencimento === hojeStr) aviso = "🔴 *[VENCE HOJE]*";
        else if (t.data_vencimento === amanhaStr) aviso = "🟠 *[VENCE AMANHÃ]*";
        else aviso = "🟡 *[FALTAM 2 DIAS]*";

        textoTarefas += `${aviso} ${t.aluno} - ${t.tipo}: ${t.titulo}\n`;
      });
    } else {
      textoTarefas += "✅ Nenhuma tarefa urgente na esteira!\n";
    }

    // 5. Bloqueio para não perturbar a noite se não tiver tarefa
    if (!deManha && (!tarefas || tarefas.length === 0)) {
      return new Response(JSON.stringify({ status: "ok", msg: "Sem pendências noturnas." }));
    }

    const saudacao = deManha ? "🌅 *Bom dia, família!*\n_Resumo operacional do dia:_\n\n" : "🌙 *Resumo da Noite!*\n_Balanço das pendências:_\n\n";
    const mensagemFinal = encodeURIComponent(saudacao + textoRotina + textoTarefas);

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (token && chatId) {
      const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${mensagemFinal}&parse_mode=Markdown`;
      await fetch(url);
    }

    return new Response(JSON.stringify({ status: "ok", msg: "Disparo no Telegram efetuado!" }));
  }
});
