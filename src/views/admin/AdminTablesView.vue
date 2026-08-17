<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTablesStore } from '../../stores/tables'
import { useAuthStore } from '../../stores/auth'
import { useSettingsStore } from '../../stores/settings'
import { orderTotal } from '../../types'
import { formatMoney } from '../../utils/format'

const tables = useTablesStore()
const auth = useAuthStore()
const settings = useSettingsStore()
tables.init()
auth.init()
settings.init()

const dialog = ref(false)
const form = ref({ id: null as string | null, name: '', capacity: 4 })
const showSnack = ref(false)
const snackText = ref('')

const tableCards = computed(() =>
  tables.tablesList.map((t) => {
    const order = tables.openOrderForTable(t.id)
    const responsibleId = order?.responsibleId ?? order?.openedBy
    return {
      table: t,
      order,
      total: order ? orderTotal(order) : 0,
      itemCount: order ? order.items.reduce((s, i) => s + i.qty, 0) : 0,
      responsible: responsibleId ? auth.users.find((u) => u.id === responsibleId)?.name ?? '' : '',
    }
  }),
)

function openDialog(table?: { id: string; name: string; capacity: number }) {
  form.value = { id: table?.id ?? null, name: table?.name ?? '', capacity: table?.capacity ?? 4 }
  dialog.value = true
}

function save() {
  const name = form.value.name.trim()
  if (!name) return
  const capacity = Math.max(1, Math.min(50, Number(form.value.capacity) || 4))
  if (form.value.id) {
    tables.updateTable(form.value.id, { name, capacity })
  } else {
    tables.addTable(name, capacity)
  }
  dialog.value = false
}

function remove(tableId: string, name: string, occupied: boolean) {
  if (occupied) {
    snackText.value = `No se puede eliminar ${name}: tiene un pedido abierto.`
    showSnack.value = true
    return
  }
  if (window.confirm(`¿Eliminar ${name}?`)) {
    tables.deleteTable(tableId)
  }
}

// Libera una mesa abierta por error (cancela el pedido sin cobrar).
// No se permite si hay productos en preparación.
function freeTable(tableId: string, name: string) {
  const order = tables.openOrderForTable(tableId)
  if (!order) return
  if (order.items.some((i) => i.status === 'preparing')) {
    snackText.value = `No se puede liberar ${name}: hay productos en preparación en cocina.`
    showSnack.value = true
    return
  }
  if (!window.confirm(`¿Cancelar el pedido de ${name} y dejarla disponible?`)) return
  const ok = tables.cancelOrder(order.id, auth.currentUser?.id)
  if (ok) {
    snackText.value = `${name} liberada`
  } else {
    snackText.value = `No se pudo liberar ${name}: hay productos en preparación en cocina.`
  }
  showSnack.value = true
}
</script>

<template>
  <div class="pa-4">
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap">
      <div>
        <h2 class="text-h5 font-weight-bold">Mesas</h2>
        <span class="text-body-2 text-grey-darken-1">
          {{ tables.tablesList.length }} mesas · {{ tables.occupiedCount }} ocupadas
        </span>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" size="x-large" @click="openDialog()">
        Agregar mesa
      </v-btn>
    </div>

    <v-row dense>
      <v-col
        v-for="entry in tableCards"
        :key="entry.table.id"
        cols="6"
        sm="4"
        md="3"
        lg="2"
      >
        <v-card
          rounded="xl"
          :color="entry.table.status === 'occupied' ? 'orange-lighten-4' : 'green-lighten-4'"
          elevation="1"
        >
          <v-card-text class="text-center">
            <v-icon
              :icon="entry.table.status === 'occupied' ? 'mdi-table-chair' : 'mdi-table'"
              size="36"
              :color="entry.table.status === 'occupied' ? 'deep-orange-darken-1' : 'green-darken-2'"
            />
            <div class="text-h6 font-weight-bold text-grey-darken-2">{{ entry.table.name }}</div>
            <v-chip
              size="small"
              :color="entry.table.status === 'occupied' ? 'warning' : 'success'"
              variant="flat"
              class="mt-1"
            >
              {{ entry.table.status === 'occupied' ? 'Ocupada' : 'Disponible' }}
            </v-chip>
            <div v-if="entry.table.status === 'occupied'" class="text-caption text-grey-darken-1 mt-1">
              {{ entry.itemCount }} productos · {{ formatMoney(entry.total) }}
              <div v-if="entry.responsible">
                <v-icon icon="mdi-account-tie" size="13" /> {{ entry.responsible }}
              </div>
            </div>
            <div class="text-caption text-grey-darken-1">Capacidad: {{ entry.table.capacity }}</div>
          </v-card-text>
          <v-card-actions class="justify-center pt-0">
            <v-tooltip v-if="entry.table.status === 'occupied'" text="Liberar mesa (cancelar pedido)" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-table-off"
                  variant="text"
                  color="warning"
                  @click="freeTable(entry.table.id, entry.table.name)"
                />
              </template>
            </v-tooltip>
            <v-btn icon="mdi-pencil" variant="text" @click="openDialog(entry.table)" />
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              color="error"
              @click="remove(entry.table.id, entry.table.name, entry.table.status === 'occupied')"
            />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" max-width="420">
      <v-card rounded="xl">
        <v-card-title class="text-h5 font-weight-bold">
          {{ form.id ? 'Editar mesa' : 'Nueva mesa' }}
        </v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="Nombre" placeholder="Ej. Mesa 9" class="mb-3" />
          <v-text-field
            v-model.number="form.capacity"
            label="Capacidad (personas)"
            type="number"
            min="1"
            max="50"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn size="x-large" variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-spacer />
          <v-btn size="x-large" color="primary" :disabled="!form.name.trim()" @click="save">
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="showSnack" color="warning" location="bottom">
      {{ snackText }}
    </v-snackbar>
  </div>
</template>
