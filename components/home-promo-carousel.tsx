'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import useEmblaCarousel from 'embla-carousel-react'
import { ArrowRight, BadgePercent, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useLang } from '@/lib/lang-context'
import styles from './home-promo-carousel.module.css'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

type Slide = {
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

type Props = { open: boolean; onOpenChange: (open: boolean) => void }

/** Active promotions open on entry; a failed photo must not hide an offer. */
export function HomePromoCarousel({ open, onOpenChange }: Props) {
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const { lang, t } = useLang()
  const [viewportRef, carousel] = useEmblaCarousel({ loop: slides.length > 1 })
  const [selected, setSelected] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(true)
  const syncSelected = useCallback(() => {
    if (carousel) setSelected(carousel.selectedScrollSnap())
  }, [carousel])

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!carousel) return
    syncSelected()
    const stop = () => setPaused(true)
    carousel.on('select', syncSelected).on('reInit', syncSelected).on('pointerDown', stop)
    return () => { carousel.off('select', syncSelected).off('reInit', syncSelected).off('pointerDown', stop) }
  }, [carousel, syncSelected])

  useEffect(() => {
    if (!open || !carousel || slides.length < 2 || paused || hovered || reducedMotion) return
    const timer = window.setInterval(() => { if (!document.hidden) carousel.scrollNext() }, 5000)
    return () => window.clearInterval(timer)
  }, [open, carousel, slides.length, paused, hovered, reducedMotion])

  const title = lang === 'en' ? 'Special offers' : 'Promoções'

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/banners', { signal: controller.signal, cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Banners unavailable')
        return response.json()
      })
      .then((data: { slides?: Slide[] }) => {
        if (!controller.signal.aborted && Array.isArray(data.slides)) setSlides(data.slides)
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  // Do not show an empty popup on entry when no promotions are configured.
  useEffect(() => {
    if (!loading && !slides.length) onOpenChange(false)
  }, [loading, slides.length, onOpenChange])

  return (
    <>
      {slides.length > 0 && <button type="button" className={styles.launcher} onClick={() => onOpenChange(true)}>
        <BadgePercent size={20} /><span>{title}</span><span className={styles.count}>{slides.length}</span><ArrowRight size={18} />
      </button>}
      <Dialog open={open && !loading} onOpenChange={onOpenChange}>
        <DialogContent className={styles.dialog}>
          <div className={styles.heading}>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className={styles.description}>{lang === 'en' ? 'Explore our current offers.' : 'Confira as ofertas disponíveis.'}</DialogDescription>
          </div>
          <div className={styles.grid} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            <div className={styles.viewport} ref={viewportRef} aria-roledescription="carousel" aria-label={title}
              onFocusCapture={() => setPaused(true)}>
            <div className={styles.track}>
            {slides.map((slide, index) => {
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
              const content = <>
                <div className={styles.copy}>
                  <span className={styles.badge}>{lang === 'en' ? 'OFFER' : 'OFERTA'}</span>
                  <h3>{slide.title}</h3>
                  {description ? <p className={styles.summary}>{description}</p> : null}
                  {price !== null ? (
                    <div className={styles.prices}>
                      <strong>{t.currency}{price.toFixed(2)}</strong>
                      {compareAt ? <s>{t.currency}{compareAt.toFixed(2)}</s> : null}
                      {discount ? <span>-{discount}%</span> : null}
                    </div>
                  ) : href ? (
                    <span className={styles.link}>{lang === 'en' ? 'View offer' : 'Ver oferta'} <ArrowRight size={16} /></span>
                  ) : null}
                </div>
                <OfferImage key={src} src={src} original={slide.imageUrl} title={slide.title} />
              </>
              return <div key={slide.id} className={styles.slide} role="group" aria-label={`${index + 1} / ${slides.length}`} aria-hidden={index !== selected}>
                {href ? <Link href={href} tabIndex={index === selected ? 0 : -1} className={styles.card} onClick={() => onOpenChange(false)}>{content}</Link>
                  : <article className={styles.card}>{content}</article>}
              </div>
            })}
            </div>
            </div>
            {slides.length > 1 && <div className={styles.controls}>
              <button type="button" aria-label={lang === 'en' ? 'Previous banner' : 'Banner anterior'} onClick={() => { setPaused(true); carousel?.scrollPrev() }}><ChevronLeft size={20} /></button>
              <div className={styles.dots}>
                {slides.map((slide, index) => <button key={slide.id} type="button" aria-label={`${index + 1}: ${slide.title}`} aria-current={index === selected ? 'true' : undefined}
                  onClick={() => { setPaused(true); carousel?.scrollTo(index) }}><span /></button>)}
              </div>
              <span className={styles.position}>{selected + 1} / {slides.length}</span>
              <button type="button" aria-label={lang === 'en' ? 'Next banner' : 'Próximo banner'} onClick={() => { setPaused(true); carousel?.scrollNext() }}><ChevronRight size={20} /></button>
              {!reducedMotion && <button type="button" aria-label={lang === 'en' ? (paused ? 'Play banners' : 'Pause banners') : (paused ? 'Reproduzir banners' : 'Pausar banners')} onClick={() => setPaused(!paused)}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>}
            </div>}
            {!slides.length && <p>{failed
              ? (lang === 'en' ? 'Unable to load offers. Please reload the page.' : 'Não foi possível carregar as ofertas. Atualize a página.')
              : (lang === 'en' ? 'No offers available right now.' : 'Nenhuma oferta disponível no momento.')}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function OfferImage({ src, original, title }: { src: string; original: string; title: string }) {
  const [failed, setFailed] = useState<string[]>([])
  const source = [src, original].find((url) => url?.trim() && !failed.includes(url))
  if (!source) return <div className={styles.art} aria-hidden="true"><BadgePercent size={48} strokeWidth={1.3} /><span>CADU</span></div>
  return <img src={source} alt={title} className={styles.image} onError={() => setFailed((urls) => [...urls, source])} />
}
