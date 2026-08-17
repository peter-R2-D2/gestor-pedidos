import { defineStore } from 'pinia'
import type { Shift } from '../types'
import { loadDB, mutateDB, subscribeDB } from '../data/storage'
import { uid } from '../utils/id'

let subscribed = false

export const useShiftsStore = defineStore('shifts', {
  state: () => ({
    shifts: [] as Shift[],
  }),

  getters: {
    // Turno activo de un usuario (si existe)
    activeShiftFor(state) {
      return (userId: string): Shift | null =>
        state.shifts.find((s) => s.userId === userId && !s.endedAt) ?? null
    },
    sortedShifts(state): Shift[] {
      return [...state.shifts].sort((a, b) => b.startedAt - a.startedAt)
    },
  },

  actions: {
    init() {
      this.load()
      if (!subscribed) {
        subscribed = true
        subscribeDB(() => this.load())
      }
    },

    load() {
      this.shifts = loadDB().shifts
    },

    startShift(userId: string) {
      if (this.activeShiftFor(userId)) return
      const shift: Shift = { id: uid(), userId, startedAt: Date.now() }
      const db = mutateDB((d) => {
        d.shifts.push(shift)
      })
      this.shifts = db.shifts
    },

    endShift(shiftId: string) {
      const db = mutateDB((d) => {
        const s = d.shifts.find((x) => x.id === shiftId)
        if (s && !s.endedAt) s.endedAt = Date.now()
      })
      this.shifts = db.shifts
    },
  },
})
