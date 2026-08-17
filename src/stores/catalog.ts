import { defineStore } from 'pinia'
import type { Category, Product } from '../types'
import { loadDB, mutateDB, subscribeDB } from '../data/storage'
import { uid } from '../utils/id'

let subscribed = false

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    categories: [] as Category[],
    products: [] as Product[],
  }),

  getters: {
    categoriesSorted(state): Category[] {
      return [...state.categories].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
    },
    productsByCategory(state) {
      return (categoryId: string): Product[] =>
        state.products
          .filter((p) => p.categoryId === categoryId)
          .sort((a, b) => a.name.localeCompare(b.name))
    },
    activeProducts(state): Product[] {
      return state.products.filter((p) => p.active)
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
      const db = loadDB()
      this.categories = db.categories
      this.products = db.products
    },

    addCategory(name: string, emoji: string) {
      const maxSort = Math.max(0, ...this.categories.map((c) => c.sort))
      const category: Category = { id: uid(), name, emoji, sort: maxSort + 1 }
      const db = mutateDB((d) => {
        d.categories.push(category)
      })
      this.categories = db.categories
    },

    updateCategory(id: string, patch: Partial<Category>) {
      const db = mutateDB((d) => {
        const cat = d.categories.find((c) => c.id === id)
        if (cat) Object.assign(cat, patch)
      })
      this.categories = db.categories
    },

    deleteCategory(id: string) {
      const db = mutateDB((d) => {
        d.categories = d.categories.filter((c) => c.id !== id)
        d.products = d.products.filter((p) => p.categoryId !== id)
      })
      this.categories = db.categories
      this.products = db.products
    },

    addProduct(data: { categoryId: string; name: string; price: number; emoji: string; active: boolean }) {
      const product: Product = { id: uid(), ...data }
      const db = mutateDB((d) => {
        d.products.push(product)
      })
      this.products = db.products
    },

    updateProduct(id: string, patch: Partial<Product>) {
      const db = mutateDB((d) => {
        const p = d.products.find((x) => x.id === id)
        if (p) Object.assign(p, patch)
      })
      this.products = db.products
    },

    deleteProduct(id: string) {
      const db = mutateDB((d) => {
        d.products = d.products.filter((p) => p.id !== id)
      })
      this.products = db.products
    },
  },
})
