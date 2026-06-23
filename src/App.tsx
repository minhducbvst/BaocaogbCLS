import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, DailyReport, Meeting, Notification as AppNotification, SystemSettings } from './types';
import { USERS, CATEGORIES, TEMPLATE_ITEMS } from './data';
import { formatDateToDDMMYYYY } from './utils/date';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ClinicalReportTable from './components/ClinicalReportTable';
import MeetingManager from './components/MeetingManager';
import SearchManager from './components/SearchManager';
import PersonnelManager from './components/PersonnelManager';
import WorkReportManager from './components/WorkReportManager';
import NotificationSettings, { defaultPreferences, playMedicalChime } from './components/NotificationSettings';
import NotificationToast from './components/NotificationToast';
import LoginScreen from './components/LoginScreen';
import { 
  Building2, 
  BarChart3, 
  Calendar, 
  ClipboardList, 
  BellRing, 
  AlertCircle, 
  Settings, 
  Info,
  CalendarCheck2,
  Search,
  Users,
  ShieldAlert,
  Lock,
  Unlock,
  Key,
  Sliders,
  Shield,
  Briefcase
} from 'lucide-react';

function getDefaultActiveDate() {
  const now = new Date();
  const hours = now.getHours();
  const targetDate = new Date();
  if (hours < 12) {
    targetDate.setDate(targetDate.getDate() - 1);
  }
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedUserId = localStorage.getItem('hospital-logged-in-user-id');
    if (savedUserId) {
      const found = USERS.find(u => u.id === savedUserId);
      if (found) return found;
    }
    return USERS[0];
  });
  
  const currentUserRef = useRef<User>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const savedUserId = localStorage.getItem('hospital-logged-in-user-id');
    return !!savedUserId;
  });
  const [users, setUsers] = useState<User[]>(USERS);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [procedures, setProcedures] = useState<any[]>(TEMPLATE_ITEMS);
  
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    themeColor: "#4f46e5",
    bannerPreset: "default",
    bannerUrl: "",
    logoPreset: "default",
    logoUrl: "",
    bgStyle: "clean-mint",
    systemTitle: "Giao Ban Khoa Cận Lâm Sàng",
    systemSubtitle: "Hệ thống báo cáo số liệu & Tự động hóa biên bản giao ban bằng AI"
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'report' | 'meetings' | 'search' | 'personnel' | 'work-reports'>('report');
  const [activeDate, setActiveDate] = useState<string>(getDefaultActiveDate); // Default to today/yesterday based on time of day
  const [selectedMeetingIdProp, setSelectedMeetingIdProp] = useState<string>('');
  
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('hospital-admin-authenticated') === 'true';
  });
  const [adminPasswordError, setAdminPasswordError] = useState('');
  const [adminSubTab, setAdminSubTab] = useState<'staff' | 'depts' | 'logs' | 'procedures' | 'printSettings' | 'themeSettings' | 'googleSheets'>('staff');
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [isSimulating, setIsSimulating] = useState(false);

  // Load all initial mock databases from the server
  const fetchAllData = async () => {
    setIsSyncing(true);
    setErrorBanner(null);
    try {
      const urls = [
        { name: 'reports', url: '/api/reports' },
        { name: 'meetings', url: '/api/meetings' },
        { name: 'notifications', url: '/api/notifications' },
        { name: 'users', url: '/api/users' },
        { name: 'settings', url: '/api/settings' },
        { name: 'procedures', url: '/api/procedures' }
      ];

      const responses = await Promise.all(urls.map(u => fetch(u.url)));

      // Check if any response is not ok
      for (let i = 0; i < responses.length; i++) {
        const res = responses[i];
        const urlItem = urls[i];
        if (!res.ok) {
          throw new Error(`Fetch failed for ${urlItem.url}: Status ${res.status} ${res.statusText}`);
        }
      }

      // Read responses as text first to handle JSON parsing cleanly
      const dataResults: any = {};
      for (let i = 0; i < responses.length; i++) {
        const res = responses[i];
        const urlItem = urls[i];
        const text = await res.text();
        try {
          dataResults[urlItem.name] = JSON.parse(text);
        } catch (e: any) {
          console.error(`JSON Parse error for ${urlItem.url}. Response text starts with:`, text.substring(0, 200));
          throw new Error(`Endpoint ${urlItem.url} returned invalid JSON instead of data. Header starts with: ${text.substring(0, 80)}`);
        }
      }

      const reportsData = dataResults.reports;
      const meetingsData = dataResults.meetings;
      const notificationsData = dataResults.notifications as AppNotification[];
      const usersData = dataResults.users;
      const settingsData = dataResults.settings;
      const proceduresData = dataResults.procedures;

      if (reportsData && meetingsData && notificationsData && usersData) {
        setReports(reportsData);
        setMeetings(meetingsData);
        setNotifications(notificationsData);
        setUsers(usersData);
        if (proceduresData) {
          setProcedures(proceduresData);
        }
        if (settingsData) {
          setSystemSettings(settingsData);
        }

        // Dynamic update of current user roles/name if edited in admin portal
        const latestUser = currentUserRef.current;
        if (latestUser) {
          const freshMe = usersData.find((u: User) => u.id === latestUser.id);
          if (freshMe) {
            const hasChanged = 
              freshMe.name !== latestUser.name ||
              freshMe.role !== latestUser.role ||
              freshMe.email !== latestUser.email ||
              freshMe.departmentName !== latestUser.departmentName ||
              freshMe.title !== latestUser.title ||
              freshMe.status !== latestUser.status ||
              freshMe.shiftCount !== latestUser.shiftCount;
              
            if (hasChanged) {
              setCurrentUser(freshMe);
            }
          }
        }

        // Process new incoming notifications to trigger pushes/toasts if appropriate
        if (notificationsData && notificationsData.length > 0) {
          setKnownIds(prevKnown => {
            // If prevKnown is empty, it means we are in the initial boot stage.
            // Under this scenario, we just populate the Set so we do not trigger annoying historic notifications.
            if (prevKnown.size === 0) {
              return new Set<string>(notificationsData.map(n => n.id));
            }

            // Find any notification that is NOT in prevKnown and is unread
            const newUnreadNotifs = notificationsData.filter(n => !prevKnown.has(n.id) && !n.read);
            
            if (newUnreadNotifs.length > 0) {
              // Load active preferences from localStorage
              let prefs = defaultPreferences;
              const saved = localStorage.getItem('user-notification-prefs');
              if (saved) {
                try { prefs = JSON.parse(saved); } catch (e) {}
              }

              // Filter based on user preferences
              const filteredNew = newUnreadNotifs.filter(n => {
                if (n.type === 'meeting' && !prefs.meetingReminders) return false;
                if (n.type === 'task' && !prefs.newTasks) return false;
                if (n.type === 'update' && !prefs.managementUpdates) return false;
                if (n.type === 'report' && !prefs.reportApprovals) return false;
                return true;
              });

              if (filteredNew.length > 0) {
                // Focus on the newest one to show as visual toast overlay
                const newest = filteredNew[0];
                setActiveToast(newest);

                // Play Medical Alert sound chime
                if (prefs.soundEnabled) {
                  playMedicalChime();
                }

                // Push Native Web Notification alert if enabled and granted
                if (prefs.browserPush && 'Notification' in window && Notification.permission === 'granted') {
                  try {
                    new Notification(newest.title, {
                      body: newest.content,
                      icon: '/favicon.ico'
                    });
                  } catch (err) {
                    console.warn("Could not dispatch browser native notification:", err);
                  }
                }
              }

              // Return updated Set
              const updatedSet = new Set(prevKnown);
              notificationsData.forEach(n => updatedSet.add(n.id));
              return updatedSet;
            }

            return prevKnown;
          });
        }
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setErrorBanner('Hệ thống dịch vụ đang tải hoặc mất kết nối mạng. Đang tự động kết nối lại...');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    // Poll updates every 10 seconds to simulate real-time synchronization
    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Sync administrative authentication state with sessionStorage
  useEffect(() => {
    sessionStorage.setItem('hospital-admin-authenticated', String(isAdminAuthenticated));
  }, [isAdminAuthenticated]);

  // Securely reset admin session when currentUser changed to non-admin
  useEffect(() => {
    if (currentUser.role !== 'admin') {
      setIsAdminAuthenticated(false);
      setAdminPassword('');
      setAdminPasswordError('');
    }
  }, [currentUser]);

  // Handle Save Report
  const handleSaveReport = async (updatedReport: DailyReport) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedReport)
      });
      if (res.ok) {
        await fetchAllData();
      } else {
        throw new Error('Không thể tải báo cáo số liệu lên hệ thống.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorBanner(err.message || 'Sự cố kết nối mạng.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Approve Report
  const handleApproveReport = async (date: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/reports/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, approvedBy: currentUser.name })
      });
      if (res.ok) {
        await fetchAllData();
      } else {
        throw new Error('Không thể phê duyệt báo cáo.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorBanner(err.message || 'Sự cố phê duyệt số liệu.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Bulk Save / Import Reports from Excel
  const handleBulkSaveReports = async (importedReports: DailyReport[]) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/reports/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports: importedReports, approvedBy: currentUser.name })
      });
      if (res.ok) {
        await fetchAllData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Không thể tải hàng loạt báo cáo lên hệ thống.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorBanner(err.message || 'Sự cố nhập dữ liệu hàng loạt.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddProcedure = async (proc: { name: string; category: string }) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/procedures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          procedure: proc, 
          actorName: currentUser.name 
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.procedures) {
          setProcedures(data.procedures);
        }
        await fetchAllData();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Không thể thêm dịch vụ kỹ thuật.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorBanner(err.message || 'Sự cố kết nối mạng.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteProcedure = async (id: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/procedures/${id}?actorName=${encodeURIComponent(currentUser.name)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.procedures) {
          setProcedures(data.procedures);
        }
        await fetchAllData();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Không thể xóa dịch vụ kỹ thuật.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorBanner(err.message || 'Sự cố kết nối mạng.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Update Theme Settings
  const handleUpdateSettings = async (newSettings: Partial<SystemSettings>) => {
    // 1. Optimistic update (giao diện thay đổi tức thì)
    setSystemSettings(prev => ({
      ...prev,
      ...newSettings
    }));

    setIsSyncing(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          setSystemSettings(data.settings);
        }
      } else {
        throw new Error('Sự cố lưu cài đặt giao diện.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorBanner(err.message || 'Không thể đồng bộ cài đặt.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Save/Submit Meeting details (agenda & notes)
  const handleSaveMeeting = async (meetingUpdates: Meeting) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting: meetingUpdates, user: currentUser })
      });
      if (res.ok) {
        await fetchAllData();
      } else {
        throw new Error('Sự cố lưu lịch họp.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorBanner(err.message || 'Không thể đồng bộ cuộc họp.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Delete Meeting with role tracking
  const handleDeleteMeeting = async (meetingId: string) => {
    setIsSyncing(true);
    try {
      const url = `/api/meetings/${meetingId}?userId=${encodeURIComponent(currentUser.id)}&userName=${encodeURIComponent(currentUser.name)}`;
      const res = await fetch(url, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchAllData();
      } else {
        throw new Error('Sự cố xóa lịch họp.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorBanner(err.message || 'Không thể xóa cuộc họp.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger Gemini AI minute generator from Express
  const handleGenerateAIExtract = async (meetingId: string, notes: string, dateMetrics?: any): Promise<string> => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/gemini/generate-minutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, notes, dateMetrics })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchAllData();
        return data.minutes;
      } else {
        throw new Error('Sự cố kết nối máy chủ AI Gemini.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorBanner('Không thể liên hệ Trí tuệ nhân tạo (Gemini). Hãy thử lại trong giây lát.');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Notifications read handlers
  const handleMarkNotificationAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateNotification = async (type: 'meeting' | 'task' | 'update') => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/notifications/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      if (res.ok) {
        // Fetch fresh data immediately to trigger our change-detection block
        await fetchAllData();
      } else {
        throw new Error('Sự cố giao tiếp kênh giả lập thông báo đẩy.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorBanner(err.message || 'Không thể liên hệ máy chủ giả lập.');
    } finally {
      setIsSimulating(false);
    }
  };

  const activeDateFormatted = useMemo(() => {
    if (!activeDate) return 'N/A';
    try {
      const parsed = new Date(activeDate);
      if (isNaN(parsed.getTime())) return activeDate;
      return parsed.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return activeDate;
    }
  }, [activeDate]);

  const handleNavigateToReport = (date: string) => {
    setActiveDate(date);
    setActiveTab('report');
  };

  const handleNavigateToMeeting = (meetingId: string) => {
    setSelectedMeetingIdProp(meetingId);
    setActiveTab('meetings');
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem('hospital-logged-in-user-id', user.id);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsAdminAuthenticated(false);
    localStorage.removeItem('hospital-logged-in-user-id');
    sessionStorage.removeItem('hospital-admin-authenticated');
  };

  const bgClass = useMemo(() => {
    switch (systemSettings.bgStyle) {
      default:
      case 'default': return 'bg-slate-50 text-slate-900';
      case 'elegant': return 'bg-[#faf8f5] text-slate-900';
      case 'modern-blue': return 'bg-slate-50/70 text-slate-900';
      case 'clean-mint': return 'bg-[#f4fcf9] text-slate-900';
      case 'warm-wood': return 'bg-[#fcfaf7] text-slate-900';
      case 'soft-slate': return 'bg-slate-100/80 text-slate-900';
      case 'cyberpunk': return 'bg-[#0f111a] text-slate-100';
      case 'dark-slate': return 'bg-[#0b0f19] text-slate-100';
    }
  }, [systemSettings.bgStyle]);

  if (!isLoggedIn) {
    return (
      <LoginScreen onLoginSuccess={handleLoginSuccess} initialUser={currentUser} users={users} />
    );
  }

  return (
    <div className={`min-h-screen ${bgClass} font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-300 pb-12`}>
      <style>{`
        :root {
          --theme-color: ${systemSettings.themeColor};
          --theme-color-10: ${systemSettings.themeColor}1a;
          --theme-color-20: ${systemSettings.themeColor}33;
          --theme-color-80: ${systemSettings.themeColor}cc;
          
          /* Cấu hình các biến thích ứng theo giao diện được chọn */
          --card-bg: ${
            systemSettings.bgStyle === 'cyberpunk' ? '#141622' :
            systemSettings.bgStyle === 'dark-slate' ? '#101524' :
            systemSettings.bgStyle === 'elegant' ? '#fffdfb' :
            systemSettings.bgStyle === 'clean-mint' ? '#fafffd' :
            systemSettings.bgStyle === 'warm-wood' ? '#fffcf6' :
            systemSettings.bgStyle === 'modern-blue' ? '#fbfcfe' :
            systemSettings.bgStyle === 'soft-slate' ? '#f8fafc' :
            '#ffffff'
          };
          --card-border: ${
            systemSettings.bgStyle === 'cyberpunk' ? 'rgba(244,63,94,0.15)' :
            systemSettings.bgStyle === 'dark-slate' ? '#1e293b' :
            systemSettings.bgStyle === 'elegant' ? '#ebe4d5' :
            systemSettings.bgStyle === 'clean-mint' ? '#d0ebd7' :
            systemSettings.bgStyle === 'warm-wood' ? '#eddcc9' :
            systemSettings.bgStyle === 'modern-blue' ? '#dbeafe' :
            systemSettings.bgStyle === 'soft-slate' ? '#cbd5e1' :
            '#e2e8f0'
          };
          --text-primary: ${
            (systemSettings.bgStyle === 'cyberpunk' || systemSettings.bgStyle === 'dark-slate') ? '#f8fafc' : '#0f172a'
          };
          --text-muted: ${
            (systemSettings.bgStyle === 'cyberpunk' || systemSettings.bgStyle === 'dark-slate') ? '#94a3b8' : '#475569'
          };
          --tab-bar-bg: ${
            systemSettings.bgStyle === 'cyberpunk' ? '#10121d' :
            systemSettings.bgStyle === 'dark-slate' ? '#0d101a' :
            systemSettings.bgStyle === 'elegant' ? '#f5f0e6' :
            systemSettings.bgStyle === 'clean-mint' ? '#e2f3ec' :
            systemSettings.bgStyle === 'warm-wood' ? '#f5ede0' :
            systemSettings.bgStyle === 'modern-blue' ? '#eff6ff' :
            systemSettings.bgStyle === 'soft-slate' ? '#e2e8f0' :
            '#f1f5f9'
          };
        }
        
        /* Tiện ích lớp thích ứng động */
        .adaptive-card {
          background-color: var(--card-bg) !important;
          border-color: var(--card-border) !important;
          color: var(--text-primary) !important;
          transition: all 0.3s ease;
        }
        .adaptive-text {
          color: var(--text-primary) !important;
        }
        .adaptive-text-muted {
          color: var(--text-muted) !important;
        }
        .adaptive-border {
          border-color: var(--card-border) !important;
        }
        .adaptive-tab-bar {
          background-color: var(--tab-bar-bg) !important;
          border-color: var(--card-border) !important;
          transition: all 0.3s ease;
        }

        @keyframes pulse-subtle {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 4px 14px 0px ${systemSettings.themeColor}aa, 0 0 10px ${systemSettings.themeColor}33;
          }
          50% {
            transform: scale(1.03);
            box-shadow: 0 8px 24px 2px ${systemSettings.themeColor}, 0 0 20px ${systemSettings.themeColor}aa;
          }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .theme-text {
          color: ${systemSettings.themeColor} !important;
        }
        .theme-bg {
          background-color: ${systemSettings.themeColor} !important;
        }
        .theme-border {
          border-color: ${systemSettings.themeColor}33 !important;
        }
        .theme-btn-primary {
          background-color: ${systemSettings.themeColor} !important;
          color: white !important;
          transition: all 0.2s ease-in-out;
        }
        .theme-btn-primary:hover {
          opacity: 0.92;
          box-shadow: 0 4px 12px ${systemSettings.themeColor}33;
        }
        .theme-bg-soft {
          background-color: ${systemSettings.themeColor}0d !important;
        }
        .theme-accent-border:focus-within {
          border-color: ${systemSettings.themeColor} !important;
          box-shadow: 0 0 0 2px ${systemSettings.themeColor}22 !important;
        }
        /* Muted beautiful borders to reduce high contrast and professional look */
        .border-slate-200 {
          border-color: var(--card-border) !important;
        }
        .border-slate-150 {
          border-color: var(--card-border) !important;
        }
        .border-slate-205 {
          border-color: var(--card-border) !important;
        }
      `}</style>
      
      {/* Real-time Express backend sync and Gemini configuration header */}
      <Header
        currentUser={currentUser}
        users={users}
        onUserChange={setCurrentUser}
        notifications={notifications}
        onMarkNotificationAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        isSyncing={isSyncing}
        onRefresh={fetchAllData}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        systemSettings={systemSettings}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">

        {/* Dynamic Alert and connection checks */}
        {errorBanner && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-md p-3 shadow-sm animate-pulse flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <div className="text-[11px] font-bold">
                {errorBanner}
              </div>
            </div>
            <button onClick={() => setErrorBanner(null)} className="text-[10px] text-rose-500 hover:text-rose-700 bg-white border border-rose-200 rounded px-1.5 py-0.5 font-bold">Bỏ qua</button>
          </div>
        )}

        {/* App Greeting Banner with Active Date parameters - High Density */}
        <div 
          className="text-white rounded-xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden border border-slate-800/20 transition-all duration-300"
          style={{
            backgroundImage: systemSettings.bannerPreset === 'custom' && systemSettings.bannerUrl 
              ? `url(${systemSettings.bannerUrl})` 
              : systemSettings.bannerPreset === 'medical'
              ? `linear-gradient(135deg, ${systemSettings.themeColor}dd, #101827)`
              : systemSettings.bannerPreset === 'modern'
              ? `linear-gradient(135deg, ${systemSettings.themeColor}, #1e1b4b)`
              : systemSettings.bannerPreset === 'geometric'
              ? `linear-gradient(135deg, #111827, ${systemSettings.themeColor}aa)`
              : `linear-gradient(135deg, #090d16, ${systemSettings.themeColor}bb, #111827)`, // Default classy gradient
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="space-y-1 relative z-10 max-w-2xl">
            <div className="flex items-center gap-1.5 text-[10px] text-indigo-300 font-bold tracking-wider uppercase">
              <Building2 className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              Hệ thống hành chính Bệnh Viện Đa Khoa
            </div>
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
              {systemSettings.systemTitle}
            </h2>
            <p className="text-[11px] text-slate-305 leading-normal opacity-90 max-w-xl">
              {systemSettings.systemSubtitle}
            </p>
          </div>
          
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 shrink-0 shadow-inner text-right z-10 flex flex-col items-end gap-1 min-w-[180px]">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ngày xem giao ban</span>
            <span className="text-xs font-mono font-bold text-white bg-slate-950 border border-slate-800/60 px-2 py-0.5 rounded">
              {formatDateToDDMMYYYY(activeDate)}
            </span>
            <span className="text-indigo-300 text-[10px] font-bold leading-none mt-0.5">{activeDateFormatted}</span>
          </div>

          {/* Background Ambient Aesthetics */}
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 translate-y-12 w-48 h-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        </div>

        {/* Tab Controls Navigation bar - High Density */}
        <div className="flex items-center space-x-1 adaptive-tab-bar border p-1 rounded-lg w-fit shadow-xs transition-all duration-300">
          <button
            onClick={() => setActiveTab('report')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition duration-150 cursor-pointer select-none ${
              activeTab === 'report' ? 'shadow-sm text-white font-extrabold' : 'adaptive-text-muted hover:text-slate-900 hover:bg-slate-200/30'
            }`}
            style={activeTab === 'report' ? { backgroundColor: systemSettings.themeColor } : {}}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Kê khai & Phê duyệt số liệu
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition duration-150 cursor-pointer select-none ${
              activeTab === 'dashboard' ? 'shadow-sm text-white font-extrabold' : 'adaptive-text-muted hover:text-slate-900 hover:bg-slate-200/30'
            }`}
            style={activeTab === 'dashboard' ? { backgroundColor: systemSettings.themeColor } : {}}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Thống kê & Chỉ số
          </button>
          
          <button
            onClick={() => setActiveTab('meetings')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition duration-150 cursor-pointer select-none ${
              activeTab === 'meetings' ? 'shadow-sm text-white font-extrabold' : 'adaptive-text-muted hover:text-slate-900 hover:bg-slate-200/30'
            }`}
            style={activeTab === 'meetings' ? { backgroundColor: systemSettings.themeColor } : {}}
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            Hội họp & Biên bản AI ✨
          </button>

          <button
            onClick={() => setActiveTab('work-reports')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition duration-150 cursor-pointer select-none ${
              activeTab === 'work-reports' ? 'shadow-sm text-white font-extrabold' : 'adaptive-text-muted hover:text-slate-900 hover:bg-slate-200/30'
            }`}
            style={activeTab === 'work-reports' ? { backgroundColor: systemSettings.themeColor } : {}}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Báo cáo & Chỉ đạo công việc 📋
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition duration-150 cursor-pointer select-none ${
              activeTab === 'search' ? 'shadow-sm text-white font-extrabold' : 'adaptive-text-muted hover:text-slate-900 hover:bg-slate-200/30'
            }`}
            style={activeTab === 'search' ? { backgroundColor: systemSettings.themeColor } : {}}
          >
            <Search className="w-3.5 h-3.5" />
            Tìm kiếm nâng cao 🔍
          </button>

          {/* Menu Admin */}
          {currentUser.role === 'admin' && (
            <button
              onClick={() => {
                setActiveTab('personnel');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition duration-150 cursor-pointer select-none ${
                activeTab === 'personnel' ? 'shadow-sm text-white font-extrabold' : 'adaptive-text-muted hover:text-slate-900 hover:bg-slate-200/30'
              }`}
              style={activeTab === 'personnel' ? { backgroundColor: systemSettings.themeColor } : {}}
            >
              <Sliders className="w-3.5 h-3.5" />
              Admin ⚙️
            </button>
          )}
        </div>

        {/* Tab Content Display */}
        <div className="tab-container animate-fade-in duration-200">
          {activeTab === 'dashboard' && (
            <Dashboard reports={reports} procedures={procedures} />
          )}

          {activeTab === 'report' && (
            <ClinicalReportTable
              reports={reports}
              activeDate={activeDate}
              setActiveDate={setActiveDate}
              currentUser={currentUser}
              onSaveReport={handleSaveReport}
              onApproveReport={handleApproveReport}
              onBulkSaveReports={handleBulkSaveReports}
              procedures={procedures}
              onRefreshData={fetchAllData}
            />
          )}

          {activeTab === 'meetings' && (
            <MeetingManager
              meetings={meetings}
              reports={reports}
              currentUser={currentUser}
              onSaveMeeting={handleSaveMeeting}
              onGenerateAIExtract={handleGenerateAIExtract}
              onDeleteMeeting={handleDeleteMeeting}
              selectedMeetingIdProp={selectedMeetingIdProp}
            />
          )}

          {activeTab === 'work-reports' && (
            <WorkReportManager
              currentUser={currentUser}
              systemSettings={systemSettings}
            />
          )}

          {activeTab === 'search' && (
            <SearchManager
              reports={reports}
              meetings={meetings}
              currentUser={currentUser}
              onNavigateToReport={handleNavigateToReport}
              onNavigateToMeeting={handleNavigateToMeeting}
            />
          )}

          {activeTab === 'personnel' && currentUser.role !== 'admin' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-8 max-w-md mx-auto text-center space-y-5 animate-fade-in my-8">
              <div className="w-16 h-16 bg-red-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-100 shadow-3xs">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-slate-850 uppercase tracking-wider">Từ chối truy cập Phân hệ</h3>
                <p className="text-[11.5px] text-slate-500 leading-relaxed font-semibold">
                  Khu vực Quản trị & Cơ cấu Phòng ban Nhân sự chỉ dành riêng cho tài khoản có vai trò <strong>Quản trị viên (Admin)</strong>.
                </p>
                <div className="text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 font-medium font-semibold">
                  Tài khoản hiện tại: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.departmentName || 'Chưa rõ Chuyên khoa'})
                </div>
              </div>
              
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] rounded-lg cursor-pointer transition active:scale-98 shadow-4xs"
                >
                  Quay lại Thống kê & Chỉ số
                </button>
              </div>
            </div>
          )}

          {activeTab === 'personnel' && currentUser.role === 'admin' && (
            <div className="space-y-4 animate-fade-in">
              <PersonnelManager
                currentUser={currentUser}
                initialSubTab={adminSubTab}
                onRefresh={fetchAllData}
                systemSettings={systemSettings}
                onUpdateSettings={handleUpdateSettings}
                procedures={procedures}
                onAddProcedure={handleAddProcedure}
                onDeleteProcedure={handleDeleteProcedure}
              />
            </div>
          )}
        </div>

      </div>

      {/* Footer credits and information */}
      <footer className="bg-white border-t border-slate-205 mt-12 py-6 text-center text-slate-500 text-[11px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-1.5">
          <p className="font-bold text-slate-700">Ứng dụng Giao ban khoa Cận lâm sàng & Tự động hóa y khoa</p>
          <div className="flex items-center justify-center gap-4 text-[10px]">
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3 text-slate-400" />
              Công nghệ Gemini-3.5-Flash
            </span>
            <span className="text-slate-205">|</span>
            <span>Bảo mật nội bộ bệnh viện cấp độ 2</span>
            <span className="text-slate-205">|</span>
            <span>Phiên bản v2.05-Release</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-2">&copy; 2026 Sở Y Tế - Phát triển và lập trình bởi Đội Ngũ Công Nghệ Thông Tin Trung Tâm</p>
        </div>
      </footer>

      {/* Push Notifications Preference Center Drawer */}
      <NotificationSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSimulate={handleSimulateNotification}
        isSimulating={isSimulating}
      />

      {/* Real-time Floating Push Notification Toast Alert */}
      <NotificationToast
        notification={activeToast}
        onClose={() => setActiveToast(null)}
        onRead={handleMarkNotificationAsRead}
      />
    </div>
  );
}
