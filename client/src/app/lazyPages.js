import { lazy } from 'react'

export const LazyTrainingsPage = lazy(() => import('../features/trainings/TrainingsPage'))
export const LazyShopPage = lazy(() => import('../features/shop/ShopPage'))
export const LazyCompetitionsPage = lazy(() => import('../features/competitions/CompetitionsPage'))
export const LazyGalleryPage = lazy(() => import('../features/gallery/GalleryPage'))
export const LazyProfilePage = lazy(() => import('../features/profile/ProfilePage'))
export const LazyAdminPanelPage = lazy(() => import('../features/admin/AdminPanelPage'))
export const LazyOnboardingTutorial = lazy(() => import('../features/onboarding/OnboardingTutorial'))

let prefetchStarted = false

/** После первого paint Ленты — параллельно подтянуть чанки остальных экранов. */
export function prefetchLazyTabPages() {
  if (prefetchStarted || typeof window === 'undefined') return
  prefetchStarted = true

  const run = () => {
    void import('../features/trainings/TrainingsPage')
    void import('../features/shop/ShopPage')
    void import('../features/competitions/CompetitionsPage')
    void import('../features/gallery/GalleryPage')
    void import('../features/profile/ProfilePage')
    void import('../features/admin/AdminPanelPage')
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 2500 })
  } else {
    window.setTimeout(run, 400)
  }
}
