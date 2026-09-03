import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from './AuthContext.jsx';
import io from 'socket.io-client';

const NotificationContext = createContext();

export const NotificationProvider = ({ children, socketUrl }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);

  const fetchNotifications = useCallback(async () => {
    const currentToken = token || localStorage.getItem('kisanqueue_token');
    if (!currentToken) return;
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setNotifications(result.data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [token]);

  // Initial fetch and on user/token change
  useEffect(() => {
    fetchNotifications();
  }, [user, token, fetchNotifications]);

  // Set up socket listener for live alerts
  useEffect(() => {
    if (!user) return;

    const socket = io(socketUrl || window.location.origin);
    const userId = user.id || user._id;
    
    if (userId) {
      socket.emit('joinCentre', userId);
    }

    socket.on('notificationReceived', (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      showToast(newNotif.title, newNotif.message);
    });

    // Also listen to general centre queue updates to trigger simple in-browser notifications
    socket.on('queueUpdated', () => {
      fetchNotifications();
    });

    return () => {
      socket.disconnect();
    };
  }, [user, socketUrl, fetchNotifications]);

  const showToast = (title, message) => {
    setToast({ title, message });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  const markAsRead = async (id) => {
    const currentToken = token || localStorage.getItem('kisanqueue_token');
    if (!currentToken) return;
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setNotifications(prev =>
          prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const currentToken = token || localStorage.getItem('kisanqueue_token');
    if (!currentToken) return;
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;

    try {
      await Promise.all(
        unread.map(n =>
          fetch(`/api/notifications/${n._id}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${currentToken}` }
          })
        )
      );
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        toast,
        showToast
      }}
    >
      {children}

      {/* Floating Toast Notification rendered in Portal */}
      {toast && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-5 right-5 z-[9997] max-w-sm w-full bg-white border-l-4 border-green-500 rounded-2xl shadow-2xl p-4 flex flex-col space-y-1 transition duration-300 transform translate-y-0 animate-bounce text-left">
          <div className="flex justify-between items-start">
            <span className="font-bold text-green-800 text-sm flex items-center">
              🌾 {toast.title}
            </span>
            <button 
              onClick={() => setToast(null)}
              className="text-gray-400 hover:text-gray-600 focus:outline-none p-1"
              aria-label="Dismiss toast"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{toast.message}</p>
        </div>,
        document.body
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
