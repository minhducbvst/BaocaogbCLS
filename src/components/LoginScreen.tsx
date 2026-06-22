import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { USERS } from '../data';
import { 
  Hospital, 
  Shield, 
  Activity, 
  FlaskConical, 
  Eye, 
  Heart, 
  AlertCircle, 
  ArrowRight, 
  Lock, 
  Clock, 
  Check, 
  UserCheck
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  initialUser?: User;
  users?: User[];
}

export default function LoginScreen({ onLoginSuccess, initialUser, users = USERS }: LoginScreenProps) {
  const [selectedUser, setSelectedUser] = useState<User>(initialUser || users[0] || USERS[0]);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  // Password Login Modal States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [targetUserForLogin, setTargetUserForLogin] = useState<User | null>(null);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Keep selected user updated if users list changes or becomes synchronized
  useEffect(() => {
    if (initialUser) {
      const found = users.find(u => u.id === initialUser.id);
      if (found) setSelectedUser(found);
    } else if (users.length > 0) {
      setSelectedUser(users[0]);
    }
  }, [users, initialUser]);

  // Real-time server clock rendering
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh'
      });
      const dateStr = now.toLocaleDateString('vi-VN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh'
      });
      setCurrentTime(`${dateStr} | ${timeStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Map roles/departments to distinctive medical icons and styles
  const getDeptIconAndStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          icon: <Shield className="w-6 h-6 text-amber-600" />,
          bgColor: 'bg-amber-50 border-amber-200 text-amber-800',
          hoverColor: 'hover:bg-amber-100 hover:border-amber-300',
          activeBg: 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-500 shadow-md ring-2 ring-amber-500/20',
          badge: 'Tài khoản Admin'
        };
      case 'truongKhoa':
        return {
          icon: <Shield className="w-6 h-6 text-indigo-600 animate-pulse" />,
          bgColor: 'bg-indigo-50 border-indigo-200 text-indigo-800',
          hoverColor: 'hover:bg-indigo-100 hover:border-indigo-300',
          activeBg: 'bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-500 shadow-md ring-2 ring-indigo-505/20',
          badge: 'Trưởng Khoa (Phê duyệt)'
        };
      case 'sieuAm':
        return {
          icon: <Activity className="w-6 h-6 text-sky-600 animate-pulse" />,
          bgColor: 'bg-sky-50 border-sky-200 text-sky-800',
          hoverColor: 'hover:bg-sky-100 hover:border-sky-300',
          activeBg: 'bg-gradient-to-br from-sky-50 to-sky-100 border-sky-500 shadow-md ring-2 ring-sky-500/20',
          badge: 'Chẩn đoán hình ảnh'
        };
      case 'noiSoi':
        return {
          icon: <Eye className="w-6 h-6 text-emerald-600" />,
          bgColor: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          hoverColor: 'hover:bg-emerald-100 hover:border-emerald-300',
          activeBg: 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-500 shadow-md ring-2 ring-emerald-500/20',
          badge: 'Nội soi Tiêu hóa'
        };
      case 'xQuang':
        return {
          icon: <UserCheck className="w-6 h-6 text-blue-600" />,
          bgColor: 'bg-blue-50 border-blue-200 text-blue-800',
          hoverColor: 'hover:bg-blue-100 hover:border-blue-300',
          activeBg: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-500 shadow-md ring-2 ring-blue-500/20',
          badge: 'Chẩn đoán hình ảnh'
        };
      case 'dienTimLHN':
        return {
          icon: <Heart className="w-6 h-6 text-purple-600" />,
          bgColor: 'bg-purple-50 border-purple-200 text-purple-800',
          hoverColor: 'hover:bg-purple-100 hover:border-purple-300',
          activeBg: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-500 shadow-md ring-2 ring-purple-500/20',
          badge: 'Thăm dò chức năng'
        };
      case 'xetNghiem':
        return {
          icon: <FlaskConical className="w-6 h-6 text-cyan-600" />,
          bgColor: 'bg-cyan-50 border-cyan-200 text-cyan-800',
          hoverColor: 'hover:bg-cyan-100 hover:border-cyan-300',
          activeBg: 'bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-500 shadow-md ring-2 ring-cyan-500/20',
          badge: 'Xét nghiệm Y học'
        };
      default:
        return {
          icon: <Hospital className="w-6 h-6 text-slate-600" />,
          bgColor: 'bg-slate-50 border-slate-200 text-slate-800',
          hoverColor: 'hover:bg-slate-100 hover:border-slate-300',
          activeBg: 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-500 shadow-md ring-2 ring-slate-505/20',
          badge: 'Liên khoa'
        };
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    if (user.password) {
      setTargetUserForLogin(user);
      setEnteredPassword('');
      setPasswordError('');
      setResetStatus('idle');
      setIsPasswordModalOpen(true);
    } else {
      // Instant direct login on click as per user requirement (automatic sign-in)
      onLoginSuccess(user);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      
      {/* Background Graphic Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row relative z-10 animate-fade-in duration-300">
        
        {/* Left Side: Hospital Branding & Active Status */}
        <div className="w-full md:w-[35%] bg-slate-950 text-white p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div className="space-y-6">
            {/* Hospital Logo block */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-2.5 rounded-lg text-white shadow-md">
                <Hospital className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-extrabold text-indigo-400 tracking-wider uppercase leading-none">Hệ thống Y khoa</div>
                <h2 className="text-sm font-black tracking-tight text-white mt-1 leading-none">HOSPITAL PORTAL</h2>
              </div>
            </div>

            <div className="h-px bg-slate-800 my-4" />

            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Đơn vị quản lý</span>
                <p className="text-xs font-black text-slate-200 mt-0.5">KHOA CẬN LÂM SÀNG & CHẨN ĐOÁN HÌNH ẢNH</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Nhiệm vụ trực tiếp</span>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-semibold">
                  Kê khai dữ liệu hiệu suất, tiếp nhận kế hoạch chuyển giao ban, đồng bộ biên bản hội ý điều hành y khoa bằng AI.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-6 md:pt-0">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thời gian hệ thống</span>
            </div>
            <div className="text-[11px] font-mono font-bold text-slate-300 bg-slate-900 border border-slate-800 p-2.5 rounded-lg shadow-inner text-center md:text-left">
              {currentTime || 'Đang đồng bộ...'}
            </div>
          </div>
        </div>

        {/* Right Side: Department Selection Grid with Instant Automated Login */}
        <div className="w-full md:w-[65%] p-6 sm:p-8 flex flex-col justify-between bg-white">
          <div className="space-y-5">
            <div className="text-center md:text-left space-y-1.5">
              <span className="text-[9px] bg-red-100 text-rose-700 px-2.5 py-1 rounded-full font-extrabold uppercase tracking-widest inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping shrink-0" />
                Hệ thống truy cập trực tiếp
              </span>
              <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">Đăng nhập khoa phòng trực ban</h1>
              <p className="text-xs text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 rounded-lg p-2.5 flex items-center gap-2">
                💡 Cổng truy cập tức thì: Chỉ cần nhấn vào hộp bộ phận hoặc biểu tượng phòng ban dưới đây để tự động đăng nhập nhanh mà không cần xác nhận.
              </p>
            </div>

            {/* Department grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {[...users]
                .sort((a, b) => {
                  if (a.role === 'admin' && b.role !== 'admin') return 1;
                  if (a.role !== 'admin' && b.role === 'admin') return -1;
                  return 0;
                })
                .map((user) => {
                  const isSelected = selectedUser.id === user.id;
                  const { icon, hoverColor, badge, activeBg } = getDeptIconAndStyle(user.role);

                  return (
                    <button
                      key={user.id}
                      id={`login-dept-card-${user.id}`}
                      onClick={() => handleSelectUser(user)}
                      className="border border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-400 hover:shadow-md active:scale-[0.99] rounded-xl p-3.5 cursor-pointer transition-all duration-200 flex flex-col items-start text-left gap-2.5 select-none w-full"
                    >
                      <div className="flex items-center gap-3 w-full min-w-0">
                        <div className="shrink-0 p-2 bg-slate-50 rounded-lg border border-slate-200 shadow-2xs">
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide inline-block">
                            {badge}
                          </span>
                          <h4 className="text-sm font-extrabold text-slate-900 tracking-tight leading-snug truncate">{user.departmentName}</h4>
                        </div>
                      </div>
                      
                      <div className="w-full pt-2 border-t border-slate-100 flex items-center justify-between gap-2 overflow-hidden mt-0.5">
                        <span className="text-[11px] text-slate-700 font-extrabold truncate">
                          {user.name}
                        </span>
                        {user.title && (
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-sans shrink-0">
                            {user.title}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 mt-6 leading-normal font-semibold">
            &copy; 2026 - Mạng lưới Kỹ thuật số Trung tâm Bệnh viện Đa Khoa Quốc Tế.
            <br />
            Phần mềm phân hiệu cận lâm sàng hỗ trợ chỉ danh kỹ thuật tự động.
          </div>
        </div>
      </div>

      {/* Password Verification Modal Overlay */}
      {isPasswordModalOpen && targetUserForLogin && (
        <div 
          id="password-login-modal" 
          onClick={() => {
            setIsPasswordModalOpen(false);
            setTargetUserForLogin(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2 bg-indigo-50 text-indigo-650 rounded-lg shrink-0 border border-indigo-100">
                <Lock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">Yêu cầu bảo mật</h3>
                <p className="text-[10px] text-indigo-600 font-bold leading-normal truncate">{targetUserForLogin.departmentName}</p>
              </div>
            </div>

            <div className="space-y-1.5 text-slate-700 text-xs leading-normal font-medium">
              <p>
                Đăng nhập tài khoản kíp trực: <strong className="text-slate-900 font-extrabold">{targetUserForLogin.name}</strong>
              </p>
              <p className="text-[10.5px] text-slate-500 font-semibold leading-normal">
                Tài khoản này đã cấu hình mật khẩu làm việc. Vui lòng cung cấp mật khẩu để tiếp tục truy cập.
              </p>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (enteredPassword === targetUserForLogin.password) {
                  setIsPasswordModalOpen(false);
                  onLoginSuccess(targetUserForLogin);
                } else {
                  setPasswordError('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
                }
              }}
              className="space-y-3.5"
            >
              <div className="space-y-1 text-left">
                <label className="text-[9.5px] font-black uppercase text-slate-400 block tracking-wider">Mật khẩu làm việc:</label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu..."
                  value={enteredPassword}
                  onChange={(e) => {
                    setEnteredPassword(e.target.value);
                    setPasswordError('');
                  }}
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-250 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-[10px] text-rose-600 font-bold mt-1 inline-flex items-center gap-1">
                    <span>⚠️ {passwordError}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setTargetUserForLogin(null);
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg cursor-pointer transition select-none text-center"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] rounded-lg cursor-pointer transition active:scale-98 shadow-3xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Đăng nhập
                </button>
              </div>
            </form>

            <div className="border-t border-slate-150 pt-3 text-left">
              {resetStatus === 'idle' && (
                <button
                  type="button"
                  onClick={async () => {
                    setResetStatus('loading');
                    try {
                      const res = await fetch('/api/users/request-reset', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: targetUserForLogin.id })
                      });
                      if (res.ok) {
                        setResetStatus('success');
                      } else {
                        setResetStatus('error');
                      }
                    } catch {
                      setResetStatus('error');
                    }
                  }}
                  className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition decoration-dotted hover:underline cursor-pointer"
                >
                  <span>🔑 Quên mật khẩu? Gửi yêu cầu reset tới Admin</span>
                </button>
              )}

              {resetStatus === 'loading' && (
                <span className="text-[10px] font-semibold text-slate-400">Đang chỉ điểm yêu cầu reset...</span>
              )}

              {resetStatus === 'success' && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-150 p-2.5 rounded-lg text-[10px] font-bold leading-normal">
                  ✔️ Đã gửi chỉ thị reset tới Admin thành công! Vui lòng báo Giáo ban/Trưởng khoa gỡ mật khẩu cho bạn.
                </div>
              )}

              {resetStatus === 'error' && (
                <div className="bg-rose-50 text-rose-800 border border-rose-150 p-2.5 rounded-lg text-[10px] font-bold leading-normal">
                  ⚠️ Không thể truyền chỉ thị tới Admin tự động. Vui lòng phản ánh trực tiếp với Trưởng khoa Giao ban.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
