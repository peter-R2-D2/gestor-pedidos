<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useCatalogStore } from './stores/catalog'
import { useTablesStore } from './stores/tables'
import { useSettingsStore } from './stores/settings'
import type { Role } from './types'
import { APP_NAME } from './config'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tables = useTablesStore()
const catalog = useCatalogStore()
const settings = useSettingsStore()

// Inicializar stores una sola vez
auth.init()
tables.init()
catalog.init()
settings.init()

const user = computed(() => auth.currentUser)

interface NavItem {
  to: string
  label: string
  icon: string
}

const NAV: Record<Role, NavItem[]> = {
  admin: [
    { to: '/admin', label: 'Panel', icon: 'mdi-view-dashboard' },
    { to: '/admin/menu', label: 'Menú', icon: 'mdi-food' },
    { to: '/admin/mesas', label: 'Mesas', icon: 'mdi-table-furniture' },
    { to: '/admin/usuarios', label: 'Usuarios', icon: 'mdi-account-group' },
    { to: '/admin/ventas', label: 'Ventas', icon: 'mdi-cash-register' },
    { to: '/admin/ajustes', label: 'Ajustes', icon: 'mdi-cog' },
  ],
  waiter: [{ to: '/mesas', label: 'Mesas', icon: 'mdi-table-furniture' }],
  kitchen: [{ to: '/cocina', label: 'Cocina', icon: 'mdi-chef-hat' }],
}

const navItems = computed<NavItem[]>(() => (user.value ? NAV[user.value.role] : []))

// La pestaña activa se deriva de la ruta actual (la vista de mesa pertenece a "Mesas")
const activeTab = computed<string>(() => {
  if (route.path.startsWith('/mesa/')) return '/mesas'
  return route.path
})

function go(tab: string) {
  if (tab !== route.path) router.push(tab)
}

const kitchenPending = computed(() => tables.pendingKitchenCount)

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <v-app>
    <v-app-bar v-if="user" color="primary" flat>
      <v-app-bar-title class="d-flex align-center">
        <v-icon icon="mdi-silverware-fork-knife" size="large" />
        <span class="ml-2 font-weight-bold d-none d-sm-inline">{{ APP_NAME }}</span>
      </v-app-bar-title>

      <v-tabs
        v-if="navItems.length > 1 || user.role === 'kitchen'"
        :model-value="activeTab"
        bg-color="transparent"
        color="white"
        base-color="rgba(255,255,255,0.85)"
        slider-color="white"
        class="ml-2"
        @update:model-value="go"
      >
        <v-tab v-for="item in navItems" :key="item.to" :value="item.to">
          <v-badge
            v-if="item.to === '/cocina' && kitchenPending > 0"
            :content="String(kitchenPending)"
            color="error"
            offset-x="12"
            offset-y="12"
          >
            <v-icon :icon="item.icon" start />
            <span class="d-none d-sm-inline">{{ item.label }}</span>
          </v-badge>
          <template v-else>
            <v-icon :icon="item.icon" start />
            <span class="d-none d-sm-inline">{{ item.label }}</span>
          </template>
        </v-tab>
      </v-tabs>

      <v-spacer />

      <div v-if="user" class="d-flex align-center mr-2">
        <v-chip variant="flat" color="rgba(255,255,255,0.15)" class="mr-2 px-2 py-1" label>
          <v-avatar :color="user.color" size="30" class="mr-2">
            <span class="text-body-2 font-weight-bold">{{ initials(user.name) }}</span>
          </v-avatar>
          <span class="font-weight-medium d-none d-sm-inline">{{ user.name }}</span>
        </v-chip>
        <v-btn icon="mdi-logout" variant="text" color="white" @click="logout" />
      </div>
    </v-app-bar>

    <v-main class="app-background">
      <router-view />
    </v-main>
  </v-app>
</template>

<style scoped>
.app-background {
  background-color: #f6f4f0;
}
</style>
