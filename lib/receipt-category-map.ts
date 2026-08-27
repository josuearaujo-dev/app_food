export type CategoryNameLookupClient = {
  from: (table: 'categorias') => {
    select: (columns: string) => {
      in: (column: string, values: string[]) => Promise<{
        data: Array<{ id: string; nome: string | null }> | null
        error: { message: string } | null
      }>
    }
  }
}

export async function fetchCategoryNameMap(
  supabase: CategoryNameLookupClient,
  categoryIds: Array<string | null | undefined>
) {
  const ids = [...new Set(categoryIds.map((id) => String(id ?? '').trim()).filter(Boolean))]
  if (ids.length === 0) return new Map<string, string>()

  const { data, error } = await supabase.from('categorias').select('id, nome').in('id', ids)
  if (error) {
    throw new Error(error.message)
  }

  return new Map((data ?? []).map((row) => [row.id, row.nome?.trim() || 'SEM CATEGORIA']))
}
