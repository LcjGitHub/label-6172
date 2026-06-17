import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { CalcPage } from './pages/CalcPage';
import { RecipesPage } from './pages/RecipesPage';

/**
 * 根路由：/calc 计算器，/recipes 配方列表
 */
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/calc" replace />} />
        <Route path="calc" element={<CalcPage />} />
        <Route path="recipes" element={<RecipesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/calc" replace />} />
    </Routes>
  );
}
