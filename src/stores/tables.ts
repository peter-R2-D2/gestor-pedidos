import { defineStore } from 'pinia'
import type {
  DiningTable,
  ItemStatus,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  TableStatus,
} from '../types'
import { loadDB, mutateDB, subscribeDB } from '../data/storage'
import { uid } from '../utils/id'

let subscribed = false

export interface NewOrderItem {
  productId: string
  name: string
  price: number
  qty: number
  note?: string
}

export const useTablesStore = defineStore('tables', {
  state: () => ({
    tables: [] as DiningTable[],
    orders: [] as Order[],
  }),

  getters: {
    tablesList(state): DiningTable[] {
      return [...state.tables]
    },
    occupiedCount(state): number {
      return state.tables.filter((t) => t.status === 'occupied').length
    },
    openOrders(state): Order[] {
      return state.orders.filter((o) => o.status === 'open')
    },
    paidOrders(state): Order[] {
      return state.orders.filter((o) => o.status === 'paid')
    },
    tableById(state) {
      return (id: string): DiningTable | null => state.tables.find((t) => t.id === id) ?? null
    },
    orderById(state) {
      return (id: string): Order | null => state.orders.find((o) => o.id === id) ?? null
    },
    openOrderForTable(state) {
      return (tableId: string): Order | null =>
        state.orders.find((o) => o.status === 'open' && o.tableId === tableId) ?? null
    },
    // Ítems sin entregar (suma de cantidades) para el badge de cocina
    pendingKitchenCount(state): number {
      return state.orders
        .filter((o) => o.status === 'open')
        .flatMap((o) => o.items)
        .filter((i) => i.status !== 'delivered')
        .reduce((sum, i) => sum + i.qty, 0)
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
      this.tables = db.tables
      this.orders = db.orders
    },

    // ---------- Mesas ----------

    addTable(name: string, capacity: number) {
      const table: DiningTable = { id: uid(), name, capacity, status: 'available', currentOrderId: null }
      const db = mutateDB((d) => {
        d.tables.push(table)
      })
      this.tables = db.tables
    },

    updateTable(id: string, patch: Partial<DiningTable>) {
      const db = mutateDB((d) => {
        const t = d.tables.find((x) => x.id === id)
        if (t) Object.assign(t, patch)
      })
      this.tables = db.tables
    },

    deleteTable(id: string) {
      const db = mutateDB((d) => {
        d.tables = d.tables.filter((t) => t.id !== id)
      })
      this.tables = db.tables
    },

    // ---------- Pedidos ----------

    openTable(tableId: string, openedBy?: string) {
      const db = mutateDB((d) => {
        const table = d.tables.find((t) => t.id === tableId)
        if (!table || table.status === 'occupied') return
        const order: Order = {
          id: uid(),
          tableId,
          tableName: table.name,
          items: [],
          status: 'open',
          createdAt: Date.now(),
          openedBy,
          // El mesero que abre la mesa queda como responsable
          responsibleId: openedBy,
        }
        table.status = 'occupied' as TableStatus
        table.currentOrderId = order.id
        d.orders.push(order)
      })
      this.tables = db.tables
      this.orders = db.orders
    },

    // Cambia el mesero responsable de un pedido (solo admin)
    setResponsible(orderId: string, responsibleId: string | undefined) {
      const db = mutateDB((d) => {
        const order = d.orders.find((o) => o.id === orderId)
        if (order) order.responsibleId = responsibleId
      })
      this.orders = db.orders
    },

    // Envía ítems (carrito del mesero) a cocina
    addItemsToOrder(orderId: string, items: NewOrderItem[]) {
      if (items.length === 0) return
      const now = Date.now()
      const db = mutateDB((d) => {
        const order = d.orders.find((o) => o.id === orderId)
        if (!order || order.status !== 'open') return
        const newItems: OrderItem[] = items.map((i) => ({
          id: uid(),
          productId: i.productId,
          name: i.name,
          price: i.price,
          qty: i.qty,
          note: i.note,
          status: 'pending' as ItemStatus,
          sentAt: now,
        }))
        order.items.push(...newItems)
      })
      this.orders = db.orders
    },

    removeOrderItem(orderId: string, itemId: string) {
      const db = mutateDB((d) => {
        const order = d.orders.find((o) => o.id === orderId)
        if (!order) return
        order.items = order.items.filter((i) => i.id !== itemId)
      })
      this.orders = db.orders
    },

    setItemStatus(orderId: string, itemId: string, status: ItemStatus) {
      const db = mutateDB((d) => {
        const order = d.orders.find((o) => o.id === orderId)
        const item = order?.items.find((i) => i.id === itemId)
        if (item) item.status = status
      })
      this.orders = db.orders
    },

    // Cierra la cuenta: marca el pedido como pagado y libera la mesa
    closeOrder(
      orderId: string,
      paymentMethod: PaymentMethod,
      closedBy?: string,
      totals?: { subtotal: number; discount: number; tip: number; total: number },
    ) {
      const db = mutateDB((d) => {
        const order = d.orders.find((o) => o.id === orderId)
        if (!order || order.status !== 'open') return
        order.status = 'paid'
        order.closedAt = Date.now()
        order.closedBy = closedBy
        order.paymentMethod = paymentMethod
        if (totals) {
          order.subtotal = totals.subtotal
          order.discount = totals.discount
          order.tip = totals.tip
          order.total = totals.total
        }
        const table = d.tables.find((t) => t.id === order.tableId)
        if (table) {
          table.status = 'available' as TableStatus
          table.currentOrderId = null
        }
      })
      this.tables = db.tables
      this.orders = db.orders
    },

    // Cancela un pedido abierto por error y libera la mesa.
    // No se permite si hay productos en preparación (ya los está cocinando el equipo).
    cancelOrder(orderId: string, closedBy?: string): boolean {
      let cancelled = false
      const db = mutateDB((d) => {
        const order = d.orders.find((o) => o.id === orderId)
        if (!order || order.status !== 'open') return
        if (order.items.some((i) => i.status === 'preparing')) return
        order.status = 'cancelled'
        order.closedAt = Date.now()
        order.closedBy = closedBy
        const table = d.tables.find((t) => t.id === order.tableId)
        if (table) {
          table.status = 'available' as TableStatus
          table.currentOrderId = null
        }
        cancelled = true
      })
      this.tables = db.tables
      this.orders = db.orders
      return cancelled
    },

    // Traslada un pedido abierto a otra mesa (disponible) y libera la original.
    // Los productos conservan su estado actual para que la cocina no pierda el hilo.
    transferTable(sourceTableId: string, destTableId: string, by?: string) {
      const db = mutateDB((d) => {
        const source = d.tables.find((t) => t.id === sourceTableId)
        const dest = d.tables.find((t) => t.id === destTableId)
        const order = d.orders.find((o) => o.status === 'open' && o.tableId === sourceTableId)
        if (!source || !dest || !order || dest.status !== 'available') return
        const newOrder: Order = {
          id: uid(),
          tableId: destTableId,
          tableName: dest.name,
          items: order.items.map((i) => ({ ...i, id: uid() })),
          status: 'open',
          createdAt: Date.now(),
          openedBy: order.openedBy,
          responsibleId: order.responsibleId ?? order.openedBy,
        }
        dest.status = 'occupied' as TableStatus
        dest.currentOrderId = newOrder.id
        source.status = 'available' as TableStatus
        source.currentOrderId = null
        order.status = 'transferred' as OrderStatus
        order.closedAt = Date.now()
        order.closedBy = by
        d.orders.push(newOrder)
      })
      this.tables = db.tables
      this.orders = db.orders
    },
  },
})
