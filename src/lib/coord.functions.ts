import { createServerFn } from "@tanstack/react-start";

export const coordStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { getCoordSession } = await import("./coord.server");
  const session = await getCoordSession();
  return { unlocked: Boolean(session.data.unlocked) };
});

export const coordLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const { getCoordSession, passwordMatches } = await import("./coord.server");
    const expected = process.env["COORD_PASSWORD"];
    if (!expected) throw new Error("Senha de coordenador não configurada");
    if (!passwordMatches(data.password, expected)) return { ok: false as const };
    const session = await getCoordSession();
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const coordLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { getCoordSession } = await import("./coord.server");
  const session = await getCoordSession();
  await session.clear();
  return { ok: true as const };
});

export const salvarMissa = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string;
      data: string;
      horario: string;
      titulo?: string;
      local: string;
      vagas: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { requireCoord, getAdmin } = await import("./coord.server");
    await requireCoord();
    const admin = await getAdmin();
    const payload = {
      data: data.data,
      horario: data.horario,
      titulo: data.titulo || "Missa",
      local: data.local || null,
      vagas: data.vagas,
    };
    const { error } = data.id
      ? await admin.from("missas").update(payload).eq("id", data.id)
      : await admin.from("missas").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });


export const excluirMissa = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { requireCoord, getAdmin } = await import("./coord.server");
    await requireCoord();
    const admin = await getAdmin();
    const { error } = await admin.from("missas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const salvarCoroinha = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { id?: string; nome: string; observacoes: string; ativo: boolean }) => data,
  )
  .handler(async ({ data }) => {
    const { requireCoord, getAdmin } = await import("./coord.server");
    await requireCoord();
    const admin = await getAdmin();
    const payload = {
      nome: data.nome,
      observacoes: data.observacoes || null,
      ativo: data.ativo,
    };
    const { error } = data.id
      ? await admin.from("coroinhas").update(payload).eq("id", data.id)
      : await admin.from("coroinhas").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const excluirCoroinha = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { requireCoord, getAdmin } = await import("./coord.server");
    await requireCoord();
    const admin = await getAdmin();
    const { error } = await admin.from("coroinhas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const marcarPresenca = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; presente: boolean | null }) => data)
  .handler(async ({ data }) => {
    const { requireCoord, getAdmin } = await import("./coord.server");
    await requireCoord();
    const admin = await getAdmin();
    const { error } = await admin
      .from("inscricoes")
      .update({ presente: data.presente })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const definirFuncao = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; funcao: string | null }) => data)
  .handler(async ({ data }) => {
    const { requireCoord, getAdmin } = await import("./coord.server");
    await requireCoord();
    const admin = await getAdmin();
    const { error } = await admin
      .from("inscricoes")
      .update({ funcao: data.funcao })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const substituirCoroinha = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; novoCoroinhaId: string }) => data)
  .handler(async ({ data }) => {
    const { requireCoord, getAdmin } = await import("./coord.server");
    await requireCoord();
    const admin = await getAdmin();
    const { error } = await admin
      .from("inscricoes")
      .update({ coroinha_id: data.novoCoroinhaId, presente: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
  
// NOVA FUNÇÃO: Remover o coroinha da escala (deleta a inscrição)
export const removerDaEscala = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { requireCoord, getAdmin } = await import("./coord.server");
    await requireCoord();
    const admin = await getAdmin();
    const { error } = await admin.from("inscricoes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listarEscala = createServerFn({ method: "POST" })
  .inputValidator((data: { inicio: string; fim: string }) => data)
  .handler(async ({ data }) => {
    const { requireCoord, getAdmin } = await import("./coord.server");
    await requireCoord();
    const admin = await getAdmin();
    const { data: missas, error } = await admin
      .from("missas")
      .select("id, data, horario, titulo, local, vagas")
      .gte("data", data.inicio)
      .lte("data", data.fim)
      .order("data")
      .order("horario");
    if (error) throw new Error(error.message);
    const ids = (missas ?? []).map((m) => m.id);
    const { data: inscricoes, error: e2 } = ids.length
      ? await admin
          .from("inscricoes")
          .select("id, missa_id, presente, funcao, coroinha_id, coroinhas(nome)")
          .in("missa_id", ids)
      : { data: [], error: null };
    if (e2) throw new Error(e2.message);
    return {
      missas: missas ?? [],
      inscricoes: (inscricoes ?? [])
        .map((i) => ({
          id: i.id,
          missa_id: i.missa_id,
          presente: i.presente,
          funcao: i.funcao,
          coroinha_id: i.coroinha_id,
          nome: i.coroinhas?.nome ?? "—",
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    };
  });


export const coordDados = createServerFn({ method: "GET" }).handler(async () => {
  const { getCoordSession, getAdmin } = await import("./coord.server");
  const session = await getCoordSession();
  if (!session.data.unlocked) {
    return { locked: true as const, missas: [], coroinhas: [] };
  }
  const admin = await getAdmin();
  const [missas, coroinhas] = await Promise.all([
    admin.from("missas").select("*").order("data", { ascending: false }).order("horario"),
    admin.from("coroinhas").select("*").order("nome"),
  ]);
  if (missas.error) throw new Error(missas.error.message);
  if (coroinhas.error) throw new Error(coroinhas.error.message);
  return { locked: false as const, missas: missas.data ?? [], coroinhas: coroinhas.data ?? [] };
});

export const listarInscricoesMissa = createServerFn({ method: "POST" })
  .inputValidator((data: { missaId: string }) => data)
  .handler(async ({ data }) => {
    const { requireCoord, getAdmin } = await import("./coord.server");
    await requireCoord();
    const admin = await getAdmin();
    const { data: rows, error } = await admin
      .from("inscricoes")
      .select("id, presente, coroinhas(nome)")
      .eq("missa_id", data.missaId);
    if (error) throw new Error(error.message);
    return (rows ?? [])
      .map((r) => ({ id: r.id, presente: r.presente, nome: r.coroinhas?.nome ?? "—" }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  });

export const alternarAtivoCoroinha = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; ativo: boolean }) => data)
  .handler(async ({ data }) => {
    const { requireCoord, getAdmin } = await import("./coord.server");
    await requireCoord();
    const admin = await getAdmin();
    const { error } = await admin
      .from("coroinhas")
      .update({ ativo: data.ativo })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const estatisticasAssiduidade = createServerFn({ method: "POST" })
  .inputValidator((data?: { inicio?: string; fim?: string }) => data ?? {})
  .handler(async ({ data }) => {
  const { requireCoord, getAdmin } = await import("./coord.server");
  await requireCoord();
  const admin = await getAdmin();
  const [coroinhas, inscricoes] = await Promise.all([
    admin.from("coroinhas").select("id, nome, ativo").order("nome"),
    admin.from("inscricoes").select("coroinha_id, presente, missas(data)"),
  ]);
  if (coroinhas.error) throw new Error(coroinhas.error.message);
  if (inscricoes.error) throw new Error(inscricoes.error.message);

  const dentro = (d?: string | null) => {
    if (!d) return false;
    if (data.inicio && d < data.inicio) return false;
    if (data.fim && d > data.fim) return false;
    return true;
  };

  const linhas = (coroinhas.data ?? []).map((c) => {
    const minhas = (inscricoes.data ?? []).filter(
      (i) => i.coroinha_id === c.id && dentro(i.missas?.data),
    );

    const presencas = minhas.filter((i) => i.presente === true).length;
    const faltas = minhas.filter((i) => i.presente === false).length;
    const pendentes = minhas.filter((i) => i.presente === null).length;
    const avaliadas = presencas + faltas;
    const ultimas = minhas
      .filter((i) => i.presente !== null)
      .sort((a, b) => String(a.missas?.data ?? "").localeCompare(String(b.missas?.data ?? "")))
      .slice(-8)
      .map((i) => ({ data: i.missas?.data ?? "", presente: i.presente === true }));
    return {
      id: c.id,
      nome: c.nome,
      ativo: c.ativo,
      escaladas: minhas.length,
      presencas,
      faltas,
      pendentes,
      percentual: avaliadas > 0 ? Math.round((presencas / avaliadas) * 100) : null,
      ultimas,
    };
  });
  return linhas;
  });
