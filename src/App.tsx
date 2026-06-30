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
  const [departments, setDepartments] = useState<any[]>([]);
  
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    themeColor: "#0284c7",
    bannerPreset: "medical",
    bannerUrl: "",
    logoPreset: "default",
    logoUrl: "",
    bgStyle: "modern-blue",
    systemTitle: "Giao Ban Khoa Cận Lâm Sàng",
    systemSubtitle: "Hệ thống báo cáo số liệu & Tự động hóa biên bản giao ban bằng AI",
    autoSyncEnabled: false,
    autoSyncTime: "12:00",
    googleSpreadsheetUrl: "https://docs.google.com/spreadsheets/d/1n7yQQmninnDTVNtIZqCzUEiAI1jRHSj4VTr7pVs3KMM/edit?usp=sharing",
    googleAccessToken: "",
    googleApiKey: "",
    googleRefreshToken: "",
    googleClientId: "1067215171120-g7a7fge4vbe050m3oabm896v1k6g6m2f.apps.googleusercontent.com",
    googleClientSecret: "",
    telegramBotToken: "",
    telegramChatId: "",
    bannerStyle: "cover",
    bannerPosition: "center",
    bannerOverlayOpacity: 0.7,
    bannerRepeat: "no-repeat"
  });

  const [previewSettings, setPreviewSettings] = useState<SystemSettings | null>(null);
  const effectiveSettings = previewSettings || systemSettings;

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
    try {
      const res = await fetch('/api/all-data');
      if (!res.ok) {
        if (res.status === 429) {
          console.warn("Rate limit (429) hit for /api/all-data. Falling back to cached state.");
          return;
        }
        throw new Error(`Fetch failed: Status ${res.status}`);
      }
      const data = await res.json();

      const reportsData = data.reports;
      const meetingsData = data.meetings;
      const notificationsData = data.notifications as AppNotification[] | undefined;
      const usersData = data.users;
      const departmentsData = data.departments;
      const settingsData = data.settings;
      const proceduresData = data.procedures;

      // Update state with any successfully fetched data
      if (reportsData !== undefined) setReports(reportsData);
      if (meetingsData !== undefined) setMeetings(meetingsData);
      if (notificationsData !== undefined) setNotifications(notificationsData);
      if (usersData !== undefined) setUsers(usersData);
      if (departmentsData !== undefined) setDepartments(departmentsData);
      if (proceduresData !== undefined) setProcedures(proceduresData);
      if (settingsData !== undefined) setSystemSettings(settingsData);

      // If we got the critical datasets successfully (or have cached ones), clear error banner
      if (reportsData !== undefined || reports.length > 0) {
        setErrorBanner(null);
      }

      const actualUsers = usersData !== undefined ? usersData : users;
      if (actualUsers) {
        // Dynamic update of current user roles/name if edited in admin portal
        const latestUser = currentUserRef.current;
        if (latestUser) {
          const freshMe = actualUsers.find((u: User) => u.id === latestUser.id);
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

  // Centralized Google OAuth parsing & Restore OAuth tab/subtab location across page reloads
  useEffect(() => {
    let hasParsedToken = false;
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const token = params.get('access_token');
      if (token) {
        hasParsedToken = true;
        // Save locally
        localStorage.setItem('google_access_token', token);
        
        // Save to server
        handleUpdateSettings({ googleAccessToken: token });

        // Retrieve restore targets
        const restoreTab = localStorage.getItem('oauth_restore_tab');
        const restoreSubTab = localStorage.getItem('oauth_restore_subtab');
        if (restoreTab) {
          setActiveTab(restoreTab as any);
          localStorage.removeItem('oauth_restore_tab');
          
          if (restoreTab === 'personnel') {
            localStorage.setItem('oauth_personnel_success', 'true');
          } else if (restoreTab === 'report') {
            localStorage.setItem('oauth_open_sheets_modal', 'true');
            localStorage.setItem('oauth_report_success', 'true');
          }
        }
        if (restoreSubTab) {
          setAdminSubTab(restoreSubTab as any);
          localStorage.removeItem('oauth_restore_subtab');
        }

        // Clear hash from address bar
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }

    if (!hasParsedToken) {
      // Standard restore if we reload without a hash (e.g. error or manual navigation back)
      const restoreTab = localStorage.getItem('oauth_restore_tab');
      const restoreSubTab = localStorage.getItem('oauth_restore_subtab');
      if (restoreTab) {
        setActiveTab(restoreTab as any);
        localStorage.removeItem('oauth_restore_tab');
      }
      if (restoreSubTab) {
        setAdminSubTab(restoreSubTab as any);
        localStorage.removeItem('oauth_restore_subtab');
      }
    }
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

  // Handle Delete Report
  const handleDeleteReport = async (date: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/reports/${date}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        await fetchAllData();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Không thể xóa báo cáo số liệu.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorBanner(err.message || 'Sự cố xóa dữ liệu.');
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

  const handleReorderProcedures = async (procedureIds: string[]) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/procedures/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedureIds,
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
        throw new Error(errData.error || 'Không thể sắp xếp lại dịch vụ kỹ thuật.');
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
    switch (effectiveSettings.bgStyle) {
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
  }, [effectiveSettings.bgStyle]);

  if (!isLoggedIn) {
    return (
      <LoginScreen onLoginSuccess={handleLoginSuccess} initialUser={currentUser} users={users} departments={departments} />
    );
  }

  return (
    <div className={`min-h-screen ${bgClass} font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-300 pb-12`}>
      <style>{`
        :root {
          --theme-color: ${effectiveSettings.themeColor};
          --theme-color-10: ${effectiveSettings.themeColor}1a;
          --theme-color-20: ${effectiveSettings.themeColor}33;
          --theme-color-80: ${effectiveSettings.themeColor}cc;
          
          /* Cấu hình các biến thích ứng theo giao diện được chọn */
          --card-bg: ${
            effectiveSettings.bgStyle === 'cyberpunk' ? '#141622' :
            effectiveSettings.bgStyle === 'dark-slate' ? '#101524' :
            effectiveSettings.bgStyle === 'elegant' ? '#fffdfb' :
            effectiveSettings.bgStyle === 'clean-mint' ? '#fafffd' :
            effectiveSettings.bgStyle === 'warm-wood' ? '#fffcf6' :
            effectiveSettings.bgStyle === 'modern-blue' ? '#fbfcfe' :
            effectiveSettings.bgStyle === 'soft-slate' ? '#f8fafc' :
            '#ffffff'
          };
          --card-border: ${
            effectiveSettings.bgStyle === 'cyberpunk' ? 'rgba(244,63,94,0.15)' :
            effectiveSettings.bgStyle === 'dark-slate' ? '#1e293b' :
            effectiveSettings.bgStyle === 'elegant' ? '#ebe4d5' :
            effectiveSettings.bgStyle === 'clean-mint' ? '#d0ebd7' :
            effectiveSettings.bgStyle === 'warm-wood' ? '#eddcc9' :
            effectiveSettings.bgStyle === 'modern-blue' ? '#dbeafe' :
            effectiveSettings.bgStyle === 'soft-slate' ? '#cbd5e1' :
            '#e2e8f0'
          };
          --text-primary: ${
            (effectiveSettings.bgStyle === 'cyberpunk' || effectiveSettings.bgStyle === 'dark-slate') ? '#f8fafc' : '#0f172a'
          };
          --text-muted: ${
            (effectiveSettings.bgStyle === 'cyberpunk' || effectiveSettings.bgStyle === 'dark-slate') ? '#94a3b8' : '#475569'
          };
          --tab-bar-bg: ${
            effectiveSettings.bgStyle === 'cyberpunk' ? '#10121d' :
            effectiveSettings.bgStyle === 'dark-slate' ? '#0d101a' :
            effectiveSettings.bgStyle === 'elegant' ? '#f5f0e6' :
            effectiveSettings.bgStyle === 'clean-mint' ? '#e2f3ec' :
            effectiveSettings.bgStyle === 'warm-wood' ? '#f5ede0' :
            effectiveSettings.bgStyle === 'modern-blue' ? '#eff6ff' :
            effectiveSettings.bgStyle === 'soft-slate' ? '#e2e8f0' :
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
            box-shadow: 0 4px 14px 0px ${effectiveSettings.themeColor}aa, 0 0 10px ${effectiveSettings.themeColor}33;
          }
          50% {
            transform: scale(1.03);
            box-shadow: 0 8px 24px 2px ${effectiveSettings.themeColor}, 0 0 20px ${effectiveSettings.themeColor}aa;
          }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        @keyframes heartbeat {
          0% {
            stroke-dashoffset: 1600;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        .animate-heartbeat {
          animation: heartbeat 24s linear infinite;
        }

        @keyframes radar-sweep {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .animate-radar-scan {
          animation: radar-sweep 25s linear infinite;
          transform-origin: center;
        }

        @keyframes dna-bounce {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(5deg);
          }
        }
        .animate-dna-float {
          animation: dna-bounce 8s ease-in-out infinite;
        }

        @keyframes wave-move {
          0% {
            transform: translateX(0) scaleY(1);
          }
          50% {
            transform: translateX(-15%) scaleY(1.05);
          }
          100% {
            transform: translateX(0) scaleY(1);
          }
        }
        .animate-wave-flow {
          animation: wave-move 12s ease-in-out infinite;
        }

        /* Highly realistic 3D Rotating DNA Helix animations */
        @keyframes dna-node-a {
          0%, 100% {
            transform: translateY(-26px) scale(1.1);
            opacity: 1;
            z-index: 20;
          }
          50% {
            transform: translateY(26px) scale(0.6);
            opacity: 0.3;
            z-index: 1;
          }
        }
        @keyframes dna-node-b {
          0%, 100% {
            transform: translateY(26px) scale(0.6);
            opacity: 0.3;
            z-index: 1;
          }
          50% {
            transform: translateY(-26px) scale(1.1);
            opacity: 1;
            z-index: 20;
          }
        }
        @keyframes dna-line {
          0%, 100% {
            transform: scaleY(1);
            opacity: 0.5;
          }
          50% {
            transform: scaleY(0.05);
            opacity: 0.15;
          }
        }

        /* 3 New Diverse Styles CSS Keyframe animations */
        @keyframes pediatric-bubble {
          0% {
            transform: translateY(110%) scale(0.8) translateX(0);
            opacity: 0;
          }
          20% {
            opacity: 0.7;
          }
          80% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(-20%) scale(1.3) translateX(25px);
            opacity: 0;
          }
        }
        .animate-pediatric-bubble-slow {
          animation: pediatric-bubble 15s infinite linear;
        }
        .animate-pediatric-bubble-medium {
          animation: pediatric-bubble 10s infinite linear;
        }
        .animate-pediatric-bubble-fast {
          animation: pediatric-bubble 7s infinite linear;
        }

        @keyframes radiology-scan {
          0% {
            transform: translateY(0);
            opacity: 0.4;
          }
          50% {
            transform: translateY(180px);
            opacity: 1;
          }
          100% {
            transform: translateY(0);
            opacity: 0.4;
          }
        }
        .animate-radiology-scan {
          animation: radiology-scan 6s infinite ease-in-out;
        }

        @keyframes sine-wave-pulse {
          0%, 100% {
            opacity: 0.25;
            transform: scaleY(0.8) scaleX(1);
          }
          50% {
            opacity: 0.8;
            transform: scaleY(1.2) scaleX(1.05);
          }
        }
        .animate-sine-wave-pulse {
          animation: sine-wave-pulse 5s infinite ease-in-out;
        }

        @keyframes herbal-drift {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(1);
            opacity: 0.2;
          }
          50% {
            transform: translate(25px, -20px) rotate(15deg) scale(1.1);
            opacity: 0.5;
          }
          100% {
            transform: translate(0, 0) rotate(0deg) scale(1);
            opacity: 0.2;
          }
        }
        .animate-herbal-drift {
          animation: herbal-drift 12s ease-in-out infinite;
        }

        @keyframes radar-scan-horizontal {
          0% {
            left: 0%;
            opacity: 0.2;
          }
          50% {
            left: 100%;
            opacity: 0.9;
          }
          100% {
            left: 0%;
            opacity: 0.2;
          }
        }
        .animate-radar-scan-horizontal {
          animation: radar-scan-horizontal 6s infinite ease-in-out;
        }
        .animate-radar-scan-horizontal-reverse {
          animation: radar-scan-horizontal 6s infinite ease-in-out;
          animation-delay: -3s;
        }

        .theme-text {
          color: ${effectiveSettings.themeColor} !important;
        }
        .theme-bg {
          background-color: ${effectiveSettings.themeColor} !important;
        }
        .theme-border {
          border-color: ${effectiveSettings.themeColor}33 !important;
        }
        .theme-btn-primary {
          background-color: ${effectiveSettings.themeColor} !important;
          color: white !important;
          transition: all 0.2s ease-in-out;
        }
        .theme-btn-primary:hover {
          opacity: 0.92;
          box-shadow: 0 4px 12px ${effectiveSettings.themeColor}33;
        }
        .theme-bg-soft {
          background-color: ${effectiveSettings.themeColor}0d !important;
        }
        .theme-accent-border:focus-within {
          border-color: ${effectiveSettings.themeColor} !important;
          box-shadow: 0 0 0 2px ${effectiveSettings.themeColor}22 !important;
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
        systemSettings={effectiveSettings}
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
            backgroundImage: effectiveSettings.bannerPreset === 'custom' && effectiveSettings.bannerUrl 
              ? `linear-gradient(135deg, rgba(15, 23, 42, ${effectiveSettings.bannerOverlayOpacity ?? 0.7}) 0%, rgba(15, 23, 42, ${(effectiveSettings.bannerOverlayOpacity ?? 0.7) * 0.8}) 60%, rgba(2, 132, 199, ${(effectiveSettings.bannerOverlayOpacity ?? 0.7) * 0.4}) 100%), url(${effectiveSettings.bannerUrl})` 
              : effectiveSettings.bannerPreset === 'medical'
              ? `linear-gradient(135deg, ${effectiveSettings.themeColor}dd 0%, #0d9488 55%, #0f766e 100%)`
              : effectiveSettings.bannerPreset === 'modern'
              ? `linear-gradient(135deg, #090d1a 0%, #101530 45%, #1e1b4b 75%, #312e81 100%)`
              : effectiveSettings.bannerPreset === 'geometric'
              ? `linear-gradient(135deg, #059669 0%, #10b981 35%, #06b6d4 100%)`
              : effectiveSettings.bannerPreset === 'pediatric'
              ? `linear-gradient(135deg, #f43f5e 0%, #fb923c 55%, #fcd34d 100%)`
              : effectiveSettings.bannerPreset === 'radiology'
              ? `linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #581c87 75%, #06b6d4 100%)`
              : effectiveSettings.bannerPreset === 'herbal'
              ? `linear-gradient(135deg, #064e3b 0%, #022c22 45%, #1c1917 100%)`
              : effectiveSettings.bannerPreset === 'sunset'
              ? `linear-gradient(135deg, #4c1d95 0%, #b91c1c 40%, #ea580c 75%, #eab308 100%)`
              : effectiveSettings.bannerPreset === 'aurora'
              ? `linear-gradient(135deg, #020617 0%, #064e3b 45%, #0d9488 75%, #10b981 100%)`
              : effectiveSettings.bannerPreset === 'neon'
              ? `linear-gradient(135deg, #09090b 0%, #18181b 50%, #2e1065 100%)`
              : `linear-gradient(135deg, #030712 0%, #080d1a 45%, #111827 100%)`, // default is "Đêm Trực Obsidian"
            backgroundSize: effectiveSettings.bannerPreset === 'custom' && effectiveSettings.bannerUrl 
              ? (effectiveSettings.bannerStyle === 'fill' ? '100% 100%' : effectiveSettings.bannerStyle || 'cover')
              : 'cover',
            backgroundPosition: effectiveSettings.bannerPreset === 'custom' && effectiveSettings.bannerUrl
              ? effectiveSettings.bannerPosition || 'center'
              : 'center',
            backgroundRepeat: effectiveSettings.bannerPreset === 'custom' && effectiveSettings.bannerUrl
              ? effectiveSettings.bannerRepeat || 'no-repeat'
              : 'no-repeat',
          }}
        >
          {/* Preset 1: Lâm Sàng Vital - Heartbeat Line, Plus Network, Circular Halo */}
          {effectiveSettings.bannerPreset === 'medical' && (
            <>
              {/* Pulsing Medical Heartbeat Line SVG */}
              <svg className="absolute inset-y-0 right-0 w-full md:w-3/4 h-full opacity-[0.12] pointer-events-none select-none mix-blend-overlay" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" preserveAspectRatio="none">
                <path d="M 0,100 L 200,100 L 220,70 L 235,130 L 250,100 L 280,100 L 290,40 L 310,165 L 330,90 L 345,100 L 500,100 L 520,70 L 535,130 L 550,100 L 580,100 L 590,40 L 610,165 L 630,90 L 645,100 L 800,100" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="1600" strokeDashoffset="1600" className="animate-heartbeat" />
              </svg>
              {/* Subtle Floating Hospital Cross Icons with glassmorphic backing */}
              <div className="absolute right-[25%] top-[15%] opacity-[0.15] pointer-events-none animate-bounce" style={{ animationDuration: '6s' }}>
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z" />
                </svg>
              </div>
              <div className="absolute left-[35%] bottom-[12%] opacity-[0.08] pointer-events-none animate-bounce" style={{ animationDuration: '9s' }}>
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z" />
                </svg>
              </div>
              <div className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
              <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
            </>
          )}
          
          {/* Preset 2: Y Học MedTech - Vector DNA Helix, Micro Bio nodes, High-tech glow */}
          {effectiveSettings.bannerPreset === 'modern' && (
            <>
              {/* High-tech glow point */}
              <div className="absolute right-[15%] top-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
              <div className="absolute right-[25%] top-[10%] w-48 h-48 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />
              
              {/* 3D Rotating DNA Helix built of dynamic base pairs and glowing nodes */}
              <div className="absolute right-[4%] inset-y-0 w-72 md:w-80 h-full opacity-[0.22] pointer-events-none select-none flex items-center justify-between px-2 mix-blend-screen animate-dna-float">
                {Array.from({ length: 14 }).map((_, idx) => {
                  const delay = (idx * 0.18).toFixed(2);
                  return (
                    <div key={idx} className="relative w-2 h-20 flex flex-col items-center justify-center">
                      {/* Connecting Base Pair Rung */}
                      <div 
                        className="absolute w-[1.5px] h-14 bg-gradient-to-b from-white/40 via-cyan-400/50 to-white/40 origin-center"
                        style={{
                          animation: `dna-line 3.2s ease-in-out infinite`,
                          animationDelay: `${delay}s`
                        }}
                      />
                      {/* Strand A Node */}
                      <div 
                        className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]"
                        style={{
                          animation: `dna-node-a 3.2s ease-in-out infinite`,
                          animationDelay: `${delay}s`
                        }}
                      />
                      {/* Strand B Node */}
                      <div 
                        className="absolute w-2 h-2 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                        style={{
                          backgroundColor: effectiveSettings.themeColor || '#22d3ee',
                          animation: `dna-node-b 3.2s ease-in-out infinite`,
                          animationDelay: `${delay}s`
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Lab grid particles */}
              <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#22d3ee 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            </>
          )}

          {/* Preset 3: Ban Mai Sáng - Layered fluid curves and shining sunrise ray */}
          {effectiveSettings.bannerPreset === 'geometric' && (
            <>
              {/* Organic fluid wave layers flowing slowly */}
              <svg className="absolute inset-0 w-full h-full opacity-[0.15] pointer-events-none select-none mix-blend-overlay animate-wave-flow" viewBox="0 0 1440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path fill="#ffffff" d="M0,192L48,197.3C96,203,192,213,288,192C384,171,480,117,576,112C672,107,768,149,864,170.7C960,192,1056,192,1152,176C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                <path fill="#a7f3d0" d="M0,96L80,112C160,128,320,160,480,154.7C640,149,800,107,960,106.7C1120,107,1280,149,1360,170.7L1440,192L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z" opacity="0.5"></path>
              </svg>
              {/* Shining Solar Ring */}
              <div className="absolute right-[10%] top-[-20%] w-60 h-60 rounded-full bg-yellow-200/20 blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
              {/* Soft environmental light dust */}
              <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 15%, transparent 15%)', backgroundSize: '12px 12px' }} />
            </>
          )}

          {/* Preset 4: Đêm Trực Obsidian - Sweeping Radar, glowing stars, slate grids */}
          {effectiveSettings.bannerPreset === 'default' && (
            <>
              {/* Fine tech grid */}
              <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
              
              {/* Rotating radar sweeps */}
              <div className="absolute right-[15%] top-1/2 -translate-y-1/2 w-64 h-64 opacity-[0.07] pointer-events-none">
                <div className="w-full h-full rounded-full border border-dashed border-white/50 animate-radar-scan relative flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-white/10" />
                  <div className="absolute w-1/2 h-0.5 bg-gradient-to-r from-transparent to-white/60 left-1/2 origin-left" />
                </div>
              </div>

              {/* Glowing active diagnostic concentric circles */}
              <div className="absolute right-[22%] top-1/2 -translate-y-1/2 w-32 h-32 opacity-[0.1] border border-white rounded-full pointer-events-none animate-ping" style={{ animationDuration: '8s' }} />
              <div className="absolute right-[26%] top-[30%] w-2 h-2 opacity-[0.3] bg-emerald-400 rounded-full pointer-events-none animate-ping" style={{ animationDuration: '3s' }} />
              
              {/* Dim medical star dots */}
              <div className="absolute left-[30%] top-[25%] w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
              <div className="absolute left-[45%] bottom-[30%] w-1 h-1 rounded-full bg-white/30 animate-pulse" />
            </>
          )}

          {/* Preset 6: Pediatric (Nhi Khoa Thân Thiện) - Floating playful bubble particles */}
          {effectiveSettings.bannerPreset === 'pediatric' && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Cute glowing circle bubbles with randomized sizes, delays & positions */}
              <div className="absolute left-[15%] bottom-[-20px] w-6 h-6 rounded-full bg-rose-300/40 blur-[1px] animate-pediatric-bubble-slow" />
              <div className="absolute left-[35%] bottom-[-20px] w-4 h-4 rounded-full bg-amber-200/50 blur-[2px] animate-pediatric-bubble-fast" style={{ animationDelay: '2.5s' }} />
              <div className="absolute left-[55%] bottom-[-20px] w-8 h-8 rounded-full bg-orange-300/35 blur-[1px] animate-pediatric-bubble-medium" style={{ animationDelay: '1s' }} />
              <div className="absolute left-[75%] bottom-[-20px] w-5 h-5 rounded-full bg-yellow-200/40 blur-[2px] animate-pediatric-bubble-slow" style={{ animationDelay: '4s' }} />
              <div className="absolute right-[10%] bottom-[-20px] w-7 h-7 rounded-full bg-rose-400/30 blur-[1px] animate-pediatric-bubble-medium" style={{ animationDelay: '6s' }} />
              
              {/* Decorative sweet background curves */}
              <div className="absolute -right-16 -top-16 w-60 h-60 rounded-full bg-amber-300/20 blur-2xl" />
              <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-pink-400/15 blur-2xl" />
            </div>
          )}

          {/* Preset 7: Radiology (Tia Quét Quang Phổ) - Neon scanning bars, diagnostic digital lines */}
          {effectiveSettings.bannerPreset === 'radiology' && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* High-frequency glowing diagnostic grid or frequency wave */}
              <div className="absolute right-[8%] inset-y-0 w-80 opacity-[0.25] flex items-center justify-center mix-blend-screen animate-sine-wave-pulse">
                <svg className="w-full h-32 text-cyan-400" viewBox="0 0 300 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Grid overlay */}
                  <path d="M0 10 H300 M0 30 H300 M0 50 H300 M0 70 H300 M0 90 H300 M50 0 V100 M100 0 V100 M150 0 V100 M200 0 V100 M250 0 V100" stroke="rgba(34, 211, 238, 0.15)" strokeWidth="0.5" />
                  {/* High frequency sine-wave representing sonography/heart signals */}
                  <path d="M 0,50 Q 15,20 30,50 T 60,50 T 90,50 T 120,50 T 150,50 T 180,50 T 210,50 T 240,50 T 270,50 T 300,50" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M 0,50 Q 15,75 30,50 T 60,50 T 90,50 T 120,50 T 150,50 T 180,50 T 210,50 T 240,50 T 270,50 T 300,50" stroke="#a855f7" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
                </svg>
              </div>

              {/* Glowing vertical scanning beam that moves up and down */}
              <div className="absolute inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 shadow-[0_0_12px_#22d3ee] animate-radiology-scan" />
              <div className="absolute inset-x-0 h-10 bg-gradient-to-b from-cyan-400/10 to-transparent blur-md animate-radiology-scan" />

              {/* Lab-style dust particles */}
              <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#a855f7 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }} />
            </div>
          )}

          {/* Preset 8: Herbal (Đông Y Cổ Truyền) - Floating natural leaf/energy nodes & organic breeze lines */}
          {effectiveSettings.bannerPreset === 'herbal' && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Natural golden energy acupuncture points or herb elements floating */}
              <div className="absolute right-[12%] inset-y-0 w-80 opacity-[0.18] flex items-center justify-center mix-blend-screen animate-herbal-drift">
                <svg className="w-64 h-64 text-emerald-300" viewBox="0 0 100 100" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                  {/* Yin Yang concept or stylized lotus leaf */}
                  <path d="M50 15 C30 15 15 30 15 50 C15 70 30 85 50 85 C70 85 85 70 85 50 C85 30 70 15 50 15 Z" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                  <path d="M50 25 A 25 25 0 0 1 50 75 A 25 25 0 0 0 50 25" fill="currentColor" opacity="0.15" />
                  <circle cx="50" cy="50" r="4" fill="#fbbf24" />
                  <circle cx="50" cy="35" r="3" fill="#fbbf24" opacity="0.8" />
                  <circle cx="50" cy="65" r="3" fill="#fbbf24" opacity="0.8" />
                  <circle cx="35" cy="50" r="3" fill="#fbbf24" opacity="0.8" />
                  <circle cx="65" cy="50" r="3" fill="#fbbf24" opacity="0.8" />
                </svg>
              </div>

              {/* Soft organic ambient glow */}
              <div className="absolute -left-16 -top-16 w-72 h-72 rounded-full bg-emerald-800/20 blur-3xl" />
              <div className="absolute right-[20%] -bottom-16 w-80 h-80 rounded-full bg-amber-900/15 blur-3xl" />
              
              {/* Fine warm natural grids */}
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(#fbbf24 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            </div>
          )}

          {/* Preset 9: Sunset Glow (Hoàng Hôn Ấm Áp) - Sun rays, ripple orbits & warm solar dust */}
          {effectiveSettings.bannerPreset === 'sunset' && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute right-[10%] top-[-20%] w-72 h-72 rounded-full bg-amber-500/15 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
              <div className="absolute right-[25%] bottom-[-10%] w-56 h-56 rounded-full bg-rose-500/10 blur-2xl" />
              
              <div className="absolute right-[8%] inset-y-0 w-80 opacity-[0.2] flex items-center justify-center mix-blend-screen animate-herbal-drift">
                <svg className="w-64 h-64 text-amber-300" viewBox="0 0 100 100" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                  {/* Concentric solar orbits representing cycles of healing/recovery */}
                  <circle cx="50" cy="50" r="45" strokeWidth="0.75" strokeDasharray="4 4" />
                  <circle cx="50" cy="50" r="30" strokeWidth="0.75" />
                  <circle cx="50" cy="50" r="15" strokeWidth="1" strokeDasharray="1 3" />
                  {/* Rays of Hope */}
                  <line x1="50" y1="5" x2="50" y2="95" strokeWidth="0.5" strokeDasharray="2 2" />
                  <line x1="5" y1="50" x2="95" y2="50" strokeWidth="0.5" strokeDasharray="2 2" />
                </svg>
              </div>
              
              <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(#fcd34d 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
            </div>
          )}

          {/* Preset 10: Cosmic Aurora (Cực Quang Bắc Cực) - Dynamic flowing northern lights wave, deep cosmos */}
          {effectiveSettings.bannerPreset === 'aurora' && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Dynamic shining aurora curtain simulation */}
              <svg className="absolute inset-0 w-full h-full opacity-[0.25] pointer-events-none select-none mix-blend-screen animate-wave-flow" viewBox="0 0 1440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path fill="url(#aurora-grad-1)" d="M0,96L120,112C240,128,480,160,720,149.3C960,139,1200,85,1320,58.7L1440,32L1440,320L1320,320C1200,320,960,320,720,320C480,320,240,320,120,320L0,320Z"></path>
                <path fill="url(#aurora-grad-2)" d="M0,192L80,176C160,160,320,128,480,138.7C640,149,800,203,960,202.7C1120,203,1280,149,1360,122.7L1440,96L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z" opacity="0.6"></path>
                <defs>
                  <linearGradient id="aurora-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="aurora-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                    <stop offset="50%" stopColor="#34d399" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Star-like glittering nodes */}
              <div className="absolute right-[20%] top-[25%] w-1.5 h-1.5 rounded-full bg-teal-200/60 animate-ping" style={{ animationDuration: '4s' }} />
              <div className="absolute right-[40%] bottom-[30%] w-1 h-1 rounded-full bg-emerald-200/50 animate-pulse" style={{ animationDuration: '3s' }} />
              <div className="absolute left-[35%] top-[40%] w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
            </div>
          )}

          {/* Preset 11: Clinical Neon (Quang Lộ Cyberpunk) - Scanning lasers, grid wave, cybernetic nodes */}
          {effectiveSettings.bannerPreset === 'neon' && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Tech cybergrid background overlay */}
              <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(14, 165, 233, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(14, 165, 233, 0.15) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
              
              {/* High-contrast cybernetic DNA/circuit line nodes */}
              <div className="absolute right-[5%] inset-y-0 w-80 opacity-[0.25] flex items-center justify-center animate-sine-wave-pulse">
                <svg className="w-72 h-32 text-indigo-400" viewBox="0 0 300 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 10 50 L 50 50 L 70 20 L 90 80 L 110 50 L 170 50 L 190 10 L 210 90 L 230 50 L 290 50" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M 10 50 L 50 50 L 70 20 L 90 80 L 110 50 L 170 50 L 190 10 L 210 90 L 230 50 L 290 50" stroke="#06b6d4" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" className="animate-pulse" />
                  <circle cx="70" cy="20" r="4" fill="#f43f5e" className="animate-ping" style={{ animationDuration: '2s' }} />
                  <circle cx="190" cy="10" r="4" fill="#06b6d4" />
                  <circle cx="210" cy="90" r="4" fill="#06b6d4" />
                </svg>
              </div>
              
              {/* Neon glowing lasers scanning across the banner */}
              <div className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-fuchsia-500 to-transparent opacity-80 shadow-[0_0_8px_#d946ef] animate-radar-scan-horizontal" />
              <div className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-60 shadow-[0_0_8px_#22d3ee] animate-radar-scan-horizontal-reverse" />
            </div>
          )}

          {/* Preset 5: Custom image overlay */}
          {effectiveSettings.bannerPreset === 'custom' && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/15 pointer-events-none" />
          )}

          <div className="space-y-1.5 relative z-10 max-w-2xl">
            <div className="flex items-center gap-1.5 text-[11px] text-white/95 font-extrabold tracking-wider uppercase" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)' }}>
              {effectiveSettings.logoPreset === 'custom' && effectiveSettings.logoUrl ? (
                <img src={effectiveSettings.logoUrl} className="w-4 h-4 object-contain rounded shrink-0" alt="Logo" referrerPolicy="no-referrer" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
              ) : effectiveSettings.logoPreset === 'shield' ? (
                <Shield className="w-3.5 h-3.5 text-white/95 shrink-0" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
              ) : effectiveSettings.logoPreset === 'cross' ? (
                <span className="text-xs" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>❤️</span>
              ) : effectiveSettings.logoPreset === 'default' ? (
                <span className="text-xs" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>🏥</span>
              ) : (
                <Building2 className="w-3.5 h-3.5 text-white/95 shrink-0" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
              )}
              Hệ thống hành chính Bệnh Viện Đa Khoa
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-white animate-fade-in bg-black/20 backdrop-blur-sm px-4 py-2 rounded-lg inline-block" style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.9), 0 4px 20px rgba(0, 0, 0, 0.7), 0 0 1px rgba(0, 0, 0, 0.95)' }}>
              {effectiveSettings.systemTitle}
            </h2>
            <p className="text-xs sm:text-sm text-white font-semibold leading-relaxed max-w-xl mt-1.5 animate-fade-in" style={{ textShadow: '0 1.5px 6px rgba(0, 0, 0, 0.85), 0 3px 12px rgba(0, 0, 0, 0.6)' }}>
              {effectiveSettings.systemSubtitle}
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
            style={activeTab === 'report' ? { backgroundColor: effectiveSettings.themeColor } : {}}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Kê khai & Phê duyệt số liệu
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition duration-150 cursor-pointer select-none ${
              activeTab === 'dashboard' ? 'shadow-sm text-white font-extrabold' : 'adaptive-text-muted hover:text-slate-900 hover:bg-slate-200/30'
            }`}
            style={activeTab === 'dashboard' ? { backgroundColor: effectiveSettings.themeColor } : {}}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Thống kê & Chỉ số
          </button>
          
          <button
            onClick={() => setActiveTab('meetings')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition duration-150 cursor-pointer select-none ${
              activeTab === 'meetings' ? 'shadow-sm text-white font-extrabold' : 'adaptive-text-muted hover:text-slate-900 hover:bg-slate-200/30'
            }`}
            style={activeTab === 'meetings' ? { backgroundColor: effectiveSettings.themeColor } : {}}
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            Hội họp & Biên bản AI ✨
          </button>

          <button
            onClick={() => setActiveTab('work-reports')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition duration-150 cursor-pointer select-none ${
              activeTab === 'work-reports' ? 'shadow-sm text-white font-extrabold' : 'adaptive-text-muted hover:text-slate-900 hover:bg-slate-200/30'
            }`}
            style={activeTab === 'work-reports' ? { backgroundColor: effectiveSettings.themeColor } : {}}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Báo cáo & Chỉ đạo công việc 📋
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition duration-150 cursor-pointer select-none ${
              activeTab === 'search' ? 'shadow-sm text-white font-extrabold' : 'adaptive-text-muted hover:text-slate-900 hover:bg-slate-200/30'
            }`}
            style={activeTab === 'search' ? { backgroundColor: effectiveSettings.themeColor } : {}}
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
              style={activeTab === 'personnel' ? { backgroundColor: effectiveSettings.themeColor } : {}}
            >
              <Sliders className="w-3.5 h-3.5" />
              Admin ⚙️
            </button>
          )}
        </div>

        {/* Tab Content Display */}
        <div className="tab-container relative z-20 animate-fade-in duration-200">
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
              onDeleteReport={handleDeleteReport}
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
                onPreviewSettings={setPreviewSettings}
                procedures={procedures}
                onAddProcedure={handleAddProcedure}
                onDeleteProcedure={handleDeleteProcedure}
                onReorderProcedures={handleReorderProcedures}
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
