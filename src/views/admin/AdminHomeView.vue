<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTablesStore } from '../../stores/tables'
import { useCatalogStore } from '../../stores/catalog'
import { useAuthStore } from '../../stores/auth'
import { resetDB } from '../../data/storage'
import { orderGrandTotal, orderTotal } from '../../types'
import { formatMoney, timeAgoLabel } from '../../utils/format'
import { useSettingsStore } from '../../stores/settings'
import { useShiftsStore } from '../../stores/shifts'

const tables = useTablesStore()
const catalog = useCatalogStore()
const auth = useAuthStore()
const settings = useSettingsStore()
const shifts = useShiftsStore()

tables.init()
catalog.init()
settings.init()
shifts.init()

const todaySales = computed(() => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return tables.paidOrders
    .filter((o) => (o.closedAt ?? 0) >= start.getTime())
    .reduce((s, o) => s + orderGrandTotal(o), 0)
})

const openOrders = computed(() =>
  tables.openOrders.map((o) => ({
    order: o,
    total: orderTotal(o),
    since: timeAgoLabel(o.createdAt),
    itemCount: o.items.reduce((s, i) => s + i.qty, 0),
  })),
)

const resetDialog = ref(false)
const showSnack = ref(false)
const snackText = ref('')

function doReset() {
  resetDB()
  auth.load()
  catalog.load()
  tables.load()
  settings.load()
  shifts.load()
  resetDialog.value = false
  snackText.value = 'Datos de demostración restablecidos'
  showSnack.value = true
}
</script>

<template>
  <div class="pa-4">
    <h2 class="text-h5 font-weight-bold mb-4">Panel de control</h2>

    <v-row dense>
      <v-col cols="6" md="3">
        <v-card rounded="xl" color="orange-lighten-4" elevation="1">
          <v-card-text class="d-flex align-center">
            <v-avatar color="warning" size="48" class="mr-3">
              <v-icon icon="mdi-table-furniture" color="white" />
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ tables.occupiedCount }}/{{ tables.tablesList.length }}</div>
              <div class="text-caption text-grey-darken-1">Mesas ocupadas</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="6" md="3">
        <v-card rounded="xl" color="blue-lighten-4" elevation="1">
          <v-card-text class="d-flex align-center">
            <v-avatar color="info" size="48" class="mr-3">
              <v-icon icon="mdi-receipt-text" color="white" />
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ openOrders.length }}</div>
              <div class="text-caption text-grey-darken-1">Pedidos abiertos</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="6" md="3">
        <v-card rounded="xl" color="green-lighten-4" elevation="1">
          <v-card-text class="d-flex align-center">
            <v-avatar color="success" size="48" class="mr-3">
              <v-icon icon="mdi-chef-hat" color="white" />
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ tables.pendingKitchenCount }}</div>
              <div class="text-caption text-grey-darken-1">Ítems en cocina</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="6" md="3">
        <v-card rounded="xl" color="teal-lighten-4" elevation="1">
          <v-card-text class="d-flex align-center">
            <v-avatar color="teal" size="48" class="mr-3">
              <v-icon icon="mdi-cash" color="white" />
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ formatMoney(todaySales) }}</div>
              <div class="text-caption text-grey-darken-1">Ventas hoy</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card rounded="xl" class="mt-4" elevation="1">
      <v-card-title class="font-weight-bold">Pedidos abiertos</v-card-title>
      <v-card-text v-if="openOrders.length" class="pa-0">
        <v-list density="comfortable">
          <v-list-item v-for="entry in openOrders" :key="entry.order.id">
            <template #prepend>
              <v-icon icon="mdi-table-furniture" color="warning" />
            </template>
            <v-list-item-title class="font-weight-bold">{{ entry.order.tableName }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ entry.itemCount }} productos · abierto {{ entry.since }}
            </v-list-item-subtitle>
            <template #append>
              <span class="text-subtitle-1 font-weight-bold text-grey-darken-2">
                {{ formatMoney(entry.total) }}
              </span>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-text v-else class="text-grey-darken-1">
        No hay pedidos abiertos en este momento.
      </v-card-text>
    </v-card>

    <v-card rounded="xl" class="mt-4" elevation="1">
      <v-card-text class="d-flex align-center justify-space-between flex-wrap ga-2">
        <div>
          <div class="font-weight-bold">Datos de demostración</div>
          <div class="text-caption text-grey-darken-1">
            Restablece usuarios, menú, mesas y pedidos de ejemplo. Se pierde lo que hayas modificado.
          </div>
        </div>
        <v-btn color="error" variant="tonal" prepend-icon="mdi-restore" @click="resetDialog = true">
          Restablecer demo
        </v-btn>
      </v-card-text>
    </v-card>

    <v-dialog v-model="resetDialog" max-width="440">
      <v-card rounded="xl">
        <v-card-title class="text-h5 font-weight-bold">¿Restablecer datos?</v-card-title>
        <v-card-text>
          Se reemplazará toda la información actual (menú, mesas, usuarios y pedidos) por los datos
          de demostración. Esta acción no se puede deshacer.
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn size="x-large" variant="text" @click="resetDialog = false">Cancelar</v-btn>
          <v-spacer />
          <v-btn size="x-large" color="error" @click="doReset">Sí, restablecer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="showSnack" color="success" location="bottom">
      {{ snackText }}
    </v-snackbar>
  </div>
</template>
