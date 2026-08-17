<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCatalogStore } from '../../stores/catalog'
import { formatMoney } from '../../utils/format'

const catalog = useCatalogStore()
catalog.init()

const selectedCategoryId = ref<string | null>(null)

const categories = computed(() => catalog.categoriesSorted)
const selectedCategory = computed(() =>
  categories.value.find((c) => c.id === selectedCategoryId.value) ?? categories.value[0] ?? null,
)

const products = computed(() =>
  selectedCategory.value ? catalog.productsByCategory(selectedCategory.value.id) : [],
)

// ---------- Diálogo de categoría ----------
const catDialog = ref(false)
const catForm = ref({ id: '' as string | null, name: '', emoji: '' })

function openCatDialog(category?: { id: string; name: string; emoji?: string }) {
  catForm.value = { id: category?.id ?? null, name: category?.name ?? '', emoji: category?.emoji ?? '' }
  catDialog.value = true
}

function saveCategory() {
  const name = catForm.value.name.trim()
  if (!name) return
  if (catForm.value.id) {
    catalog.updateCategory(catForm.value.id, { name, emoji: catForm.value.emoji })
  } else {
    catalog.addCategory(name, catForm.value.emoji)
  }
  catDialog.value = false
}

function deleteCategory() {
  const cat = selectedCategory.value
  if (!cat) return
  const count = catalog.products.filter((p) => p.categoryId === cat.id).length
  if (
    window.confirm(
      `¿Eliminar la categoría "${cat.name}"${count ? ` y sus ${count} productos` : ''}?`,
    )
  ) {
    catalog.deleteCategory(cat.id)
    selectedCategoryId.value = null
  }
}

// ---------- Diálogo de producto ----------
const prodDialog = ref(false)
const prodForm = ref({
  id: null as string | null,
  name: '',
  price: 0,
  emoji: '',
  active: true,
})

function openProdDialog(product?: { id: string; name: string; price: number; emoji?: string; active: boolean }) {
  prodForm.value = {
    id: product?.id ?? null,
    name: product?.name ?? '',
    price: product?.price ?? 0,
    emoji: product?.emoji ?? '',
    active: product?.active ?? true,
  }
  prodDialog.value = true
}

function saveProduct() {
  const name = prodForm.value.name.trim()
  const price = Number(prodForm.value.price)
  const cat = selectedCategory.value
  if (!name || !cat) return
  if (price <= 0) {
    window.alert('El precio debe ser mayor a 0')
    return
  }
  const data = { name, price, emoji: prodForm.value.emoji, active: prodForm.value.active }
  if (prodForm.value.id) {
    catalog.updateProduct(prodForm.value.id, data)
  } else {
    catalog.addProduct({ categoryId: cat.id, ...data })
  }
  prodDialog.value = false
}

function deleteProduct(id: string, name: string) {
  if (window.confirm(`¿Eliminar "${name}" del menú?`)) {
    catalog.deleteProduct(id)
  }
}
</script>

