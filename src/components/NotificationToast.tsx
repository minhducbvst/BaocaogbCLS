import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  Calendar, 
  ClipboardList, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Check, 
  Info,
  ShieldAlert
} from 'lucide-react';
import { Notification } from '../types';

interface NotificationToastProps {
  notification: Notification | null;
  onClose: () => void;
  onRead: (id: string) => void;
}

export default function NotificationToast({ 
  notification, 
  onClose,
  onRead
}: NotificationToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      // Auto dismiss after 7 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300); // Wait for exit animation
      }, 7000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const getStyleAndIcon = () => {
    switch (notification.type) {
      case 'meeting':
        return {
          icon: <Calendar className="w-4 h-4 text-white" />,
          badgeBg: 'bg-indigo-600 border-indigo-700',
          ringBg: 'ring-indigo-100',
          title: 'Nhắc Nhở Lịch Họp'
        };
      case 'task':
        return {
          icon: <ClipboardList className="w-4 h-4 text-white" />,
          badgeBg: 'bg-amber-600 border-amber-700',
          ringBg: 'ring-amber-100',
          title: 'Nhiệm Vụ Mới'
        };
      case 'update':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-white" />,
          badgeBg: 'bg-emerald-600 border-emerald-700',
          ringBg: 'ring-emerald-100',
          title: 'Chỉ Đạo Quan Trọng'
        };
      case 'alert':
        return {
          icon: <ShieldAlert className="w-4 h-4 text-white" />,
          badgeBg: 'bg-rose-600 border-rose-700',
          ringBg: 'ring-rose-100',
          title: 'Thông Báo Khẩn'
        };
      case 'report':
        return {
          icon: <Info className="w-4 h-4 text-white" />,
          badgeBg: 'bg-cyan-600 border-cyan-700',
          ringBg: 'ring-cyan-100',
          title: 'Đồng Bộ Số Liệu'
        };
      default:
        return {
          icon: <Bell className="w-4 h-4 text-white" />,
          badgeBg: 'bg-slate-800 border-slate-900',
          ringBg: 'ring-slate-100',
          title: 'Thông Báo Hệ Thống'
        };
    }
  };

  const { icon, badgeBg, ringBg, title } = getStyleAndIcon();

  const handleActionClick = () => {
    onRead(notification.id);
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div 
      className={`fixed top-18 right-4 z-50 w-full max-w-sm sm:max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-4 flex gap-3 transform transition-all duration-300 ease-out font-sans ${
        visible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 scale-95 pointer-events-none'
      }`}
      style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
    >
      {/* Icon Badge */}
      <div className={`p-2 rounded-lg ${badgeBg} border text-white shadow-sm shrink-0 flex items-center justify-center h-9 w-9 self-start`}>
        {icon}
      </div>

      {/* Body content */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-650 font-mono">
            {title}
          </span>
          <span className="text-[9px] text-slate-400 font-mono">Vừa xong</span>
        </div>
        <p className="text-[11px] font-bold text-slate-900 leading-tight">
          {notification.title}
        </p>
        <p className="text-[10px] text-slate-600 leading-normal">
          {notification.content}
        </p>
        
        {/* Actions bar */}
        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={handleActionClick}
            className="inline-flex items-center gap-1 text-[9px] bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 font-bold px-2 py-1 rounded cursor-pointer transition shadow-xs"
          >
            <Check className="w-3 h-3 text-indigo-600" /> Đã rõ & Đánh dấu đọc
          </button>
          
          <button
            onClick={() => {
              setVisible(false);
              setTimeout(onClose, 300);
            }}
            className="inline-flex items-center text-[9px] bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold px-2 py-1 rounded cursor-pointer transition border border-slate-200/50"
          >
            Bỏ qua
          </button>
        </div>
      </div>

      {/* Exit Button */}
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 300);
        }}
        className="text-slate-400 hover:text-slate-600 self-start p-0.5 rounded transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
