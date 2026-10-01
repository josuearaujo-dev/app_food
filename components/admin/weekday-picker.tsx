'use client'

const WEEKDAYS = [
  { id: 1, en: 'Mon', pt: 'Seg' },
  { id: 2, en: 'Tue', pt: 'Ter' },
  { id: 3, en: 'Wed', pt: 'Qua' },
  { id: 4, en: 'Thu', pt: 'Qui' },
  { id: 5, en: 'Fri', pt: 'Sex' },
  { id: 6, en: 'Sat', pt: 'Sáb' },
  { id: 0, en: 'Sun', pt: 'Dom' },
]

export function WeekdayPicker({
  value,
  onChange,
  lang,
}: {
  value: number[]
  onChange: (days: number[]) => void
  lang: 'en' | 'pt'
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold text-[#531b04]">
        {lang === 'en' ? 'Days on the menu' : 'Dias no cardápio'}
      </p>
      <div className="flex flex-wrap gap-2">
        {WEEKDAYS.map((day) => {
          const selected = value.includes(day.id)
          return (
            <button
              key={day.id}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                onChange(selected ? value.filter((item) => item !== day.id) : [...value, day.id])
              }
              className={
                selected
                  ? 'rounded-full bg-[#531b04] px-3 py-1.5 text-xs font-bold text-white'
                  : 'rounded-full border border-[#d5c0b3] bg-white px-3 py-1.5 text-xs font-bold text-[#531b04]'
              }
            >
              {lang === 'en' ? day.en : day.pt}
            </button>
          )
        })}
      </div>
      <p className="mt-1 text-[11px] text-[#7A4A35]">
        {lang === 'en'
          ? 'Leave every day unselected to show the promotion all week.'
          : 'Deixe todos desmarcados para a promoção aparecer todos os dias.'}
      </p>
    </div>
  )
}
