import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { User, PrintSettings } from '../types';
import { CATEGORIES, DEFAULT_PRINT_SETTINGS } from '../data';
import { 
  Users, 
  Building2, 
  History, 
  PlusCircle, 
  Trash2, 
  UserPlus, 
  Check, 
  X, 
  MapPin, 
  PhoneCall, 
  ShieldAlert, 
  Award, 
  Fingerprint, 
  Clock, 
  Sparkles,
  Search,
  Activity,
  Edit2,
  Printer,
  Shield,
  FileSpreadsheet,
  UploadCloud,
  ImageIcon,
  FileDown,
  Mail,
  Calendar,
  Briefcase,
  BookOpen,
  Info,
  Send
} from 'lucide-react';

const getYearFromBirthDate = (birthDate?: string | number): number | undefined => {
  if (!birthDate) return undefined;
  if (typeof birthDate === 'number') return birthDate;
  const str = String(birthDate).trim();
  const parts = str.split('/');
  if (parts.length === 3) {
    const year = Number(parts[2]);
    if (!isNaN(year)) return year;
  }
  const year = Number(str);
  if (!isNaN(year) && year > 1900 && year < 2100) return year;
  return undefined;
};

const getAgeFromBirthDate = (birthDate?: string | number): number | string => {
  const year = getYearFromBirthDate(birthDate);
  if (!year) return '---';
  return new Date().getFullYear() - year;
};

interface ServerDepartment {
  id: string;
  name: string;
  code: string;
  headId: string;
  headName: string;
  location: string;
  phone: string;
  description: string;
}

interface ServerAuditLog {
  id: string;
  actor: string;
  action: string;
  details: string;
  timestamp: string;
}

