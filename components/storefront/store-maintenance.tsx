import Image from 'next/image'
import logo from '@/logo/logo-principal-transparent.png'

export function StoreMaintenance() {
  return (
    <main className="cadu-maintenance">
      <div className="cadu-maintenance-card">
        <Image
          src={logo}
          alt="Cadu Cakes & Lanches"
          width={220}
          height={120}
          priority
          className="cadu-maintenance-logo"
        />
        <p className="cadu-maintenance-kicker">Temporarily closed</p>
        <h1>We&apos;ll be right back</h1>
        <p>
          Cadu Cakes &amp; Lanches is taking a short break while we make a few updates to the
          store.
        </p>
        <p>Online orders are paused for now. Please check back soon.</p>
        <p className="cadu-maintenance-thanks">Thank you for your patience.</p>
      </div>
    </main>
  )
}
