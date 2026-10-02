'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BadgePercent, Plus } from 'lucide-react'
import { useLang } from '@/lib/lang-context'
import styles from './home-promo-carousel.module.css'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export type OfferSlide = {
  id: string
  title: string
  description?: string | null
  descriptionEn?: string | null
  imageUrl: string
  imageUrlEn?: string
  href: string | null
  price?: number | null
  compareAtPrice?: number | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  showLauncher?: boolean
  onAdd?: (slide: OfferSlide) => void
}

/** Active promotions open on entry; a failed photo must not hide an offer. */
export function HomePromoCarousel({ open, onOpenChange, showLauncher = true, onAdd }: Props) {
  const [slides, setSlides] = useState<OfferSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const { lang, t } = useLang()
  const title = t.specialOffers

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/banners', { signal: controller.signal, cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Banners unavailable')
        return response.json()
      })
      .then((data: { slides?: OfferSlide[] }) => {
        if (!controller.signal.aborted && Array.isArray(data.slides)) setSlides(data.slides)
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!loading && !slides.length) onOpenChange(false)
  }, [loading, slides.length, onOpenChange])

  return (
    <>
      {showLauncher && slides.length > 0 && <button type="button" className={styles.launcher} onClick={() => onOpenChange(true)}>
        <BadgePercent size={20} /><span>{title}</span><span className={styles.count}>{slides.length}</span><ArrowRight size={18} />
      </button>}
      <Dialog open={open && !loading} onOpenChange={onOpenChange}>
        <DialogContent className={styles.dialog}>
          <div className={styles.heading}>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className={styles.description}>{lang === 'en' ? 'Pick a combo and add it to your bag.' : 'Escolha um combo e adicione à sacola.'}</DialogDescription>
          </div>
          <div className={styles.grid}>
            {slides.map((slide) => {
              const src = lang === 'en' && slide.imageUrlEn ? slide.imageUrlEn : slide.imageUrl
              const href = slide.href && /^(\/[^/]|https?:\/\/)/i.test(slide.href) ? slide.href : null
              const description = (lang === 'en' ? slide.descriptionEn || slide.description : slide.description)?.trim()
              const price = typeof slide.price === 'number' ? slide.price : null
              const compareAt = typeof slide.compareAtPrice === 'number' && price !== null && slide.compareAtPrice > price
                ? slide.compareAtPrice
                : null
              const discount = compareAt && price !== null
                ? Math.round(((compareAt - price) / compareAt) * 100)
                : null
              const copy = (
                <>
                  <span className={styles.badge}>{lang === 'en' ? 'COMBO' : 'COMBO'}</span>
                  <h3>{slide.title}</h3>
                  {description ? <p className={styles.summary}>{description}</p> : null}
                  {price !== null ? (
                    <div className={styles.prices}>
                      <strong>{t.currency}{price.toFixed(2)}</strong>
                      {compareAt ? <s>{t.currency}{compareAt.toFixed(2)}</s> : null}
                      {discount ? <span>-{discount}%</span> : null}
                    </div>
                  ) : null}
                </>
              )
              return (
                <article key={slide.id} className={styles.card}>
                  <div className={styles.copy}>{copy}</div>
                  <div className={styles.side}>
                    <OfferImage key={src} src={src} original={slide.imageUrl} title={slide.title} />
                    {onAdd ? (
                      <button
                        type="button"
                        className={styles.add}
                        onClick={() => {
                          console.info('[cadu:combo-add] popup Add button', {
                            id: slide.id,
                            title: slide.title,
                            href: slide.href,
                            price: slide.price,
                          })
                          onAdd(slide)
                        }}
                      >
                        {t.addToCart} <Plus size={14} />
                      </button>
                    ) : href ? (
                      <Link href={href} className={styles.add} onClick={() => onOpenChange(false)}>
                        {lang === 'en' ? 'View' : 'Ver'} <ArrowRight size={14} />
                      </Link>
                    ) : null}
                  </div>
                </article>
              )
            })}
            {!slides.length && <p>{failed
              ? (lang === 'en' ? 'Unable to load offers. Please reload the page.' : 'Não foi possível carregar as ofertas. Atualize a página.')
              : (lang === 'en' ? 'No offers available right now.' : 'Nenhuma oferta disponível no momento.')}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function SpecialOfferGrid({ slides, addLabel, onAdd }: { slides: OfferSlide[]; addLabel: string; onAdd: (slide: OfferSlide) => void }) {
  const { lang, t } = useLang()
  return (
    <div className={styles.section}>
      {slides.map((slide) => {
        const src = lang === 'en' && slide.imageUrlEn ? slide.imageUrlEn : slide.imageUrl
        const href = slide.href && /^(\/[^/]|https?:\/\/)/i.test(slide.href) ? slide.href : null
        const description = (lang === 'en' ? slide.descriptionEn || slide.description : slide.description)?.trim()
        const price = typeof slide.price === 'number' ? slide.price : null
        const compareAt = typeof slide.compareAtPrice === 'number' && price !== null && slide.compareAtPrice > price
          ? slide.compareAtPrice
          : null
        const discount = compareAt && price !== null
          ? Math.round(((compareAt - price) / compareAt) * 100)
          : null
        const copy = (
          <>
            <span className={styles.badge}>{lang === 'en' ? 'COMBO' : 'COMBO'}</span>
            <h3>{slide.title}</h3>
            {description ? <p className={styles.summary}>{description}</p> : null}
            {price !== null ? (
              <div className={styles.prices}>
                <strong>{t.currency}{price.toFixed(2)}</strong>
                {compareAt ? <s>{t.currency}{compareAt.toFixed(2)}</s> : null}
                {discount ? <span>-{discount}%</span> : null}
              </div>
            ) : href ? (
              <span className={styles.link}>{lang === 'en' ? 'View combo' : 'Ver combo'} <ArrowRight size={16} /></span>
            ) : null}
          </>
        )
        return (
          <article key={slide.id} className={styles.card}>
            <div className={styles.copy}>{copy}</div>
            <div className={styles.side}>
              <OfferImage key={src} src={src} original={slide.imageUrl} title={slide.title} />
              <button type="button" className={styles.add} onClick={() => {
                console.info('[cadu:combo-add] menu Add button', {
                  id: slide.id,
                  title: slide.title,
                  href: slide.href,
                  price: slide.price,
                })
                onAdd(slide)
              }}>
                {addLabel} <Plus size={14} />
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function OfferImage({ src, original, title }: { src: string; original: string; title: string }) {
  const [failed, setFailed] = useState<string[]>([])
  const source = [src, original].find((url) => url?.trim() && !failed.includes(url))
  if (!source) return <div className={styles.art} aria-hidden="true"><BadgePercent size={48} strokeWidth={1.3} /><span>CADU</span></div>
  return <img src={source} alt={title} className={styles.image} onError={() => setFailed((urls) => [...urls, source])} />
}
