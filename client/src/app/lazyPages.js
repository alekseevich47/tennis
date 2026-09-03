import { lazy } from 'react'

export const LazyTrainingsPage = lazy(() => import('../features/trainings/TrainingsPage'))
export const LazyShopPage = lazy(() => import('../features/shop/ShopPage'))
export const LazyCompetitionsPage = lazy(() => import('../features/competitions/CompetitionsPage'))
export const LazyGalleryPage = lazy(() => import('../features/gallery/GalleryPage'))
export const LazyProfilePage = lazy(() => import('../features/profile/ProfilePage'))
export const LazyAdminPanelPage = lazy(() => import('../features/admin/AdminPanelPage'))
export const LazyOnboardingTutorial = lazy(() => import('../features/onboarding/OnboardingTutorial'))
