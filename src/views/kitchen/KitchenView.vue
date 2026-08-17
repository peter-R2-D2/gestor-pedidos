<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useTablesStore } from '../../stores/tables'
import { useAuthStore } from '../../stores/auth'
import { ITEM_STATUS } from '../../types'
import type { ItemStatus } from '../../types'
import { timeAgoLabel } from '../../utils/format'

const tables = useTablesStore()
const auth = useAuthStore()

tables.init()

// Reloj para refrescar los "hace X min" sin tocar los datos
const now = ref(Date.now())
const timer = setInterval(() => (now.value = Date.now()), 30_000)
onUnmounted(() => clearInterval(timer))

interface Board {
  orderId: string
  tableName: string
  createdAt: number
  since: string
  items: { id: string; name: string; qty: number; note?: string; status: ItemStatus }[]
  deliveredQty: number
}

const boards = computed<Board[]>(() =>
  tables.openOrders.map((o) => {
    const delivered = o.items.filter((i) => i.status === 'delivered')
    return {
      orderId: o.id,
      tableName: o.tableName,
      createdAt: o.createdAt,
      since: timeAgoLabel(o.createdAt, now.value),
      items: o.items
        .filter((i) => i.status !== 'delivered')
        .map((i) => ({ id: i.id, name: i.name, qty: i.qty, note: i.note, status: i.status })),
      deliveredQty: delivered.reduce((s, i) => s + i.qty, 0),
    }
  }),
)

const counts = computed(() => {
  const c = { pending: 0, preparing: 0, ready: 0 }
  for (const b of boards.value) {
    for (const i of b.items) {
      if (i.status === 'pending') c.pending += i.qty
      else if (i.status === 'preparing') c.preparing += i.qty
      else if (i.status === 'ready') c.ready += i.qty
    }
  }
  return c
})

interface NextAction {
  to: ItemStatus
  label: string
  color: string
  icon: string
}

function nextAction(status: ItemStatus): NextAction {
  if (status === 'pending') return { to: 'preparing', label: 'Cocinar', color: 'orange', icon: 'mdi-fire' }
  if (status === 'preparing') return { to: 'ready', label: 'Listo', color: 'info', icon: 'mdi-food-takeout-box' }
  return { to: 'delivered', label: 'Entregar', color: 'success', icon: 'mdi-check' }
}

function advance(orderId: string, itemId: string, status: ItemStatus) {
  tables.setItemStatus(orderId, itemId, status)
}
</script>

<template>
  <div class="pa-4">
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap">
      <div>
        <h2 class="text-h5 font-weight-bold">Cocina</h2>
        <span class="text-body-2 text-grey-darken-1">
          {{ auth.currentUser?.name ?? 'Cocina' }} · {{ boards.length }}
          {{ boards.length === 1 ? 'mesa con pedido' : 'mesas con pedido' }}
        </span>
      </div>
      <div class="d-flex ga-2">
        <v-chip variant="tonal" color="warning" size="large">
          <v-icon icon="mdi-clock-outline" start /> Pendientes: {{ counts.pending }}
        </v-chip>
        <v-chip variant="tonal" color="orange" size="large">
          <v-icon icon="mdi-fire" start /> Preparando: {{ counts.preparing }}
        </v-chip>
        <v-chip variant="tonal" color="info" size="large">
          <v-icon icon="mdi-food-takeout-box" start /> Listos: {{ counts.ready }}
        </v-chip>
      </div>
    </div>

    <v-row v-if="boards.length" dense>
      <v-col v-for="b in boards" :key="b.orderId" cols="12" sm="6" lg="4" xl="3">
        <v-card rounded="xl" elevation="2" class="kitchen-card fill-height d-flex flex-column">
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon icon="mdi-table-furniture" class="mr-2" color="primary" />
              <span class="text-h6 font-weight-bold">{{ b.tableName }}</span>
            </div>
            <v-chip size="small" variant="tonal" color="grey">{{ b.since }}</v-chip>
          </v-card-title>
          <v-divider />

          <v-card-text class="flex-grow-1 overflow-y-auto">
            <div v-if="b.items.length === 0" class="text-center text-grey-darken-1 py-4">
              <v-icon icon="mdi-check-all" size="36" color="success" />
              <div class="text-body-2 mt-1">Todo entregado</div>
            </div>

            <div v-for="item in b.items" :key="item.id" class="py-2">
              <div class="d-flex align-center justify-space-between">
                <div class="flex-grow-1 pr-2">
                  <div class="font-weight-bold text-body-1">
                    {{ item.qty }} × {{ item.name }}
                  </div>
                  <div v-if="item.note" class="text-caption text-amber-darken-3">📝 {{ item.note }}</div>
                  <v-chip size="x-small" :color="ITEM_STATUS[item.status].color" variant="tonal" class="mt-1">
                    <v-icon :icon="ITEM_STATUS[item.status].icon" size="12" start />
                    {{ ITEM_STATUS[item.status].label }}
                  </v-chip>
                </div>
                <v-btn
                  size="x-large"
                  :color="nextAction(item.status).color"
                  class="ml-2"
                  @click="advance(b.orderId, item.id, nextAction(item.status).to)"
                >
                  <v-icon :icon="nextAction(item.status).icon" start />
                  {{ nextAction(item.status).label }}
                </v-btn>
              </div>
            </div>

            <div v-if="b.deliveredQty > 0" class="mt-3 pt-2 border-t">
              <div class="text-caption text-grey-darken-1">
                ✓ {{ b.deliveredQty }} {{ b.deliveredQty === 1 ? 'producto entregado' : 'productos entregados' }}
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <div v-else class="text-center text-grey-darken-1 py-16">
      <v-icon icon="mdi-chef-hat" size="64" class="mb-3" color="grey-lighten-1" />
      <h3 class="text-h5">No hay pedidos pendientes</h3>
      <p class="text-body-1">Los pedidos que envíen los meseros aparecerán aquí.</p>
    </div>
  </div>
</template>

<style scoped>
.kitchen-card {
  min-height: 240px;
}
.border-t {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}
</style>
