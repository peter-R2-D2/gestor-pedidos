import { createRouter, createWebHistory } from 'vue-router'
import type { Role } from '../types'
import { useAuthStore } from '../stores/auth'

export function homeForRole(role: Role): string {
  if (role === 'admin') return '/admin'
  if (role === 'kitchen') return '/cocina'
  return '/mesas'
}

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    roles?: Role[]
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
    { path: '/', redirect: '/mesas' },

    // Mesas (meseros y admin)
    { path: '/mesas', component: () => import('../views/waiter/TablesView.vue'), meta: { roles: ['waiter', 'admin'] } },
    { path: '/mesa/:id', component: () => import('../views/waiter/TableDetailView.vue'), meta: { roles: ['waiter', 'admin'] } },

    // Cocina
    { path: '/cocina', component: () => import('../views/kitchen/KitchenView.vue'), meta: { roles: ['kitchen'] } },

    // Administración
    { path: '/admin', component: () => import('../views/admin/AdminHomeView.vue'), meta: { roles: ['admin'] } },
    { path: '/admin/menu', component: () => import('../views/admin/AdminMenuView.vue'), meta: { roles: ['admin'] } },
    { path: '/admin/mesas', component: () => import('../views/admin/AdminTablesView.vue'), meta: { roles: ['admin'] } },
    { path: '/admin/usuarios', component: () => import('../views/admin/AdminUsersView.vue'), meta: { roles: ['admin'] } },
    { path: '/admin/ventas', component: () => import('../views/admin/AdminSalesView.vue'), meta: { roles: ['admin'] } },
    { path: '/admin/ajustes', component: () => import('../views/admin/AdminSettingsView.vue'), meta: { roles: ['admin'] } },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  auth.init()

  if (to.meta.public) {
    if (auth.currentUser) return homeForRole(auth.currentUser.role)
    return true
  }

  if (!auth.currentUser) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  const roles = to.meta.roles
  if (roles && !roles.includes(auth.currentUser.role)) {
    return homeForRole(auth.currentUser.role)
  }
  return true
})

export default router
