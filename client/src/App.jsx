import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { PWAProvider } from './context/PWAContext.jsx';

import Navbar from './components/Navbar.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';

// Pages
import LandingPage from './pages/LandingPage.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import RegisterCentre from './pages/RegisterCentre.jsx';
import FarmerDashboard from './pages/FarmerDashboard.jsx';
import BookSlot from './pages/BookSlot.jsx';
import OperatorDashboard from './pages/OperatorDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider>
            <NotificationProvider>
              <PWAProvider>
                <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-150">
                  <Navbar />
                  <main className="flex-grow">
                    <Routes>
                      {/* Public routes */}
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/register-centre" element={<RegisterCentre />} />

                      {/* Farmer dashboard routes */}
                      <Route
                        path="/farmer"
                        element={
                          <PrivateRoute allowedRoles={['farmer']}>
                            <FarmerDashboard />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/farmer/book"
                        element={
                          <PrivateRoute allowedRoles={['farmer']}>
                            <BookSlot />
                          </PrivateRoute>
                        }
                      />

                      {/* Operator dashboard routes */}
                      <Route
                        path="/operator"
                        element={
                          <PrivateRoute allowedRoles={['operator']}>
                            <OperatorDashboard />
                          </PrivateRoute>
                        }
                      />

                      {/* Admin dashboard routes */}
                      <Route
                        path="/admin"
                        element={
                          <PrivateRoute allowedRoles={['admin']}>
                            <AdminDashboard />
                          </PrivateRoute>
                        }
                      />
                    </Routes>
                  </main>
                </div>
              </PWAProvider>
            </NotificationProvider>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
