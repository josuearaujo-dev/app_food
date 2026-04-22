import { createAdminClient } from '@/lib/supabase/admin'

type StoreSettingsRow = {
  taxa_entrega_padrao: number | null
}

type DeliveryLocationRow = {
  id: string
  nome: string
  taxa_entrega: number
  ativo: boolean
  ordem: number
}

export async function listDeliveryLocations(): Promise<Array<{ id: string; nome: string; taxaEntrega: number }>> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('localidades_entrega')
    .select('id, nome, taxa_entrega, ativo, ordem')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })

  return ((data as DeliveryLocationRow[] | null) ?? [])
    .map((row) => ({
      id: row.id,
      nome: row.nome,
      taxaEntrega: Number(Number(row.taxa_entrega ?? 0).toFixed(2)),
    }))
    .filter((row) => Number.isFinite(row.taxaEntrega) && row.taxaEntrega >= 0)
}

export async function getDeliveryFeeAmount(localidadeId?: string | null): Promise<number> {
  const supabase = createAdminClient()
  if (localidadeId && localidadeId.trim()) {
    const { data: localidade } = await supabase
      .from('localidades_entrega')
      .select('taxa_entrega, ativo')
      .eq('id', localidadeId.trim())
      .maybeSingle<{ taxa_entrega: number | null; ativo: boolean | null }>()

    if (localidade?.ativo) {
      const fee = Number(localidade.taxa_entrega ?? 0)
      if (Number.isFinite(fee) && fee >= 0) return Number(fee.toFixed(2))
    }
  }

  const { data } = await supabase
    .from('configuracoes_loja')
    .select('taxa_entrega_padrao')
    .order('atualizado_em', { ascending: false })
    .limit(1)
    .maybeSingle<StoreSettingsRow>()

  const fee = Number(data?.taxa_entrega_padrao ?? 0)
  if (!Number.isFinite(fee) || fee < 0) return 0
  return Number(fee.toFixed(2))
}
