import type { Database, Session } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { seedDatabase } from './seed'

// ============================================================
// Capa de persistencia local.
// Todo acceso a datos pasa por aquí: al migrar a Firebase /
// Supabase, solo hay que reemplazar estas funciones por
// suscripciones en tiempo real (ver README).
// ============================================================

export const DB_KEY = 'restopos.db.v1'
export const SESSION_KEY = 'restopos.session'

const EMPTY_DB: Database = {
  users: [],
  categories: [],
  products: [],
  tables: [],
  orders: [],
  shifts: [],
  settings: { ...DEFAULT_SETTINGS },
}

export function loadDB(): Database {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Database>
      return { ...EMPTY_DB, ...parsed }
    }
  } catch {
    // Datos corruptos: se regeneran
  }
  const db = seedDatabase()
  persistDB(db)
  return db
}

export function persistDB(db: Database): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

// Lee, muta y guarda en un solo paso, devolviendo la base actualizada.
export function mutateDB(fn: (db: Database) => void): Database {
  const db = loadDB()
  fn(db)
  persistDB(db)
  return db
}

// Restablece los datos de demostración.
export function resetDB(): Database {
  const db = seedDatabase()
  persistDB(db)
  return db
}

// Sincroniza entre pestañas del mismo navegador (evento `storage`).
// Otras tablets/dispositivos necesitarán Firebase/Supabase.
export function subscribeDB(callback: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === DB_KEY) callback()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

// ============================================================
// Sesión actual (usuario logueado) — sessionStorage
// ============================================================

export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function saveSession(session: Session | null): void {
  if (session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } else {
    sessionStorage.removeItem(SESSION_KEY)
  }
}
