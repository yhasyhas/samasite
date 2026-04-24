import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';

import { PublicLayout } from './components/public/PublicLayout';
import { AdminLayout } from './components/admin/AdminLayout';
import { ProtectedRoute } from './components/admin/ProtectedRoute';

import { HomePage } from './pages/public/HomePage';
import { CatalogPage } from './pages/public/CatalogPage';
import { ProductDetailPage } from './pages/public/ProductDetailPage';
import { CategoryPage } from './pages/public/CategoryPage';
import { QuotePage } from './pages/public/QuotePage';
import { ContactPage } from './pages/public/ContactPage';

import { LoginPage } from './pages/admin/LoginPage';
import { ResetPasswordPage } from './pages/admin/ResetPasswordPage';
import { AcceptInvitePage } from './pages/admin/AcceptInvitePage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { ProductsPage } from './pages/admin/ProductsPage';
import { CategoriesPage } from './pages/admin/CategoriesPage';
import { OrdersPage } from './pages/admin/OrdersPage';
import { OrderDetailPage } from './pages/admin/OrderDetailPage';
import { QuotesPage } from './pages/admin/QuotesPage';
import { PromotionsPage } from './pages/admin/PromotionsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { LogsPage } from './pages/admin/LogsPage';
import { GeneralSettingsPage } from './pages/admin/GeneralSettingsPage';
import { AppearanceSettingsPage } from './pages/admin/AppearanceSettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <Toaster richColors position="top-right" />
            <Routes>
              {/* Public routes */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/catalog" element={<CatalogPage />} />
                <Route path="/product/:slug" element={<ProductDetailPage />} />
                <Route path="/category/:slug" element={<CategoryPage />} />
                <Route path="/quote" element={<QuotePage />} />
                <Route path="/contact" element={<ContactPage />} />
              </Route>

              {/* Admin auth (pas besoin d\'être connecté) */}
              <Route path="/admin/login" element={<LoginPage />} />
              <Route path="/admin/reset-password" element={<ResetPasswordPage />} />
              <Route path="/admin/accept-invite" element={<AcceptInvitePage />} />

              {/* Admin protected routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="orders/:id" element={<OrderDetailPage />} />
                <Route path="quotes" element={<QuotesPage />} />
                <Route path="promotions" element={<PromotionsPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="logs" element={<LogsPage />} />
                <Route path="settings/general" element={<GeneralSettingsPage />} />
                <Route path="settings/appearance" element={
                  <ProtectedRoute requiredRole="super_admin">
                    <AppearanceSettingsPage />
                  </ProtectedRoute>
                } />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

// import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// import { Toaster } from 'sonner';
// import { ThemeProvider } from './contexts/ThemeContext';
// import { AuthProvider } from './contexts/AuthContext';
// import { CartProvider } from './contexts/CartContext';

// import { PublicLayout } from './components/public/PublicLayout';
// import { AdminLayout } from './components/admin/AdminLayout';
// import { ProtectedRoute } from './components/admin/ProtectedRoute';

// import { HomePage } from './pages/public/HomePage';
// import { CatalogPage } from './pages/public/CatalogPage';
// import { ProductDetailPage } from './pages/public/ProductDetailPage';
// import { CategoryPage } from './pages/public/CategoryPage';
// import { QuotePage } from './pages/public/QuotePage';
// import { ContactPage } from './pages/public/ContactPage';

// import { LoginPage } from './pages/admin/LoginPage';
// import { ResetPasswordPage } from './pages/admin/ResetPasswordPage';
// import { DashboardPage } from './pages/admin/DashboardPage';
// import { ProductsPage } from './pages/admin/ProductsPage';
// import { CategoriesPage } from './pages/admin/CategoriesPage';
// import { OrdersPage } from './pages/admin/OrdersPage';
// import { OrderDetailPage } from './pages/admin/OrderDetailPage';
// import { QuotesPage } from './pages/admin/QuotesPage';
// import { PromotionsPage } from './pages/admin/PromotionsPage';
// import { UsersPage } from './pages/admin/UsersPage';
// import { LogsPage } from './pages/admin/LogsPage';
// import { GeneralSettingsPage } from './pages/admin/GeneralSettingsPage';
// import { AppearanceSettingsPage } from './pages/admin/AppearanceSettingsPage';

// export default function App() {
//   return (
//     <BrowserRouter>
//       <ThemeProvider>
//         <AuthProvider>
//           <CartProvider>
//             <Toaster richColors position="top-right" />
//             <Routes>
//               {/* Public routes */}
//               <Route element={<PublicLayout />}>
//                 <Route path="/" element={<HomePage />} />
//                 <Route path="/catalog" element={<CatalogPage />} />
//                 <Route path="/product/:slug" element={<ProductDetailPage />} />
//                 <Route path="/category/:slug" element={<CategoryPage />} />
//                 <Route path="/quote" element={<QuotePage />} />
//                 <Route path="/contact" element={<ContactPage />} />
//               </Route>

//               {/* Admin auth */}
//               <Route path="/admin/login" element={<LoginPage />} />
//               <Route path="/admin/reset-password" element={<ResetPasswordPage />} />

//               {/* Admin protected routes */}
//               <Route
//                 path="/admin"
//                 element={
//                   <ProtectedRoute>
//                     <AdminLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<DashboardPage />} />
//                 <Route path="products" element={<ProductsPage />} />
//                 <Route path="categories" element={<CategoriesPage />} />
//                 <Route path="orders" element={<OrdersPage />} />
//                 <Route path="orders/:id" element={<OrderDetailPage />} />
//                 <Route path="quotes" element={<QuotesPage />} />
//                 <Route path="promotions" element={<PromotionsPage />} />
//                 <Route path="users" element={<UsersPage />} />
//                 <Route path="logs" element={<LogsPage />} />
//                 <Route path="settings/general" element={<GeneralSettingsPage />} />
//                 <Route path="settings/appearance" element={
//                   <ProtectedRoute requiredRole="super_admin">
//                     <AppearanceSettingsPage />
//                   </ProtectedRoute>
//                 } />
//               </Route>

//               <Route path="*" element={<Navigate to="/" replace />} />
//             </Routes>
//           </CartProvider>
//         </AuthProvider>
//       </ThemeProvider>
//     </BrowserRouter>
//   );
// }

// import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// import { Toaster } from 'sonner';
// import { ThemeProvider } from './contexts/ThemeContext';
// import { AuthProvider } from './contexts/AuthContext';
// import { CartProvider } from './contexts/CartContext';

// import { PublicLayout } from './components/public/PublicLayout';
// import { AdminLayout } from './components/admin/AdminLayout';
// import { ProtectedRoute } from './components/admin/ProtectedRoute';

// import { HomePage } from './pages/public/HomePage';
// import { CatalogPage } from './pages/public/CatalogPage';
// import { ProductDetailPage } from './pages/public/ProductDetailPage';
// import { CategoryPage } from './pages/public/CategoryPage';
// import { QuotePage } from './pages/public/QuotePage';
// import { ContactPage } from './pages/public/ContactPage';

// import { LoginPage } from './pages/admin/LoginPage';
// import { DashboardPage } from './pages/admin/DashboardPage';
// import { ProductsPage } from './pages/admin/ProductsPage';
// import { CategoriesPage } from './pages/admin/CategoriesPage';
// import { OrdersPage } from './pages/admin/OrdersPage';
// import { OrderDetailPage } from './pages/admin/OrderDetailPage';
// import { QuotesPage } from './pages/admin/QuotesPage';
// import { PromotionsPage } from './pages/admin/PromotionsPage';
// import { UsersPage } from './pages/admin/UsersPage';
// import { LogsPage } from './pages/admin/LogsPage';
// import { GeneralSettingsPage } from './pages/admin/GeneralSettingsPage';
// import { AppearanceSettingsPage } from './pages/admin/AppearanceSettingsPage';

// export default function App() {
//   return (
//     <BrowserRouter>
//       <ThemeProvider>
//         <AuthProvider>
//           <CartProvider>
//             <Toaster richColors position="top-right" />
//             <Routes>
//               {/* Public routes */}
//               <Route element={<PublicLayout />}>
//                 <Route path="/" element={<HomePage />} />
//                 <Route path="/catalog" element={<CatalogPage />} />
//                 <Route path="/product/:slug" element={<ProductDetailPage />} />
//                 <Route path="/category/:slug" element={<CategoryPage />} />
//                 <Route path="/quote" element={<QuotePage />} />
//                 <Route path="/contact" element={<ContactPage />} />
//               </Route>

//               {/* Admin auth */}
//               <Route path="/admin/login" element={<LoginPage />} />

//               {/* Admin protected routes */}
//               <Route
//                 path="/admin"
//                 element={
//                   <ProtectedRoute>
//                     <AdminLayout />
//                   </ProtectedRoute>
//                 }
//               >
//                 <Route index element={<DashboardPage />} />
//                 <Route path="products" element={<ProductsPage />} />
//                 <Route path="categories" element={<CategoriesPage />} />
//                 <Route path="orders" element={<OrdersPage />} />
//                 <Route path="orders/:id" element={<OrderDetailPage />} />
//                 <Route path="quotes" element={<QuotesPage />} />
//                 <Route path="promotions" element={<PromotionsPage />} />
//                 <Route path="users" element={<UsersPage />} />
//                 <Route path="logs" element={<LogsPage />} />
//                 <Route path="settings/general" element={<GeneralSettingsPage />} />
//                 <Route path="settings/appearance" element={
//                   <ProtectedRoute requiredRole="super_admin">
//                     <AppearanceSettingsPage />
//                   </ProtectedRoute>
//                 } />
//               </Route>

//               <Route path="*" element={<Navigate to="/" replace />} />
//             </Routes>
//           </CartProvider>
//         </AuthProvider>
//       </ThemeProvider>
//     </BrowserRouter>
//   );
// }
