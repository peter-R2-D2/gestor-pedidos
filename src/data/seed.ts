import type { Database, DiningTable, Order, Product, StaffUser } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { uid } from '../utils/id'

// Datos de demostración: usuarios, menú, mesas y algunos pedidos
// para que la app se vea viva desde el primer arranque.
export function seedDatabase(): Database {
  const now = Date.now()
  const min = 60_000
  const hour = 3_600_000

  const users: StaffUser[] = [
    { id: 'u-admin', name: 'Ana López', role: 'admin', color: 'primary', active: true },
    { id: 'u-waiter-1', name: 'Carlos Ruiz', role: 'waiter', color: 'success', active: true },
    { id: 'u-waiter-2', name: 'María Pérez', role: 'waiter', color: 'info', active: true },
    { id: 'u-kitchen', name: 'José Mendoza', role: 'kitchen', color: 'warning', active: true },
  ]

  const cEntradas = uid()
  const cTacos = uid()
  const cPlatos = uid()
  const cBebidas = uid()
  const cPostres = uid()

  const categories = [
    { id: cEntradas, name: 'Entradas', emoji: '🥗', sort: 1 },
    { id: cTacos, name: 'Tacos y Antojitos', emoji: '🌮', sort: 2 },
    { id: cPlatos, name: 'Platos Fuertes', emoji: '🍖', sort: 3 },
    { id: cBebidas, name: 'Bebidas', emoji: '🥤', sort: 4 },
    { id: cPostres, name: 'Postres', emoji: '🍰', sort: 5 },
  ]

  const products: Product[] = [
    { id: uid(), categoryId: cEntradas, name: 'Guacamole con totopos', price: 95, emoji: '🥑', active: true },
    { id: uid(), categoryId: cEntradas, name: 'Queso fundido', price: 85, emoji: '🧀', active: true },
    { id: uid(), categoryId: cEntradas, name: 'Sopa de tortilla', price: 70, emoji: '🍲', active: true },
    { id: uid(), categoryId: cTacos, name: 'Tacos al pastor (x3)', price: 75, emoji: '🌮', active: true },
    { id: uid(), categoryId: cTacos, name: 'Tacos de birria (x3)', price: 95, emoji: '🌯', active: true },
    { id: uid(), categoryId: cTacos, name: 'Quesadilla sencilla', price: 55, emoji: '🫓', active: true },
    { id: uid(), categoryId: cTacos, name: 'Torta de milanesa', price: 80, emoji: '🥪', active: true },
    { id: uid(), categoryId: cTacos, name: 'Elote callejero', price: 45, emoji: '🌽', active: true },
    { id: uid(), categoryId: cPlatos, name: 'Carne asada con guarnición', price: 185, emoji: '🥩', active: true },
    { id: uid(), categoryId: cPlatos, name: 'Pollo a la parrilla', price: 165, emoji: '🍗', active: true },
    { id: uid(), categoryId: cPlatos, name: 'Filete de pescado', price: 190, emoji: '🐟', active: true },
    { id: uid(), categoryId: cPlatos, name: 'Enchiladas verdes (x3)', price: 120, emoji: '🫔', active: true },
    { id: uid(), categoryId: cBebidas, name: 'Refresco 600 ml', price: 35, emoji: '🥤', active: true },
    { id: uid(), categoryId: cBebidas, name: 'Agua de horchata', price: 40, emoji: '🥛', active: true },
    { id: uid(), categoryId: cBebidas, name: 'Limonada natural', price: 45, emoji: '🍋', active: true },
    { id: uid(), categoryId: cBebidas, name: 'Cerveza nacional', price: 55, emoji: '🍺', active: true },
    { id: uid(), categoryId: cPostres, name: 'Flan casero', price: 50, emoji: '🍮', active: true },
    { id: uid(), categoryId: cPostres, name: 'Pastel de chocolate', price: 60, emoji: '🍰', active: true },
  ]

  const byName = (name: string): string => products.find((p) => p.name === name)?.id ?? ''

  const mesa3 = uid()
  const tables: DiningTable[] = [
    { id: uid(), name: 'Mesa 1', capacity: 4, status: 'available', currentOrderId: null },
    { id: uid(), name: 'Mesa 2', capacity: 4, status: 'available', currentOrderId: null },
    { id: mesa3, name: 'Mesa 3', capacity: 6, status: 'occupied', currentOrderId: 'o-demo-open' },
    { id: uid(), name: 'Mesa 4', capacity: 2, status: 'available', currentOrderId: null },
    { id: uid(), name: 'Mesa 5', capacity: 4, status: 'available', currentOrderId: null },
    { id: uid(), name: 'Mesa 6', capacity: 4, status: 'available', currentOrderId: null },
    { id: uid(), name: 'Mesa 7', capacity: 8, status: 'available', currentOrderId: null },
    { id: uid(), name: 'Mesa 8', capacity: 2, status: 'available', currentOrderId: null },
  ]

  const openOrder: Order = {
    id: 'o-demo-open',
    tableId: mesa3,
    tableName: 'Mesa 3',
    status: 'open',
    createdAt: now - 45 * min,
    openedBy: 'u-waiter-1',
    responsibleId: 'u-waiter-1',
    items: [
      {
        id: uid(),
        productId: byName('Tacos al pastor (x3)'),
        name: 'Tacos al pastor (x3)',
        price: 75,
        qty: 2,
        status: 'delivered',
        sentAt: now - 45 * min,
      },
      {
        id: uid(),
        productId: byName('Refresco 600 ml'),
        name: 'Refresco 600 ml',
        price: 35,
        qty: 2,
        status: 'ready',
        sentAt: now - 12 * min,
      },
      {
        id: uid(),
        productId: byName('Tacos de birria (x3)'),
        name: 'Tacos de birria (x3)',
        price: 95,
        qty: 1,
        status: 'preparing',
        sentAt: now - 7 * min,
      },
      {
        id: uid(),
        productId: byName('Guacamole con totopos'),
        name: 'Guacamole con totopos',
        price: 95,
        qty: 1,
        status: 'pending',
        sentAt: now - 2 * min,
        note: 'Sin cebolla',
      },
    ],
  }

  const paid1: Order = {
    id: 'o-paid-1',
    tableId: tables[1].id,
    tableName: 'Mesa 2',
    status: 'paid',
    createdAt: now - 3 * hour,
    openedBy: 'u-waiter-2',
    closedAt: now - 2 * hour,
    closedBy: 'u-waiter-2',
    paymentMethod: 'cash',
    items: [
      { id: uid(), productId: byName('Carne asada con guarnición'), name: 'Carne asada con guarnición', price: 185, qty: 2, status: 'delivered', sentAt: now - 3 * hour },
      { id: uid(), productId: byName('Cerveza nacional'), name: 'Cerveza nacional', price: 55, qty: 2, status: 'delivered', sentAt: now - 2 * hour },
      { id: uid(), productId: byName('Flan casero'), name: 'Flan casero', price: 50, qty: 1, status: 'delivered', sentAt: now - 2 * hour },
    ],
  }

  const paid2: Order = {
    id: 'o-paid-2',
    tableId: tables[4].id,
    tableName: 'Mesa 5',
    status: 'paid',
    createdAt: now - 2 * hour,
    openedBy: 'u-waiter-1',
    closedAt: now - hour,
    closedBy: 'u-waiter-1',
    paymentMethod: 'card',
    items: [
      { id: uid(), productId: byName('Tacos de birria (x3)'), name: 'Tacos de birria (x3)', price: 95, qty: 3, status: 'delivered', sentAt: now - 2 * hour },
      { id: uid(), productId: byName('Refresco 600 ml'), name: 'Refresco 600 ml', price: 35, qty: 2, status: 'delivered', sentAt: now - hour },
      { id: uid(), productId: byName('Quesadilla sencilla'), name: 'Quesadilla sencilla', price: 55, qty: 1, status: 'delivered', sentAt: now - hour },
    ],
  }

  return {
    users,
    categories,
    products,
    tables,
    orders: [openOrder, paid1, paid2],
    shifts: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}
