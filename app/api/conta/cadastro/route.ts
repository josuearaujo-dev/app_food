import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      nome?: string
      telefone?: string
      email?: string
      password?: string
      aceitaSms?: boolean
      aceitaEmail?: boolean
    }

    const nome = String(body.nome ?? '').trim()
    const telefone = String(body.telefone ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const aceitaSms = Boolean(body.aceitaSms)
    const aceitaEmail = Boolean(body.aceitaEmail)

    if (nome.length < 2 || telefone.length < 8 || !email.includes('@')) {
      return NextResponse.json({ error: 'invalid' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'weak_password' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'customer',
        nome_completo: nome,
        telefone,
        aceita_sms_atualizacoes_pedido: aceitaSms,
        aceita_email_atualizacoes_pedido: aceitaEmail,
      },
    })

    if (error || !data.user) {
      const message = (error?.message ?? '').toLowerCase()
      if (message.includes('already') || message.includes('registered') || message.includes('exists')) {
        return NextResponse.json({ error: 'email_taken' }, { status: 409 })
      }
      return NextResponse.json({ error: 'signup_failed' }, { status: 400 })
    }

    const { error: profileError } = await admin.from('cliente_perfis').upsert(
      {
        user_id: data.user.id,
        nome_completo: nome,
        telefone,
        aceita_sms_atualizacoes_pedido: aceitaSms,
        aceita_email_atualizacoes_pedido: aceitaEmail,
      },
      { onConflict: 'user_id' }
    )

    if (profileError) {
      console.error('[cadastro] perfil', profileError.message)
      return NextResponse.json({ error: 'signup_failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[cadastro]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'signup_failed' }, { status: 500 })
  }
}
