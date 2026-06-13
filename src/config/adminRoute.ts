export const ADMIN_ROUTE_HASH = 'd2d0934de49b'

export function isAdminRoute(): boolean {
  return window.location.hash === `#/${ADMIN_ROUTE_HASH}`
}
