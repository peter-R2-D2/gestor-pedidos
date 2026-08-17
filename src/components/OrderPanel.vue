<script setup lang="ts">
import { computed } from 'vue'
import type { DraftOrderItem, Order } from '../types'
import { ITEM_STATUS, orderTotal } from '../types'
import { formatMoney } from '../utils/format'

const props = defineProps<{
  tableName: string
  order: Order | null
  cart: DraftOrderItem[]
  // Modo solo-lectura: otro mesero viendo una mesa que no le corresponde
  readonly?: boolean
  responsibleName?: string
}>()

const emit = defineEmits<{
  'update-cart': [key: string, patch: Partial<DraftOrderItem>]
  'remove-cart': [key: string]
  'send-cart': []
  'remove-item': [itemId: string]
  'request-close': []
}>()

const cartTotal = computed(() => props.cart.reduce((s, i) => s + i.price * i.qty, 0))
const sentTotal = computed(() => (props.order ? orderTotal(props.order) : 0))
const total = computed(() => cartTotal.value + sentTotal.value)
</script>

<template>
  <v-card rounded="lg" class="d-flex flex-column order-panel fill-height" elevation="2">
    <v-card-title class="pb-1 pt-3">
      <div class="d-flex align-center justify-space-between">
        <span class="text-h6 font-weight-bold">Pedido · {{ tableName }}</span>
        <v-chip v-if="order" size="small" color="warning" variant="flat">Abierto</v-chip>
      </div>
      <div v-if="responsibleName" class="text-caption text-grey-darken-1 mt-1">
        <v-icon icon="mdi-account-tie" size="14" /> Atendida por {{ responsibleName }}
      </div>
    </v-card-title>

    <v-alert
      v-if="readonly"
      type="info"
      variant="tonal"
      density="compact"
      class="ma-3 mb-0"
    >
      Esta mesa la atiende otro mesero. Solo puedes verla.
    </v-alert>

    <v-divider />

    <v-card-text class="flex-grow-1 overflow-y-auto pa-2">
      <!-- Carrito (por enviar) -->
      <div v-if="cart.length" class="mb-3">
        <div class="text-subtitle-2 font-weight-bold text-uppercase text-grey-darken-1 px-2 py-1">
          Por enviar a cocina
        </div>
        <div v-for="item in cart" :key="item.key" class="pa-2">
          <div class="d-flex align-center">
            <div class="flex-grow-1">
              <div class="font-weight-medium text-body-1">{{ item.name }}</div>
              <div class="text-caption text-grey-darken-1">{{ formatMoney(item.price) }} c/u</div>
            </div>            <v-btn-group v-if="!readonly" density="compact" variant="outlined" class="mx-2">
              <v-btn icon="mdi-minus" size="small" @click="emit('update-cart', item.key, { qty: Math.max(1, item.qty - 1) })" />
              <v-btn disabled width="36" class="font-weight-bold">{{ item.qty }}</v-btn>
              <v-btn icon="mdi-plus" size="small" @click="emit('update-cart', item.key, { qty: item.qty + 1 })" />
            </v-btn-group>
            <v-chip v-else size="small" variant="outlined" class="mx-2">× {{ item.qty }}</v-chip>
            <div class="text-right font-weight-bold" style="min-width: 88px">
              {{ formatMoney(item.price * item.qty) }}
            </div>
            <v-btn v-if="!readonly" icon="mdi-close" size="small" variant="text" color="error" @click="emit('remove-cart', item.key)" />
          </div>
          <v-text-field
            :model-value="item.note"
            density="compact"
            variant="solo-filled"
            placeholder="Nota (ej. sin cebolla)"
            hide-details
            class="mt-1"
            @update:model-value="emit('update-cart', item.key, { note: $event as string })"
          />
        </div>
      </div>

      <!-- Ítems ya enviados -->
      <div v-if="order && order.items.length" class="mb-3">
        <div class="text-subtitle-2 font-weight-bold text-uppercase text-grey-darken-1 px-2 py-1">
          En cocina / Servidos
        </div>
        <div v-for="item in order.items" :key="item.id" class="d-flex align-center pa-2">
          <div class="flex-grow-1">
            <div class="font-weight-medium" :class="{ 'text-decoration-line-through text-grey': item.status === 'delivered' }">
              {{ item.qty }} × {{ item.name }}
            </div>
            <div v-if="item.note" class="text-caption text-amber-darken-3">📝 {{ item.note }}</div>
            <v-chip size="x-small" :color="ITEM_STATUS[item.status].color" variant="tonal" class="mt-1">
              <v-icon :icon="ITEM_STATUS[item.status].icon" size="12" start />
              {{ ITEM_STATUS[item.status].label }}
            </v-chip>
          </div>
          <div class="text-right font-weight-bold mx-2" style="min-width: 88px">
            {{ formatMoney(item.price * item.qty) }}
          </div>
          <v-btn
            v-if="!readonly"
            icon="mdi-delete-outline"
            size="small"
            variant="text"
            color="error"
            @click="emit('remove-item', item.id)"
          />
        </div>
      </div>

      <div v-if="!cart.length && (!order || !order.items.length)" class="text-center text-grey-darken-1 py-10">
        <v-icon icon="mdi-food-off" size="48" class="mb-2" />
        <div class="text-body-1">Toca un producto del menú para agregarlo</div>
      </div>
    </v-card-text>

    <v-divider />

    <v-card-actions class="pa-4 flex-column align-stretch">
      <div class="d-flex justify-space-between align-center mb-2 px-1">
        <span class="text-h6">Total</span>
        <span class="text-h5 font-weight-bold text-primary">{{ formatMoney(total) }}</span>
      </div>
      <v-btn
        size="x-large"
        color="primary"
        prepend-icon="mdi-send"
        :disabled="readonly || cart.length === 0"
        @click="emit('send-cart')"
      >
        Enviar a cocina
      </v-btn>
      <v-btn
        size="x-large"
        variant="tonal"
        color="success"
        prepend-icon="mdi-cash-register"
        class="mt-2"
        :disabled="readonly || !order || order.items.length === 0"
        @click="emit('request-close')"
      >
        Cerrar cuenta
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