interface ServerStaff {
  id: string;
  name: string;
  role: 'admin' | 'truongKhoa' | 'phoKhoa' | 'general' | 'nhanVien' | 'sieuAm' | 'noiSoi' | 'xQuang' | 'dienTimLHN' | 'xetNghiem';
  email: string;
  departmentName: string;
  title: string;
  shiftCount: number;
  status: string;
  password?: string;
  passwordResetRequested?: boolean;
  birthDate?: string;
  gender?: string;
  qualification?: string;
  degree?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

interface PersonnelManagerProps {
  currentUser: User;
  initialSubTab?: 'staff' | 'depts' | 'logs' | 'procedures' | 'printSettings' | 'themeSettings' | 'googleSheets';
  onRefresh?: () => void;
  systemSettings?: any; // SystemSettings
  onUpdateSettings?: (settings: any) => Promise<void>;
  onPreviewSettings?: (settings: any | null) => void;
  procedures: any[];
  onAddProcedure: (proc: { name: string; category: string }) => Promise<void>;
  onDeleteProcedure: (id: string) => Promise<void>;
}

export default function PersonnelManager({ 
  currentUser, 
  initialSubTab = 'staff', 
  onRefresh,
  systemSettings,
  onUpdateSettings,
  onPreviewSettings,
  procedures,
  onAddProcedure,
  onDeleteProcedure
}: PersonnelManagerProps) {
  const [staffList, setStaffList] = useState<ServerStaff[]>([]);
  const [deptList, setDeptList] = useState<ServerDepartment[]>([]);
  const [auditLogs, setAuditLogs] = useState<ServerAuditLog[]>([]);
  
  const [activeSubTab, setActiveSubTab] = useState<'staff' | 'depts' | 'logs' | 'procedures' | 'printSettings' | 'themeSettings' | 'googleSheets'>(initialSubTab as any);

  const [localSettings, setLocalSettings] = useState<any>(null);

  // Sync state if prop changes from parent dropdown triggers
  useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    if (systemSettings) {
      setLocalSettings((prev: any) => {
        if (!prev) return systemSettings;
        return {
          ...systemSettings,
          systemTitle: prev.systemTitle !== undefined ? prev.systemTitle : systemSettings.systemTitle,
          systemSubtitle: prev.systemSubtitle !== undefined ? prev.systemSubtitle : systemSettings.systemSubtitle,
          themeColor: prev.themeColor !== undefined ? prev.themeColor : systemSettings.themeColor,
          logoPreset: prev.logoPreset !== undefined ? prev.logoPreset : systemSettings.logoPreset,
          logoUrl: prev.logoUrl !== undefined ? prev.logoUrl : systemSettings.logoUrl,
          bannerPreset: prev.bannerPreset !== undefined ? prev.bannerPreset : systemSettings.bannerPreset,
          bannerUrl: prev.bannerUrl !== undefined ? prev.bannerUrl : systemSettings.bannerUrl,
          bgStyle: prev.bgStyle !== undefined ? prev.bgStyle : systemSettings.bgStyle,
        };
      });
    }
  }, [systemSettings]);

  // Sync real-time live preview to main layout
  useEffect(() => {
    if (activeSubTab === 'themeSettings' && localSettings) {
      onPreviewSettings?.(localSettings);
    } else {
      onPreviewSettings?.(null);
    }
    return () => {
      onPreviewSettings?.(null);
    };
  }, [localSettings, activeSubTab, onPreviewSettings]);

  const [printSettings, setPrintSettings] = useState<PrintSettings>(() => {
    const saved = localStorage.getItem('print-settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_PRINT_SETTINGS;
      }
    }
    return DEFAULT_PRINT_SETTINGS;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Custom logo upload states
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [logoUploadSuccess, setLogoUploadSuccess] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  // Custom banner upload states
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerUploadError, setBannerUploadError] = useState<string | null>(null);
  const [bannerUploadSuccess, setBannerUploadSuccess] = useState(false);
  const [isDraggingBanner, setIsDraggingBanner] = useState(false);

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setLogoUploadError("Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP, SVG, GIF).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError("Kích thước hình ảnh không được vượt quá 5MB.");
      return;
    }

    setLogoUploading(true);
    setLogoUploadError(null);
    setLogoUploadSuccess(false);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch("/api/upload-logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, base64Data })
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Tải ảnh lên thất bại.");
        }

        const data = await res.json();
        if (data.success && data.settings) {
          setLocalSettings((prev: any) => ({
            ...prev,
            logoUrl: data.logoUrl,
            logoPreset: 'custom'
          }));
          await onUpdateSettings?.(data.settings);
          setLogoUploadSuccess(true);
          setTimeout(() => setLogoUploadSuccess(false), 3000);
        } else {
          throw new Error("Lỗi phản hồi từ máy chủ.");
        }
      } catch (err: any) {
        console.error(err);
        setLogoUploadError(err.message || "Không thể tải hình ảnh lên máy chủ.");
      } finally {
        setLogoUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleLogoDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingLogo(true);
  };

  const handleLogoDragLeave = () => {
    setIsDraggingLogo(false);
  };

  const handleLogoDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setLogoUploadError("Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP, SVG, GIF).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError("Kích thước hình ảnh không được vượt quá 5MB.");
      return;
    }

    setLogoUploading(true);
    setLogoUploadError(null);
    setLogoUploadSuccess(false);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch("/api/upload-logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, base64Data })
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Tải ảnh lên thất bại.");
        }

        const data = await res.json();
        if (data.success && data.settings) {
          setLocalSettings((prev: any) => ({
            ...prev,
            logoUrl: data.logoUrl,
            logoPreset: 'custom'
          }));
          await onUpdateSettings?.(data.settings);
          setLogoUploadSuccess(true);
          setTimeout(() => setLogoUploadSuccess(false), 3000);
        } else {
          throw new Error("Lỗi phản hồi từ máy chủ.");
        }
      } catch (err: any) {
        console.error(err);
        setLogoUploadError(err.message || "Không thể tải hình ảnh lên máy chủ.");
      } finally {
        setLogoUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setBannerUploadError("Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP, SVG, GIF).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setBannerUploadError("Kích thước hình ảnh không được vượt quá 5MB.");
      return;
    }

    setBannerUploading(true);
    setBannerUploadError(null);
    setBannerUploadSuccess(false);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch("/api/upload-banner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, base64Data })
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Tải ảnh lên thất bại.");
        }

        const data = await res.json();
        if (data.success && data.settings) {
          setLocalSettings((prev: any) => ({
            ...prev,
            bannerUrl: data.bannerUrl,
            bannerPreset: 'custom'
          }));
          await onUpdateSettings?.(data.settings);
          setBannerUploadSuccess(true);
          setTimeout(() => setBannerUploadSuccess(false), 3000);
        } else {
          throw new Error("Lỗi phản hồi từ máy chủ.");
        }
      } catch (err: any) {
        console.error(err);
        setBannerUploadError(err.message || "Không thể tải hình ảnh lên máy chủ.");
      } finally {
        setBannerUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleBannerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingBanner(true);
  };

  const handleBannerDragLeave = () => {
    setIsDraggingBanner(false);
  };

  const handleBannerDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingBanner(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setBannerUploadError("Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP, SVG, GIF).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setBannerUploadError("Kích thước hình ảnh không được vượt quá 5MB.");
      return;
    }

    setBannerUploading(true);
    setBannerUploadError(null);
    setBannerUploadSuccess(false);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch("/api/upload-banner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, base64Data })
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Tải ảnh lên thất bại.");
        }

        const data = await res.json();
        if (data.success && data.settings) {
          setLocalSettings((prev: any) => ({
            ...prev,
            bannerUrl: data.bannerUrl,
            bannerPreset: 'custom'
          }));
          await onUpdateSettings?.(data.settings);
          setBannerUploadSuccess(true);
          setTimeout(() => setBannerUploadSuccess(false), 3000);
        } else {
          throw new Error("Lỗi phản hồi từ máy chủ.");
        }
      } catch (err: any) {
        console.error(err);
        setBannerUploadError(err.message || "Không thể tải hình ảnh lên máy chủ.");
      } finally {
        setBannerUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  // Google Sheets Integration State in Admin Menu
  const [googleAccessToken, setGoogleAccessToken] = useState(() => localStorage.getItem('google_access_token') || '');
  const [googleSpreadsheetUrl, setGoogleSpreadsheetUrl] = useState(() => localStorage.getItem('google_spreadsheet_url') || 'https://docs.google.com/spreadsheets/d/1n7yQQmninnDTVNtIZqCzUEiAI1jRHSj4VTr7pVs3KMM/edit?usp=sharing');
  const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('google_client_id') || '1067215171120-g7a7fge4vbe050m3oabm896v1k6g6m2f.apps.googleusercontent.com');

  const [isTestingAutoSync, setIsTestingAutoSync] = useState(false);
  const [testAutoSyncMessage, setTestAutoSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testSyncDate, setTestSyncDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1); // Mặc định là ngày hôm qua
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const handleTestAutoSync = async () => {
    setIsTestingAutoSync(true);
    setTestAutoSyncMessage(null);
    try {
      const res = await fetch('/api/sheets/auto-sync-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: testSyncDate })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestAutoSyncMessage({
          type: 'success',
          text: `Đồng bộ & gửi Telegram thành công số liệu ngày ${data.date || testSyncDate}!`
        });
        if (onRefresh) {
          onRefresh();
        }
      } else {
        throw new Error(data.error || 'Lỗi xử lý tự động đồng bộ & gửi Telegram.');
      }
    } catch (err: any) {
      console.error(err);
      setTestAutoSyncMessage({
        type: 'error',
        text: `Lỗi: ${err.message || String(err)}`
      });
    } finally {
      setIsTestingAutoSync(false);
    }
  };

  useEffect(() => {
    if (systemSettings) {
      if (systemSettings.googleSpreadsheetUrl !== undefined && systemSettings.googleSpreadsheetUrl !== googleSpreadsheetUrl) {
        setGoogleSpreadsheetUrl(systemSettings.googleSpreadsheetUrl);
        localStorage.setItem('google_spreadsheet_url', systemSettings.googleSpreadsheetUrl);
      }
      if (systemSettings.googleAccessToken !== undefined && systemSettings.googleAccessToken !== googleAccessToken) {
        setGoogleAccessToken(systemSettings.googleAccessToken);
        localStorage.setItem('google_access_token', systemSettings.googleAccessToken);
      }
      if (systemSettings.googleClientId !== undefined && systemSettings.googleClientId !== googleClientId) {
        setGoogleClientId(systemSettings.googleClientId);
        localStorage.setItem('google_client_id', systemSettings.googleClientId);
      }
    }
  }, [systemSettings]);

  useEffect(() => {
    // Check if we have been instructed to show success text
    const showSuccess = localStorage.getItem('oauth_personnel_success') === 'true';
    if (showSuccess) {
      localStorage.removeItem('oauth_personnel_success');
      setSuccessText('Kết nối tài khoản Google thành công! Cấu hình đã được lưu trữ.');
      setTimeout(() => setSuccessText(null), 5000);
    }
  }, []);

  const handleGoogleConnect = () => {
    if (!googleClientId.trim()) {
      setErrorText('Vui lòng cung cấp Google OAuth Client ID.');
      setTimeout(() => setErrorText(null), 4500);
      return;
    }
    // Save current state to restore after redirect
    localStorage.setItem('oauth_restore_tab', 'personnel');
    localStorage.setItem('oauth_restore_subtab', 'googleSheets');

    const redirectUri = window.location.href.split('#')[0]; // Current page minus hash
    const scope = 'https://www.googleapis.com/auth/spreadsheets';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId.trim()}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}`;
    
    window.location.href = authUrl;
  };

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Form states - Staff
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffTitle, setStaffTitle] = useState('Bác Sĩ Điều Trị');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffDept, setStaffDept] = useState('Phòng Siêu Âm');
  const [staffRole, setStaffRole] = useState<'admin' | 'truongKhoa' | 'phoKhoa' | 'general' | 'nhanVien' | 'sieuAm' | 'noiSoi' | 'xQuang' | 'dienTimLHN' | 'xetNghiem'>('general');
  const [staffStatus, setStaffStatus] = useState('Đang làm việc');
  const [staffShift, setStaffShift] = useState(15);
  const [staffBirthDate, setStaffBirthDate] = useState<string>('');
  const [staffGender, setStaffGender] = useState<string>('Nam');
  const [staffQualification, setStaffQualification] = useState<string>('Bác sĩ');
  const [staffDegree, setStaffDegree] = useState<string>('ĐH');
  const [staffPhone, setStaffPhone] = useState<string>('');
  const [staffAddress, setStaffAddress] = useState<string>('');
  const [staffNotes, setStaffNotes] = useState<string>('');

  // Viewing detail state
  const [viewingStaff, setViewingStaff] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Excel Import States & Handlers
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [excelImportError, setExcelImportError] = useState<string | null>(null);
  const [excelImportSuccess, setExcelImportSuccess] = useState<string | null>(null);
  const [excelImportLogs, setExcelImportLogs] = useState<string[]>([]);
  const [parsedExcelUsers, setParsedExcelUsers] = useState<any[]>([]);
  const [isExcelImportingProgress, setIsExcelImportingProgress] = useState(false);

  const handleDownloadTemplate = () => {
    const wsData = [
      [
        "Họ và tên *", 
        "Thư điện tử (Email) *", 
        "Phòng ban *", 
        "Vai trò *", 
        "Chức danh / Chức vụ", 
        "Giới tính", 
        "Năm sinh", 
        "Trình độ chuyên môn", 
        "Bằng cấp", 
        "Số điện thoại", 
        "Địa chỉ", 
        "Ghi chú"
      ],
      [
        "Nguyễn Văn A", 
        "nguyenvana@gmail.com", 
        "Phòng Siêu Âm", 
        "Siêu âm", 
        "Bác sĩ điều trị", 
        "Nam", 
        1980, 
        "Bác sĩ CKII", 
        "Sau ĐH", 
        "0901234567", 
        "123 Nguyễn Huệ, Quận 1, TP. HCM", 
        "Trưởng nhóm trực siêu âm"
      ],
      [
        "Trần Thị B", 
        "tranthib@gmail.com", 
        "Phòng Nội Soi", 
        "Nội soi", 
        "Kỹ thuật viên Nội soi", 
        "Nữ", 
        1988, 
        "Bác sĩ CKI", 
        "Sau ĐH", 
        "0912345678", 
        "456 Lê Lợi, Quận 1, TP. HCM", 
        ""
      ],
      [
        "Phạm Văn C", 
        "phamvanc@gmail.com", 
        "Phòng Xét Nghiệm", 
        "Xét nghiệm", 
        "Bác sĩ Xét nghiệm", 
        "Nam", 
        1992, 
        "Thạc sĩ", 
        "Sau ĐH", 
        "0923456789", 
        "789 CMT8, Quận 3, TP. HCM", 
        "Đã được tập huấn máy Cobas"
      ],
      [
        "Lê Văn D", 
        "levand@gmail.com", 
        "Phòng X-Quang & CT", 
        "Nhân viên", 
        "Kỹ thuật viên hình ảnh", 
        "Nam", 
        1995, 
        "Cử nhân", 
        "ĐH", 
        "0987654321", 
        "321 Ba Tháng Hai, Quận 10, TP. HCM", 
        ""
      ]
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const wscols = [
      { wch: 22 }, // Họ và tên
      { wch: 25 }, // Email
      { wch: 25 }, // Phòng ban
      { wch: 15 }, // Vai trò
      { wch: 22 }, // Chức danh
      { wch: 10 }, // Giới tính
      { wch: 10 }, // Năm sinh
      { wch: 22 }, // Trình độ chuyên môn
      { wch: 12 }, // Bằng cấp
      { wch: 15 }, // Số điện thoại
      { wch: 30 }, // Địa chỉ
      { wch: 25 }  // Ghi chú
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_nhan_vien");
    XLSX.writeFile(wb, "Mau_nhap_lieu_nhan_vien.xlsx");
  };

  const handleExcelImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelImportError(null);
    setExcelImportSuccess(null);
    setExcelImportLogs([]);
    setParsedExcelUsers([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstream = evt.target?.result;
        const wb = XLSX.read(bstream, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

        if (data.length < 2) {
          throw new Error('Tệp Excel trống hoặc không chứa dòng tiêu đề và dòng dữ liệu.');
        }

        const headers = data[0].map((h: any) => String(h || '').trim().toLowerCase());
        
        let nameColIdx = headers.findIndex((h: string) => h.includes('họ') || h.includes('tên') || h.includes('name'));
        let emailColIdx = headers.findIndex((h: string) => h.includes('email') || h.includes('thư điện tử') || h.includes('thu dien tu'));
        let deptColIdx = headers.findIndex((h: string) => h.includes('phòng') || h.includes('khoa') || h.includes('bộ phận') || h.includes('phong ban') || h.includes('department'));
        let roleColIdx = headers.findIndex((h: string) => h.includes('vai trò') || h.includes('role') || h.includes('chức vụ trực') || h.includes('vai tro'));
        let titleColIdx = headers.findIndex((h: string) => h.includes('chức danh') || h.includes('chức vụ') || h.includes('title'));
        let genderColIdx = headers.findIndex((h: string) => h.includes('giới tính') || h.includes('gender') || h.includes('gioi tinh'));
        let birthColIdx = headers.findIndex((h: string) => h.includes('năm sinh') || h.includes('ngày sinh') || h.includes('sinh') || h.includes('birth') || h.includes('nam sinh'));
        let qualColIdx = headers.findIndex((h: string) => h.includes('trình độ') || h.includes('chuyên môn') || h.includes('qualification'));
        let degreeColIdx = headers.findIndex((h: string) => h.includes('bằng') || h.includes('học vị') || h.includes('degree'));
        let phoneColIdx = headers.findIndex((h: string) => h.includes('điện thoại') || h.includes('phone') || h.includes('sđt') || h.includes('dien thoai'));
        let addrColIdx = headers.findIndex((h: string) => h.includes('địa chỉ') || h.includes('address') || h.includes('dia chi'));
        let notesColIdx = headers.findIndex((h: string) => h.includes('ghi chú') || h.includes('note') || h.includes('ghi chu'));

        // Fallbacks for main indexes
        if (nameColIdx === -1) nameColIdx = 0;
        if (emailColIdx === -1) emailColIdx = 1;
        if (deptColIdx === -1) deptColIdx = 2;
        if (roleColIdx === -1) roleColIdx = 3;

        const logs: string[] = [];
        logs.push(`🔍 Hệ thống đã tự động liên kết các cột dữ liệu:`);
        logs.push(`- Họ và tên: Cột ${nameColIdx + 1} ("${data[0][nameColIdx] || 'Không thấy'}")`);
        logs.push(`- Email: Cột ${emailColIdx + 1} ("${data[0][emailColIdx] || 'Không thấy'}")`);
        logs.push(`- Phòng ban: Cột ${deptColIdx + 1} ("${data[0][deptColIdx] || 'Không thấy'}")`);
        logs.push(`- Vai trò: Cột ${roleColIdx + 1} ("${data[0][roleColIdx] || 'Không thấy'}")`);

        const mapRoleStringToKey = (roleStr: string): 'admin' | 'truongKhoa' | 'phoKhoa' | 'general' | 'nhanVien' | 'sieuAm' | 'noiSoi' | 'xQuang' | 'dienTimLHN' | 'xetNghiem' => {
          const str = String(roleStr || '').trim().toLowerCase();
          if (str.includes('quản trị') || str === 'admin') return 'admin';
          if (str.includes('trưởng khoa') || str === 'truongkhoa') return 'truongKhoa';
          if (str.includes('phó khoa') || str === 'phokhoa') return 'phoKhoa';
          if (str.includes('siêu âm') || str === 'sieuam') return 'sieuAm';
          if (str.includes('nội soi') || str === 'noisoi') return 'noiSoi';
          if (str.includes('xquang') || str.includes('x-quang') || str === 'xquang') return 'xQuang';
          if (str.includes('điện tim') || str.includes('dientim') || str.includes('dien tim')) return 'dienTimLHN';
          if (str.includes('xét nghiệm') || str === 'xetnghiem') return 'xetNghiem';
          return 'general';
        };

        const importedUsersList: any[] = [];
        let validRows = 0;
        let invalidRows = 0;

        for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
          const row = data[rowIdx];
          if (!row || row.length === 0) continue;

          const rawName = row[nameColIdx];
          const rawEmail = row[emailColIdx];
          const rawDept = row[deptColIdx];

          if (!rawName || !String(rawName).trim()) {
            logs.push(`⚠️ Dòng ${rowIdx + 1}: Bỏ qua do thiếu "Họ và tên".`);
            invalidRows++;
            continue;
          }

          const name = String(rawName).trim();
          const email = rawEmail ? String(rawEmail).trim().toLowerCase() : `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@test.hospital.vn`;
          const departmentName = rawDept ? String(rawDept).trim() : 'Phòng ban chung';
          const role = roleColIdx !== -1 && row[roleColIdx] ? mapRoleStringToKey(row[roleColIdx]) : 'general';
          
          const title = titleColIdx !== -1 && row[titleColIdx] ? String(row[titleColIdx]).trim() : 'Bác Sĩ Điều Trị';
          const gender = genderColIdx !== -1 && row[genderColIdx] ? String(row[genderColIdx]).trim() : 'Nam';
          let birthDate: string | undefined = undefined;
          if (birthColIdx !== -1 && row[birthColIdx]) {
            const rawBirthVal = String(row[birthColIdx]).trim();
            if (/^\d{4}$/.test(rawBirthVal)) {
              birthDate = `01/01/${rawBirthVal}`;
            } else {
              birthDate = rawBirthVal;
            }
          }
          const qualification = qualColIdx !== -1 && row[qualColIdx] ? String(row[qualColIdx]).trim() : 'Bác sĩ';
          const degree = degreeColIdx !== -1 && row[degreeColIdx] ? String(row[degreeColIdx]).trim() : 'ĐH';
          let phone = phoneColIdx !== -1 && row[phoneColIdx] ? String(row[phoneColIdx]).trim() : '';
          if (phone.endsWith('.0')) {
            phone = phone.substring(0, phone.length - 2);
          }
          const cleanPhone = phone.replace(/\D/g, '');
          if (/^\d{9}$/.test(cleanPhone)) {
            phone = '0' + cleanPhone;
          } else if (cleanPhone) {
            phone = cleanPhone;
          }
          const address = addrColIdx !== -1 && row[addrColIdx] ? String(row[addrColIdx]).trim() : '';
          const notes = notesColIdx !== -1 && row[notesColIdx] ? String(row[notesColIdx]).trim() : '';

          importedUsersList.push({
            name,
            email,
            departmentName,
            role,
            title,
            gender,
            birthDate,
            qualification,
            degree,
            phone,
            address,
            notes,
            status: 'Đang làm việc'
          });

          validRows++;
        }

        logs.push(`✅ Hoàn thành phân tích: phát hiện ${validRows} dòng hợp lệ, ${invalidRows} dòng lỗi/bỏ qua.`);
        setExcelImportLogs(logs);
        setParsedExcelUsers(importedUsersList);
      } catch (err: any) {
        setExcelImportError(err.message || 'Lỗi khi đọc file Excel. Vui lòng đảm bảo tệp tin đúng định dạng.');
      }
    };

    reader.readAsBinaryString(file);
    // Reset file input value
    e.target.value = '';
  };

  const handleSyncExcelUsers = async () => {
    if (parsedExcelUsers.length === 0) return;
    setIsExcelImportingProgress(true);
    setExcelImportError(null);

    try {
      const res = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: parsedExcelUsers })
      });

      if (res.ok) {
        const data = await res.json();
        setExcelImportSuccess(`Đồng bộ thành công! Đã xử lý xong: Thêm mới ${data.countCreated || 0} cán bộ và Cập nhật ${data.countUpdated || 0} cán bộ vào danh sách.`);
        setParsedExcelUsers([]);
        await fetchAllPersonnelData();
        setTimeout(() => {
          setExcelImportSuccess(null);
          setIsExcelImportOpen(false);
        }, 5000);
      } else {
        throw new Error('Lỗi từ hệ thống khi đồng bộ hàng loạt.');
      }
    } catch (err: any) {
      setExcelImportError(err.message || 'Không thể đồng bộ danh sách nhân sự. Vui lòng kiểm tra lại kết nối.');
    } finally {
      setIsExcelImportingProgress(false);
    }
  };

  // Form states - Department
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [isDeptFormOpen, setIsDeptFormOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptLocation, setDeptLocation] = useState('');
  const [deptPhone, setDeptPhone] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptHeadId, setDeptHeadId] = useState('');

  // Fetch helper from APIs
  const fetchAllPersonnelData = async () => {
    setIsLoading(true);
    setErrorText(null);
    try {
      const [uRes, dRes, aRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/departments'),
        fetch('/api/audit-logs')
      ]);

      if (uRes.ok && dRes.ok && aRes.ok) {
        setStaffList(await uRes.json());
        setDeptList(await dRes.json());
        setAuditLogs(await aRes.json());
        onRefresh?.();
      } else {
        throw new Error('Không thể đồng nhất cơ sở dữ liệu từ Express.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorText('Lỗi kết nối máy chủ quản trị. Đang hiển thị dữ liệu tạm thời.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPersonnelData();
  }, []);

  const clearStaffForm = () => {
    setEditingStaffId(null);
    setStaffName('');
    setStaffTitle('Bác Sĩ Điều Trị');
    setStaffEmail('');
    setStaffDept('Phòng Siêu Âm');
    setStaffRole('general');
    setStaffStatus('Đang làm việc');
    setStaffShift(12);
    setStaffBirthDate('');
    setStaffGender('Nam');
    setStaffQualification('Bác sĩ');
    setStaffDegree('ĐH');
    setStaffPhone('');
    setStaffAddress('');
    setStaffNotes('');
    setIsStaffFormOpen(false);
  };

  const clearDeptForm = () => {
    setEditingDeptId(null);
    setDeptName('');
    setDeptCode('');
    setDeptLocation('');
    setDeptPhone('');
    setDeptDesc('');
    setDeptHeadId('');
    setIsDeptFormOpen(false);
  };

  // Staff CRUD Actions
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim() || !staffEmail.trim()) {
      setErrorText('Họ tên và Thư điện tử (Email) không được để trống.');
      return;
    }

    setIsLoading(true);
    try {
      const payload: Partial<ServerStaff> = {
        name: staffName,
        title: staffTitle,
        email: staffEmail,
        departmentName: staffDept,
        role: staffRole,
        status: staffStatus,
        shiftCount: Number(staffShift) || 0,
        birthDate: staffBirthDate ? staffBirthDate : undefined,
        gender: staffGender,
        qualification: staffQualification,
        degree: staffDegree,
        phone: staffPhone,
        address: staffAddress,
        notes: staffNotes,
      };

      if (editingStaffId) {
        payload.id = editingStaffId;
      }

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessText(editingStaffId ? 'Cập nhật nhân sự chuyên khoa thành công!' : 'Thêm nhân sự mới thành công!');
        setTimeout(() => setSuccessText(null), 3000);
        clearStaffForm();
        await fetchAllPersonnelData();
      } else {
        throw new Error('Phản hồi lỗi từ máy chủ API.');
      }
    } catch (err: any) {
      setErrorText('Không thể lưu thông tin nhân sự. Vui lòng kiểm tra kết nối.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStaffClick = (staff: ServerStaff) => {
    setEditingStaffId(staff.id);
    setStaffName(staff.name);
    setStaffTitle(staff.title);
    setStaffEmail(staff.email);
    setStaffDept(staff.departmentName);
    setStaffRole(staff.role);
    setStaffStatus(staff.status);
    setStaffShift(staff.shiftCount);
    setStaffBirthDate(staff.birthDate || '');
    setStaffGender(staff.gender || 'Nam');
    setStaffQualification(staff.qualification || 'Bác sĩ');
    setStaffDegree(staff.degree || 'ĐH');
    setStaffPhone(staff.phone || '');
    setStaffAddress(staff.address || '');
    setStaffNotes(staff.notes || '');
    setIsStaffFormOpen(true);
    setErrorText(null);
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    setConfirmModal({
      title: 'Xác nhận xóa nhân sự',
      message: `Bạn có chắc chắn muốn xóa nhân sự "${name}" khỏi biên chế trực khoa? Thao tác này ghi nhận tức thì vào nhật ký.`,
      onConfirm: async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/users/${id}`, {
            method: 'DELETE'
          });

          if (res.ok) {
            setSuccessText(`Đã gỡ bỏ nhân viên "${name}" thành công.`);
            setTimeout(() => setSuccessText(null), 3000);
            await fetchAllPersonnelData();
          } else {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Lỗi hệ thống');
          }
        } catch (err: any) {
          setErrorText(err.message || 'Không thể xóa tài sản nhân viên.');
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleResetPasswordByAdmin = async (id: string, name: string) => {
    setConfirmModal({
      title: 'Xác nhận gỡ bỏ mật khẩu',
      message: `Bạn có chắc chắn muốn xóa mật khẩu của nhân sự "${name}"? Tài khoản này sẽ có thể đăng nhập trực tiếp mà không cần mật khẩu.`,
      onConfirm: async () => {
        setIsLoading(true);
        try {
          const res = await fetch('/api/users/admin-reset', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: id })
          });

          if (res.ok) {
            setSuccessText(`Đã đặt lại mật khẩu cho "${name}" thành công.`);
            setTimeout(() => setSuccessText(null), 3000);
            await fetchAllPersonnelData();
          } else {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Lỗi hệ thống');
          }
        } catch (err: any) {
          setErrorText(err.message || 'Không thể reset mật khẩu.');
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  // Department CRUD Actions
  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) {
      setErrorText('Tên phòng ban và Mã ký hiệu không được rỗng.');
      return;
    }

    setIsLoading(true);
    try {
      // Find head staff name
      const matchedHead = staffList.find(s => s.id === deptHeadId);
      const headName = matchedHead ? matchedHead.name : 'Chưa chỉ định';

      const payload: Partial<ServerDepartment> = {
        name: deptName,
        code: deptCode,
        location: deptLocation,
        phone: deptPhone,
        description: deptDesc,
        headId: deptHeadId,
        headName: headName
      };

      if (editingDeptId) {
        payload.id = editingDeptId;
      }

      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessText(editingDeptId ? 'Cập nhật cơ cấu tổ chức thành công!' : 'Khởi lập thành công phòng chức năng mới!');
        setTimeout(() => setSuccessText(null), 3000);
        clearDeptForm();
        await fetchAllPersonnelData();
      } else {
        throw new Error('Lỗi máy chủ Express.');
      }
    } catch (err: any) {
      setErrorText('Không thể lưu thông tin phòng ban.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditDeptClick = (dept: ServerDepartment) => {
    setEditingDeptId(dept.id);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setDeptLocation(dept.location);
    setDeptPhone(dept.phone);
    setDeptDesc(dept.description);
    setDeptHeadId(dept.headId);
    setIsDeptFormOpen(true);
    setErrorText(null);
  };

  const handleDeleteDept = async (id: string, name: string) => {
    setConfirmModal({
      title: 'Xác nhận giải thể đơn vị',
      message: `Xác nhận giải thể/sáp nhập phòng ban "${name}"? Thao tác này ghi nhận tức thì vào nhật ký.`,
      onConfirm: async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/departments/${id}`, {
            method: 'DELETE'
          });

          if (res.ok) {
            setSuccessText(`Đã giải thể đơn vị "${name}".`);
            setTimeout(() => setSuccessText(null), 3000);
            await fetchAllPersonnelData();
          } else {
            throw new Error('Lợi ích sáp nhập bị gián đoạn.');
          }
        } catch (err: any) {
          setErrorText('Không thể xóa đơn vị phòng ban này.');
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  // Live filtering
  const filteredStaff = staffList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // We match clean department
    const matchesDept = deptFilter === 'all' || s.departmentName === deptFilter;
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;

    return matchesSearch && matchesDept && matchesRole;
  });

  return (
    <div id="personnel-department-workspace" className="adaptive-card border rounded-xl shadow-xs p-4 sm:p-5 space-y-4 transition-all duration-300">
      {/* Header and statistics banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 gap-4 adaptive-border">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-305 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border border-sky-150 dark:border-sky-900/30">
            <Building2 className="w-3.5 h-3.5 text-sky-605" />
            Hệ thống Quản trị & Điều động
          </div>
          <h3 className="text-sm font-black flex items-center gap-2 uppercase tracking-wide adaptive-text">
            Phân hệ Quản lý Nhân sự & Cơ cấu Tổ chức Khoa
          </h3>
          <p className="text-[11px] max-w-2xl leading-normal font-medium adaptive-text-muted">
            Quản lý danh sách cán bộ, y bác sĩ và cơ cấu 6 phân khoa Cận lâm sàng. Ghi nhận nhật ký điều động và xếp ca trực tự động, áp dụng quy trình kiểm chuẩn hành chính số 1 bám sát HIS.
          </p>
        </div>

        {/* Workspace controls */}
        <div className="flex items-center gap-2 self-start md:self-center">
          {activeSubTab === 'staff' && (
            <button
              onClick={() => setIsExcelImportOpen(!isExcelImportOpen)}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 shadow-3xs active:scale-98 transition dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {isExcelImportOpen ? 'Đóng Nhập Excel' : 'Nhập Excel'}
            </button>
          )}
          {activeSubTab !== 'logs' && activeSubTab !== 'printSettings' && (
            <button
              onClick={() => {
                if (activeSubTab === 'staff') {
                  clearStaffForm();
                  setIsStaffFormOpen(true);
                } else if (activeSubTab === 'depts') {
                  clearDeptForm();
                  setIsDeptFormOpen(true);
                }
              }}
              style={{ backgroundColor: systemSettings?.themeColor || '#4f46e5' }}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-black rounded-lg text-white hover:opacity-90 shadow-3xs active:scale-98 transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {activeSubTab === 'depts' ? 'Thêm phòng ban mới' : 'Thêm nhân sự'}
            </button>
          )}
        </div>
      </div>

      {/* Internal Nav Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 adaptive-tab-bar border p-1 rounded-lg w-fit transition-all duration-300">
        <button
          onClick={() => { setActiveSubTab('staff'); setErrorText(null); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10.5px] font-bold transition select-none cursor-pointer ${
            activeSubTab === 'staff'
              ? 'bg-white dark:bg-slate-800 shadow-3xs font-black border border-slate-200/50'
              : 'adaptive-text-muted hover:text-slate-900 hover:bg-slate-200/30'
          }`}
          style={activeSubTab === 'staff' ? { color: systemSettings?.themeColor || '#4f46e5' } : {}}
        >
          <Users className="w-3.5 h-3.5 text-indigo-500" />
          Nhân sự Chuyên khoa ({staffList.length})
        </button>

        <button
          onClick={() => { setActiveSubTab('depts'); setErrorText(null); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10.5px] font-bold transition select-none cursor-pointer ${
            activeSubTab === 'depts'
              ? 'bg-white dark:bg-slate-800 shadow-3xs font-black border border-slate-200/50'
              : 'adaptive-text-muted hover:text-slate-900 hover:bg-slate-200/30'
          }`}
          style={activeSubTab === 'depts' ? { color: systemSettings?.themeColor || '#4f46e5' } : {}}
        >
          <Building2 className="w-3.5 h-3.5 text-emerald-500" />
          Khoa phòng & Thiết chế ({deptList.length})
        </button>

        <button
          onClick={() => { setActiveSubTab('procedures'); setErrorText(null); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10.5px] font-bold transition select-none cursor-pointer ${
            activeSubTab === 'procedures'
              ? 'bg-white dark:bg-slate-800 shadow-3xs font-black border border-slate-200/50'
              : 'adaptive-text-muted hover:text-slate-900 hover:bg-slate-200/30'
          }`}
          style={activeSubTab === 'procedures' ? { color: systemSettings?.themeColor || '#4f46e5' } : {}}
        >
          <Activity className="w-3.5 h-3.5 text-indigo-500" />
          Dịch vụ Kỹ thuật ({procedures.length})
        </button>

        <button
          onClick={() => { setActiveSubTab('logs'); setErrorText(null); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10.5px] font-bold transition select-none cursor-pointer ${
            activeSubTab === 'logs'
              ? 'bg-white dark:bg-slate-800 shadow-3xs font-black border border-slate-200/50'
              : 'adaptive-text-muted hover:text-slate-900 hover:bg-slate-200/30'
          }`}
          style={activeSubTab === 'logs' ? { color: systemSettings?.themeColor || '#4f46e5' } : {}}
        >
          <History className="w-3.5 h-3.5 text-amber-500" />
          Nhật ký Nghiệp vụ ({auditLogs.length})
        </button>

        <button
          onClick={() => { setActiveSubTab('printSettings'); setErrorText(null); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10.5px] font-bold transition select-none cursor-pointer ${
            activeSubTab === 'printSettings'
              ? 'bg-white dark:bg-slate-800 shadow-3xs font-black border border-slate-200/50'
              : 'adaptive-text-muted hover:text-slate-900 hover:bg-slate-200/30'
          }`}
          style={activeSubTab === 'printSettings' ? { color: systemSettings?.themeColor || '#4f46e5' } : {}}
        >
          <Printer className="w-3.5 h-3.5 text-blue-500" />
          Cài đặt in ấn
        </button>

        <button
          onClick={() => { setActiveSubTab('themeSettings'); setErrorText(null); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10.5px] font-bold transition select-none cursor-pointer ${
            activeSubTab === 'themeSettings'
              ? 'bg-white dark:bg-slate-800 shadow-3xs font-black border border-slate-200/50'
              : 'adaptive-text-muted hover:text-slate-900 hover:bg-slate-200/30'
          }`}
          style={activeSubTab === 'themeSettings' ? { color: systemSettings?.themeColor || '#4f46e5' } : {}}
        >
          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          Cấu hình Giao diện 🎨
        </button>

        <button
          onClick={() => { setActiveSubTab('googleSheets'); setErrorText(null); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10.5px] font-bold transition select-none cursor-pointer ${
            activeSubTab === 'googleSheets'
              ? 'bg-white dark:bg-slate-800 shadow-3xs font-black border border-slate-200/50'
              : 'adaptive-text-muted hover:text-slate-900 hover:bg-slate-200/30'
          }`}
          style={activeSubTab === 'googleSheets' ? { color: systemSettings?.themeColor || '#4f46e5' } : {}}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          Đồng bộ Google Sheets 📊
        </button>
      </div>

      {/* Feedback Messages */}
      {errorText && (
        <div className="bg-red-50 border border-red-150 text-red-800 rounded-lg p-3 text-[11px] font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorText}</span>
          </div>
          <button onClick={() => setErrorText(null)} className="text-red-400 hover:text-red-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successText && (
        <div className="bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-lg p-3 text-[11px] font-bold flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-500" />
          <span>{successText}</span>
        </div>
      )}

      {/* SUB-TAB 1: STAFF DIRECTORY AND MANAGEMENT */}
      {activeSubTab === 'staff' && (
        <div className="space-y-4">
          
          {isExcelImportOpen && (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 animate-fade-in shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 dark:border-slate-800 pb-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    Nhập danh sách nhân sự từ Excel
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Hệ thống tự động đồng bộ hàng loạt hồ sơ, phòng tránh trùng lặp email và tự động bổ sung lịch sử hệ thống.
                  </p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-3xs transition self-start sm:self-center"
                >
                  <FileDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Tải Excel mẫu (.xlsx) 📥
                </button>
              </div>

              {/* Upload drag drop style area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-950 border-2 border-dashed border-slate-250 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-6 transition text-center relative flex flex-col justify-center items-center min-h-[140px]">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleExcelImportFile}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={isExcelImportingProgress}
                  />
                  <UploadCloud className="w-8 h-8 text-slate-400 dark:text-slate-600 mb-2 animate-pulse" />
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                    Kéo & thả tệp Excel vào đây hoặc click để duyệt
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Định dạng hỗ trợ: .xlsx, .xls, .csv
                  </p>
                </div>

                {/* Parsing logs */}
                <div className="flex flex-col justify-between space-y-2">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-450 dark:text-slate-500">
                    Nhật ký phân tích dữ liệu:
                  </span>
                  <div className="flex-1 bg-slate-950 text-slate-300 font-mono text-[10px] p-3 rounded-lg overflow-y-auto max-h-[110px] space-y-1 shadow-inner">
                    {excelImportLogs.length > 0 ? (
                      excelImportLogs.map((log, lIdx) => (
                        <div key={lIdx} className={log.includes('✅') ? 'text-emerald-400 font-bold' : log.includes('⚠️') ? 'text-amber-400' : log.includes('❌') ? 'text-rose-400 font-black' : 'text-slate-400'}>
                          {log}
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 italic text-center py-4">Chưa tải tệp nào lên...</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Feedback and trigger button */}
              {excelImportError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-bold leading-relaxed shadow-3xs dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300 animate-fade-in">
                  ⚠️ {excelImportError}
                </div>
              )}

              {excelImportSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold leading-relaxed shadow-3xs dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300 animate-fade-in">
                  ✅ {excelImportSuccess}
                </div>
              )}

              {parsedExcelUsers.length > 0 && (
                <div className="flex items-center justify-between bg-emerald-500/10 dark:bg-emerald-400/5 border border-emerald-500/25 p-3 rounded-xl animate-fade-in">
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Đã chuẩn bị sẵn <span className="font-extrabold underline">{parsedExcelUsers.length}</span> tài khoản cán bộ để đồng bộ vào cơ sở dữ liệu.
                  </div>
                  <button
                    onClick={handleSyncExcelUsers}
                    disabled={isExcelImportingProgress}
                    className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] px-4 py-2 rounded-lg shadow-3xs hover:shadow-2xs active:scale-98 transition disabled:opacity-50 shrink-0"
                  >
                    {isExcelImportingProgress ? 'Đang đồng bộ...' : 'Đồng bộ ngay 🚀'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Staff Statistics Dashboard Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 space-y-1">
              <span className="text-[9px] font-black text-indigo-700/80 uppercase tracking-widest block">Tổng biên chế</span>
              <div className="flex items-center gap-1">
                <span className="text-xl font-mono font-black text-indigo-950">{staffList.length}</span>
                <span className="text-[10px] text-slate-450 font-bold">Thành viên khoa</span>
              </div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 space-y-1">
              <span className="text-[9px] font-black text-emerald-700/80 uppercase tracking-widest block">Đang làm việc</span>
              <div className="flex items-center gap-1">
                <span className="text-xl font-mono font-black text-emerald-950 flex items-center">
                  {staffList.filter(s => s.status === 'Đang làm việc').length}
                </span>
                <span className="text-[10px] text-slate-450 font-bold">Đang hoạt động</span>
              </div>
            </div>

            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 space-y-1">
              <span className="text-[9px] font-black text-amber-700/80 uppercase tracking-widest block">Nghỉ / Vắng mặt</span>
              <div className="flex items-center gap-1">
                <span className="text-xl font-mono font-black text-amber-950">
                  {staffList.filter(s => ['Nghỉ không lương', 'Nghỉ thai sản', 'Nghỉ việc'].includes(s.status || '')).length}
                </span>
                <span className="text-[10px] text-slate-450 font-bold">Nhân sự tạm vắng hoặc nghỉ</span>
              </div>
            </div>

            <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-3 space-y-1">
              <span className="text-[9px] font-black text-sky-700/80 uppercase tracking-widest block">Độ bao phủ chuyên môn</span>
              <div className="flex items-center gap-1">
                <span className="text-xl font-mono font-black text-sky-950">100%</span>
                <span className="text-[10px] text-slate-450 font-bold">Đạt mức tối ưu</span>
              </div>
            </div>
          </div>

          {/* Controls: Search and Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-slate-50 border border-slate-150 p-3 rounded-xl">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Tìm nhân viên theo tên, email, chức danh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-[11px] bg-white border border-slate-200/80 rounded-lg pl-8 pr-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-white border border-slate-200/80 rounded-lg text-[10.5px] font-medium px-2 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">Tất cả Phòng ban</option>
                {Array.from(new Set(staffList.map(s => s.departmentName))).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-white border border-slate-200/80 rounded-lg text-[10.5px] font-medium px-2 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">Tất cả vai trò</option>
                <option value="admin">Quản trị viên (Admin)</option>
                <option value="truongKhoa">Trưởng khoa</option>
                <option value="phoKhoa">Phó khoa</option>
                <option value="general">Nhân viên</option>
              </select>
            </div>
          </div>

          {/* Form Create/Edit Staff Block Modal */}
          {isStaffFormOpen && (
            <div 
              onClick={clearStaffForm}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in"
            >
              <form 
                onSubmit={handleSaveStaff} 
                onClick={(e) => e.stopPropagation()}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-2xl max-w-2xl w-full overflow-hidden animate-scale-up text-slate-800"
              >
                <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                  <span className="text-sm font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-indigo-600" />
                    {editingStaffId ? 'Cập nhật hồ sơ nhân sự' : 'Khai báo nhân sự trực mới'}
                  </span>
                  <button
                    type="button"
                    onClick={clearStaffForm}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Học hàm & Họ tên:</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: BS. Nguyễn Văn A"
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-550 focus:bg-white focus:outline-none transition-all font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Chức vụ / Chức danh:</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Bác sĩ điều trị / Kỹ thuật viên trưởng"
                      value={staffTitle}
                      onChange={(e) => setStaffTitle(e.target.value)}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-550 focus:bg-white focus:outline-none transition-all font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Thư điện tử (Email):</label>
                    <input
                      type="email"
                      required
                      placeholder="VD: mail.nhanvien@hospital.gov.vn"
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-550 focus:bg-white focus:outline-none transition-all font-mono font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Phòng trực / Khoa chỉ định:</label>
                    <select
                      value={staffDept}
                      onChange={(e) => setStaffDept(e.target.value)}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-550 focus:bg-white focus:outline-none transition-all font-semibold"
                    >
                      {deptList.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                      <option value="Khác">Phòng ban bổ sung khác</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Hạn mức vai trò chỉ số:</label>
                    <select
                      value={staffRole}
                      onChange={(e) => setStaffRole(e.target.value as any)}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-550 focus:bg-white focus:outline-none transition-all font-semibold"
                    >
                      <option value="admin">Quản trị viên (Admin)</option>
                      <option value="truongKhoa">Trưởng khoa</option>
                      <option value="phoKhoa">Phó khoa</option>
                      <option value="general">Nhân viên</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Trạng thái làm việc:</label>
                    <select
                      value={staffStatus}
                      onChange={(e) => setStaffStatus(e.target.value)}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-550 focus:bg-white focus:outline-none transition-all font-semibold"
                    >
                      <option value="Đang làm việc">Đang làm việc</option>
                      <option value="Nghỉ không lương">Nghỉ không lương</option>
                      <option value="Nghỉ thai sản">Nghỉ thai sản</option>
                      <option value="Nghỉ việc">Nghỉ việc</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Ngày sinh (DD/MM/YYYY):</label>
                    <input
                      type="text"
                      placeholder="VD: 15/08/1985"
                      value={staffBirthDate}
                      onChange={(e) => {
                        let value = e.target.value;
                        value = value.replace(/[^\d/]/g, '');
                        // Basic auto-insert slash assist
                        if (value.length === 2 && !value.includes('/')) {
                          value += '/';
                        } else if (value.length === 5 && value.split('/').length === 2) {
                          value += '/';
                        }
                        if (value.length > 10) value = value.substring(0, 10);
                        setStaffBirthDate(value);
                      }}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-550 focus:bg-white focus:outline-none transition-all font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Giới tính:</label>
                    <select
                      value={staffGender}
                      onChange={(e) => setStaffGender(e.target.value)}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-550 focus:bg-white focus:outline-none transition-all font-semibold"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Trình độ chuyên môn:</label>
                    <input
                      type="text"
                      placeholder="VD: Bác sĩ, Thạc sĩ, KTV, Cử nhân..."
                      value={staffQualification}
                      onChange={(e) => setStaffQualification(e.target.value)}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-550 focus:bg-white focus:outline-none transition-all font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Bằng cấp:</label>
                    <select
                      value={staffDegree}
                      onChange={(e) => setStaffDegree(e.target.value)}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-550 focus:bg-white focus:outline-none transition-all font-semibold"
                    >
                      <option value="ĐH">Đại học (ĐH)</option>
                      <option value="Trên ĐH">Sau đại học (Trên ĐH)</option>
                      <option value="CĐ">Cao đẳng (CĐ)</option>
                      <option value="TC">Trung cấp (TC)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Số điện thoại liên lạc:</label>
                    <input
                      type="tel"
                      placeholder="VD: 0987xxxxxx"
                      value={staffPhone}
                      onChange={(e) => setStaffPhone(e.target.value)}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-550 focus:bg-white focus:outline-none transition-all font-semibold font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Địa chỉ hiện tại:</label>
                    <input
                      type="text"
                      placeholder="VD: Quận Đống Đa, Hà Nội"
                      value={staffAddress}
                      onChange={(e) => setStaffAddress(e.target.value)}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-550 focus:bg-white focus:outline-none transition-all font-semibold"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Ghi chú / Thông tin thêm:</label>
                    <textarea
                      placeholder="VD: Lưu ý đặc biệt, liên hệ dự phòng, phân công riêng..."
                      value={staffNotes}
                      onChange={(e) => setStaffNotes(e.target.value)}
                      rows={2}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-550 focus:bg-white focus:outline-none transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-150">
                  <button
                    type="button"
                    onClick={clearStaffForm}
                    className="px-4 py-2 rounded-lg border border-slate-255 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold shadow-3xs cursor-pointer active:scale-98 transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md cursor-pointer active:scale-98 transition disabled:opacity-50"
                  >
                    {isLoading ? 'Đang gửi chỉ thị...' : 'Xác minh & Lưu nhân viên'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Staff Directory Table List */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-md bg-white">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead className="bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider select-none border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center w-12 min-w-[48px] max-w-[48px] border-r border-slate-700/50 sticky left-0 bg-slate-800 z-20">STT</th>
                  <th className="py-3 px-4 min-w-[160px] border-r border-slate-700/50 sticky left-12 bg-slate-800 z-20">Họ và tên (Xem chi tiết 👤)</th>
                  <th className="py-3 px-3 min-w-[120px] border-r border-slate-700/50">Chức danh</th>
                  <th className="py-3 px-4 min-w-[140px] border-r border-slate-700/50">Bộ phận</th>
                  <th className="py-3 px-4 min-w-[180px] border-r border-slate-700/50">Số điện thoại / Email</th>
                  <th className="py-3 px-3 text-center min-w-[110px] border-r border-slate-700/50">Trạng thái</th>
                  <th className="py-3 px-4 text-center w-24">Phím nhấn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-[11.5px] text-slate-700">
                {filteredStaff.map((staff, idx) => {
                  const age = getAgeFromBirthDate(staff.birthDate);
                  const isAdmin = staff.role === 'admin';
                  const isTruongKhoa = staff.role === 'truongKhoa';
                  const isPhoKhoa = staff.role === 'phoKhoa';
                  const isNhanVien = staff.role === 'general' || staff.role === 'nhanVien' || !staff.role;

                  // Status pill color mapping
                  let statusBadge = 'bg-slate-50 text-slate-600 border-slate-205';
                  if (staff.status === 'Đang làm việc') {
                    statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold';
                  } else if (staff.status === 'Nghỉ không lương') {
                    statusBadge = 'bg-amber-50/60 text-amber-800 border-amber-200 font-extrabold';
                  } else if (staff.status === 'Nghỉ thai sản') {
                    statusBadge = 'bg-pink-50 text-pink-700 border-pink-200 font-extrabold';
                  } else if (staff.status === 'Nghỉ việc') {
                    statusBadge = 'bg-red-50 text-red-700 border-red-200 font-extrabold';
                  }

                  return (
                    <tr 
                      key={staff.id} 
                      className={`group hover:bg-slate-50 transition-all ${
                        idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                      }`}
                    >
                      <td className={`py-3 px-3 text-center font-bold text-slate-500 border-r border-slate-100 sticky left-0 z-10 w-12 min-w-[48px] max-w-[48px] transition-all group-hover:bg-slate-100/80 ${
                        idx % 2 === 1 ? 'bg-[#f8fafc]' : 'bg-white'
                      }`}>{idx + 1}</td>
                      <td className={`py-3 px-4 border-r border-slate-200 sticky left-12 z-10 min-w-[160px] transition-all group-hover:bg-slate-100/80 ${
                        idx % 2 === 1 ? 'bg-[#f8fafc]' : 'bg-white'
                      }`}>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => {
                              setViewingStaff(staff);
                              setIsDetailModalOpen(true);
                            }}
                            className="text-left font-extrabold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline flex items-center gap-1.5 flex-wrap cursor-pointer"
                          >
                            <span>{staff.name}</span>
                            {isAdmin && (
                              <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase select-none flex items-center gap-1 scale-90" title="Quản trị viên">
                                <Shield className="w-2.5 h-2.5" />
                                AD
                              </span>
                            )}
                            {isTruongKhoa && (
                              <span className="bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded uppercase select-none scale-90" title="Trưởng khoa">
                                TK
                              </span>
                            )}
                            {isPhoKhoa && (
                              <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded uppercase select-none scale-90" title="Phó khoa">
                                PK
                              </span>
                            )}
                            {isNhanVien && (
                              <span className="bg-slate-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded uppercase select-none scale-90" title="Nhân viên">
                                NV
                              </span>
                            )}
                          </button>
                          {staff.passwordResetRequested && (
                            <span className="text-[9px] text-amber-600 font-black mt-0.5 animate-pulse">
                              ⚠️ Request Reset
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 border-r border-slate-100 font-semibold">{staff.title}</td>
                      <td className="py-3 px-4 border-r border-slate-100">
                        <span className="font-extrabold text-slate-800">{staff.departmentName}</span>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-100 space-y-0.5">
                        <div className="font-semibold text-slate-900 font-mono select-all">
                          {staff.phone || '---'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono leading-none select-all">
                          {staff.email}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center border-r border-slate-100">
                        <span className={`text-[9.5px] px-2 py-0.5 rounded-full border inline-block whitespace-nowrap ${statusBadge}`}>
                          {staff.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {staff.passwordResetRequested ? (
                            <button
                              onClick={() => handleResetPasswordByAdmin(staff.id, staff.name)}
                              title="Duyệt reset mật khẩu"
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-black text-[9px] transition cursor-pointer"
                            >
                              Reset
                            </button>
                          ) : null}
                          <button
                            onClick={() => handleEditStaffClick(staff)}
                            title="Sửa hồ sơ nhân sự"
                            className="p-1 px-1.5 rounded border border-indigo-150 hover:bg-indigo-50 text-indigo-700 cursor-pointer text-[10px] font-bold flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(staff.id, staff.name)}
                            title="Xóa hồ sơ khỏi khoa"
                            className="p-1 px-1.5 rounded border border-rose-200 hover:bg-rose-50 text-rose-700 cursor-pointer text-[10px] font-bold flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredStaff.length === 0 && (
              <div className="border-t border-slate-200 py-12 px-4 text-center space-y-2">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Không có nhân sự trùng khớp</p>
                <p className="text-[10px] text-slate-450">Vui lòng điều chỉnh điều kiện lọc hoặc khai báo nhân sự mới.</p>
              </div>
            )}
          </div>

          {/* Staff Detail View Modal */}
          {isDetailModalOpen && viewingStaff && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[10000] p-4 animate-fade-in text-slate-800 dark:text-slate-100">
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal Header with solid theme background */}
                <div 
                  className="px-6 py-5 text-white flex items-center justify-between relative"
                  style={{ backgroundColor: systemSettings?.themeColor || '#4f46e5' }}
                >
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-white/80 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" /> Chi tiết hồ sơ nhân sự
                    </span>
                    <h3 className="text-lg font-black tracking-tight">{viewingStaff.name}</h3>
                  </div>
                  <button 
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      setViewingStaff(null);
                    }}
                    className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                  {/* Summary Banner with custom styling */}
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-150 dark:border-slate-850">
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center font-black text-xl text-white select-none shadow-sm"
                      style={{ backgroundColor: systemSettings?.themeColor || '#4f46e5' }}
                    >
                      {viewingStaff.name.split(' ').pop()?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">{viewingStaff.name}</span>
                        {viewingStaff.role === 'admin' && (
                          <span className="bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                            AD
                          </span>
                        )}
                        {viewingStaff.role === 'truongKhoa' && (
                          <span className="bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                            TK
                          </span>
                        )}
                        {viewingStaff.role === 'phoKhoa' && (
                          <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                            PK
                          </span>
                        )}
                        {(!viewingStaff.role || viewingStaff.role === 'general' || viewingStaff.role === 'nhanVien') && (
                          <span className="bg-slate-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                            NV
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-550 dark:text-slate-400 font-bold">{viewingStaff.title || 'Chưa rõ chức danh'}</p>
                    </div>
                  </div>

                  {/* Grid of Attributes */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-extrabold text-slate-450 dark:text-slate-500 tracking-wider">Bộ phận công tác</span>
                      <p className="font-extrabold text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        {viewingStaff.departmentName || '---'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-extrabold text-slate-450 dark:text-slate-500 tracking-wider">Trạng thái</span>
                      <div>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full border inline-block font-extrabold ${
                          viewingStaff.status === 'Đang làm việc' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50' :
                          viewingStaff.status === 'Nghỉ không lương' ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400' :
                          viewingStaff.status === 'Nghỉ thai sản' ? 'bg-pink-50 text-pink-700 border-pink-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {viewingStaff.status || '---'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 border-t border-slate-100 dark:border-slate-850 pt-2.5">
                      <span className="text-[10px] uppercase font-extrabold text-slate-450 dark:text-slate-500 tracking-wider">Ngày sinh / Tuổi</span>
                      <p className="font-bold text-slate-805 dark:text-slate-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        {viewingStaff.birthDate ? `${viewingStaff.birthDate} (Tuổi: ${getAgeFromBirthDate(viewingStaff.birthDate)})` : '---'}
                      </p>
                    </div>

                    <div className="space-y-1 border-t border-slate-100 dark:border-slate-850 pt-2.5">
                      <span className="text-[10px] uppercase font-extrabold text-slate-450 dark:text-slate-500 tracking-wider">Giới tính</span>
                      <p className="font-bold text-slate-805 dark:text-slate-300">
                        {viewingStaff.gender || 'Nam'}
                      </p>
                    </div>

                    <div className="space-y-1 border-t border-slate-100 dark:border-slate-850 pt-2.5">
                      <span className="text-[10px] uppercase font-extrabold text-slate-450 dark:text-slate-500 tracking-wider">Trình độ chuyên môn</span>
                      <p className="font-bold text-slate-805 dark:text-slate-300 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        {viewingStaff.qualification || 'Bác sĩ'}
                      </p>
                    </div>

                    <div className="space-y-1 border-t border-slate-100 dark:border-slate-850 pt-2.5">
                      <span className="text-[10px] uppercase font-extrabold text-slate-450 dark:text-slate-500 tracking-wider">Bằng cấp</span>
                      <div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-black ${
                          viewingStaff.degree === 'Trên ĐH' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          viewingStaff.degree === 'ĐH' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          viewingStaff.degree === 'CĐ' ? 'bg-blue-105 text-blue-800 border border-blue-200' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {viewingStaff.degree || 'ĐH'}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-2 space-y-1 border-t border-slate-100 dark:border-slate-850 pt-2.5">
                      <span className="text-[10px] uppercase font-extrabold text-slate-450 dark:text-slate-500 tracking-wider">Số điện thoại</span>
                      <p className="font-bold text-slate-805 dark:text-slate-300 flex items-center gap-1.5">
                        <PhoneCall className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        {viewingStaff.phone ? (
                          <a href={`tel:${viewingStaff.phone}`} className="hover:underline hover:text-indigo-600">{viewingStaff.phone}</a>
                        ) : '---'}
                      </p>
                    </div>

                    <div className="col-span-2 space-y-1 border-t border-slate-100 dark:border-slate-850 pt-2.5">
                      <span className="text-[10px] uppercase font-extrabold text-slate-450 dark:text-slate-500 tracking-wider">Thư điện tử (Email)</span>
                      <p className="font-mono text-slate-805 dark:text-slate-300 flex items-center gap-1.5 select-all">
                        <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        {viewingStaff.email ? (
                          <a href={`mailto:${viewingStaff.email}`} className="hover:underline hover:text-indigo-600">{viewingStaff.email}</a>
                        ) : '---'}
                      </p>
                    </div>

                    <div className="col-span-2 space-y-1 border-t border-slate-100 dark:border-slate-850 pt-2.5">
                      <span className="text-[10px] uppercase font-extrabold text-slate-450 dark:text-slate-500 tracking-wider">Địa chỉ liên hệ</span>
                      <p className="font-bold text-slate-805 dark:text-slate-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        {viewingStaff.address || '---'}
                      </p>
                    </div>

                    <div className="col-span-2 space-y-1 border-t border-slate-100 dark:border-slate-850 pt-2.5">
                      <span className="text-[10px] uppercase font-extrabold text-slate-450 dark:text-slate-500 tracking-wider">Ghi chú</span>
                      <p className="font-semibold text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850">
                        {viewingStaff.notes || 'Không có ghi chú nào thêm.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-850 flex items-center justify-end gap-2.5">
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      setViewingStaff(null);
                      handleEditStaffClick(viewingStaff);
                    }}
                    className="px-4 py-2 rounded-lg bg-white dark:bg-slate-950 hover:bg-slate-50 border border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-300 text-xs font-black shadow-3xs cursor-pointer active:scale-98 transition flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa hồ sơ
                  </button>
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      setViewingStaff(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-black shadow-3xs cursor-pointer active:scale-98 transition"
                  >
                    Đóng lại
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: DEPARTMENTS MANAGEMENT */}
      {activeSubTab === 'depts' && (
        <div className="space-y-4">
          
          {/* Department form Create/Edit Modal */}
          {isDeptFormOpen && (
            <div 
              onClick={clearDeptForm}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in"
            >
              <form 
                onSubmit={handleSaveDept} 
                onClick={(e) => e.stopPropagation()}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-2xl max-w-2xl w-full overflow-hidden animate-scale-up text-slate-800"
              >
                <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                  <span className="text-sm font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    {editingDeptId ? 'Cập nhật phân bộ / Khoa phòng' : 'Khai lập phân khoa chức năng mới'}
                  </span>
                  <button
                    type="button"
                    onClick={clearDeptForm}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Tên phân khoa / Phòng ban:</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Phòng Siêu Âm Chẩn Đoán / Phòng Chụp Cắt Lớp"
                      value={deptName}
                      onChange={(e) => setDeptName(e.target.value)}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-emerald-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Mã ký hiệu văn bản (Code):</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: SA, NS, CLVT"
                      value={deptCode}
                      onChange={(e) => setDeptCode(e.target.value)}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-emerald-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all font-mono font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Vị trí tuyến phòng khám (Location):</label>
                    <input
                      type="text"
                      placeholder="VD: Phòng 201, Tầng 2, Nhà T"
                      value={deptLocation}
                      onChange={(e) => setDeptLocation(e.target.value)}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-emerald-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Số tổng đài nội bộ (Extension IP):</label>
                    <input
                      type="text"
                      placeholder="VD: 024-3851-1234 (Ext: 102)"
                      value={deptPhone}
                      onChange={(e) => setDeptPhone(e.target.value)}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-emerald-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Chỉ định Trưởng bộ phận (Department Head):</label>
                    <select
                      value={deptHeadId}
                      onChange={(e) => setDeptHeadId(e.target.value)}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-emerald-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all font-semibold"
                    >
                      <option value="">-- Chưa chỉ định Trưởng Bộ Phận --</option>
                      {staffList.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.title})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Mô tả chức năng chuyên môn phòng ban:</label>
                    <textarea
                      rows={3}
                      placeholder="Sơ lược về công tác khám, vai trò trực, kiểm tra chất lượng vật tư tiêu hao..."
                      value={deptDesc}
                      onChange={(e) => setDeptDesc(e.target.value)}
                      className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-emerald-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all font-semibold resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-150">
                  <button
                    type="button"
                    onClick={clearDeptForm}
                    className="px-4 py-2 rounded-lg border border-slate-255 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold shadow-3xs cursor-pointer active:scale-98 transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer active:scale-98 transition disabled:opacity-50"
                  >
                    {isLoading ? 'Đang tác động hệ HIS...' : 'Phê duyệt Thiết kế Phòng ban'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Department Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deptList.map((dept) => {
              // Calculate dynamic headcount
              const headcount = staffList.filter(s => s.departmentName === dept.name).length;

              return (
                <div key={dept.id} className="bg-slate-50 hover:bg-slate-50/50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 transition shadow-4xs group">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200 px-1.5 py-0.5 rounded font-mono">
                            {dept.code}
                          </span>
                          <span className="text-[10px] font-extrabold text-indigo-650">{headcount} nhân sự</span>
                        </div>
                        <h4 className="text-xs font-black text-slate-850 mt-1">{dept.name}</h4>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditDeptClick(dept)}
                          className="p-1 px-2 rounded bg-white hover:bg-slate-100 border border-slate-205 text-slate-700 font-extrabold text-[9.5px]"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteDept(dept.id, dept.name)}
                          className="p-1 px-2 rounded bg-white hover:bg-red-50 border border-slate-205 text-rose-600 font-extrabold text-[9.5px]"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>

                    <p className="text-[10.5px] leading-relaxed text-slate-550 font-medium">
                      {dept.description || 'Chưa thiết lập mô tả chức vụ hành chính cấp khoa phòng.'}
                    </p>
                  </div>

                  {/* Room metadata */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200/50 text-[10.5px] text-slate-600 font-medium bg-white/40 p-2 rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-450 text-[10px]">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>ĐỊA ĐIỂM / PHÒNG</span>
                      </div>
                      <span className="text-slate-800 font-bold block">{dept.location || 'Chưa xác định'}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-450 text-[10px]">
                        <PhoneCall className="w-3 h-3 text-slate-400" />
                        <span>SỐ MÁY NỘI BỘ</span>
                      </div>
                      <span className="text-slate-800 font-bold block">{dept.phone || 'Chưa thiết lập'}</span>
                    </div>

                    <div className="col-span-2 pt-1 border-t border-slate-100 flex items-center gap-1.5">
                      <span className="text-[9.5px] text-slate-400">TRƯỞNG BỘ PHẬN:</span>
                      <span className="text-[10px] text-indigo-700 font-black flex items-center gap-1">
                        <Fingerprint className="w-3 h-3 text-indigo-500" />
                        {dept.headName || 'Chưa chỉ định'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB: PROCEDURES MANAGEMENT */}
      {activeSubTab === 'procedures' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs space-y-4">
            <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              Thêm dịch vụ kỹ thuật mới
            </h3>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const nameEl = form.elements.namedItem('procName') as HTMLInputElement;
              const catEl = form.elements.namedItem('procCategory') as HTMLSelectElement;
              const name = nameEl.value.trim();
              const category = catEl.value;
              if (!name || !category) return;
              
              try {
                await onAddProcedure({ name, category });
                nameEl.value = '';
                setErrorText(null);
              } catch (err: any) {
                setErrorText(err.message || 'Lỗi thêm dịch vụ');
              }
            }} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="space-y-1.5 col-span-1 md:col-span-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Tên dịch vụ cận lâm sàng:</label>
                <input
                  name="procName"
                  type="text"
                  required
                  placeholder="VD: Siêu âm khớp gối, Nội soi đại tràng gây mê..."
                  className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5 col-span-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Chọn Phân khoa phụ trách:</label>
                <select
                  name="procCategory"
                  required
                  className="w-full text-xs bg-slate-50/50 border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-1.8 focus:ring-1 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all font-semibold h-[34px]"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.key} value={c.key}>{c.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                style={{ backgroundColor: systemSettings?.themeColor || '#4f46e5' }}
                className="w-full text-xs font-black text-white hover:opacity-90 rounded-lg px-4 py-2 hover:shadow h-[34px] transition active:scale-98 cursor-pointer flex items-center justify-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Khai lập Dịch vụ
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs space-y-4">
            <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2 border-b border-slate-150 pb-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              Danh mục dịch vụ kỹ thuật hiện thời ({procedures.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CATEGORIES.map(category => {
                const catProcs = procedures.filter(p => p.category === category.key);
                return (
                  <div key={category.key} className="border border-slate-200 rounded-xl bg-slate-50/50 p-4 space-y-3 shadow-4xs">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {category.name}
                      </span>
                      <span className="text-[10px] font-extrabold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                        {catProcs.length} dịch vụ
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                      {catProcs.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic">Không có dịch vụ kỹ thuật nào.</p>
                      ) : (
                        catProcs.map(proc => (
                          <div key={proc.id} className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-150 text-[11px] text-slate-700 font-semibold shadow-5xs hover:bg-slate-50/40 transition">
                            <span className="truncate flex-1 leading-normal" title={proc.name}>
                              {proc.name}
                            </span>
                            <button
                              onClick={() => {
                                setConfirmModal({
                                  title: "Xóa Dịch Vụ Kỹ Thuật",
                                  message: `Bạn có chắc chắn muốn xóa dịch vụ kỹ thuật "${proc.name}"? Số liệu tại các báo cáo đã duyệt sẽ vẫn được lưu danh mục nhưng không thể nhập mới.`,
                                  onConfirm: async () => {
                                    try {
                                      await onDeleteProcedure(proc.id);
                                      setErrorText(null);
                                    } catch (err: any) {
                                      setErrorText(err.message || 'Lỗi xóa dịch vụ');
                                    }
                                  }
                                });
                              }}
                              className="text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-50 transition cursor-pointer"
                              title="Xóa dịch vụ kỹ thuật"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MANAGEMENT AUDIT LOGS */}
      {activeSubTab === 'logs' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-emerald-500" />
              Nhật ký Hành động Quản trị toàn cục
            </span>
            <button
              onClick={fetchAllPersonnelData}
              className="px-2 py-1 rounded border border-slate-250 bg-slate-50 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition shadow-4xs shrink-0"
            >
              Làm mới nhật ký
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-4 max-h-[420px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="border-l-2 border-indigo-500 pl-3.5 py-0.5 space-y-1 flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                <div className="space-y-0.5">
                  <div className="flex items-center flex-wrap gap-1.5">
                    <span className="text-[11px] font-black text-slate-800">{log.action}</span>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-150 px-1.5 py-0.2 rounded-full">
                      Cấp quyền: {log.actor}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-550 leading-relaxed font-semibold">
                    {log.details}
                  </p>
                </div>

                <span className="text-[9px] font-mono font-black text-slate-400 bg-white border border-slate-205 px-2 py-0.5 rounded-full shrink-0 h-fit self-start sm:self-center">
                  {new Date(log.timestamp).toLocaleString('vi-VN')}
                </span>
              </div>
            ))}

            {auditLogs.length === 0 && (
              <p className="text-[10px] text-center text-slate-400 py-6">Chưa có thay đổi nghiệp vụ nào được vận hành.</p>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: PRINT SETTINGS */}
      {activeSubTab === 'printSettings' && (
        <form onSubmit={(e) => {
          e.preventDefault();
          localStorage.setItem('print-settings', JSON.stringify(printSettings));
          setSuccessText('Cập nhật cấu hình in và thông tin cơ quan thành công!');
          setTimeout(() => setSuccessText(null), 3000);
        }} className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[11.5px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-indigo-500" />
              Thiết lập Thông tin Cơ quan & Mẫu bản in báo cáo
            </span>
            <button
              type="button"
              onClick={() => {
                setConfirmModal({
                  title: 'Khôi phục cài đặt gốc',
                  message: 'Bạn có chắc chắn muốn khôi phục toàn bộ thông số in ấn về mặc định ban đầu?',
                  onConfirm: () => {
                    setPrintSettings(DEFAULT_PRINT_SETTINGS);
                    localStorage.setItem('print-settings', JSON.stringify(DEFAULT_PRINT_SETTINGS));
                    setSuccessText('Khôi phục cấu hình in mặc định thành công!');
                    setTimeout(() => setSuccessText(null), 3500);
                  }
                });
              }}
              className="px-2.5 py-1 rounded border border-slate-200 bg-red-50 text-[10px] font-bold text-red-700 hover:bg-red-100 transition shadow-4xs shrink-0 cursor-pointer"
            >
              Đặt lại mặc định
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Group 1: General Institution details */}
            <div className="space-y-3 bg-slate-50/50 p-4 border border-slate-200 rounded-xl">
              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-150 pb-1 flex items-center gap-1.5">I. THÔNG TIN CƠ QUAN CHỦ QUẢN & BỆNH VIỆN</h4>
              
              <div className="space-y-1">
                <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Cơ quan chủ quản:</label>
                <input
                  type="text"
                  value={printSettings.supervisoryOrgan}
                  onChange={(e) => setPrintSettings(prev => ({ ...prev, supervisoryOrgan: e.target.value }))}
                  className="w-full text-xs bg-white border border-slate-250 rounded-lg px-2.5 py-2 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Tên đơn vị / Bệnh viện:</label>
                <input
                  type="text"
                  value={printSettings.institutionName}
                  onChange={(e) => setPrintSettings(prev => ({ ...prev, institutionName: e.target.value }))}
                  className="w-full text-xs bg-white border border-slate-250 rounded-lg px-2.5 py-2 font-black focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-850"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Ban điều hành phụ đề:</label>
                <input
                  type="text"
                  value={printSettings.councilSubtitle}
                  onChange={(e) => setPrintSettings(prev => ({ ...prev, councilSubtitle: e.target.value }))}
                  className="w-full text-xs bg-white border border-slate-250 rounded-lg px-2.5 py-2 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Tiêu đề phụ báo cáo:</label>
                <input
                  type="text"
                  value={printSettings.reportSubtitle}
                  onChange={(e) => setPrintSettings(prev => ({ ...prev, reportSubtitle: e.target.value }))}
                  className="w-full text-xs bg-white border border-slate-250 rounded-lg px-2.5 py-2 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Mã số mẫu biểu:</label>
                  <input
                    type="text"
                    value={printSettings.modelNumber}
                    onChange={(e) => setPrintSettings(prev => ({ ...prev, modelNumber: e.target.value }))}
                    className="w-full text-xs bg-white border border-slate-250 rounded-lg px-2.5 py-2 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Trạng thái số liệu:</label>
                  <input
                    type="text"
                    value={printSettings.statusText}
                    onChange={(e) => setPrintSettings(prev => ({ ...prev, statusText: e.target.value }))}
                    className="w-full text-xs bg-white border border-slate-250 rounded-lg px-2.5 py-2 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Group 2: Signatures and Names */}
            <div className="space-y-3 bg-slate-50/50 p-4 border border-slate-200 rounded-xl">
              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-150 pb-1 flex items-center gap-1.5">II. NGƯỜI LẬP BIỂU & PHÊ DUYỆT CHỮ KÝ</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Họ tên người lập:</label>
                  <input
                    type="text"
                    value={printSettings.compilerName}
                    onChange={(e) => setPrintSettings(prev => ({ ...prev, compilerName: e.target.value }))}
                    className="w-full text-xs bg-white border border-slate-250 rounded-lg px-2.5 py-2 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Chức danh lập biểu:</label>
                  <input
                    type="text"
                    value={printSettings.compilerTitle}
                    onChange={(e) => setPrintSettings(prev => ({ ...prev, compilerTitle: e.target.value }))}
                    className="w-full text-xs bg-white border border-slate-250 rounded-lg px-2.5 py-2 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Họ tên người phê duyệt:</label>
                <input
                  type="text"
                  value={printSettings.approverName}
                  onChange={(e) => setPrintSettings(prev => ({ ...prev, approverName: e.target.value }))}
                  className="w-full text-xs bg-white border border-slate-250 rounded-lg px-2.5 py-2 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Chức vụ người duyệt chính:</label>
                <input
                  type="text"
                  value={printSettings.approverTitle}
                  onChange={(e) => setPrintSettings(prev => ({ ...prev, approverTitle: e.target.value }))}
                  className="w-full text-xs bg-white border border-slate-250 rounded-lg px-2.5 py-2 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Tiêu đề hội đồng duyệt phụ:</label>
                <input
                  type="text"
                  value={printSettings.approverSubtitle}
                  onChange={(e) => setPrintSettings(prev => ({ ...prev, approverSubtitle: e.target.value }))}
                  className="w-full text-xs bg-white border border-slate-250 rounded-lg px-2.5 py-2 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Tỉnh/Thành phố ký biểu:</label>
                <input
                  type="text"
                  value={printSettings.location}
                  onChange={(e) => setPrintSettings(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full text-xs bg-white border border-slate-250 rounded-lg px-2.5 py-2 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition active:scale-98 shadow-3xs cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 font-bold" />
              Lưu Cấu Hình Mẫu In Báo Cáo
            </button>
          </div>
        </form>
      )}

      {/* SUB-TAB 5: SYSTEM THEME CUSTOMIZATION */}
      {activeSubTab === 'themeSettings' && localSettings && (
        <div className="space-y-6 animate-fade-in my-3">
          <div 
            className="p-4 rounded-xl border space-y-1.5 shadow-3xs transition-all duration-300"
            style={{ 
              backgroundColor: `${localSettings.themeColor}05`, 
              borderColor: `${localSettings.themeColor}22` 
            }}
          >
            <h4 
              className="text-xs font-black flex items-center gap-1.5 uppercase tracking-wide"
              style={{ color: localSettings.themeColor }}
            >
              <Sparkles className="w-4 h-4 animate-pulse" style={{ color: localSettings.themeColor }} />
              Tùy biến nhãn hiệu, màu sắc & phong cách hệ thống
            </h4>
            <p className="text-[11px] text-slate-550 leading-relaxed font-semibold">
              Kính chào Admin! Là một Quản trị viên, bạn có quyền thay đổi toàn diện diện mạo và dấu ấn trải nghiệm của hệ thống giao ban. Hãy tùy chọn màu sắc dễ chịu (pastels, tone-on-tone dịu mát), đổi logo chuyên khoa hoặc cập nhật banner chào đón bám sát tinh thần của đơn vị.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Box 1: Brand & Logo Identifiers */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-4">
              <h5 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-widest border-b border-slate-200/50 pb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                Định danh & Logo Đơn vị
              </h5>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Tiêu đề chính hệ thống:</label>
                  <input
                    type="text"
                    value={localSettings.systemTitle || ''}
                    onChange={(e) => setLocalSettings((prev: any) => ({ ...prev, systemTitle: e.target.value }))}
                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-2 hover:border-slate-305 transition focus:ring-1 focus:outline-none"
                    style={{ '--tw-ring-color': localSettings.themeColor } as React.CSSProperties}
                    placeholder="Giao Ban Khoa Cận Lâm Sàng"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Phụ đề giới thiệu chi tiết:</label>
                  <textarea
                    rows={2}
                    value={localSettings.systemSubtitle || ''}
                    onChange={(e) => setLocalSettings((prev: any) => ({ ...prev, systemSubtitle: e.target.value }))}
                    className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2.5 py-2 font-medium hover:border-slate-305 transition focus:ring-1 focus:outline-none leading-relaxed"
                    style={{ '--tw-ring-color': localSettings.themeColor } as React.CSSProperties}
                    placeholder="Báo cáo số liệu và tự động hóa biên bản bằng AI..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Mẫu Logo phù hợp:</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'default', label: 'Bệnh viện', icon: '🏥' },
                      { key: 'shield', label: 'Bảo mật', icon: '🛡️' },
                      { key: 'cross', label: 'Trái tim', icon: '❤️' },
                      { key: 'custom', label: 'Custom', icon: '🔗' },
                    ].map((logo) => (
                      <button
                        key={logo.key}
                        type="button"
                        onClick={() => setLocalSettings((prev: any) => ({ ...prev, logoPreset: logo.key }))}
                        style={localSettings.logoPreset === logo.key ? { borderColor: localSettings.themeColor, color: localSettings.themeColor, boxShadow: `0 0 0 1px ${localSettings.themeColor}` } : {}}
                        className={`py-1.5 px-1 bg-white border rounded-lg text-center flex flex-col items-center justify-center transition cursor-pointer select-none ${
                          localSettings.logoPreset === logo.key
                            ? 'font-bold shadow-4xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-sm mb-0.5">{logo.icon}</span>
                        <span className="text-[9px] font-bold tracking-tight">{logo.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {localSettings.logoPreset === 'custom' && (
                  <div className="space-y-3 animate-fade-in border-t border-slate-200/50 pt-3">
                    <label className="text-[10px] font-extrabold text-slate-600 uppercase block">Logo tùy chỉnh:</label>
                    
                    {/* Drag & Drop / File Select Zone */}
                    <div
                      onDragOver={handleLogoDragOver}
                      onDragLeave={handleLogoDragLeave}
                      onDrop={handleLogoDrop}
                      className="border-2 border-dashed rounded-xl p-4 text-center transition-all bg-white hover:border-slate-300"
                      style={{ borderColor: isDraggingLogo ? localSettings.themeColor : '#e2e8f0' }}
                    >
                      <input
                        type="file"
                        id="logo-upload-input"
                        className="hidden"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        disabled={logoUploading}
                      />
                      <label 
                        htmlFor="logo-upload-input" 
                        className="cursor-pointer flex flex-col items-center justify-center space-y-2 group"
                      >
                        {logoUploading ? (
                          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: localSettings.themeColor }} />
                        ) : localSettings.logoUrl ? (
                          <div className="relative">
                            <img 
                              src={localSettings.logoUrl} 
                              alt="Custom Logo" 
                              className="max-h-16 max-w-full object-contain rounded border border-slate-100 shadow-2xs p-1"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-3xs">
                              <Check className="w-3 h-3 font-black" />
                            </div>
                          </div>
                        ) : (
                          <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        )}
                        <div className="text-xs font-semibold text-slate-700">
                          {logoUploading 
                            ? "Đang tải ảnh lên..." 
                            : isDraggingLogo 
                              ? "Thả ảnh vào đây để tải lên" 
                              : "Kéo thả ảnh hoặc nhấp để chọn tệp"}
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold">Hỗ trợ PNG, JPG, WEBP, SVG (Tối đa 5MB)</p>
                      </label>
                    </div>

                    {/* Status notifications */}
                    {logoUploadError && (
                      <div className="text-[10.5px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100/50 font-bold">
                        {logoUploadError}
                      </div>
                    )}
                    {logoUploadSuccess && (
                      <div className="text-[10.5px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100/50 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-500 font-black" />
                        Tải ảnh lên thành công!
                      </div>
                    )}

                    {/* Fallback Custom URL input */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-extrabold text-slate-400 uppercase block">Hoặc đường dẫn logo URL:</label>
                        {localSettings.logoUrl && (
                          <button
                            type="button"
                            onClick={() => setLocalSettings((prev: any) => ({ ...prev, logoUrl: '' }))}
                            className="text-[9.5px] font-bold hover:underline cursor-pointer"
                            style={{ color: localSettings.themeColor }}
                          >
                            Xóa ảnh hiện tại
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={localSettings.logoUrl || ''}
                        onChange={(e) => setLocalSettings((prev: any) => ({ ...prev, logoUrl: e.target.value }))}
                        className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-2 hover:border-slate-305 transition focus:ring-1 focus:outline-none"
                        style={{ '--tw-ring-color': localSettings.themeColor } as React.CSSProperties}
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Box 2: Colors, Banner and backgrounds */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-4">
              <h5 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-widest border-b border-slate-200/50 pb-2 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-500" />
                Màu sắc & Thiết lập Hình nền
              </h5>

              <div className="space-y-4">
                
                {/* 1. Theme Color Presets */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Màu sắc chủ đạo y tế:</label>
                    <span className="text-[9.5px] font-mono font-bold text-slate-550 uppercase bg-slate-100 border border-slate-200 px-1 rounded">{localSettings.themeColor}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 py-1">
                    {[
                      { hex: '#0284c7', name: 'Sky hòa bình (Khuyên dùng y tế)' },
                      { hex: '#0d9488', name: 'Teal dịu mát' },
                      { hex: '#10b981', name: 'Emerald lục bảo' },
                      { hex: '#4f46e5', name: 'Indigo y đức' },
                      { hex: '#7c3aed', name: 'Violet tinh anh' },
                      { hex: '#d97706', name: 'Amber nhiệt thành' },
                      { hex: '#e11d48', name: 'Rose sưởi ấm' },
                      { hex: '#1e293b', name: 'Slate chuyên trị' },
                    ].map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => setLocalSettings((prev: any) => ({ ...prev, themeColor: color.hex }))}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition cursor-pointer relative shadow-4xs ${
                          localSettings.themeColor === color.hex
                            ? 'scale-110 border-slate-900 ring-2 ring-slate-350 z-10'
                            : 'border-white hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {localSettings.themeColor === color.hex && (
                          <Check className="w-3.5 h-3.5 text-white stroke-2 dropdown-glow" />
                        )}
                      </button>
                    ))}
                    {/* Custom Picker */}
                    <div className="relative flex items-center">
                      <input 
                        type="color" 
                        value={localSettings.themeColor || '#0284c7'} 
                        onChange={(e) => setLocalSettings((prev: any) => ({ ...prev, themeColor: e.target.value }))}
                        className="w-6 h-6 rounded-full border border-white cursor-pointer hover:scale-105 shadow-4xs opacity-0 absolute inset-0 text-[0px] z-20"
                      />
                      <div className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center bg-white text-[10px] hover:bg-slate-100 pointer-events-none tracking-tight font-black">+</div>
                    </div>
                  </div>
                </div>

                {/* 2. Banner presets */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase block tracking-wider">Phong cách Banner chào mừng:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    {[
                      { 
                        key: 'medical', 
                        label: 'Lâm Sàng Vital',
                        previewClass: 'bg-gradient-to-br from-sky-600 via-teal-600 to-emerald-700',
                        badge: 'Y đức',
                        desc: 'Sóng điện tim & Chữ thập',
                        icon: (
                          <svg className="absolute inset-y-0 right-0 w-full h-full opacity-30 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" preserveAspectRatio="none">
                            <path d="M 0,20 L 30,20 L 33,12 L 36,28 L 39,20 L 50,20 L 53,8 L 56,32 L 59,20 L 100,20" fill="none" stroke="#ffffff" strokeWidth="1.2" />
                          </svg>
                        )
                      },
                      { 
                        key: 'modern', 
                        label: 'Y Học MedTech',
                        previewClass: 'bg-gradient-to-br from-[#090a15] via-[#101432] to-[#1a2566]',
                        badge: 'Số hóa',
                        desc: 'DNA & Vi điểm sinh học',
                        icon: (
                          <div className="absolute right-1 inset-y-0 w-12 flex items-center justify-center opacity-30">
                            <svg className="w-8 h-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                            </svg>
                          </div>
                        )
                      },
                      { 
                        key: 'geometric', 
                        label: 'Ban Mai Sáng',
                        previewClass: 'bg-gradient-to-br from-emerald-400 via-teal-500 to-sky-500',
                        badge: 'Sáng sủa',
                        desc: 'Sóng lượn & Ánh dương',
                        icon: (
                          <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle, white 10%, transparent 10%)', backgroundSize: '10px 10px' }} />
                        )
                      },
                      { 
                        key: 'default', 
                        label: 'Đêm Obsidian',
                        previewClass: 'bg-gradient-to-br from-[#020617] via-[#0b1329] to-[#1e293b]',
                        badge: 'Mắt dịu',
                        desc: 'Radar & Lưới tinh vân',
                        icon: (
                          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '6px 6px' }} />
                        )
                      },
                      { 
                        key: 'pediatric', 
                        label: 'Nhi Khoa Thân Thiện',
                        previewClass: 'bg-gradient-to-br from-rose-500 via-orange-400 to-amber-400',
                        badge: 'Ấm áp',
                        desc: 'Bong bóng & Trái tim ấm',
                        icon: (
                          <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                            <span className="w-3 h-3 rounded-full bg-rose-200 blur-3xs absolute -translate-x-3 -translate-y-1 animate-ping" />
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-200 blur-3xs absolute translate-x-3 translate-y-2 animate-pulse" />
                            <span className="w-2 h-2 rounded-full bg-orange-200 blur-3xs absolute translate-x-1 -translate-y-3 animate-ping" style={{ animationDuration: '3s' }} />
                          </div>
                        )
                      },
                      { 
                        key: 'radiology', 
                        label: 'Quang Phổ X-Ray',
                        previewClass: 'bg-gradient-to-br from-indigo-950 via-slate-900 to-cyan-900',
                        badge: 'Quang học',
                        desc: 'Tia quét & Sóng điện từ',
                        icon: (
                          <div className="absolute inset-0 flex flex-col justify-between p-2 opacity-30">
                            <div className="w-full h-[1px] bg-cyan-300 animate-pulse" />
                            <div className="w-full h-[1px] bg-cyan-300 opacity-60" />
                            <div className="w-full h-[1px] bg-cyan-300 opacity-30" />
                          </div>
                        )
                      },
                      { 
                        key: 'herbal', 
                        label: 'Đông Y Cổ Truyền',
                        previewClass: 'bg-gradient-to-br from-emerald-800 via-emerald-950 to-stone-900',
                        badge: 'Tự nhiên',
                        desc: 'Y học cổ truyền & Cân bằng',
                        icon: (
                          <div className="absolute inset-0 opacity-[0.25] flex items-center justify-center">
                            <svg className="w-6 h-6 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                            </svg>
                          </div>
                        )
                      },
                      { 
                        key: 'sunset', 
                        label: 'Hoàng Hôn Ấm Áp',
                        previewClass: 'bg-gradient-to-br from-violet-950 via-red-700 to-amber-500',
                        badge: 'Ấm áp',
                        desc: 'Tia nắng hy vọng & Chu kỳ phục hồi',
                        icon: (
                          <div className="absolute inset-0 opacity-[0.2] flex items-center justify-center">
                            <svg className="w-6 h-6 text-amber-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="9" />
                              <line x1="12" y1="3" x2="12" y2="21" strokeDasharray="2 2" strokeWidth="1.5" />
                            </svg>
                          </div>
                        )
                      },
                      { 
                        key: 'aurora', 
                        label: 'Cực Quang Bắc Cực',
                        previewClass: 'bg-gradient-to-br from-slate-950 via-teal-900 to-emerald-500',
                        badge: 'Tinh anh',
                        desc: 'Cực quang xanh lá & Tinh vân vũ trụ',
                        icon: (
                          <div className="absolute inset-0 opacity-[0.25] flex items-center justify-center">
                            <svg className="w-6 h-6 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path d="M4 15 Q 8 10, 12 15 T 20 15" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )
                      },
                      { 
                        key: 'neon', 
                        label: 'Quang Lộ Cyberpunk',
                        previewClass: 'bg-gradient-to-br from-zinc-950 via-zinc-800 to-purple-900',
                        badge: 'Công nghệ',
                        desc: 'Mạch điện tử & Laser quét nhịp tim',
                        icon: (
                          <div className="absolute inset-0 opacity-[0.25] flex flex-col justify-center p-2">
                            <div className="w-full h-[2px] bg-rose-500" />
                          </div>
                        )
                      },
                      { 
                        key: 'custom', 
                        label: 'Ảnh Ban Khoa',
                        previewClass: 'bg-slate-50 border border-dashed border-slate-300 text-slate-400',
                        badge: 'Tự chọn',
                        desc: 'Tải ảnh tập thể khoa',
                        icon: (
                          <ImageIcon className="w-5 h-5 text-slate-400" />
                        )
                      },
                    ].map((bPreset) => {
                      const isSelected = localSettings.bannerPreset === bPreset.key;
                      return (
                        <button
                          key={bPreset.key}
                          type="button"
                          onClick={() => setLocalSettings((prev: any) => ({ ...prev, bannerPreset: bPreset.key }))}
                          className={`group rounded-xl border p-2 bg-white text-left transition-all duration-300 cursor-pointer flex flex-col justify-between h-28 relative overflow-hidden select-none ${
                            isSelected
                              ? 'shadow-sm translate-y-[-2px]'
                              : 'border-slate-200 hover:border-slate-305 hover:shadow-2xs'
                          }`}
                          style={isSelected ? { borderColor: localSettings.themeColor } : {}}
                        >
                          {/* Mini Visual Preview Block */}
                          <div 
                            className={`w-full h-12 rounded-lg relative overflow-hidden flex items-center justify-center ${bPreset.previewClass}`}
                            style={bPreset.key === 'custom' && localSettings.bannerUrl ? { backgroundImage: `url(${localSettings.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                          >
                            {bPreset.icon}
                            <span className="absolute top-1 left-1 px-1 py-0.5 rounded text-[8px] font-black uppercase text-white bg-black/30 backdrop-blur-3xs">{bPreset.badge}</span>
                            {isSelected && (
                              <div className="absolute top-1 right-1 rounded-full p-0.5" style={{ backgroundColor: localSettings.themeColor }}>
                                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                              </div>
                            )}
                          </div>

                          {/* Content Label */}
                          <div className="mt-2 space-y-0.5">
                            <span className="text-[10px] font-bold text-slate-800 block leading-tight">{bPreset.label}</span>
                            <span className="text-[8px] text-slate-400 font-semibold block leading-normal line-clamp-1 group-hover:text-slate-500">{bPreset.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {localSettings.bannerPreset === 'custom' && (
                    <div className="space-y-3 animate-fade-in border-t border-slate-200/50 pt-3">
                      <label className="text-[10px] font-extrabold text-slate-600 uppercase block">Ảnh banner tùy chỉnh:</label>
                      
                      {/* Drag & Drop / File Select Zone */}
                      <div
                        onDragOver={handleBannerDragOver}
                        onDragLeave={handleBannerDragLeave}
                        onDrop={handleBannerDrop}
                        className="border-2 border-dashed rounded-xl p-4 text-center transition-all bg-white hover:border-slate-300"
                        style={{ borderColor: isDraggingBanner ? localSettings.themeColor : '#e2e8f0' }}
                      >
                        <input
                          type="file"
                          id="banner-upload-input"
                          className="hidden"
                          accept="image/*"
                          onChange={handleBannerFileUpload}
                          disabled={bannerUploading}
                        />
                        <label 
                          htmlFor="banner-upload-input" 
                          className="cursor-pointer flex flex-col items-center justify-center space-y-2 group"
                        >
                          {bannerUploading ? (
                            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: localSettings.themeColor }} />
                          ) : localSettings.bannerUrl ? (
                            <div className="relative max-w-full flex justify-center">
                              <img 
                                src={localSettings.bannerUrl} 
                                alt="Custom Banner" 
                                className="max-h-24 max-w-full object-contain rounded border border-slate-100 shadow-2xs p-1"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-3xs">
                                <Check className="w-3.5 h-3.5 font-black" />
                              </div>
                            </div>
                          ) : (
                            <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-slate-600 transition-colors" />
                          )}
                          <div className="text-xs font-semibold text-slate-700">
                            {bannerUploading 
                              ? "Đang tải ảnh lên..." 
                              : isDraggingBanner 
                                ? "Thả ảnh vào đây để tải lên" 
                                : "Kéo thả ảnh hoặc nhấp để chọn tệp"}
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold">Hỗ trợ PNG, JPG, WEBP, SVG (Tối đa 5MB)</p>
                        </label>
                      </div>

                      {/* Banner Ratio & Sizing Guide */}
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                          <Info className="w-4 h-4 text-sky-500 shrink-0" />
                          <span>Hướng dẫn chọn ảnh Banner tối ưu</span>
                        </div>
                        <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                          <li>
                            <strong className="text-slate-700">Tỷ lệ khuyên dùng:</strong> Tốt nhất là tỷ lệ siêu rộng (panoramic) như <strong className="text-slate-800">4:1</strong> hoặc <strong className="text-slate-800">16:4</strong> (Kích thước khuyên dùng: <strong className="text-slate-800">1200 x 300px</strong> hoặc <strong className="text-slate-800">1600 x 400px</strong>).
                          </li>
                          <li>
                            <strong className="text-slate-700">Bố cục ảnh:</strong> Nên chọn ảnh có các chi tiết chính nằm ở bên phải hoặc trung tâm. Góc trái nên là các mảng tối hoặc ít chi tiết để không làm che khuất thông tin tiêu đề/nút của bảng điều khiển.
                          </li>
                          <li>
                            <strong className="text-slate-700">Độ tương phản:</strong> Sau khi tải lên, bạn nên điều chỉnh <strong className="text-slate-800">Độ mờ lớp phủ tối</strong> phía dưới (ví dụ 60% - 80%) để chữ màu trắng hiển thị sắc nét nhất trên nền ảnh.
                          </li>
                          <li>
                            <strong className="text-slate-700">Mẹo hiển thị:</strong> Nếu ảnh bị cắt mất phần quan trọng, hãy thử đổi vị trí căn chỉnh (<strong className="text-slate-800">Căn chỉnh vị trí</strong>) sang Trên cùng hoặc Dưới cùng, hoặc chuyển Sizing Mode sang <strong className="text-slate-800">Chứa trong (Contain)</strong>.
                          </li>
                        </ul>
                      </div>

                      {/* Status notifications */}
                      {bannerUploadError && (
                        <div className="text-[10.5px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100/50 font-bold">
                          {bannerUploadError}
                        </div>
                      )}
                      {bannerUploadSuccess && (
                        <div className="text-[10.5px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100/50 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-500 font-black" />
                          Tải ảnh lên thành công!
                        </div>
                      )}

                      {/* Fallback Custom URL input */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] font-extrabold text-slate-400 uppercase block">Hoặc đường dẫn ảnh banner (URL):</label>
                          {localSettings.bannerUrl && (
                            <button
                              type="button"
                              onClick={() => setLocalSettings((prev: any) => ({ ...prev, bannerUrl: '' }))}
                              className="text-[9.5px] font-bold hover:underline cursor-pointer"
                              style={{ color: localSettings.themeColor }}
                            >
                              Xóa ảnh hiện tại
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={localSettings.bannerUrl || ''}
                          onChange={(e) => setLocalSettings((prev: any) => ({ ...prev, bannerUrl: e.target.value }))}
                          className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-2 hover:border-slate-305 transition focus:ring-1 focus:outline-none"
                          style={{ '--tw-ring-color': localSettings.themeColor } as React.CSSProperties}
                          placeholder="https://example.com/banner-hospital.jpg"
                        />
                      </div>

                      {/* Advanced Banner Display Controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                        {/* Display Sizing Mode */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase block">Kích thước hiển thị (Size):</label>
                          <select
                            value={localSettings.bannerStyle || 'cover'}
                            onChange={(e) => setLocalSettings((prev: any) => ({ ...prev, bannerStyle: e.target.value }))}
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                          >
                            <option value="cover">Phủ đầy (Cover - Khuyên dùng)</option>
                            <option value="contain">Chứa trong (Contain - Trọn vẹn ảnh)</option>
                            <option value="fill">Kéo giãn (Stretch/Fill - Đầy khung)</option>
                            <option value="auto">Gốc (Auto - Tỷ lệ thực)</option>
                          </select>
                        </div>

                        {/* Alignment Position */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase block">Căn chỉnh vị trí (Position):</label>
                          <select
                            value={localSettings.bannerPosition || 'center'}
                            onChange={(e) => setLocalSettings((prev: any) => ({ ...prev, bannerPosition: e.target.value }))}
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                          >
                            <option value="center">Giữa (Center)</option>
                            <option value="top">Trên cùng (Top)</option>
                            <option value="bottom">Dưới cùng (Bottom)</option>
                          </select>
                        </div>

                        {/* Repeat Mode */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase block">Lặp lại hình ảnh (Repeat):</label>
                          <select
                            value={localSettings.bannerRepeat || 'no-repeat'}
                            onChange={(e) => setLocalSettings((prev: any) => ({ ...prev, bannerRepeat: e.target.value }))}
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                          >
                            <option value="no-repeat">Không lặp lại (No Repeat)</option>
                            <option value="repeat">Lặp lại (Repeat)</option>
                          </select>
                        </div>

                        {/* Dark Overlay Opacity Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-extrabold text-slate-500 uppercase block">Độ mờ lớp phủ tối:</label>
                            <span className="text-[10px] font-bold text-slate-600">{Math.round((localSettings.bannerOverlayOpacity ?? 0.7) * 100)}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="0"
                              max="0.95"
                              step="0.05"
                              value={localSettings.bannerOverlayOpacity ?? 0.7}
                              onChange={(e) => setLocalSettings((prev: any) => ({ ...prev, bannerOverlayOpacity: parseFloat(e.target.value) }))}
                              className="w-full accent-slate-700 h-1 bg-slate-200 rounded-lg cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Site-Wide Background Style */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase block tracking-wider">Chọn Hình nền ứng dụng:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { 
                        key: 'default', 
                        label: 'Mục Slate', 
                        desc: 'Sáng dịu tối giản',
                        bgColor: '#f8fafc', 
                        cardBg: '#ffffff', 
                        accentColor: '#64748b',
                        textColor: '#0f172a'
                      },
                      { 
                        key: 'elegant', 
                        label: 'Y đức ấm', 
                        desc: 'Cổ điển hoàng gia',
                        bgColor: '#fffdfb', 
                        cardBg: '#fdfbf7', 
                        accentColor: '#c5a880',
                        textColor: '#292524'
                      },
                      { 
                        key: 'clean-mint', 
                        label: 'Bạc hà dịu', 
                        desc: 'Xanh thanh mát y học',
                        bgColor: '#f2faf5', 
                        cardBg: '#ffffff', 
                        accentColor: '#10b981',
                        textColor: '#064e3b'
                      },
                      { 
                        key: 'warm-wood', 
                        label: 'Gỗ nhạt', 
                        desc: 'Ấm áp & Tin cậy',
                        bgColor: '#fffcf6', 
                        cardBg: '#faf4eb', 
                        accentColor: '#b45309',
                        textColor: '#451a03'
                      },
                      { 
                        key: 'modern-blue', 
                        label: 'Biển buổi sáng', 
                        desc: 'Hy vọng & Bình an',
                        bgColor: '#f3f8fc', 
                        cardBg: '#ffffff', 
                        accentColor: '#0284c7',
                        textColor: '#0369a1'
                      },
                      { 
                        key: 'soft-slate', 
                        label: 'Đá lạnh', 
                        desc: 'Kim loại sáng sủa',
                        bgColor: '#f1f5f9', 
                        cardBg: '#ffffff', 
                        accentColor: '#475569',
                        textColor: '#1e293b'
                      },
                      { 
                        key: 'cyberpunk', 
                        label: 'Đen Obsidian', 
                        desc: 'Chế độ tối dịu mắt',
                        bgColor: '#10121d', 
                        cardBg: '#181b2a', 
                        accentColor: '#e11d48',
                        textColor: '#f8fafc'
                      },
                    ].map((bgStyleItem) => {
                      const isSelected = localSettings.bgStyle === bgStyleItem.key;
                      return (
                        <button
                          key={bgStyleItem.key}
                          type="button"
                          onClick={() => setLocalSettings((prev: any) => ({ ...prev, bgStyle: bgStyleItem.key }))}
                          className={`group rounded-xl border p-2 bg-white text-left transition-all duration-300 cursor-pointer flex flex-col justify-between h-24 relative overflow-hidden select-none ${
                            isSelected
                              ? 'shadow-sm translate-y-[-2px]'
                              : 'border-slate-200 hover:border-slate-305 hover:shadow-2xs'
                          }`}
                          style={isSelected ? { borderColor: localSettings.themeColor } : {}}
                        >
                          {/* Mini Mockup Layout Preview */}
                          <div 
                            className="w-full h-10 rounded-lg relative overflow-hidden flex flex-col p-1 border border-slate-100 shadow-4xs transition-transform duration-300 group-hover:scale-[1.02]"
                            style={{ backgroundColor: bgStyleItem.bgColor }}
                          >
                            {/* Tiny Header Strip */}
                            <div 
                              className="h-1.5 w-full rounded-xs flex items-center justify-between px-1"
                              style={{ backgroundColor: bgStyleItem.cardBg, borderBottom: `1px solid ${bgStyleItem.accentColor}20` }}
                            >
                              <div className="w-4 h-0.5 rounded-2xs" style={{ backgroundColor: bgStyleItem.accentColor }} />
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bgStyleItem.accentColor }} />
                            </div>
                            
                            {/* Tiny Body Columns */}
                            <div className="flex-1 flex gap-1 mt-1">
                              {/* Tiny Sidebar */}
                              <div className="w-4 h-full rounded-xs" style={{ backgroundColor: `${bgStyleItem.accentColor}15` }} />
                              
                              {/* Tiny main card */}
                              <div 
                                className="flex-1 h-full rounded-xs p-0.5 flex flex-col gap-0.5"
                                style={{ backgroundColor: bgStyleItem.cardBg, border: `1px solid ${bgStyleItem.accentColor}10` }}
                              >
                                <div className="w-6 h-0.5 rounded-2xs" style={{ backgroundColor: `${bgStyleItem.textColor}40` }} />
                                <div className="w-4 h-0.5 rounded-2xs" style={{ backgroundColor: `${bgStyleItem.textColor}25` }} />
                              </div>
                            </div>

                            {/* Selected Badge */}
                            {isSelected && (
                              <div className="absolute right-1 bottom-1 rounded-full p-0.5" style={{ backgroundColor: localSettings.themeColor }}>
                                <Check className="w-2 h-2 text-white stroke-[3]" />
                              </div>
                            )}
                          </div>

                          {/* Content Label */}
                          <div className="mt-1.5 space-y-0.5">
                            <span className="text-[10px] font-bold text-slate-800 block leading-tight">{bgStyleItem.label}</span>
                            <span className="text-[8px] text-slate-400 font-semibold block leading-normal line-clamp-1 group-hover:text-slate-500">{bgStyleItem.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-3xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Trực quan hóa thiết kế</span>
              <p className="text-[10.5px] text-slate-550 font-semibold">Tất cả thay đổi được lưu trữ an toàn trong Hệ thống Admin và tự động đồng bộ ngay lập tức cho các y bác sĩ trực khoa.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setLocalSettings(systemSettings);
                  onPreviewSettings?.(null);
                  setSuccessText("Đã hủy bỏ thay đổi và khôi phục giao diện hiện tại!");
                  setTimeout(() => setSuccessText(null), 3000);
                }}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-98 font-bold text-[11px] rounded-lg cursor-pointer transition flex items-center gap-1.5 text-center justify-center w-full sm:w-auto"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
                Hủy & Khôi Phục
              </button>
              <button
                onClick={() => {
                  if (localSettings) {
                    onUpdateSettings?.(localSettings);
                    onPreviewSettings?.(null);
                    setSuccessText("Đã áp dụng và lưu cấu hình giao diện mới thành công!");
                    setTimeout(() => setSuccessText(null), 4000);
                  }
                }}
                className="px-5 py-2 hover:opacity-95 text-white active:scale-98 font-bold text-[11px] rounded-lg cursor-pointer transition flex items-center gap-1.5 text-center justify-center shrink-0 shadow-3xs w-full sm:w-auto"
                style={{ backgroundColor: localSettings.themeColor || '#4f46e5' }}
              >
                <Check className="w-3.5 h-3.5" />
                Áp Dụng Thiết Kế Mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: GOOGLE SHEETS CONNECTION & SYNC PATH SETTINGS */}
      {activeSubTab === 'googleSheets' && (
        <div className="space-y-6 animate-fade-in my-3 text-slate-800">
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-4 shadow-3xs space-y-4 transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-850 dark:text-white text-xs md:text-sm tracking-tight flex items-center gap-2">
                    Tích hợp Google Sheets nâng cao 📊
                    {googleAccessToken ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black font-sans">
                        ● Đã kết nối
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">
                        ○ Chưa kết nối
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold uppercase tracking-wider">
                    Cấu hình đường dẫn và mã bảo mật đồng bộ Google Sheets cho Clinis
                  </p>
                </div>
              </div>
            </div>

            {/* Input link Spreadsheet */}
            <div className="space-y-1.5 max-w-3xl">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Đường dẫn Google Sheets đồng bộ:</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-[11px] text-slate-400 font-mono select-none">🔗</span>
                <input 
                  type="text"
                  value={googleSpreadsheetUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGoogleSpreadsheetUrl(val);
                    localStorage.setItem('google_spreadsheet_url', val);
                    onUpdateSettings?.({ googleSpreadsheetUrl: val });
                  }}
                  placeholder="https://docs.google.com/spreadsheets/d/Spreadsheet-ID/edit"
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-250 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-505 focus:border-indigo-500 font-semibold font-sans shadow-3xs"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Lưu ý: Mọi thay đổi về đường dẫn sẽ tự động lưu trữ và áp dụng ngay lập tức cho các nút đồng bộ.</p>
            </div>

            {/* Credentials Setup Drawer Content */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3.5 space-y-4">
              {/* Explanation of 403 Error */}
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 rounded-lg space-y-2">
                <span className="text-[11px] font-black text-amber-800 dark:text-amber-400 block flex items-center gap-1.5 font-sans">
                  ⚠️ GIẢI THÍCH LỖI 403 "DO NOT HAVE ACCESS TO THIS DOC/PAGE":
                </span>
                <p className="text-[10.5px] text-slate-650 dark:text-slate-450 leading-relaxed font-semibold">
                  Mã kết nối (Client ID) mặc định thuộc Google Cloud của môi trường phát triển đang đặt ở trạng thái <strong className="text-amber-800 dark:text-amber-300">Thử nghiệm (Testing)</strong>. Google chỉ cho phép những tài khoản email được khai báo thủ công truy cập. Do đó khi nhấn nút kết nối, tài khoản của bạn sẽ báo lỗi 403.
                </p>
                <div className="pt-1 text-[10.5px] text-slate-650 dark:text-slate-450 leading-relaxed space-y-1">
                  <p className="font-extrabold text-slate-800 dark:text-slate-350">Hãy lựa chọn một trong 2 giải pháp cực kỳ đơn giản dưới đây để đồng bộ ngay:</p>
                </div>
              </div>

              {/* Sol 1: OAuth Playground */}
              <div className="p-3.5 bg-indigo-50/30 dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 font-black text-[10px] text-indigo-700 dark:text-indigo-400 mb-1.5 uppercase font-sans">
                      Cách 1: Lấy token qua OAuth Playground (Khuyên dùng)
                    </span>
                    <h4 className="font-extrabold text-slate-800 dark:text-white text-xs">Không cần cấu hình, hoạt động tức thì với tài khoản bất kỳ</h4>
                  </div>
                  <a 
                    href="https://developers.google.com/oauthplayground" 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-650 dark:text-indigo-400 hover:underline font-black hover:scale-105 transition"
                  >
                    Mở OAuth Playground 🚀
                  </a>
                </div>
                
                <ol className="list-decimal list-inside text-[10.5px] text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed font-medium">
                  <li>Truy cập liên kết <strong className="text-indigo-600 dark:text-indigo-400">OAuth Playground</strong> bên phải.</li>
                  <li>Tại danh sách API bên trái (Step 1), tìm và mở rộng mục <strong className="text-slate-800 dark:text-slate-300">Google Sheets API v4</strong>.</li>
                  <li>Tích chọn link scope: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">https://www.googleapis.com/auth/spreadsheets</code> rồi click <strong className="text-slate-850 dark:text-slate-200">Authorize APIs</strong>.</li>
                  <li>Đăng nhập bằng Gmail của bạn, cho phép ứng dụng truy cập.</li>
                  <li>Ở Step 2, nhấp chuột vào nút màu xanh <strong className="text-emerald-700 dark:text-emerald-400 font-bold">"Exchange authorization code for tokens"</strong>.</li>
                  <li>Sao chép toàn bộ dòng chữ dài trong ô <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">"Access Token"</strong> dán trực tiếp vào ô bên dưới.</li>
                </ol>

                <div className="space-y-1.5 pt-2">
                  <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-widest block">Google Access Token (Dán tại đây):</label>
                  <textarea 
                    rows={2}
                    value={googleAccessToken}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGoogleAccessToken(val);
                      localStorage.setItem('google_access_token', val);
                      onUpdateSettings?.({ googleAccessToken: val });
                    }}
                    placeholder="Dán mã Access Token lấy từ OAuth Playground bắt đầu bằng ya29... tại đây"
                    className="w-full text-xs font-mono border border-slate-250 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-930 text-slate-800 dark:text-slate-200 placeholder-slate-400 p-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-505 focus:border-indigo-500 leading-relaxed shadow-xs"
                  />
                </div>
              </div>

              {/* Sol 2: Custom Client ID */}
              <div className="p-3.5 bg-slate-100/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-black text-[10px] text-slate-700 dark:text-slate-400 uppercase font-sans">
                  Cách 2: Sử dụng Google Client ID cá nhân
                </span>
                <p className="text-[10.5px] text-slate-650 dark:text-slate-450 leading-relaxed font-semibold">
                  Tạo mã kết nối riêng của bạn để nút <strong className="text-slate-800 dark:text-slate-200 font-black">Kết nối Google Account</strong> hoạt động trực tiếp.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pb-2">
                  <div className="md:col-span-8 space-y-1.5">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-widest block">Nhập mã Client ID Google của bạn:</label>
                    <input 
                      type="text"
                      value={googleClientId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGoogleClientId(val);
                        localStorage.setItem('google_client_id', val);
                        onUpdateSettings?.({ googleClientId: val });
                      }}
                      placeholder="Nhập mã Client ID (dòng dài kết thúc bằng .apps.googleusercontent.com)"
                      className="w-full text-xs font-mono border border-slate-250 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-930 text-slate-800 dark:text-slate-200 placeholder-slate-400 px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-505 shadow-xs"
                    />
                  </div>
                  <div className="md:col-span-4 self-end">
                    <button
                      type="button"
                      onClick={handleGoogleConnect}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-950 dark:bg-indigo-605 dark:hover:bg-indigo-750 text-white font-extrabold text-xs shadow-xs transition duration-150 cursor-pointer select-none"
                    >
                      <div className="w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center p-0.5 shrink-0">
                        <svg viewBox="0 0 48 48" className="w-full h-full">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        </svg>
                      </div>
                      Kết nối Google Account ➔
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 leading-relaxed space-y-1 font-medium bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-md border border-slate-200/50 dark:border-slate-800/50">
                  <p className="font-extrabold text-slate-800 dark:text-slate-350">Các bước đăng ký Redirect URI trên Google Cloud Console:</p>
                  <p>1. Tại Credentials, chọn Client ID vừa tạo hoặc tạo mới.</p>
                  <p>2. Trong mục <strong className="text-slate-705 dark:text-slate-300">"Authorized redirect URIs"</strong>, nhấp chuột "Add URI" và thêm chính xác đường dẫn hiện tại của bạn:</p>
                  <p className="font-mono bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded text-[9.5px] select-all tracking-tight break-all inline-block font-black mt-1 text-indigo-600 dark:text-indigo-400">
                    {window.location.origin}/
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: TELEGRAM AUTOMATION & AUTO SYNC CONFIGURATION */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-4 shadow-3xs space-y-4 transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Send className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-850 dark:text-white text-xs md:text-sm tracking-tight flex items-center gap-2">
                    Tự động đồng bộ & Báo cáo Telegram 🤖
                    {systemSettings?.autoSyncEnabled ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black font-sans animate-pulse">
                        ● Đang chạy tự động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">
                        ○ Chưa bật tự động
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold uppercase tracking-wider">
                    Cấu hình tự động đồng bộ Google Sheets lúc 12:00 hàng ngày & báo cáo trực tiếp qua Telegram
                  </p>
                </div>
              </div>
            </div>

            {/* Config Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Left Column: Schedule & Key */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-xl">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Bật tự động hàng ngày:</label>
                    <p className="text-[10px] text-slate-400 font-medium">Đồng bộ số liệu ngày hôm trước</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings?.({ autoSyncEnabled: !systemSettings?.autoSyncEnabled })}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      systemSettings?.autoSyncEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        systemSettings?.autoSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Giờ chạy tự động:</label>
                  <input
                    type="time"
                    value={systemSettings?.autoSyncTime || '12:00'}
                    onChange={(e) => onUpdateSettings?.({ autoSyncTime: e.target.value })}
                    className="w-full text-xs font-mono border border-slate-250 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-200 p-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-505"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Google Sheets API Key (Dành cho bảng tính công khai):</label>
                  <input
                    type="text"
                    value={systemSettings?.googleApiKey || ''}
                    onChange={(e) => onUpdateSettings?.({ googleApiKey: e.target.value })}
                    placeholder="Nhập Google API Key (Dành cho bảng tính công khai)"
                    className="w-full text-xs font-mono border border-slate-250 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-200 p-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-505"
                  />
                  <p className="text-[9.5px] text-slate-450 leading-relaxed">
                    Sử dụng khi Spreadsheet được chia sẻ ở chế độ <b>"Bất kỳ ai có đường liên kết đều có thể xem"</b>. Cách này đơn giản và chạy ngầm cực kỳ ổn định.
                  </p>
                </div>
              </div>

              {/* Right Column: Telegram Settings */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Telegram Bot Token:</label>
                  <input
                    type="password"
                    value={systemSettings?.telegramBotToken || ''}
                    onChange={(e) => onUpdateSettings?.({ telegramBotToken: e.target.value })}
                    placeholder="Dán mã Token từ @BotFather (ví dụ: 123456:ABC-DEF...)"
                    className="w-full text-xs font-mono border border-slate-250 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-200 p-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-505"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Telegram Chat ID / Group ID:</label>
                  <input
                    type="text"
                    value={systemSettings?.telegramChatId || ''}
                    onChange={(e) => onUpdateSettings?.({ telegramChatId: e.target.value })}
                    placeholder="Nhập ID cuộc trò chuyện hoặc ID nhóm (ví dụ: -100123456789)"
                    className="w-full text-xs font-mono border border-slate-250 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-200 p-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-505"
                  />
                </div>

                <div className="p-3 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-150/40 rounded-xl space-y-1">
                  <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 block flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    CÁC BƯỚC KHỞI TẠO TELEGRAM BOT BÁO CÁO:
                  </span>
                  <ol className="list-decimal list-inside text-[9.5px] text-slate-500 dark:text-slate-450 leading-relaxed space-y-1 font-semibold">
                    <li>Nhắn tin cho <strong className="text-indigo-650 dark:text-indigo-400">@BotFather</strong>, gõ lệnh <code className="bg-slate-100 px-1 py-0.2 rounded font-mono">/newbot</code> tạo Bot báo cáo mới.</li>
                    <li>Copy đoạn <b>Token</b> Bot dán vào ô cấu hình bên trên.</li>
                    <li>Tạo một nhóm chat, thêm Bot vào nhóm làm quản trị viên.</li>
                    <li>Lấy Chat ID của nhóm thông qua các Bot như <strong className="text-slate-750">@raw_data_bot</strong> dán vào ô Chat ID.</li>
                  </ol>
                </div>
              </div>

            </div>

            {/* Optional private oauth block */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3.5 space-y-3">
              <h4 className="font-extrabold text-slate-800 dark:text-white text-xs">Cách 2: Đồng bộ bảo mật với Refresh Token (Spreadsheet riêng tư)</h4>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                Nếu bảng tính Google Sheets của bạn ở trạng thái riêng tư, hãy điền đầy đủ thông tin xác thực Google Client bên dưới để máy chủ tự động gia hạn quyền truy cập khi chạy ngầm:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9.5px] font-bold text-slate-500 block">Google Client Secret:</label>
                  <input
                    type="password"
                    value={systemSettings?.googleClientSecret || ''}
                    onChange={(e) => onUpdateSettings?.({ googleClientSecret: e.target.value })}
                    placeholder="Nhập Google OAuth Client Secret"
                    className="w-full text-xs font-mono border border-slate-250 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-200 p-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-505"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9.5px] font-bold text-slate-500 block">Google OAuth Refresh Token:</label>
                  <input
                    type="password"
                    value={systemSettings?.googleRefreshToken || ''}
                    onChange={(e) => onUpdateSettings?.({ googleRefreshToken: e.target.value })}
                    placeholder="Dán mã Refresh Token"
                    className="w-full text-xs font-mono border border-slate-250 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-200 p-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-505"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9.5px] font-bold text-slate-500 block">Google Client ID (Dành cho nền):</label>
                  <input
                    type="text"
                    value={systemSettings?.googleClientId || ''}
                    onChange={(e) => onUpdateSettings?.({ googleClientId: e.target.value })}
                    placeholder="Nhập Client ID"
                    className="w-full text-xs font-mono border border-slate-250 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-200 p-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-505"
                  />
                </div>
              </div>
            </div>

            {/* Test Connection Form Row */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-[10px] font-black text-slate-500 uppercase shrink-0">Ngày chạy thử số liệu:</label>
                <input
                  type="date"
                  value={testSyncDate}
                  onChange={(e) => setTestSyncDate(e.target.value)}
                  className="text-xs border border-slate-250 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-200 p-1.5 focus:outline-hidden"
                />
              </div>
              <button
                type="button"
                onClick={handleTestAutoSync}
                disabled={isTestingAutoSync}
                style={{ backgroundColor: systemSettings?.themeColor || '#4f46e5' }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-white font-extrabold text-xs shadow-xs transition duration-150 cursor-pointer select-none disabled:opacity-50"
              >
                {isTestingAutoSync ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Chạy thử & Gửi báo cáo ngay 🚀
              </button>
            </div>

            {/* Test Result Message Output */}
            {testAutoSyncMessage && (
              <div className={`p-3 rounded-lg text-xs font-semibold leading-relaxed border ${
                testAutoSyncMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50 text-emerald-800 dark:text-emerald-400'
                  : 'bg-red-50 dark:bg-red-950/20 border-red-200/50 text-red-850 dark:text-red-400'
              }`}>
                {testAutoSyncMessage.type === 'success' ? '➔ ✅ ' : '➔ ⚠️ '}
                {testAutoSyncMessage.text}
              </div>
            )}
          </div>
        </div>
      )}

      {confirmModal && (
        <div 
          onClick={() => setConfirmModal(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden animate-scale-up text-slate-800"
          >
            <div className="p-5">
              <div className="flex items-center gap-3 text-red-605 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-850 uppercase tracking-wider">{confirmModal.title}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Xác thực hệ thống</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold bg-slate-50 p-3 rounded-lg border border-slate-100">
                {confirmModal.message}
              </p>
            </div>
            <div className="bg-slate-50 px-5 py-3 flex items-center justify-end gap-2 border-t border-slate-150">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-1.5 rounded border border-slate-205 text-slate-600 font-extrabold text-[11px] hover:bg-slate-100 cursor-pointer transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white font-black text-[11px] shadow-sm cursor-pointer transition active:scale-97"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
