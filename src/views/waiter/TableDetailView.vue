<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useTablesStore } from '../../stores/tables'
import { useCatalogStore } from '../../stores/catalog'
import { useAuthStore } from '../../stores/auth'
import { useSettingsStore } from '../../stores/settings'
import type { DraftOrderItem, PaymentMethod, Product } from '../../types'
import { orderTotal } from '../../types'
import { formatMoney } from '../../utils/format'
import { uid } from '../../utils/id'
import OrderPanel from '../../components/OrderPanel.vue'
import ReceiptDialog from '../../components/ReceiptDialog.vue'

const route = useRoute()
const router = useRouter()
const tables = useTablesStore()
const catalog = useCatalogStore()
const auth = useAuthStore()
const settings = useSettingsStore()

tables.init()
catalog.init()
settings.init()

const tableId = route.params.id as string
const table = computed(() => tables.tableById(tableId))
const order = computed(() => tables.openOrderForTable(tableId))

// ---------- Permisos por mesa (responsable) ----------
const canModify = computed(() => {
  if (!order.value) return true
  const user = auth.currentUser
  if (!user) return false
  if (user.role === 'admin') return true
  if (!settings.settings.responsiblePerTable) return true
  const responsible = order.value.responsibleId ?? order.value.openedBy
  return responsible === user.id
})

const responsibleName = computed(() => {
  const o = order.value
  if (!o) return ''
  const id = o.responsibleId ?? o.openedBy
  if (!id) return ''
  return auth.users.find((u) => u.id === id)?.name ?? ''
})

const waiterOptions = computed(() =>
  auth.activeUsers.map((u) => ({ title: u.name, value: u.id })),
)

function assignResponsible(id: string | null) {
  if (!order.value) return
  tables.setResponsible(order.value.id, id ?? undefined)
}

// ---------- Menú ----------
const selectedCategory = ref<string | null>(null)
const search = ref('')

const categories = computed(() => catalog.categoriesSorted)

const visibleProducts = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = catalog.products.filter((p) => p.active)
  if (q) {
    list = list.filter((p) => p.name.toLowerCase().includes(q))
  } else if (selectedCategory.value) {
    list = list.filter((p) => p.categoryId === selectedCategory.value)
  }
  return [...list].sort((a, b) => a.name.localeCompare(b.name))
})

onMounted(() => {
  if (!selectedCategory.value && categories.value.length) {
    selectedCategory.value = categories.value[0].id
  }
})

// ---------- Carrito ----------
const cart = ref<DraftOrderItem[]>([])
const showInfo = ref(false)
const infoMsg = ref('')

function addToCart(product: Product) {
  if (!canModify.value) {
    infoMsg.value = 'Esta mesa la atiende otro mesero: solo puedes verla.'
    showInfo.value = true
    return
  }
  const existing = cart.value.find((i) => i.productId === product.id)
  if (existing) {
    existing.qty += 1
  } else {
    cart.value.push({
      key: uid(),
      productId: product.id,
      name: product.name,
      price: product.price,
      qty: 1,
      note: '',
    })
  }
}

function updateCart(key: string, patch: Partial<DraftOrderItem>) {
  const item = cart.value.find((i) => i.key === key)
  if (item) Object.assign(item, patch)
}

function removeCart(key: string) {
  cart.value = cart.value.filter((i) => i.key !== key)
}

function sendToKitchen() {
  if (!order.value || cart.value.length === 0) return
  const items = cart.value.map((i) => ({
    productId: i.productId,
    name: i.name,
    price: i.price,
    qty: i.qty,
    note: i.note,
  }))
  tables.addItemsToOrder(order.value.id, items)
  cart.value = []
}

function removeSentItem(itemId: string) {
  if (!order.value) return
  if (window.confirm('¿Quitar este producto del pedido? También desaparecerá de cocina.')) {
    tables.removeOrderItem(order.value.id, itemId)
  }
}

// ---------- Abrir mesa ----------
function openOrder() {
  tables.openTable(tableId, auth.currentUser?.id)
}

// No se puede cancelar si hay productos en preparación (ya los está cocinando el equipo)
const preparingCount = computed(() =>
  order.value?.items
    .filter((i) => i.status === 'preparing')
    .reduce((s, i) => s + i.qty, 0) ?? 0,
)

// ---------- Cancelar pedido (por error) ----------
function cancelOrder() {
  if (!order.value || !table.value) return
  if (preparingCount.value > 0) {
    infoMsg.value = 'No se puede cancelar: hay productos en preparación en cocina.'
    showInfo.value = true
    return
  }
  if (!window.confirm(`¿Cancelar el pedido de ${table.value.name}? La mesa quedará disponible.`)) return
  const ok = tables.cancelOrder(order.value.id, auth.currentUser?.id)
  if (!ok) {
    infoMsg.value = 'No se pudo cancelar: hay productos en preparación en cocina.'
    showInfo.value = true
    return
  }
  router.push('/mesas')
}

