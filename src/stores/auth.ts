import { defineStore } from 'pinia'
import type { Role, StaffUser } from '../types'
import { loadDB, loadSession, mutateDB, saveSession, subscribeDB } from '../data/storage'
import { uid } from '../utils/id'

let subscribed = false

export const useAuthStore = defineStore('auth', {
  state: () => ({
    users: [] as StaffUser[],
    currentUserId: loadSession()?.userId ?? null,
  }),

  getters: {
    currentUser(state): StaffUser | null {
      return state.users.find((u) => u.id === state.currentUserId) ?? null
    },
    activeUsers(state): StaffUser[] {
      return state.users.filter((u) => u.active)
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
      this.users = loadDB().users
      // Si el usuario de la sesión ya no existe (fue eliminado), se cierra sesión.
      if (this.currentUserId && !this.users.some((u) => u.id === this.currentUserId)) {
        this.currentUserId = null
        saveSession(null)
      }
    },

    login(userId: string) {
      this.currentUserId = userId
      saveSession({ userId, loginAt: Date.now() })
    },

    logout() {
      this.currentUserId = null
      saveSession(null)
    },

    addUser(data: { name: string; role: Role; color: string }) {
      const user: StaffUser = { id: uid(), active: true, ...data }
      const db = mutateDB((d) => {
        d.users.push(user)
      })
      this.users = db.users
    },

    updateUser(id: string, patch: Partial<StaffUser>) {
      const db = mutateDB((d) => {
        const user = d.users.find((u) => u.id === id)
        if (user) Object.assign(user, patch)
      })
      this.users = db.users
    },

    deleteUser(id: string) {
      if (id === this.currentUserId) return
      const db = mutateDB((d) => {
        d.users = d.users.filter((u) => u.id !== id)
      })
      this.users = db.users
    },
  },
})
