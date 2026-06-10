import { OilType } from '@/types'

// Rates are intentionally 0 — every bill uses a custom rate typed at billing time
export const OIL_TYPES: OilType[] = [
  { id: 'soya_refined', name: 'Soya Refined Oil', rate: 0, unit: 'jar' },
  { id: 'palm_oil',     name: 'Palm Oil',          rate: 0, unit: 'jar' },
  { id: 'mustard_oil',  name: 'Mustard Oil',       rate: 0, unit: 'jar' },
  { id: 'rice_oil',     name: 'Rice Oil',           rate: 0, unit: 'jar' },
]

export const getOilById = (id: string) => OIL_TYPES.find(o => o.id === id)

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

export const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const generateBillNumber = () => {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `OIL-${yy}${mm}-${rand}`
}
