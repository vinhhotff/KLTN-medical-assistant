import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, X, AlertCircle } from 'lucide-react';
import { notificationService, NotificationItem } from '../../services/notificationService';

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const [list, count] = await Promise.all([
        notificationService.getMyNotifications(),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch {
      // silently ignore if not logged in
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        title="Thông báo hệ thống"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-sm">Thông Báo</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-600">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Đã đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Không có thông báo nào
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkAsRead(n.id, { stopPropagation: () => {} } as any)}
                  className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${
                    !n.isRead ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold ${
                        n.type.includes('APPROVED')
                          ? 'bg-emerald-100 text-emerald-700'
                          : n.type.includes('REJECTED') || n.type.includes('ALERT')
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className={`text-xs font-semibold truncate ${!n.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          title="Đánh dấu đã đọc"
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(n.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