// ---------- Trasladar a otra mesa ----------
const transferDialog = ref(false)
const destTableId = ref<string | null>(null)

const transferTargets = computed(() =>
  tables.tablesList
    .filter((t) => t.id !== tableId && t.status === 'available')
    .map((t) => ({ title: t.name, value: t.id })),
)

function openTransfer() {
  destTableId.value = null
  transferDialog.value = true
}

function confirmTransfer() {
  if (!destTableId.value || !order.value) return
  tables.transferTable(tableId, destTableId.value, auth.currentUser?.id)
  const destName = tables.tableById(destTableId.value)?.name ?? ''
  infoMsg.value = `Pedido trasladado a ${destName}`
  showInfo.value = true
  transferDialog.value = false
  router.push(`/mesa/${destTableId.value}`)
}

// ---------- Cerrar cuenta ----------
const closeDialog = ref(false)
const payment = ref<PaymentMethod>('cash')
const discountPct = ref(0)
const tipPct = ref(0)

const subtotal = computed(() => (order.value ? orderTotal(order.value) : 0))
const discountAmount = computed(() =>
  Math.round(subtotal.value * Math.min(100, Math.max(0, discountPct.value)) / 100),
)
const tipAmount = computed(() => Math.round(subtotal.value * Math.max(0, tipPct.value) / 100))
const grandTotal = computed(() => subtotal.value - discountAmount.value + tipAmount.value)

const undelivered = computed(() => {
  const o = order.value
  if (!o) return 0
  return o.items.filter((i) => i.status !== 'delivered').reduce((s, i) => s + i.qty, 0)
})

function requestClose() {
  discountPct.value = 0
  tipPct.value = 0
  closeDialog.value = true
}

// Pedido recién cerrado, para mostrar el ticket
const closedOrderId = ref<string | null>(null)
const closedOrder = computed(() => (closedOrderId.value ? tables.orderById(closedOrderId.value) : null))
const receiptShow = ref(false)

function confirmClose() {
  if (!order.value) return
  tables.closeOrder(order.value.id, payment.value, auth.currentUser?.id, {
    subtotal: subtotal.value,
    discount: discountAmount.value,
    tip: settings.settings.tipsEnabled ? tipAmount.value : 0,
    total: grandTotal.value,
  })
  closedOrderId.value = order.value.id
  closeDialog.value = false
  receiptShow.value = true
}

function onReceiptChange(show: boolean) {
  receiptShow.value = show
  if (!show) router.push('/mesas')
}

// Si el mesero deja la mesa con ítems sin enviar, pedir confirmación
onBeforeRouteLeave(() => {
  if (cart.value.length > 0) {
    return window.confirm('Tienes productos sin enviar a cocina. ¿Salir de todas formas?')
  }
  return true
})
</script>

