import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      nome?: string
      telefone?: string
      aceitaSms?: boolean
      aceitaEmail?: boolean
    }
    const nome = String(body.nome ?? '').trim()
    const telefone = String(body.telefone ?? '').trim()
    if (nome.length < 2 || telefone.length < 8) {
      return NextResponse.json({ error: 'invalid' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin.from('cliente_perfis').upsert(
      {
        user_id: user.id,
        nome_completo: nome,
        telefone,
        aceita_sms_atualizacoes_pedido: Boolean(body.aceitaSms),
        aceita_email_atualizacoes_pedido: Boolean(body.aceitaEmail),
        prefere_salvar_cartao_futuro: false,
      },
      { onConflict: 'user_id' }
    )

    if (error) {
      console.error('[perfil]', error.message)
      return NextResponse.json({ error: 'save_failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[perfil]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }
}
