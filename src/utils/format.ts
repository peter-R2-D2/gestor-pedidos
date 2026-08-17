import { CURRENCY, LOCALE } from '../config'

const moneyFmt = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY })

export function formatMoney(n: number): string {
  return moneyFmt.format(n)
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(LOCALE, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })
}

export function minutesAgo(ts: number, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - ts) / 60_000))
}

export function timeAgoLabel(ts: number, now: number = Date.now()): string {
  const m = minutesAgo(ts, now)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  return `hace ${h} h ${m % 60} min`
}
