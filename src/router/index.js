import { createRouter, createWebHistory } from 'vue-router'
import CreateEscrow from '../views/CreateEscrow.vue'
import ManageEscrows from '../views/ManageEscrows.vue'
import EscrowDetail from '../views/EscrowDetail.vue'

// GitHub Pages SPA redirect handler
// GitHub Pages redirects 404s to 404.html with the path as ?/path
// We need to extract this and redirect to the actual path
if (typeof window !== 'undefined') {
  const search = window.location.search
  if (search && search.includes('?/')) {
    // Extract path from ?/path format
    const pathMatch = search.match(/\?\/?(.+?)(?:&|$)/)
    if (pathMatch) {
      const path = '/' + pathMatch[1].replace(/~and~/g, '&')
      // Extract remaining query params
      const remainingSearch = search.replace(/\?\/?.+?&/, '&').replace(/~and~/g, '&')
      const finalSearch = remainingSearch.startsWith('&') ? remainingSearch.slice(1) : remainingSearch
      const newUrl = path + (finalSearch ? '?' + finalSearch : '') + window.location.hash
      window.history.replaceState({}, '', newUrl)
    }
  }
}

const routes = [
  {
    path: '/',
    redirect: '/create'
  },
  {
    path: '/create',
    name: 'Create',
    component: CreateEscrow
  },
  {
    path: '/manage',
    name: 'Manage',
    component: ManageEscrows
  },
  {
    path: '/escrow/:id',
    name: 'EscrowDetail',
    component: EscrowDetail,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
