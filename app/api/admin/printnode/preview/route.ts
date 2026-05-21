import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminAppUser } from '@/lib/admin-access'
import { buildKitchenReceiptExampleText } from '@/lib/kitchen-receipt-example'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!isAdminAppUser(user)) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    }

    return NextResponse.json({ text: buildKitchenReceiptExampleText() })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao gerar exemplo de impressao.' },
      { status: 500 }
    )
  }
}
