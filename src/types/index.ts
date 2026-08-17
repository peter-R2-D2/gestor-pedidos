// ============================================================
// Tipos de dominio del sistema de pedidos
// ============================================================

export type Role = 'admin' | 'waiter' | 'kitchen'

export const ROLES: Record<Role, { label: string; color: string; icon: string }> = {
  admin: { label: 'Administrador', color: 'primary', icon: 'mdi-shield-account' },
  waiter: { label: 'Mesero', color: 'success', icon: 'mdi-account-tie' },
  kitchen: { label: 'Cocina', color: 'warning', icon: 'mdi-chef-hat' },
}

export interface StaffUser {
  id: string
  name: string
  role: Role
  color: string
  active: boolean
}

export interface Category {
  id: string
  name: string
  emoji?: string
  sort: number
}

export interface Product {
  id: string
  categoryId: string
  name: string
  price: number
  emoji?: string
  active: boolean
}

export type ItemStatus = 'pending' | 'preparing' | 'ready' | 'delivered'

export const ITEM_STATUS: Record<ItemStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pendiente', color: 'warning', icon: 'mdi-clock-outline' },
  preparing: { label: 'En preparación', color: 'orange', icon: 'mdi-fire' },
  ready: { label: 'Listo', color: 'info', icon: 'mdi-food-takeout-box' },
  delivered: { label: 'Entregado', color: 'success', icon: 'mdi-check-circle' },
}

export interface OrderItem {
  id: string
  productId: string
  name: string
  price: number
  qty: number
  note?: string
  status: ItemStatus
  sentAt: number
}

export type TableStatus = 'available' | 'occupied'

export interface DiningTable {
  id: string
  name: string
  capacity: number
  status: TableStatus
  currentOrderId: string | null
}

export type PaymentMethod = 'cash' | 'card' | 'other'

export const PAYMENT_METHODS: Record<PaymentMethod, { label: string; icon: string }> = {
  cash: { label: 'Efectivo', icon: 'mdi-cash' },
  card: { label: 'Tarjeta', icon: 'mdi-credit-card-outline' },
  other: { label: 'Otro', icon: 'mdi-cash-multiple' },
}

export type OrderStatus = 'open' | 'paid' | 'cancelled' | 'transferred'

export interface Order {
  id: string
  tableId: string
  tableName: string
  items: OrderItem[]
  status: OrderStatus
  createdAt: number
  openedBy?: string
  // Mesero responsable (por defecto quien abrió la mesa)
  responsibleId?: string
  closedAt?: number
  closedBy?: string
  paymentMethod?: PaymentMethod
  // Totales capturados al cerrar la cuenta
  subtotal?: number
  discount?: number
  tip?: number
  total?: number
}

// Item en el carrito del mesero (aún no enviado a cocina)
export interface DraftOrderItem {
  key: string
  productId: string
  name: string
  price: number
  qty: number
  note: string
}

export interface Session {
  userId: string
  loginAt: number
}

// Turno de un mesero: inicio/fin de jornada para corte de caja
// (las cuentas cerradas por el mesero dentro del rango pertenecen al turno)
export interface Shift {
  id: string
  userId: string
  startedAt: number
  endedAt?: number
}

// Ajustes configurables desde el panel de administración
export interface AppSettings {
  // Si está activo, cada mesa queda asignada al mesero que la abrió
  // y solo ese mesero (o un admin) puede modificarla.
  responsiblePerTable: boolean
  tipsEnabled: boolean
  discountsEnabled: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  responsiblePerTable: false,
  tipsEnabled: true,
  discountsEnabled: true,
}

// Base de datos completa persistida en localStorage
export interface Database {
  users: StaffUser[]
  categories: Category[]
  products: Product[]
  tables: DiningTable[]
  orders: Order[]
  shifts: Shift[]
  settings: AppSettings
}

export function orderTotal(order: { items: OrderItem[] }): number {
  return order.items.reduce((sum, i) => sum + i.price * i.qty, 0)
}

// Total final cobrado (incluye propina/descuento cuando se guardó al cerrar)
export function orderGrandTotal(order: { items: OrderItem[]; total?: number }): number {
  return order.total !== undefined ? order.total : orderTotal(order)
}
