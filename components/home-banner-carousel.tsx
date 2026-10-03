'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useLang } from '@/lib/lang-context'

export type BannerSlide = {
  id: string
  title: string
  imageUrl: string
  imageUrlEn?: string
  href: string | null
}

/** Carousel de banners da home (Admin → Banners), separado das Ofertas especiais. */
export function HomeBannerCarousel({ slides }: { slides: BannerSlide[] }) {
  const { lang } = useLang()
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
    return () => {
      carousel.off('select', syncSelected).off('reInit', syncSelected).off('pointerDown', stop)
    }
  }, [carousel, syncSelected])

  useEffect(() => {
    if (!carousel || slides.length < 2 || paused || hovered || reducedMotion) return
    const timer = window.setInterval(() => {
      if (!document.hidden) carousel.scrollNext()
    }, 5000)
    return () => window.clearInterval(timer)
  }, [carousel, slides.length, paused, hovered, reducedMotion])

  if (!slides.length) return null

  const label = lang === 'en' ? 'Banners' : 'Banners'

  return (
    <section
      className="cadu-promos"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="cadu-promos-viewport" ref={viewportRef}>
        <div style={{ display: 'flex' }}>
          {slides.map((slide, index) => {
            const src = lang === 'en' && slide.imageUrlEn ? slide.imageUrlEn : slide.imageUrl
            const href = slide.href && /^(\/[^/]|https?:\/\/)/i.test(slide.href) ? slide.href : null
            const image = (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={slide.title} className="cadu-promo-image" />
            )
            return (
              <div
                key={slide.id}
                className="cadu-promo-slide"
                role="group"
                aria-label={`${index + 1} / ${slides.length}`}
                aria-hidden={index !== selected}
              >
                {href ? (
                  <Link href={href} tabIndex={index === selected ? 0 : -1}>
                    {image}
                  </Link>
                ) : (
                  image
                )}
                {slide.title ? <p className="cadu-promo-caption">{slide.title}</p> : null}
              </div>
            )
          })}
        </div>
      </div>
      {slides.length > 1 ? (
        <div className="cadu-promo-controls">
          <button
            type="button"
            aria-label={lang === 'en' ? 'Previous banner' : 'Banner anterior'}
            onClick={() => {
              setPaused(true)
              carousel?.scrollPrev()
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="cadu-promo-dots">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`${index + 1}: ${slide.title}`}
                aria-current={index === selected ? 'true' : undefined}
                onClick={() => {
                  setPaused(true)
                  carousel?.scrollTo(index)
                }}
              >
                <span />
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label={lang === 'en' ? 'Next banner' : 'Próximo banner'}
            onClick={() => {
              setPaused(true)
              carousel?.scrollNext()
            }}
          >
            <ChevronRight size={20} />
          </button>
          {!reducedMotion ? (
            <button
              type="button"
              aria-label={
                lang === 'en'
                  ? paused
                    ? 'Play banners'
                    : 'Pause banners'
                  : paused
                    ? 'Reproduzir banners'
                    : 'Pausar banners'
              }
              onClick={() => setPaused(!paused)}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
