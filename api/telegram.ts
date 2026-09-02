import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  try {
    // 1. Conexão com o Supabase
    const supabaseUrl =
      process.env.VITE_SUPABASE_URL ||
      "https://switudaszwnbmgpbhamd.supabase.co";
    const supabaseKey =
      process.env.VITE_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3aXR1ZGFzenduYm1ncGJoYW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2Nzk5MDUsImV4cCI6MjEwMzI1NTkwNX0.yodx01zOqwhdRCog-msV6YRGvz3bReAdPjY_W7Nfk9Q";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Fuso Horário de São Paulo
    const agoraStr = new Date().toLocaleString("en-US", {
      timeZone: "America/Sao_Paulo",
    });
    const agora = new Date(agoraStr);
    const hora = agora.getHours();
    const deManha = hora < 14;

    const formatData = (d: Date) => {
      const ano = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      const dia = String(d.getDate()).padStart(2, "0");
      return `${ano}-${mes}-${dia}`;
    };

    const hojeStr = formatData(agora);

    const amanhaData = new Date(agora);
    amanhaData.setDate(agora.getDate() + 1);
    const amanhaStr = formatData(amanhaData);

    const doisDiasData = new Date(agora);
    doisDiasData.setDate(agora.getDate() + 2);
    const doisDiasStr = formatData(doisDiasData);

    // 3. Busca Tarefas Atrasadas / Pendentes
    const { data: tarefas, error: errTarefas } = await supabase
      .from("tarefas_escola")
      .select("*")
      .eq("concluida", false)
      .lte("data_vencimento", doisDiasStr)
      .order("data_vencimento");

    if (errTarefas) {
      console.error("Erro ao buscar tarefas no Supabase:", errTarefas);
    }

    // 4. Monta a Rotina da Mochila (Somente de manhã)
    let textoRotina = "";
    if (deManha) {
      const diaSemana = agora.getDay();
      const diaAlvo = diaSemana === 0 || diaSemana === 6 ? 1 : diaSemana;

      const { data: rotinas } = await supabase
        .from("rotina_semanal")
        .select("*")
        .eq("dia_semana", diaAlvo);

      if (rotinas && rotinas.length > 0) {
        textoRotina += "🎒 *MOCHILA E ROTINA:*\n\n";
        rotinas.forEach((r) => {
          // Exibe diretamente a frase da mochila, removendo o prefixo "Nome: Matérias"
          const fraseMochila = r.mochila || `Hoje o ${r.aluno} tem que levar as apostilas de ${r.atividade}.`;
          textoRotina += `• ${fraseMochila}\n\n`;
        });
      }
    }

    // 5. Monta o Alerta de Tarefas (com espaçamentos limpos)
    let textoTarefas = "";
    const appLink = "https://licao-de-casa.vercel.app";

    if (tarefas && tarefas.length > 0) {
      textoTarefas += "📋 *TAREFAS PENDENTES:*\n\n";

      const tarefasDavi = tarefas.filter(
        (t: any) => t.aluno?.toLowerCase() === "davi"
      );
      const tarefasPedro = tarefas.filter(
        (t: any) => t.aluno?.toLowerCase() === "pedro"
      );

      // BLOCO DO DAVI
      if (tarefasDavi.length > 0) {
        textoTarefas += "👦 *DAVI*\n\n";
        tarefasDavi.forEach((t: any) => {
          let aviso = "";
          if (t.data_vencimento < hojeStr) aviso = "⚠️ *[ATRASADA]*";
          else if (t.data_vencimento === hojeStr) aviso = "🔴 *[VENCE HOJE]*";
          else if (t.data_vencimento === amanhaStr) aviso = "🟠 *[VENCE AMANHÃ]*";
          else aviso = "🟡 *[FALTAM 2 DIAS]*";

          textoTarefas += `${aviso} ${t.tipo}: ${t.titulo}\n👉 [Concluir Tarefa](${appLink})\n\n`;
        });
      }

      // BLOCO DO PEDRO (com espaçamento de separação do Davi)
      if (tarefasPedro.length > 0) {
        if (tarefasDavi.length > 0) {
          textoTarefas += "\n";
        }
        textoTarefas += "👦 *PEDRO*\n\n";
        tarefasPedro.forEach((t: any) => {
          let aviso = "";
          if (t.data_vencimento < hojeStr) aviso = "⚠️ *[ATRASADA]*";
          else if (t.data_vencimento === hojeStr) aviso = "🔴 *[VENCE HOJE]*";
          else if (t.data_vencimento === amanhaStr) aviso = "🟠 *[VENCE AMANHÃ]*";
          else aviso = "🟡 *[FALTAM 2 DIAS]*";

          textoTarefas += `${aviso} ${t.tipo}: ${t.titulo}\n👉 [Concluir Tarefa](${appLink})\n\n`;
        });
      }
    } else {
      textoTarefas += "✅ Nenhuma tarefa pendente!\n";
    }

    // 6. Montagem final e envio via POST para o Telegram
    const saudacao = deManha
      ? "🌅 *Bom dia, família!*\n_Resumo operacional do dia:_\n\n"
      : "🌙 *Resumo da Noite!*\n_Balanço das pendências:_\n\n";

    const mensagemFinal = saudacao + textoRotina + textoTarefas;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return res.status(500).json({
        error: "TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não estão configuradas.",
      });
    }

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: mensagemFinal,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      }
    );

    const telegramData = await telegramRes.json();

    if (!telegramRes.ok) {
      console.error("Erro retornado pelo Telegram:", telegramData);
      return res
        .status(400)
        .json({ error: "Erro na API do Telegram", detalhe: telegramData });
    }

    return res
      .status(200)
      .json({ status: "ok", msg: "Disparo no Telegram efetuado com sucesso!" });
  } catch (error: any) {
    console.error("Erro interno no processamento:", error);
    return res.status(500).json({
      error: "Erro interno no processamento do alerta.",
      detalhes: error.message,
    });
  }
}
