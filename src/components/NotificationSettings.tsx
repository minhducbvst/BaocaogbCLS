import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  X, 
  Send, 
  Info,
  Calendar,
  ClipboardList,
  AlertCircle
} from 'lucide-react';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulate: (type: 'meeting' | 'task' | 'update') => void;
  isSimulating: boolean;
}

export interface UserNotificationPreferences {
  meetingReminders: boolean;
  newTasks: boolean;
  managementUpdates: boolean;
  reportApprovals: boolean;
  browserPush: boolean;
  soundEnabled: boolean;
}

export const defaultPreferences: UserNotificationPreferences = {
  meetingReminders: true,
  newTasks: true,
  managementUpdates: true,
  reportApprovals: true,
  browserPush: false,
  soundEnabled: true
};

export const playMedicalChime = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // First high-register chime note
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    gain1.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
    
    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.35);
    
    // Second note slightly delayed for diagnostic tone feel
    setTimeout(() => {
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(698.46, audioCtx.currentTime); // F5
      gain2.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
      
      osc2.start(audioCtx.currentTime);
      osc2.stop(audioCtx.currentTime + 0.45);
    }, 110);
    
  } catch (err) {
    console.warn("Medical voice/audio synthesis blocked or unsupported:", err);
  }
};

export default function NotificationSettings({ 
  isOpen, 
  onClose,
  onSimulate,
  isSimulating
}: NotificationSettingsProps) {
  const [prefs, setPrefs] = useState<UserNotificationPreferences>(defaultPreferences);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  // Load preferences from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('user-notification-prefs');
    if (saved) {
      try {
        setPrefs(JSON.parse(saved));
      } catch (e) {
        console.warn("Error parsing preferences:", e);
      }
    }

    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const savePrefs = (newPrefs: UserNotificationPreferences) => {
    setPrefs(newPrefs);
    localStorage.setItem('user-notification-prefs', JSON.stringify(newPrefs));
  };

  const handleToggle = (key: keyof UserNotificationPreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    
    // Special check if enabling browser push
    if (key === 'browserPush' && !prefs.browserPush) {
      requestBrowserPermission(updated);
      return;
    }

    savePrefs(updated);
  };

  const requestBrowserPermission = async (currentPrefs: UserNotificationPreferences) => {
    if (!('Notification' in window)) {
      alert("Hệ thống thông báo đẩy (Web Notification API) không hoạt động trên trình duyệt hiện tại.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === 'granted') {
        savePrefs({ ...currentPrefs, browserPush: true });
        // Send immediate browser hello notification
        new Notification("Hệ thống Giao Ban Khoa", {
          body: "Bạn đã bật thành công thông báo đẩy trên trình duyệt!",
          icon: "/favicon.ico"
        });
      } else {
        savePrefs({ ...currentPrefs, browserPush: false });
      }
    } catch (e) {
      console.error("Error requesting permission", e);
    }
  };

  const handleTestSound = () => {
    playMedicalChime();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 overflow-hidden">
        {/* Dark Overlay with transition backdrop */}
        <div 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300" 
          onClick={onClose}
        />

        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="pointer-events-auto w-screen max-w-md transform transition-all duration-300 ease-in-out">
            <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl border-l border-slate-200">
              
              {/* Header */}
              <div className="bg-slate-900 px-4 py-5 sm:px-6 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-500/20 p-1.5 rounded border border-indigo-400/20 text-indigo-400">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold" id="slide-over-title">Cài đặt Nhận Thông Báo</h2>
                    <p className="text-[10px] text-slate-400">Tùy biến bộ lọc và phương thức thông báo đẩy</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-md text-slate-400 hover:text-white hover:bg-slate-800 p-1 transition"
                  onClick={onClose}
                >
                  <span className="sr-only">Đóng</span>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content body */}
              <div className="flex-1 px-4 py-5 sm:px-6 space-y-6">
                
                {/* Section 1: Types of notification */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                    <span className="text-xs font-extrabold text-slate-850 uppercase tracking-widest">Loại thông báo đẩy nhận</span>
                  </div>
                  
                  <div className="space-y-2.5">
                    
                    {/* Meeting Reminders */}
                    <div className="flex items-start justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/45 hover:bg-slate-50/90 transition">
                      <div className="flex items-start gap-2.5">
                        <Calendar className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                        <div>
                          <label className="text-[11px] font-bold text-slate-850 block cursor-pointer" htmlFor="meeting-reminder-toggle">
                            Nhắc nhở lịch họp giao thường kỳ
                          </label>
                          <span className="text-[10px] text-slate-500">Thông báo khi có lịch họp mới, nhắc nhở trước phiên giao ban 15 phút.</span>
                        </div>
                      </div>
                      <input
                        id="meeting-reminder-toggle"
                        type="checkbox"
                        checked={prefs.meetingReminders}
                        onChange={() => handleToggle('meetingReminders')}
                        className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer self-center"
                      />
                    </div>

                    {/* New Tasks */}
                    <div className="flex items-start justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/45 hover:bg-slate-50/90 transition">
                      <div className="flex items-start gap-2.5">
                        <ClipboardList className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <label className="text-[11px] font-bold text-slate-850 block cursor-pointer" htmlFor="new-tasks-toggle">
                            Nhiệm vụ mới hoặc bàn giao đột xuất
                          </label>
                          <span className="text-[10px] text-slate-500">Thông báo khi quản lý giao việc rà soát vật tư, nội kiểm thiết bị, hỗ trợ quá tải.</span>
                        </div>
                      </div>
                      <input
                        id="new-tasks-toggle"
                        type="checkbox"
                        checked={prefs.newTasks}
                        onChange={() => handleToggle('newTasks')}
                        className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer self-center"
                      />
                    </div>

                    {/* Management Updates */}
                    <div className="flex items-start justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/45 hover:bg-slate-50/90 transition">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <label className="text-[11px] font-bold text-slate-850 block cursor-pointer" htmlFor="management-updates-toggle">
                            Cập nhật quan trọng từ Ban Quản lý khoa
                          </label>
                          <span className="text-[10px] text-slate-500">Nhận các quyết định, điều chỉnh định mức vật tư y tế, thông tin khẩn từ Trưởng khoa.</span>
                        </div>
                      </div>
                      <input
                        id="management-updates-toggle"
                        type="checkbox"
                        checked={prefs.managementUpdates}
                        onChange={() => handleToggle('managementUpdates')}
                        className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer self-center"
                      />
                    </div>

                    {/* Report Approvals */}
                    <div className="flex items-start justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/45 hover:bg-slate-50/90 transition">
                      <div className="flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-cyan-600 mt-0.5 shrink-0" />
                        <div>
                          <label className="text-[11px] font-bold text-slate-850 block cursor-pointer" htmlFor="report-approvals-toggle">
                            Đồng bộ và phê duyệt số liệu kê khai
                          </label>
                          <span className="text-[10px] text-slate-500">Báo cáo chỉ số trực chuyên môn vừa được gửi lên hoặc được Trưởng khoa ký duyệt.</span>
                        </div>
                      </div>
                      <input
                        id="report-approvals-toggle"
                        type="checkbox"
                        checked={prefs.reportApprovals}
                        onChange={() => handleToggle('reportApprovals')}
                        className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer self-center"
                      />
                    </div>

                  </div>
                </div>

                {/* Section 2: Channels / Methods of notification */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                    <span className="text-xs font-extrabold text-slate-850 uppercase tracking-widest">Kênh & Tiện ích đẩy</span>
                  </div>

                  <div className="space-y-3">
                    
                    {/* Browser Native Notifications Toggle */}
                    <div className="p-3 bg-indigo-50/20 border border-indigo-100/50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="text-[11px] font-bold text-slate-850">Thông báo đẩy Trình duyệt (Push notification)</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={prefs.browserPush}
                          onChange={() => handleToggle('browserPush')}
                          className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Kích hoạt Web Push API để hệ thống gửi thông báo trực tiếp ra màn hình nền (desktop/điện thoại) cả khi tab chạy nền.
                      </p>
                      
                      <div className="pt-1.5 flex items-center justify-between text-[10px] border-t border-indigo-100/30">
                        <span className="text-slate-500 font-medium">Trạng thái quyền hệ thống:</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold uppercase ${
                            permissionStatus === 'granted' ? 'text-emerald-600' :
                            permissionStatus === 'denied' ? 'text-rose-600' : 'text-amber-600'
                          }`}>
                            {permissionStatus === 'granted' ? 'Đã cho phép' :
                             permissionStatus === 'denied' ? 'Bị từ chối' : 'Yêu cầu hành động'}
                          </span>
                          {permissionStatus !== 'granted' && (
                            <button
                              type="button"
                              onClick={() => requestBrowserPermission(prefs)}
                              className="text-[9px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2 py-0.5 rounded shadow-xs"
                            >
                              Yêu cầu cấp quyền
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sound Alert Toggle */}
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {prefs.soundEnabled ? <Volume2 className="w-4 h-4 text-slate-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                          <span className="text-[11px] font-bold text-slate-850">Âm thanh cảnh báo y khoa</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={prefs.soundEnabled}
                          onChange={() => handleToggle('soundEnabled')}
                          className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Phát tín hiệu âm thanh kép mượt mà chuẩn bệnh viện để cảnh báo nhanh khi có thông báo cấp bách tự động.
                      </p>
                      {prefs.soundEnabled && (
                        <button
                          type="button"
                          onClick={handleTestSound}
                          className="text-[9px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold px-2.5 py-0.5 rounded shadow-xs flex items-center gap-1 w-fit transition"
                        >
                          <Volume2 className="w-3 h-3 text-indigo-500" /> Nghe thử tín hiệu âm thanh
                        </button>
                      )}
                    </div>

                  </div>
                </div>

                {/* Section 3: Sandbox Simulation */}
                <div className="p-4 bg-slate-900 text-white rounded-lg border border-slate-850 space-y-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Trình giả lập trải nghiệm</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Nhấp vào các phím chức năng bên dưới để gửi lệnh bất đồng bộ đến máy chủ Express, thiết lập các thông báo thực tế và trực tiếp theo dõi hiệu ứng thông báo đẩy lập tức trên màn hình của bạn!
                  </p>
                  
                  <div className="grid grid-cols-1 gap-2 pt-1 font-sans">
                    <button
                      type="button"
                      disabled={isSimulating}
                      onClick={() => onSimulate('meeting')}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-700 text-white font-bold text-[10px] rounded transition shadow-xs cursor-pointer truncate"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Gửi thử: Nhắc nhở họp khoa
                    </button>

                    <button
                      type="button"
                      disabled={isSimulating}
                      onClick={() => onSimulate('task')}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:bg-slate-700 text-white font-bold text-[10px] rounded transition shadow-xs cursor-pointer truncate"
                    >
                      <ClipboardList className="w-3.5 h-3.5" /> Gửi thử: Phân công nhiệm vụ
                    </button>

                    <button
                      type="button"
                      disabled={isSimulating}
                      onClick={() => onSimulate('update')}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-slate-700 text-white font-bold text-[10px] rounded transition shadow-xs cursor-pointer truncate"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Gửi thử: Cập nhật chỉ đạo
                    </button>
                  </div>
                  
                  {isSimulating && (
                    <div className="text-[9px] text-center text-indigo-300 animate-pulse font-mono">
                      Đang đồng bộ lệnh giả sinh từ Server...
                    </div>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 p-4 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-slate-600">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  Hiệu lực tức thì
                </span>
                <span className="font-mono text-[9px] text-slate-400">UUID.NOTIF_v2.05</span>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