<template>
  <div class="pa-4">
    <h2 class="text-h5 font-weight-bold mb-4">Menú</h2>

    <v-row dense>
      <!-- Categorías -->
      <v-col cols="12" md="4" lg="3">
        <v-card rounded="xl" elevation="1" class="fill-height d-flex flex-column">
          <v-card-title class="d-flex align-center justify-space-between">
            <span class="font-weight-bold">Categorías</span>
            <v-btn icon="mdi-plus" color="primary" variant="tonal" @click="openCatDialog()" />
          </v-card-title>
          <v-divider />
          <v-list density="comfortable" class="flex-grow-1 overflow-y-auto">
            <v-list-item
              v-for="cat in categories"
              :key="cat.id"
              :active="selectedCategory?.id === cat.id"
              @click="selectedCategoryId = cat.id"
            >
              <template #prepend>
                <span class="text-h6 mr-2">{{ cat.emoji ?? '🍽️' }}</span>
              </template>
              <v-list-item-title class="font-weight-medium">{{ cat.name }}</v-list-item-title>
              <template #append>
                <v-btn icon="mdi-pencil" size="small" variant="text" @click.stop="openCatDialog(cat)" />
                <v-btn
                  icon="mdi-delete-outline"
                  size="small"
                  variant="text"
                  color="error"
                  @click.stop="selectedCategoryId = cat.id; deleteCategory()"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <!-- Productos -->
      <v-col cols="12" md="8" lg="9">
        <v-card rounded="xl" elevation="1" class="fill-height d-flex flex-column">
          <v-card-title class="d-flex align-center justify-space-between">
            <span class="font-weight-bold">
              Productos {{ selectedCategory ? `· ${selectedCategory.emoji ?? ''} ${selectedCategory.name}` : '' }}
            </span>
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              :disabled="!selectedCategory"
              @click="openProdDialog()"
            >
              Agregar producto
            </v-btn>
          </v-card-title>
          <v-divider />
          <v-list density="comfortable" class="flex-grow-1 overflow-y-auto">
            <v-list-item v-for="p in products" :key="p.id">
              <template #prepend>
                <span class="text-h6 mr-2">{{ p.emoji ?? '🍽️' }}</span>
              </template>
              <v-list-item-title class="font-weight-medium" :class="{ 'text-grey': !p.active }">
                {{ p.name }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-body-1 font-weight-bold">
                {{ formatMoney(p.price) }}
              </v-list-item-subtitle>
              <template #append>
                <v-switch
                  :model-value="p.active"
                  color="success"
                  hide-details
                  @update:model-value="catalog.updateProduct(p.id, { active: !!$event })"
                />
                <v-btn icon="mdi-pencil" size="small" variant="text" @click.stop="openProdDialog(p)" />
                <v-btn
                  icon="mdi-delete-outline"
                  size="small"
                  variant="text"
                  color="error"
                  @click.stop="deleteProduct(p.id, p.name)"
                />
              </template>
            </v-list-item>
            <v-list-item v-if="!products.length">
              <v-list-item-title class="text-grey-darken-1 text-center py-4">
                Sin productos en esta categoría. ¡Agrega el primero!
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <!-- Diálogo categoría -->
    <v-dialog v-model="catDialog" max-width="420">
      <v-card rounded="xl">
        <v-card-title class="text-h5 font-weight-bold">
          {{ catForm.id ? 'Editar categoría' : 'Nueva categoría' }}
        </v-card-title>
        <v-card-text>
          <v-text-field v-model="catForm.name" label="Nombre" placeholder="Ej. Bebidas" class="mb-3" />
          <v-text-field v-model="catForm.emoji" label="Emoji (opcional)" placeholder="Ej. 🥤" />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn size="x-large" variant="text" @click="catDialog = false">Cancelar</v-btn>
          <v-spacer />
          <v-btn size="x-large" color="primary" :disabled="!catForm.name.trim()" @click="saveCategory">
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo producto -->
    <v-dialog v-model="prodDialog" max-width="460">
      <v-card rounded="xl">
        <v-card-title class="text-h5 font-weight-bold">
          {{ prodForm.id ? 'Editar producto' : 'Nuevo producto' }}
        </v-card-title>
        <v-card-text>
          <v-text-field v-model="prodForm.name" label="Nombre" placeholder="Ej. Tacos al pastor (x3)" class="mb-3" />
          <v-text-field
            v-model.number="prodForm.price"
            label="Precio"
            type="number"
            min="0"
            class="mb-3"
            :prefix="'$'"
          />
          <v-text-field v-model="prodForm.emoji" label="Emoji (opcional)" placeholder="Ej. 🌮" class="mb-3" />
          <v-switch v-model="prodForm.active" label="Producto activo (visible para meseros)" color="success" hide-details />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn size="x-large" variant="text" @click="prodDialog = false">Cancelar</v-btn>
          <v-spacer />
          <v-btn size="x-large" color="primary" :disabled="!prodForm.name.trim()" @click="saveProduct">
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
