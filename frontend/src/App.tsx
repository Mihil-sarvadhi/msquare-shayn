import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from '@pages/dashboard/page';
import ReviewsPage from '@pages/reviews/page';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
