'use client'

import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Image from 'next/image'
import Link from 'next/link'
import { useLang } from '@/lib/lang-context'
import { cn } from '@/lib/utils'

type Slide = { id: string; title: string; imageUrl: string; imageUrlEn?: string; href: string | null }

export function HomePromoCarousel() {
  const [slides, setSlides] = useState<Slide[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/banners')
      .then((r) => r.json())
      .then((data: { slides?: Slide[] }) => {
        if (!cancelled && Array.isArray(data.slides)) setSlides(data.slides)
      })
      .catch(() => {
        if (!cancelled) setSlides([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (slides.length === 0) return null

  return <HomePromoCarouselInner slides={slides} />
}

function HomePromoCarouselInner({ slides }: { slides: Slide[] }) {
  const { t, lang } = useLang()
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: slides.length > 1,
    align: 'start',
  })
  const [selected, setSelected] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelected(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  useEffect(() => {
    if (!emblaApi || slides.length < 2) return
    const id = window.setInterval(() => emblaApi.scrollNext(), 5500)
    return () => window.clearInterval(id)
  }, [emblaApi, slides.length])

  return (
    <section
      className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen border-b border-border/60 bg-card/40 pb-5 pt-4 md:pt-5"
      aria-label={t.homePromoCarouselAria}
    >
      <div className="mx-auto w-full max-w-[1360px] overflow-hidden bg-muted/30 shadow-(--shadow-card)">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y">
            {slides.map((s, i) => (
              <div key={s.id} className="min-w-0 shrink-0 grow-0 basis-full">
                <div className="group relative aspect-video min-h-[200px] w-full sm:aspect-16/8.5 sm:min-h-[240px] md:aspect-16/5.5 md:min-h-[220px] md:max-h-[360px]">
                  {(() => {
                    const imageSrc = lang === 'en' && s.imageUrlEn ? s.imageUrlEn : s.imageUrl
                    return s.href ? (
                      <Link href={s.href} className="block h-full w-full" aria-label={s.title}>
                        <Image
                          src={imageSrc}
                          alt={s.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1360px) 100vw, 1360px"
                          priority={i === 0}
                        />
                      </Link>
                    ) : (
                      <Image
                        src={imageSrc}
                        alt={s.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1360px) 100vw, 1360px"
                        priority={i === 0}
                      />
                    )
                  })()}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/65 to-transparent px-3 pb-2.5 pt-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                    <p className="line-clamp-2 text-center text-xs font-semibold text-white drop-shadow-sm sm:text-sm">
                      {s.title}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {slides.length > 1 && (
          <div className="flex justify-center gap-1.5 py-2.5" role="tablist" aria-label={t.homePromoDotsAria}>
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === selected}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === selected ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/35'
                )}
                onClick={() => emblaApi?.scrollTo(i)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
