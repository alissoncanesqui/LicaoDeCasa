import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  try {
    // 1. Conecta direto no banco de dados
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
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

    // 5. Monta o Alerta (Andon)
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
