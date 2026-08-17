import { defineStore } from 'pinia'
import type { AppSettings } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { loadDB, mutateDB, subscribeDB } from '../data/storage'

let subscribed = false

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: { ...DEFAULT_SETTINGS } as AppSettings,
  }),

  actions: {
    init() {
      this.load()
      if (!subscribed) {
        subscribed = true
        subscribeDB(() => this.load())
      }
    },

    load() {
      this.settings = { ...DEFAULT_SETTINGS, ...loadDB().settings }
    },

    update(patch: Partial<AppSettings>) {
      const db = mutateDB((d) => {
        d.settings = { ...DEFAULT_SETTINGS, ...d.settings, ...patch }
      })
      this.settings = { ...DEFAULT_SETTINGS, ...db.settings }
    },
  },
})
