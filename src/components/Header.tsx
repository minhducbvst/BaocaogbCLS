import React, { useState, useEffect, useRef } from 'react';
import { User, Notification, SystemSettings } from '../types';
import { Shield, Bell, Check, UserCircle, Hospital, RefreshCw, Layers, Settings, LogOut, Key, X, Heart, Award, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  users: User[];
  onUserChange: (user: User) => void;
  notifications: Notification[];
  onMarkNotificationAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  isSyncing: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onLogout?: () => void;
  systemSettings?: SystemSettings;
}

export default function Header({
  currentUser,
  users,
  onUserChange,
  notifications,
  onMarkNotificationAsRead,
  onMarkAllAsRead,
  isSyncing,
  onRefresh,
  onOpenSettings,
  onLogout,
  systemSettings
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Password Setup & Change states
  const [isPasswordChangeOpen, setIsPasswordChangeOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordStateError, setPasswordStateError] = useState('');
  const [passwordStateSuccess, setPasswordStateSuccess] = useState('');
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [showRemovePasswordConfirm, setShowRemovePasswordConfirm] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const bgStyle = systemSettings?.bgStyle || 'default';
  const isHeaderDark = bgStyle === 'cyberpunk' || bgStyle === 'dark-slate';

  const headerBgStyle = isHeaderDark
    ? bgStyle === 'cyberpunk'
      ? 'bg-[#0a0c14]/95 text-slate-100 border-b border-rose-500/10'
      : 'bg-[#070b12]/95 text-slate-200 border-b border-slate-800'
    : bgStyle === 'elegant'
    ? 'bg-[#faf8f5]/96 text-slate-800 border-b border-amber-900/10 shadow-3xs'
    : bgStyle === 'clean-mint'
    ? 'bg-[#ecf7f3]/96 text-slate-800 border-b border-emerald-900/10 shadow-3xs'
    : bgStyle === 'warm-wood'
    ? 'bg-[#fcf7ee]/96 text-slate-800 border-b border-amber-900/10 shadow-3xs'
    : bgStyle === 'modern-blue'
    ? 'bg-[#f0f4f8]/96 text-slate-805 border-b border-blue-200/80 shadow-3xs'
    : bgStyle === 'soft-slate'
    ? 'bg-[#f1f5f9]/96 text-slate-800 border-b border-slate-300/80 shadow-3xs'
    : 'bg-white/96 text-slate-805 border-b border-slate-200 shadow-3xs'; // default light

  const btnBgClass = isHeaderDark
    ? 'bg-slate-900/40 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-850 hover:border-slate-800'
    : 'bg-slate-100/50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200/50 hover:border-slate-300';

  const titleClass = isHeaderDark ? 'text-white' : 'text-slate-900';
  const subtitleClass = isHeaderDark ? 'text-slate-400' : 'text-slate-550';

  const badgeClass = isHeaderDark 
    ? 'text-[#f1f3f5] border border-slate-705 bg-slate-800/80' 
    : 'text-slate-650 border border-slate-250 bg-slate-100';

  const profileNameClass = isHeaderDark ? 'text-white' : 'text-slate-900';
  const profileRoleClass = isHeaderDark ? 'text-indigo-400' : 'text-slate-500';
  const profileContainerBorder = isHeaderDark ? 'border-slate-800' : 'border-slate-200';
  const profileIconBg = isHeaderDark ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200';

  const pwdBtnClass = isHeaderDark
    ? 'bg-slate-900 hover:bg-slate-850 hover:text-white text-indigo-400 border border-slate-800 hover:border-slate-705'
    : 'bg-slate-50 hover:bg-slate-100 hover:text-slate-900 text-indigo-650 border border-slate-200 hover:border-slate-300';

  return (
    <header className={`${headerBgStyle} sticky top-0 z-50 transition-all duration-300 select-none`}>
      {/* Dynamic line colored matching the primary theme choice at the top */}
      <div className="h-[3px] w-full shrink-0" style={{ backgroundColor: systemSettings?.themeColor || '#4f46e5' }} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-13">
          {/* Logo / Brand */}
          <div className="flex items-center space-x-2.5">
            <div 
              className="p-1.5 rounded text-white shadow-sm shrink-0 flex items-center justify-center transition-all duration-300"
              style={{ backgroundColor: systemSettings?.themeColor || '#4f46e5' }}
            >
              {systemSettings?.logoPreset === 'custom' && systemSettings?.logoUrl ? (
                <img src={systemSettings.logoUrl} className="w-4 h-4 object-cover rounded" referrerPolicy="no-referrer" alt="Logo" />
              ) : systemSettings?.logoPreset === 'shield' ? (
                <ShieldCheck className="w-4 h-4" />
              ) : systemSettings?.logoPreset === 'cross' ? (
                <Heart className="w-4 h-4 fill-white" />
              ) : systemSettings?.logoPreset === 'custom' ? (
                <Award className="w-4 h-4" />
              ) : (
                <Hospital className="w-4 h-4" />
              )}
            </div>
            <div>
              <h1 className={`text-sm font-bold tracking-tight flex items-center gap-1.5 leading-none ${titleClass}`}>
                {systemSettings?.systemTitle || 'Giao Ban Khoa Cận Lâm Sàng'}
                <span className={`hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider scale-95 ${badgeClass}`}>
                  Chính Quy
                </span>
              </h1>
              <p className={`text-[10px] hidden sm:block mt-0.5 leading-none ${subtitleClass}`}>
                {systemSettings?.systemSubtitle ? (systemSettings.systemSubtitle.length > 80 ? systemSettings.systemSubtitle.substring(0, 80) + '...' : systemSettings.systemSubtitle) : 'Hệ thống báo cáo & tự động hóa biên bản y khoa bằng AI'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-3">
            {/* Syncing State Indicator */}
            <button 
              onClick={onRefresh}
              className={`p-1 px-2 rounded-md transition duration-150 flex items-center gap-1 text-[11px] border ${btnBgClass}`}
              title="Cập nhật dữ liệu từ máy chủ (Hỗ trợ Thời gian thực)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} style={{ color: systemSettings?.themeColor || '#4f46e5' }} />
              <span className="hidden md:inline">Đồng bộ</span>
            </button>

            {/* Notification Settings Toggle */}
            <button
              onClick={onOpenSettings}
              className={`p-1.5 rounded-md focus:outline-none transition relative border ${btnBgClass}`}
              title="Cài đặt thông báo đẩy"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Notification Center */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-1.5 rounded-md focus:outline-none transition relative border ${btnBgClass}`}
              >
                <span className="sr-only">Xem thông báo</span>
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className={`absolute top-1 right-1 block h-2 w-2 rounded-full bg-rose-500 animate-pulse ring-1 ${isHeaderDark ? 'ring-slate-950' : 'ring-white'}`} />
                )}
              </button>

              {showNotifications && (
                <div className="origin-top-right absolute right-0 mt-1.5 w-80 md:w-96 rounded-lg shadow-xl bg-white text-slate-900 border border-slate-200 py-1 focus:outline-none z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <span className="font-bold text-xs text-slate-800">Thông báo ({unreadCount})</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => {
                          onMarkAllAsRead();
                          setShowNotifications(false);
                        }}
                        className="text-[10px] text-indigo-650 hover:text-indigo-800 font-bold hover:underline"
                      >
                        Đánh dấu tất cả đã đọc
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-slate-400 text-xs">Không có thông báo mới</div>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          className={`px-3.5 py-2 hover:bg-slate-50 transition cursor-pointer flex items-start gap-2 ${!notif.read ? 'bg-indigo-50/30' : ''}`}
                          onClick={() => onMarkNotificationAsRead(notif.id)}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${!notif.read ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                          <div className="flex-1">
                            <p className="text-[11px] font-bold text-slate-800">{notif.title}</p>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-normal">{notif.content}</p>
                            <span className="text-[9px] text-slate-400 mt-0.5 block">
                              {new Date(notif.timestamp).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          {!notif.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkNotificationAsRead(notif.id);
                              }}
                              className="text-slate-400 hover:text-indigo-600 p-0.5 self-center"
                              title="Đánh dấu đã đọc"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Info (Account Switcher Removed as per Request) */}
            <div className={`flex items-center space-x-3 border-l pl-3 ${profileContainerBorder}`}>
              <div className="text-right">
                <p className={`text-xs font-bold leading-none ${profileNameClass}`}>{currentUser.name}</p>
                <span className={`text-[9px] font-mono tracking-wider uppercase leading-none block mt-1.5 ${profileRoleClass}`}>
                  {currentUser.role === 'admin' ? 'Quản trị viên (Admin)' : currentUser.role === 'truongKhoa' ? 'Trưởng Khoa (Ban Giám Đốc)' : `Kíp trực: ${currentUser.departmentName}`}
                </span>
              </div>
              <div className={`p-1.5 rounded-md border shrink-0 ${profileIconBg}`}>
                <Shield className={`w-3.5 h-3.5 ${currentUser.role === 'admin' || currentUser.role === 'truongKhoa' ? 'text-amber-400' : 'text-slate-400'}`} />
              </div>

              <button
                onClick={() => setIsPasswordChangeOpen(true)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer select-none ${pwdBtnClass}`}
                title="Thiết lập hoặc đổi mật khẩu tài khoản"
              >
                <Key className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mật khẩu</span>
              </button>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className={isHeaderDark
                    ? "bg-rose-950/40 hover:bg-rose-900 border border-rose-900/45 hover:border-rose-705 text-rose-300 hover:text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer select-none"
                    : "bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 text-rose-700 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer select-none"
                  }
                  title="Đăng xuất khỏi phòng trực"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Đăng xuất</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password Setup & Update Modal Overlay */}
      {isPasswordChangeOpen && (
        <div 
          id="password-setup-modal" 
          onClick={() => {
            setIsPasswordChangeOpen(false);
            setPasswordStateError('');
            setPasswordStateSuccess('');
            setCurrentPasswordInput('');
            setNewPasswordInput('');
            setConfirmPasswordInput('');
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in text-slate-800 select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-left">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-tight">Cấu hình Mật khẩu</h3>
                  <p className="text-[10px] text-slate-400 font-extrabold leading-none mt-1">Tài khoản: {currentUser.name}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsPasswordChangeOpen(false);
                  setPasswordStateError('');
                  setPasswordStateSuccess('');
                  setCurrentPasswordInput('');
                  setNewPasswordInput('');
                  setConfirmPasswordInput('');
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordStateSuccess ? (
              <div className="space-y-4 py-2">
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-150 p-3 rounded-xl text-[11px] font-bold leading-relaxed">
                  ✔️ {passwordStateSuccess}
                </div>
                <button
                  onClick={() => {
                    setIsPasswordChangeOpen(false);
                    setPasswordStateError('');
                    setPasswordStateSuccess('');
                    setCurrentPasswordInput('');
                    setNewPasswordInput('');
                    setConfirmPasswordInput('');
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-lg cursor-pointer"
                >
                  Xong
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setPasswordStateError('');
                  
                  // Validation
                  if (currentUser.password && currentPasswordInput !== currentUser.password) {
                    setPasswordStateError('Mật khẩu cũ không chính xác. Nếu quên, bạn có thể Đăng xuất và gửi Yêu cầu khôi phục tới Admin.');
                    return;
                  }
                  
                  if (!newPasswordInput) {
                    setPasswordStateError('Vui lòng cung cấp mật khẩu mới.');
                    return;
                  }

                  if (newPasswordInput !== confirmPasswordInput) {
                    setPasswordStateError('Mật khẩu mới và mật khẩu xác nhận không trùng khớp.');
                    return;
                  }

                  setIsPasswordSubmitting(true);
                  try {
                    const res = await fetch('/api/users/change-password', {
                      method: 'POST',
                      headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify({ userId: currentUser.id, newPassword: newPasswordInput })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      const updatedUser = data.users.find((u: User) => u.id === currentUser.id);
                      if (updatedUser) {
                        onUserChange(updatedUser);
                      }
                      setPasswordStateSuccess('Cập nhật mật khẩu cá nhân thành công!');
                    } else {
                      setPasswordStateError('Không thể lưu mật khẩu. Vui lòng liên hệ hỗ trợ kỹ thuật.');
                    }
                  } catch {
                    setPasswordStateError('Hệ thống mất kết nối. Vui lòng thử lại sau.');
                  } finally {
                    setIsPasswordSubmitting(false);
                  }
                }}
                className="space-y-3"
              >
                {currentUser.password && (
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400 block">Mật khẩu cũ của bạn:</label>
                    <input
                      type="password"
                      placeholder="Mật khẩu hiện tại..."
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-250 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      required
                    />
                  </div>
                )}

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">Mật khẩu mới:</label>
                  <input
                    type="password"
                    placeholder="Mật khẩu mới..."
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-250 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">Xác nhận mật khẩu mới:</label>
                  <input
                    type="password"
                    placeholder="Nhập lại mật khẩu mới..."
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-250 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                {currentUser.password && (
                  <div className="text-right pt-1.5">
                    <button
                      type="button"
                      onClick={() => setShowRemovePasswordConfirm(true)}
                      className="text-[10px] font-extrabold text-rose-600 hover:text-rose-800 transition py-1 text-right cursor-pointer"
                    >
                      🔓 Hủy mật khẩu hiện tại (Trình tự đăng nhập trực tiếp)
                    </button>
                  </div>
                )}

                {passwordStateError && (
                  <p className="text-[10px] text-rose-600 font-extrabold leading-normal text-left">
                    ⚠️ {passwordStateError}
                  </p>
                )}

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPasswordChangeOpen(false);
                      setPasswordStateError('');
                      setCurrentPasswordInput('');
                      setNewPasswordInput('');
                      setConfirmPasswordInput('');
                    }}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-[11px] rounded-lg transition"
                    disabled={isPasswordSubmitting}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] rounded-lg transition shadow-2xs cursor-pointer active:scale-98 disabled:opacity-50"
                    disabled={isPasswordSubmitting}
                  >
                    {isPasswordSubmitting ? 'Đang lưu...' : 'Xác nhận'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showRemovePasswordConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-scale-up text-slate-800">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-full bg-amber-50 text-amber-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </span>
              <h4 className="font-extrabold text-slate-900 text-sm">Xác nhận hủy mật khẩu</h4>
            </div>
            <p className="text-xs text-slate-650 leading-relaxed font-semibold">
              Bạn có chắc muốn hủy bỏ/xóa bảo mật mật khẩu của tài khoản này? Sau khi gỡ, bạn có thể tự động vào hệ thống trực tiếp mà không cần mật khẩu.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowRemovePasswordConfirm(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 bg-white text-xs font-bold transition hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowRemovePasswordConfirm(false);
                  setIsPasswordSubmitting(true);
                  try {
                    const res = await fetch('/api/users/change-password', {
                      method: 'POST',
                      headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify({ userId: currentUser.id, newPassword: '' })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      const updatedUser = data.users.find((u: User) => u.id === currentUser.id);
                      if (updatedUser) {
                        onUserChange(updatedUser);
                      }
                      setPasswordStateSuccess('Đã gỡ bỏ mật khẩu cá nhân thành công. Tài khoản sẽ tự động đăng nhập từ nay về sau!');
                    }
                  } catch {
                    setPasswordStateError('Không thể gỡ mật khẩu.');
                  } finally {
                    setIsPasswordSubmitting(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold transition hover:bg-indigo-700 cursor-pointer"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