<template>
  <div v-if="!table" class="pa-8 text-center">
    <p class="text-body-1 text-grey-darken-1">La mesa ya no existe.</p>
    <v-btn color="primary" prepend-icon="mdi-arrow-left" @click="router.push('/mesas')">Volver a mesas</v-btn>
  </div>

  <div v-else class="d-flex flex-column" style="height: calc(100vh - var(--v-layout-top))">
    <!-- Encabezado -->
    <div class="d-flex align-center pa-4 pb-2 flex-wrap">
      <v-btn icon="mdi-arrow-left" size="x-large" variant="tonal" @click="router.push('/mesas')" />
      <div class="ml-3">
        <div class="d-flex align-center flex-wrap">
          <span class="text-h5 font-weight-bold">{{ table.name }}</span>
          <v-chip size="small" :color="table.status === 'occupied' ? 'warning' : 'success'" variant="flat" class="ml-2">
            {{ table.status === 'occupied' ? 'Ocupada' : 'Disponible' }}
          </v-chip>
          <v-chip v-if="order && responsibleName" size="small" variant="tonal" color="grey" class="ml-2">
            <v-icon icon="mdi-account-tie" size="14" start />
            Atendida por {{ responsibleName }}
          </v-chip>
        </div>
      </div>

      <v-select
        v-if="auth.currentUser?.role === 'admin' && settings.settings.responsiblePerTable && order"
        :model-value="order.responsibleId ?? order.openedBy ?? null"
        :items="waiterOptions"
        label="Responsable"
        density="compact"
        variant="solo-filled"
        hide-details
        class="ml-3"
        style="width: 200px"
        @update:model-value="assignResponsible($event as string | null)"
      />

      <v-spacer />

      <div v-if="order && canModify" class="mr-3 d-flex align-center ga-2">
        <v-btn color="secondary" variant="tonal" prepend-icon="mdi-swap-horizontal" @click="openTransfer">
          Trasladar mesa
        </v-btn>
        <v-tooltip
          v-if="preparingCount > 0"
          text="No se puede cancelar: hay productos en preparación"
          location="top"
        >
          <template #activator="{ props }">
            <v-btn v-bind="props" color="error" variant="tonal" prepend-icon="mdi-cancel" disabled>
              Cancelar pedido
            </v-btn>
          </template>
        </v-tooltip>
        <v-btn v-else color="error" variant="tonal" prepend-icon="mdi-cancel" @click="cancelOrder">
          Cancelar pedido
        </v-btn>
      </div>

      <div v-if="order" class="text-right mr-2">
        <div class="text-h5 font-weight-bold text-primary">{{ formatMoney(orderTotal(order)) }}</div>
        <div class="text-caption text-grey-darken-1">{{ order.items.reduce((s, i) => s + i.qty, 0) }} productos</div>
      </div>
    </div>

    <!-- Mesa sin pedido: pantalla de apertura -->
    <div v-if="!order" class="flex-grow-1 d-flex align-center justify-center pa-6">
      <div class="text-center">
        <v-avatar color="green-lighten-3" size="96" class="mb-4">
          <v-icon icon="mdi-table" size="52" color="green-darken-2" />
        </v-avatar>
        <h3 class="text-h5 mb-1">Mesa disponible</h3>
        <p class="text-body-1 text-grey-darken-1 mb-6">
          Abre la mesa para comenzar a tomar el pedido.
        </p>
        <v-btn size="x-large" color="success" prepend-icon="mdi-plus-circle" @click="openOrder">
          Abrir mesa
        </v-btn>
      </div>
    </div>

    <!-- Menú + pedido -->
    <div v-else class="d-flex flex-grow-1 overflow-hidden px-4 pb-4" style="min-height: 0">
      <v-sheet class="d-flex flex-column overflow-hidden mr-4" rounded="lg" elevation="2" style="flex: 1 1 auto">
        <div class="pa-3">
          <v-text-field
            v-model="search"
            density="comfortable"
            variant="solo-filled"
            placeholder="Buscar producto…"
            prepend-inner-icon="mdi-magnify"
            hide-details
            clearable
          />
          <v-chip-group
            v-if="categories.length"
            v-model="selectedCategory"
            mandatory
            class="mt-3"
            selected-class="text-white"
          >
            <v-chip
              v-for="cat in categories"
              :key="cat.id"
              :value="cat.id"
              size="large"
              color="primary"
              variant="outlined"
              filter
            >
              {{ cat.emoji }} {{ cat.name }}
            </v-chip>
          </v-chip-group>
        </div>

        <div class="flex-grow-1 overflow-y-auto pa-3 pt-0">
          <v-row v-if="visibleProducts.length" dense>
            <v-col v-for="p in visibleProducts" :key="p.id" cols="6" sm="4" md="3" xl="2">
              <v-btn
                block
                height="104"
                variant="tonal"
                color="primary"
                class="product-btn"
                @click="addToCart(p)"
              >
                <div class="d-flex flex-column align-center py-1">
                  <span class="text-h5 mb-1">{{ p.emoji ?? '🍽️' }}</span>
                  <span class="text-body-2 font-weight-bold text-center lh-tight">{{ p.name }}</span>
                  <span class="text-body-1 font-weight-bold text-primary">{{ formatMoney(p.price) }}</span>
                </div>
              </v-btn>
            </v-col>
          </v-row>
          <div v-else class="text-center text-grey-darken-1 py-10">
            <v-icon icon="mdi-food-off" size="44" class="mb-2" />
            <div class="text-body-1">
              {{ search ? 'Sin resultados para tu búsqueda' : 'No hay productos en esta categoría' }}
            </div>
            <div class="text-caption">El administrador puede agregarlos en Menú</div>
          </div>
        </div>
      </v-sheet>

      <OrderPanel
        :table-name="table.name"
        :order="order"
        :cart="cart"
        :readonly="!canModify"
        :responsible-name="responsibleName"
        style="width: 400px; flex: none"
        @update-cart="updateCart"
        @remove-cart="removeCart"
        @send-cart="sendToKitchen"
        @remove-item="removeSentItem"
        @request-close="requestClose"
      />
    </div>

    <!-- Diálogo trasladar mesa -->
    <v-dialog v-model="transferDialog" max-width="440">
      <v-card rounded="xl">
        <v-card-title class="text-h5 font-weight-bold">Trasladar a otra mesa</v-card-title>
        <v-card-text>
          <p class="text-body-1 text-grey-darken-1 mb-3">
            El pedido completo de {{ table.name }} pasará a la mesa seleccionada y esta quedará
            disponible. La cocina seguirá viendo los productos.
          </p>
          <v-select
            v-model="destTableId"
            :items="transferTargets"
            label="Mesa de destino"
            placeholder="Selecciona una mesa disponible"
            density="comfortable"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn size="x-large" variant="text" @click="transferDialog = false">Cancelar</v-btn>
          <v-spacer />
          <v-btn
            size="x-large"
            color="secondary"
            prepend-icon="mdi-swap-horizontal"
            :disabled="!destTableId"
            @click="confirmTransfer"
          >
            Trasladar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo cerrar cuenta -->
    <v-dialog v-model="closeDialog" max-width="500">
      <v-card rounded="xl">
        <v-card-title class="text-h5 font-weight-bold">Cerrar cuenta · {{ table.name }}</v-card-title>
        <v-card-text>
          <div class="d-flex justify-space-between mb-1">
            <span class="text-body-1 text-grey-darken-1">Subtotal</span>
            <span class="font-weight-medium">{{ formatMoney(subtotal) }}</span>
          </div>
          <div v-if="discountAmount > 0" class="d-flex justify-space-between mb-1">
            <span class="text-body-1 text-grey-darken-1">Descuento ({{ discountPct }}%)</span>
            <span class="font-weight-medium text-error">−{{ formatMoney(discountAmount) }}</span>
          </div>
          <div v-if="tipAmount > 0" class="d-flex justify-space-between mb-1">
            <span class="text-body-1 text-grey-darken-1">Propina ({{ tipPct }}%)</span>
            <span class="font-weight-medium text-success">+{{ formatMoney(tipAmount) }}</span>
          </div>
          <v-divider class="my-2" />
          <div class="d-flex justify-space-between align-center mb-3">
            <span class="text-h6">Total a cobrar</span>
            <span class="text-h4 font-weight-bold text-primary">{{ formatMoney(grandTotal) }}</span>
          </div>

          <div v-if="undelivered > 0" class="mb-3">
            <v-alert type="warning" variant="tonal" density="compact">
              Faltan {{ undelivered }} {{ undelivered === 1 ? 'producto por entregar' : 'productos por entregar' }}.
            </v-alert>
          </div>

          <div v-if="settings.settings.discountsEnabled" class="mb-4">
            <div class="text-subtitle-1 font-weight-bold mb-1">Descuento</div>
            <v-text-field
              v-model.number="discountPct"
              type="number"
              min="0"
              max="100"
              suffix="%"
              density="comfortable"
              hide-details
              :disabled="!canModify"
            />
          </div>

          <div v-if="settings.settings.tipsEnabled" class="mb-2">
            <div class="text-subtitle-1 font-weight-bold mb-1">Propina</div>
            <v-btn-toggle
              v-model="tipPct"
              mandatory
              divided
              variant="outlined"
              color="primary"
              :disabled="!canModify"
            >
              <v-btn :value="0" class="px-4">Sin</v-btn>
              <v-btn :value="10" class="px-4">10%</v-btn>
              <v-btn :value="15" class="px-4">15%</v-btn>
              <v-btn :value="20" class="px-4">20%</v-btn>
            </v-btn-toggle>
          </div>

          <div class="text-subtitle-1 font-weight-bold mb-2 mt-3">Método de pago</div>
          <v-btn-toggle v-model="payment" mandatory divided class="w-100" color="primary" variant="outlined">
            <v-btn :value="'cash'" class="flex-grow-1" height="64">
              <v-icon icon="mdi-cash" start />
              Efectivo
            </v-btn>
            <v-btn :value="'card'" class="flex-grow-1" height="64">
              <v-icon icon="mdi-credit-card-outline" start />
              Tarjeta
            </v-btn>
            <v-btn :value="'other'" class="flex-grow-1" height="64">
              <v-icon icon="mdi-cash-multiple" start />
              Otro
            </v-btn>
          </v-btn-toggle>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn size="x-large" variant="text" @click="closeDialog = false">Cancelar</v-btn>
          <v-spacer />
          <v-btn size="x-large" color="success" prepend-icon="mdi-cash-check" @click="confirmClose">
            Cobrar y cerrar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Ticket de venta -->
    <ReceiptDialog
      :show="receiptShow"
      :order="closedOrder"
      :waiter-name="auth.currentUser?.name"
      @update:show="onReceiptChange"
    />

    <v-snackbar v-model="showInfo" color="info" location="bottom">
      {{ infoMsg }}
    </v-snackbar>
  </div>
</template>

<style scoped>
.product-btn {
  text-transform: none;
  border: 1px solid rgba(0, 0, 0, 0.08);
}
.lh-tight {
  line-height: 1.15;
}
</style>
