<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTablesStore } from '../../stores/tables'
import { useAuthStore } from '../../stores/auth'
import { useShiftsStore } from '../../stores/shifts'
import { PAYMENT_METHODS, orderGrandTotal, orderTotal } from '../../types'
import { formatDateTime, formatMoney } from '../../utils/format'
import { shiftSummary } from '../../utils/shifts'

const tables = useTablesStore()
const auth = useAuthStore()
const shifts = useShiftsStore()
tables.init()
shifts.init()

type Period = 'today' | '7d' | 'all'
const period = ref<Period>('today')

const startOfToday = (): number => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

const filtered = computed(() => {
  const start = period.value === 'today' ? startOfToday() : Date.now() - 7 * 86_400_000
  return tables.paidOrders
    .filter((o) => (o.closedAt ?? 0) >= start)
    .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))
})

const summary = computed(() => {
  let total = 0
  const byMethod: Record<string, number> = { cash: 0, card: 0, other: 0 }
  for (const o of filtered.value) {
    const t = orderGrandTotal(o)
    total += t
    if (o.paymentMethod) byMethod[o.paymentMethod] += t
  }
  return { total, count: filtered.value.length, byMethod }
})

const rows = computed(() =>
  filtered.value.map((o) => {
    const closer = auth.users.find((u) => u.id === o.closedBy)
    return {
      fecha: formatDateTime(o.closedAt ?? o.createdAt),
      mesa: o.tableName,
      items: o.items.reduce((s, i) => s + i.qty, 0),
      metodo: o.paymentMethod ? PAYMENT_METHODS[o.paymentMethod].label : '—',
      subtotal: formatMoney(o.subtotal ?? orderTotal(o)),
      descuento: formatMoney(o.discount ?? 0),
      propina: formatMoney(o.tip ?? 0),
      total: formatMoney(orderGrandTotal(o)),
      por: closer?.name ?? '—',
    }
  }),
)

const headers = [
  { title: 'Fecha', key: 'fecha' },
  { title: 'Mesa', key: 'mesa' },
  { title: 'Productos', key: 'items' },
  { title: 'Método', key: 'metodo' },
  { title: 'Subtotal', key: 'subtotal' },
  { title: 'Descuento', key: 'descuento' },
  { title: 'Propina', key: 'propina' },
  { title: 'Total', key: 'total' },
  { title: 'Cerrado por', key: 'por' },
]

// Cortes de caja por turno
const shiftRows = computed(() =>
  shifts.sortedShifts.map((s) => ({
    shift: s,
    user: auth.users.find((u) => u.id === s.userId),
    summary: shiftSummary(s, tables.paidOrders),
  })),
)

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
</script>

<template>
  <div class="pa-4">
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
      <div>
        <h2 class="text-h5 font-weight-bold">Ventas</h2>
        <span class="text-body-2 text-grey-darken-1">Historial de cuentas cerradas</span>
      </div>
      <v-btn-toggle v-model="period" mandatory divided variant="outlined" color="primary">
        <v-btn :value="'today'">Hoy</v-btn>
        <v-btn :value="'7d'">7 días</v-btn>
        <v-btn :value="'all'">Todo</v-btn>
      </v-btn-toggle>
    </div>

    <v-row dense class="mb-4">
      <v-col cols="6" md="3">
        <v-card rounded="xl" color="teal-lighten-4" elevation="1">
          <v-card-text>
            <div class="text-caption text-grey-darken-1">Total</div>
            <div class="text-h5 font-weight-bold">{{ formatMoney(summary.total) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card rounded="xl" color="blue-lighten-4" elevation="1">
          <v-card-text>
            <div class="text-caption text-grey-darken-1">Cuentas</div>
            <div class="text-h5 font-weight-bold">{{ summary.count }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card rounded="xl" color="green-lighten-4" elevation="1">
          <v-card-text>
            <div class="text-caption text-grey-darken-1">Efectivo</div>
            <div class="text-h5 font-weight-bold">{{ formatMoney(summary.byMethod.cash) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card rounded="xl" color="orange-lighten-4" elevation="1">
          <v-card-text>
            <div class="text-caption text-grey-darken-1">Tarjeta</div>
            <div class="text-h5 font-weight-bold">{{ formatMoney(summary.byMethod.card) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card rounded="xl" elevation="1">
      <v-data-table
        :headers="headers"
        :items="rows"
        density="comfortable"
        items-per-page="15"
        hover
      >
        <template #no-data>
          <div class="pa-6 text-grey-darken-1">
            No hay ventas en este periodo.
          </div>
        </template>
      </v-data-table>
    </v-card>

    <v-card rounded="xl" elevation="1" class="mt-4">
      <v-card-title class="font-weight-bold d-flex align-center">
        <v-icon icon="mdi-clipboard-arrow-right" class="mr-2" color="primary" />
        Cortes de caja por mesero
      </v-card-title>
      <v-card-text v-if="shiftRows.length" class="pa-0">
        <v-list density="comfortable">
          <v-list-item v-for="row in shiftRows" :key="row.shift.id">
            <template #prepend>
              <v-avatar :color="row.user?.color ?? 'grey'" size="38" class="mr-3">
                <span class="text-white font-weight-bold">{{ row.user ? initials(row.user.name) : '?' }}</span>
              </v-avatar>
            </template>
            <v-list-item-title class="font-weight-bold">
              {{ row.user?.name ?? 'Usuario eliminado' }}
              <v-chip v-if="!row.shift.endedAt" size="x-small" color="teal" variant="flat" class="ml-2">
                Activo
              </v-chip>
            </v-list-item-title>
            <v-list-item-subtitle>
              Inicio {{ formatDateTime(row.shift.startedAt) }}
              <template v-if="row.shift.endedAt"> · Fin {{ formatDateTime(row.shift.endedAt) }}</template>
            </v-list-item-subtitle>
            <template #append>
              <div class="text-right">
                <div class="font-weight-bold">{{ formatMoney(row.summary.total) }}</div>
                <div class="text-caption text-grey-darken-1">{{ row.summary.count }} cuentas</div>
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-text v-else class="text-grey-darken-1">
        Aún no hay turnos registrados. Los meseros inician su turno desde su vista de mesas.
      </v-card-text>
    </v-card>
  </div>
</template>
