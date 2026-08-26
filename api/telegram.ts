import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  try {
    // 1. Conecta no banco de dados (Já deixei a solda de segurança aqui também)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://switudaszwnbmgpbhamd.supabase.co";
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3aXR1ZGFzenduYm1ncGJoYW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2Nzk5MDUsImV4cCI6MjEwMzI1NTkwNX0.yodx01zOqwhdRCog-msV6YRGvz3bReAdPjY_W7Nfk9Q";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Relógio e Fuso Horário
    const agora = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const hora = agora.getHours();
    const deManha = hora < 14;

    const hojeStr = agora.toISOString().slice(0, 10);
    const amanhaData = new Date(agora); amanhaData.setDate(agora.getDate() + 1);
    const amanhaStr = amanhaData.toISOString().slice(0, 10);
    const doisDiasData = new Date(agora); doisDiasData.setDate(agora.getDate() + 2);
    const doisDiasStr = doisDiasData.toISOString().slice(0, 10);

    // 3. Puxa as Tarefas Atrasadas/Pendentes
    const { data: tarefas } = await supabase
      .from("tarefas_escola")
      .select("*")
      .eq("concluida", false)
      .lte("data_vencimento", doisDiasStr)
      .order("data_vencimento");

    // 4. Monta a Rotina da Mochila (Só Roda de Manhã)
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

    // 5. Monta o Alerta de Tarefas (Agrupado e Formatado)
    let textoTarefas = "";
    const appLink = "https://licao-de-casa.vercel.app"; // Link direto para o painel

    if (tarefas && tarefas.length > 0) {
      textoTarefas += "📋 *TAREFAS PENDENTES:*\n\n";

      // Filtra separando as crianças
      const tarefasDavi = tarefas.filter((t: any) => t.aluno === "Davi" || t.aluno === "davi");
      const tarefasPedro = tarefas.filter((t: any) => t.aluno === "Pedro" || t.aluno === "pedro");

      // BLOCO DO DAVI
      if (tarefasDavi.length > 0) {
        textoTarefas += "👦 *DAVI*\n";
        tarefasDavi.forEach((t: any) => {
          let aviso = "";
          if (t.data_vencimento < hojeStr) aviso = "⚠️ *[ATRASADA]*";
          else if (t.data_vencimento === hojeStr) aviso = "🔴 *[VENCE HOJE]*";
          else if (t.data_vencimento === amanhaStr) aviso = "🟠 *[VENCE AMANHÃ]*";
          else aviso = "🟡 *[FALTAM 2 DIAS]*";

          // Formatação com enter no final e link clicável
          textoTarefas += `${aviso} ${t.tipo}: ${t.titulo}\n👉 [Concluir Tarefa](${appLink})\n\n`;
        });
      }

      // BLOCO DO PEDRO
      if (tarefasPedro.length > 0) {
        textoTarefas += "👦 *PEDRO*\n";
        tarefasPedro.forEach((t: any) => {
          let aviso = "";
          if (t.data_vencimento < hojeStr) aviso = "⚠️ *[ATRASADA]*";
          else if (t.data_vencimento === hojeStr) aviso = "🔴 *[VENCE HOJE]*";
          else if (t.data_vencimento === amanhaStr) aviso = "🟠 *[VENCE AMANHÃ]*";
          else aviso = "🟡 *[FALTAM 2 DIAS]*";

          // Formatação com enter no final e link clicável
          textoTarefas += `${aviso} ${t.tipo}: ${t.titulo}\n👉 [Concluir Tarefa](${appLink})\n\n`;
        });
      }

    } else {
      textoTarefas += "✅ Nenhuma tarefa urgente na esteira!\n";
    }

    // 6. Bloqueio para não mandar mensagem à noite se estiver tudo pronto
    if (!deManha && (!tarefas || tarefas.length === 0)) {
      return res.status(200).json({ status: "ok", msg: "Sem pendências noturnas." });
    }

    // 7. Despacho para o Telegram
    const saudacao = deManha ? "🌅 *Bom dia, família!*\n_Resumo operacional do dia:_\n\n" : "🌙 *Resumo da Noite!*\n_Balanço das pendências:_\n\n";
    const mensagemFinal = encodeURIComponent(saudacao + textoRotina + textoTarefas);

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (token && chatId) {
      const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${mensagemFinal}&parse_mode=Markdown`;
      await fetch(url);
    }

    return res.status(200).json({ status: "ok", msg: "Disparo no Telegram efetuado com sucesso!" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro interno no processamento do alerta." });
  }
}
