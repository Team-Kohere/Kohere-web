import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { setSessionExpiredHandler } from './api/client'
import { RequireAuth } from './routes/RequireAuth'
import AdminListingReviewPage from './pages/AdminListingReviewPage'
import AdminPage from './pages/AdminPage'
import FindAccountPage from './pages/FindAccountPage'
import ListingDetailPage from './pages/ListingDetailPage'
import ListingNewPage from './pages/ListingNewPage'
import ListingsPage from './pages/ListingsPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import OnboardingPage from './pages/OnboardingPage'
import ProfilePage from './pages/ProfilePage'
import ProfileEditPage from './pages/ProfileEditPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SignupPage from './pages/SignupPage'

export default function App() {
  const navigate = useNavigate()

  // 토큰 재발급까지 실패해 세션이 끊기면 로그인 화면으로 돌려보낸다.
  useEffect(() => {
    setSessionExpiredHandler(() => navigate('/login', { replace: true }))
    return () => setSessionExpiredHandler(null)
  }, [navigate])

  return (
    <Routes>
      {/* 공개 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/find-account" element={<FindAccountPage />} />
      {/* 메일로 보낸 재설정 링크가 도착하는 곳. 링크의 token 이 본인 확인을 대신한다. */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* 로그인 필요 */}
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Navigate to="/listings" replace />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/listings" element={<ListingsPage />} />
        {/* key 를 나눠야 수정 → 신규로 옮길 때 새로 마운트된다. 같으면 컴포넌트가 재사용되어
            수정 중이던 값·사진이 신규 폼과 임시저장으로 넘어간다. */}
        <Route path="/listings/new" element={<ListingNewPage key="new" />} />
        <Route path="/listings/:listingId/edit" element={<ListingNewPage key="edit" />} />
        <Route path="/listings/:listingId" element={<ListingDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<ProfileEditPage />} />
        {/* 관리자 권한 확인은 서버 응답으로 판단해 추가한다. 지금은 경로만 잡아둔다. */}
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/listings/:listingId" element={<AdminListingReviewPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
