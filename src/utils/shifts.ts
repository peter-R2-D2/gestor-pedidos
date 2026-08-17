import type { Order, Shift } from '../types'
import { orderGrandTotal } from '../types'

export interface ShiftSummary {
  count: number
  total: number
  byMethod: { cash: number; card: number; other: number }
}

// Resumen de un turno: cuentas pagadas cerradas por el mesero
// dentro del rango de tiempo del turno.
export function shiftSummary(shift: Shift, orders: Order[]): ShiftSummary {
  const start = shift.startedAt
  const end = shift.endedAt ?? Date.now()
  const result: ShiftSummary = { count: 0, total: 0, byMethod: { cash: 0, card: 0, other: 0 } }
  for (const o of orders) {
    if (o.status !== 'paid' || o.closedBy !== shift.userId) continue
    const closedAt = o.closedAt ?? 0
    if (closedAt < start || closedAt > end) continue
    const t = orderGrandTotal(o)
    result.count += 1
    result.total += t
    if (o.paymentMethod) result.byMethod[o.paymentMethod] += t
  }
  return result
}
