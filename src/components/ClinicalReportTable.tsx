import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DailyReport, ReportItem, User, CategoryKey } from '../types';
import { CATEGORIES, USERS } from '../data';
import { Save, CheckCircle, FilePenLine, Lock, ShieldAlert, Calendar, Eye, Database, Printer, FileDown, UploadCloud, DownloadCloud, RefreshCw, Settings, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { formatDateToDDMMYYYY, shiftDateString } from '../utils/date';
import * as XLSX from 'xlsx';

interface ClinicalReportTableProps {
  reports: DailyReport[];
  activeDate: string;
  setActiveDate: (date: string) => void;
  currentUser: User;
  onSaveReport: (report: DailyReport) => Promise<void>;
  onApproveReport: (date: string) => Promise<void>;
  onBulkSaveReports?: (imported: DailyReport[]) => Promise<void>;
  procedures: Omit<ReportItem, 'bh' | 'nd'>[];
  onRefreshData?: () => Promise<void>;
  onDeleteReport?: (date: string) => Promise<void>;
}

export default function ClinicalReportTable({
  reports,
  activeDate,
  setActiveDate,
  currentUser,
  onSaveReport,
  onApproveReport,
  onBulkSaveReports,
  procedures,
  onRefreshData,
  onDeleteReport
}: ClinicalReportTableProps) {
  // Find or initialize report for the active date
  const [currentReport, setCurrentReport] = useState<DailyReport | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [prevActiveDate, setPrevActiveDate] = useState(activeDate);

  // Google Sheets Integration State
  const [googleAccessToken, setGoogleAccessToken] = useState(() => localStorage.getItem('google_access_token') || '');
  const [googleSpreadsheetUrl, setGoogleSpreadsheetUrl] = useState(() => localStorage.getItem('google_spreadsheet_url') || 'https://docs.google.com/spreadsheets/d/1n7yQQmninnDTVNtIZqCzUEiAI1jRHSj4VTr7pVs3KMM/edit?usp=sharing');
  const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('google_client_id') || '1067215171120-g7a7fge4vbe050m3oabm896v1k6g6m2f.apps.googleusercontent.com');
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [isPullingSheets, setIsPullingSheets] = useState(false);
  const [sheetsSyncMessage, setSheetsSyncMessage] = useState<{ 
    type: 'success' | 'error'; 
    text: string;
    syncType?: string;
    overwrite?: boolean;
    details?: {
      dayDetails?: {
        id: string;
        name: string;
        status: 'dong_bo_moi' | 'giu_nguyen' | 'ghi_de' | 'trong';
        appBh: number;
        appNd: number;
        sheetBh: number;
        sheetNd: number;
        resolvedBh: number;
        resolvedNd: number;
      }[];
      syncedDays?: string[];
      unsyncedDays?: { date: string; reason: string }[];
      largeSync?: {
        syncedCount: number;
        unsyncedCount: number;
        reasons: { reason: string; count: number }[];
      };
    };
  } | null>(null);
  const [confirmSheetSync, setConfirmSheetSync] = useState<{ timeRange: 'day' | 'week' | 'month' | 'year'; overwrite: boolean } | null>(null);
  const [confirmSheetPull, setConfirmSheetPull] = useState<{ timeRange: 'day' | 'week' | 'month' | 'year'; overwrite: boolean } | null>(null);
  const [syncDirection, setSyncDirection] = useState<'push' | 'pull'>('push');
  const [syncTimeRange, setSyncTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [syncOverwrite, setSyncOverwrite] = useState<boolean>(true);
  const [syncSelectedDate, setSyncSelectedDate] = useState<string>(activeDate);
  const [isGoogleSyncModalOpen, setIsGoogleSyncModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingReport, setIsDeletingReport] = useState(false);

  useEffect(() => {
    setSyncSelectedDate(activeDate);
  }, [activeDate]);

  useEffect(() => {
    // Read the latest token in case it was updated on reload/oauth
    const latestToken = localStorage.getItem('google_access_token') || '';
    if (latestToken) {
      setGoogleAccessToken(latestToken);
    }
    const latestClientId = localStorage.getItem('google_client_id') || '';
    if (latestClientId) {
      setGoogleClientId(latestClientId);
    }

    // Check if we have been instructed to open sheets modal
    const shouldOpen = localStorage.getItem('oauth_open_sheets_modal') === 'true';
    if (shouldOpen) {
      localStorage.removeItem('oauth_open_sheets_modal');
      setIsGoogleSyncModalOpen(true);
      
      const reportSuccess = localStorage.getItem('oauth_report_success') === 'true';
      if (reportSuccess) {
        localStorage.removeItem('oauth_report_success');
        setSheetsSyncMessage({ type: 'success', text: 'Kết nối tài khoản Google thành công! Bạn có thể thực hiện đồng bộ ngay.' });
      }
    }
  }, []);

  const handleGoogleConnect = () => {
    const freshClientId = localStorage.getItem('google_client_id') || googleClientId;
    if (!freshClientId || !freshClientId.trim()) {
      setSheetsSyncMessage({ type: 'error', text: 'Vui lòng cung cấp Google OAuth Client ID trong phần cấu hình nâng cao hoặc cài đặt Admin.' });
      return;
    }
    // Save current state to restore after redirect
    localStorage.setItem('oauth_restore_tab', 'report');
    localStorage.setItem('oauth_open_sheets_modal', 'true');

    const redirectUri = window.location.href.split('#')[0]; // Current page minus hash
    const scope = 'https://www.googleapis.com/auth/spreadsheets';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${freshClientId.trim()}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}`;
    
    window.location.href = authUrl;
  };

  const handleSyncToSheets = (timeRange: 'day' | 'week' | 'month' | 'year', overwrite: boolean) => {
    // Dynamically retrieve configured values from Admin settings stored in localStorage
    const freshToken = localStorage.getItem('google_access_token') || '';
    const freshUrl = localStorage.getItem('google_spreadsheet_url') || '';
    
    setGoogleAccessToken(freshToken);
    setGoogleSpreadsheetUrl(freshUrl);

    if (!freshUrl.trim()) {
      setSheetsSyncMessage({ type: 'error', text: 'Vui lòng thiết lập đường dẫn liên kết Google Sheets trong mục Quản trị hệ thống > Đồng bộ Google Sheets.' });
      return;
    }
    if (!freshToken.trim()) {
      setSheetsSyncMessage({ type: 'error', text: 'Vui lòng kết nối tài khoản Google hoặc nhập Access Token trong mục Quản trị hệ thống > Đồng bộ Google Sheets trước.' });
      return;
    }

    setConfirmSheetSync({ timeRange, overwrite });
  };

  const proceedSyncToSheets = async (timeRange: 'day' | 'week' | 'month' | 'year', overwrite: boolean) => {
    setIsSyncingSheets(true);
    setSheetsSyncMessage(null);

    const freshToken = localStorage.getItem('google_access_token') || googleAccessToken;
    const freshUrl = localStorage.getItem('google_spreadsheet_url') || googleSpreadsheetUrl;

    try {
      const d = new Date(syncSelectedDate);
      const month = d.getMonth() + 1; // 1-12
      const year = d.getFullYear();

      const response = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month,
          year,
          accessToken: freshToken,
          spreadsheetUrl: freshUrl,
          syncAllMonth: timeRange === 'month',
          syncType: timeRange,
          overwrite,
          date: syncSelectedDate,
          activeUser: currentUser.name
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSheetsSyncMessage({
          type: 'success',
          text: data.message || 'Đồng bộ Google Sheets thành công!',
          syncType: data.syncType,
          overwrite: data.overwrite,
          details: data.details
        });
      } else {
        if (response.status === 401 || data.reauthRequired || (data.error && (data.error.includes("401") || data.error.includes("UNAUTHENTICATED") || data.error.includes("credentials")))) {
          setSheetsSyncMessage({
            type: 'error',
            text: 'Mã Access Token kết nối Google Sheets đã hết hạn hoặc không hợp lệ. Vui lòng vào Quản trị hệ thống > Đồng bộ Google Sheets để kết nối và cấp quyền lại tài khoản Google của bạn.'
          });
        } else {
          setSheetsSyncMessage({
            type: 'error',
            text: data.error || 'Lỗi đồng bộ Google Sheets.'
          });
        }
      }
    } catch (err: any) {
      setSheetsSyncMessage({
        type: 'error',
        text: 'Lỗi kết nối mạng: Không thể liên lạc được với máy chủ.'
      });
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handlePullFromSheets = (timeRange: 'day' | 'week' | 'month' | 'year', overwrite: boolean) => {
    // Dynamically retrieve configured values from Admin settings stored in localStorage
    const freshToken = localStorage.getItem('google_access_token') || '';
    const freshUrl = localStorage.getItem('google_spreadsheet_url') || '';

    setGoogleAccessToken(freshToken);
    setGoogleSpreadsheetUrl(freshUrl);

    if (!freshUrl.trim()) {
      setSheetsSyncMessage({ type: 'error', text: 'Vui lòng thiết lập đường dẫn liên kết Google Sheets trong mục Quản trị hệ thống > Đồng bộ Google Sheets.' });
      return;
    }
    if (!freshToken.trim()) {
      setSheetsSyncMessage({ type: 'error', text: 'Vui lòng kết nối tài khoản Google hoặc nhập Access Token trong mục Quản trị hệ thống > Đồng bộ Google Sheets trước.' });
      return;
    }

    setConfirmSheetPull({ timeRange, overwrite });
  };

  const proceedPullFromSheets = async (timeRange: 'day' | 'week' | 'month' | 'year', overwrite: boolean) => {
    setIsPullingSheets(true);
    setSheetsSyncMessage(null);

    const freshToken = localStorage.getItem('google_access_token') || googleAccessToken;
    const freshUrl = localStorage.getItem('google_spreadsheet_url') || googleSpreadsheetUrl;

    try {
      const d = new Date(syncSelectedDate);
      const month = d.getMonth() + 1; // 1-12
      const year = d.getFullYear();

      const response = await fetch('/api/sheets/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month,
          year,
          accessToken: freshToken,
          spreadsheetUrl: freshUrl,
          pullAllMonth: timeRange === 'month',
          syncType: timeRange,
          overwrite,
          date: syncSelectedDate,
          activeUser: currentUser.name
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSheetsSyncMessage({
          type: 'success',
          text: data.message || 'Tải dữ liệu từ Google Sheets thành công!'
        });
        if (onRefreshData) {
          await onRefreshData();
        }
      } else {
        if (response.status === 401 || data.reauthRequired || (data.error && (data.error.includes("401") || data.error.includes("UNAUTHENTICATED") || data.error.includes("credentials")))) {
          setSheetsSyncMessage({
            type: 'error',
            text: 'Mã Access Token kết nối Google Sheets đã hết hạn hoặc không hợp lệ. Vui lòng vào Quản trị hệ thống > Đồng bộ Google Sheets để kết nối và cấp quyền lại tài khoản Google của bạn.'
          });
        } else {
          setSheetsSyncMessage({
            type: 'error',
            text: data.error || 'Lỗi tải dữ liệu từ Google Sheets.'
          });
        }
      }
    } catch (err: any) {
      setSheetsSyncMessage({
        type: 'error',
        text: 'Lỗi kết nối mạng: Không thể liên lạc được với máy chủ.'
      });
    } finally {
      setIsPullingSheets(false);
    }
  };

  const [draftSavedCheckpoint, setDraftSavedCheckpoint] = useState<ReportItem[] | null>(null);
  const [isDraftSavingActive, setIsDraftSavingActive] = useState(false);

  const handleDraftCheckpointClick = async () => {
    if (!currentReport || isSaving) return;
    
    setIsSaving(true);
    try {
      if (!isDraftSavingActive) {
        // 1. Save checkpoint and auto-save current edited items
        const checkpointItems = JSON.parse(JSON.stringify(currentReport.items));
        setDraftSavedCheckpoint(checkpointItems);
        
        const reportToSave = {
          ...currentReport,
          submittedBy: currentUser.name,
          status: 'draft' as any,
        };
        await onSaveReport(reportToSave);
        setIsDraftSavingActive(true);
      } else {
        // 2. Revert to checkpoint, save reverted data, and clear checkpoint
        if (draftSavedCheckpoint) {
          const revertedItems = JSON.parse(JSON.stringify(draftSavedCheckpoint));
          const revertedReport = {
            ...currentReport,
            items: revertedItems,
            submittedBy: currentUser.name,
            status: 'draft' as any,
          };
          
          // First update local state
          setCurrentReport(revertedReport);
          
          // Save reverted data to backend
          await onSaveReport(revertedReport);
        }
        setIsDraftSavingActive(false);
        setDraftSavedCheckpoint(null);
      }
    } catch (err) {
      console.error("Lỗi xử lý nháp:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  
  // Excel import helper states
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [parsedReports, setParsedReports] = useState<DailyReport[]>([]);
  const [isImportingProgress, setIsImportingProgress] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date(activeDate);
    if (isNaN(d.getTime())) return '2026-03-01';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}-01`;
  });
  const [exportEndDate, setExportEndDate] = useState(activeDate);

  const previewItems = (() => {
    const filtered = reports.filter(r => r.date >= exportStartDate && r.date <= exportEndDate);
    const sums: { [id: string]: { bh: number; nd: number } } = {};
    procedures.forEach(t => {
      sums[t.id] = { bh: 0, nd: 0 };
    });
    filtered.forEach(r => {
      r.items.forEach(item => {
        if (sums[item.id]) {
          sums[item.id].bh += (item.bh || 0);
          sums[item.id].nd += (item.nd || 0);
        }
      });
    });
    return procedures.map(it => ({
      ...it,
      bh: sums[it.id]?.bh || 0,
      nd: sums[it.id]?.nd || 0,
    }));
  })();

  const handleExportCSV = () => {
    let csvContent = '\uFEFF'; 
    csvContent += 'BÁO CÁO TỔNG HỢP CHỈ TIÊU KỸ THUẬT Y KHOA\n';
    csvContent += `Khoa Cận Lâm Sàng - Bệnh Viện Đa Khoa Executive\n`;
    csvContent += `Khoảng thời gian: ${formatDateToDDMMYYYY(exportStartDate)} đến ${formatDateToDDMMYYYY(exportEndDate)}\n\n`;
    csvContent += 'PHÒNG BAN/CHUYÊN KHOA,CHỈ TIÊU KỸ THUẬT,BẢO HIỂM (BH),NGOÀI DỊCH VỤ (ND),TỔNG CỘNG\n';
    let grandBh = 0;
    let grandNd = 0;
    
    CATEGORIES.forEach(category => {
      const catItems = previewItems.filter(it => it.category === category.key);
      let catBh = 0;
      let catNd = 0;
      catItems.forEach(it => {
        const total = it.bh + it.nd;
        catBh += it.bh;
        catNd += it.nd;
        const escapedName = it.name.replace(/"/g, '""');
        csvContent += `"${category.name}","${escapedName}",${it.bh},${it.nd},${total}\n`;
      });
      grandBh += catBh;
      grandNd += catNd;
      csvContent += `"${category.name} (TỔNG)","TỔNG PHÒNG BAN",${catBh},${catNd},${catBh + catNd}\n`;
    });
    csvContent += `"TỔNG CỘNG TOÀN KHOA","TỔNG CỘNG",${grandBh},${grandNd},${grandBh + grandNd}\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bao_cao_giao_ban_tong_hop_${exportStartDate}_den_${exportEndDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getUserCategory = (user: typeof currentUser): CategoryKey | null => {
    if (user.role === 'admin' || user.role === 'truongKhoa') return null;
    
    // Check if role is directly one of the active categories
    const role = user.role;
    if (role === 'sieuAm' || role === 'noiSoi' || role === 'xQuang' || role === 'dienTimLHN' || role === 'xetNghiem') {
      return role as CategoryKey;
    }
    
    // Fallback to mapping based on department name
    const dept = (user.departmentName || '').toLowerCase();
    if (dept.includes('siêu âm')) return 'sieuAm';
    if (dept.includes('nội soi')) return 'noiSoi';
    if (dept.includes('x-quang') || dept.includes('x quang')) return 'xQuang';
    if (dept.includes('điện tim')) return 'dienTimLHN';
    if (dept.includes('xét nghiệm')) return 'xetNghiem';
    
    return null;
  };

  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | 'all'>(() => {
    const userCat = getUserCategory(currentUser);
    if (userCat) {
      return userCat;
    }
    return 'all';
  });

  // Keep selected tab in sync if user changes
  useEffect(() => {
    const userCat = getUserCategory(currentUser);
    if (userCat) {
      setSelectedCategory(userCat);
    } else if (currentUser.role === 'admin' || currentUser.role === 'truongKhoa') {
      setSelectedCategory('all');
    }
  }, [currentUser]);

  useEffect(() => {
    const dateSwitched = activeDate !== prevActiveDate;
    if (dateSwitched) {
      setPrevActiveDate(activeDate);
      setIsEditing(false);
      setIsDraftSavingActive(false);
      setDraftSavedCheckpoint(null);
    }

    if (!isEditing || dateSwitched) {
      const existingReport = reports.find(r => r.date === activeDate);
      if (existingReport) {
        // Create a deep copy and merge with active procedures to reflect additions/deletions seamlessly
        const mergedItems = procedures.map(p => {
          const found = existingReport.items.find(item => item.id === p.id);
          return {
            ...p,
            bh: found ? found.bh || 0 : 0,
            nd: found ? found.nd || 0 : 0,
          };
        });
        setCurrentReport({
          ...existingReport,
          items: mergedItems
        });
      } else {
        // Create empty report template
        setCurrentReport({
          date: activeDate,
          status: 'draft',
          submittedBy: currentUser.name,
          submittedAt: '',
          items: procedures.map(p => ({ ...p, bh: 0, nd: 0 }))
        });
      }
    }
  }, [activeDate, reports, currentUser, isEditing, prevActiveDate, procedures]);

  if (!currentReport) return null;

  // Key stats calculations
  const calculateCategoryTotals = (category: CategoryKey) => {
    let bhSum = 0;
    let ndSum = 0;
    currentReport.items.forEach(item => {
      if (item.category === category) {
        bhSum += Number(item.bh) || 0;
        ndSum += Number(item.nd) || 0;
      }
    });
    return { bh: bhSum, nd: ndSum, total: bhSum + ndSum };
  };

  const calculateGrandTotals = () => {
    let bhSum = 0;
    let ndSum = 0;
    currentReport.items.forEach(item => {
      bhSum += Number(item.bh) || 0;
      ndSum += Number(item.nd) || 0;
    });
    return { bh: bhSum, nd: ndSum, total: bhSum + ndSum };
  };

  // Check if current user has edit permission for a category
  const hasPermissionForCategory = (category: CategoryKey) => {
    if (currentUser.role === 'admin' || currentUser.role === 'truongKhoa') return true;
    const userCat = getUserCategory(currentUser);
    return userCat === category;
  };

  // Handles input revisions
  const handleInputChange = (itemId: string, type: 'bh' | 'nd', val: string) => {
    if (!currentReport) return;
    const numericValue = val === '' ? 0 : Math.max(0, parseInt(val, 10));
    
    const updatedItems = currentReport.items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          [type]: numericValue
        };
      }
      return item;
    });

    setCurrentReport({
      ...currentReport,
      items: updatedItems
    });
  };

  // Triggers save
  const handleSave = async () => {
    if (!currentReport) return;
    setIsSaving(true);
    try {
      const reportToSave = {
        ...currentReport,
        submittedBy: currentUser.name,
        status: (currentUser.role === 'admin' || currentUser.role === 'truongKhoa') ? 'approved' : 'submitted' as any,
        approvedBy: (currentUser.role === 'admin' || currentUser.role === 'truongKhoa') ? currentUser.name : undefined
      };
      await onSaveReport(reportToSave);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    setIsSaving(true);
    try {
      await onApproveReport(currentReport.date);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Excel Import File and parsing
  const handleExcelImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportLogs([]);
    setParsedReports([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstream = evt.target?.result;
        const wb = XLSX.read(bstream, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

        if (data.length < 2) {
          throw new Error('File excel trống hoặc không chứa tiêu đề và dữ liệu hợp lệ.');
        }

        // Identify headers
        const headers = data[0].map((h: any) => String(h || '').trim().toLowerCase());
        
        // Find column indexes
        let dateColIdx = headers.findIndex((h: string) => h.includes('ngày') || h.includes('date') || h.includes('ngay'));
        let itemColIdx = headers.findIndex((h: string) => h.includes('chỉ tiêu') || h.includes('tên') || h.includes('mã') || h.includes('procedure') || h.includes('name') || h.includes('id'));
        let bhColIdx = headers.findIndex((h: string) => h === 'bh' || h.includes('bảo hiểm') || h.includes('bao hiem'));
        let ndColIdx = headers.findIndex((h: string) => h === 'nd' || h.includes('dịch vụ') || h.includes('dich vu') || h.includes('ngoài dịch vụ') || h.includes('nhân dân') || h.includes('ngoai dich vu'));

        if (dateColIdx === -1) dateColIdx = 0;
        if (itemColIdx === -1) itemColIdx = 1;
        if (bhColIdx === -1) bhColIdx = 2;
        if (ndColIdx === -1) ndColIdx = 3;

        const logs: string[] = [];
        logs.push(`🔍 Hệ thống đã tự động nhận diện cột:`);
        logs.push(`- Cột Ngày: Cột ${dateColIdx + 1} ("${data[0][dateColIdx] || 'N/A'}")`);
        logs.push(`- Cột Kỹ thuật: Cột ${itemColIdx + 1} ("${data[0][itemColIdx] || 'N/A'}")`);
        logs.push(`- Cột Bảo hiểm (BH): Cột ${bhColIdx + 1} ("${data[0][bhColIdx] || 'N/A'}")`);
        logs.push(`- Cột Dịch vụ (ND): Cột ${ndColIdx + 1} ("${data[0][ndColIdx] || 'N/A'}")`);

        const reportsByDate: { [date: string]: { [itemId: string]: { bh: number; nd: number } } } = {};

        for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
          const row = data[rowIdx];
          if (!row || row.length === 0) continue;

          let rawDate = row[dateColIdx];
          if (rawDate === undefined || rawDate === null || rawDate === '') continue;

          let dateStr = '';
          if (rawDate instanceof Date) {
            const yyyy = rawDate.getFullYear();
            const mm = String(rawDate.getMonth() + 1).padStart(2, '0');
            const dd = String(rawDate.getDate()).padStart(2, '0');
            dateStr = `${yyyy}-${mm}-${dd}`;
          } else {
            const rawStr = String(rawDate).trim();
            if (!rawStr) continue;

            if (/^\d{4}-\d{2}-\d{2}/.test(rawStr)) {
              dateStr = rawStr.split(' ')[0];
            } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(rawStr)) {
              const parts = rawStr.split(/[\/\-]/);
              const dd = parts[0].padStart(2, '0');
              const mm = parts[1].padStart(2, '0');
              const yyyy = parts[2].substring(0, 4);
              dateStr = `${yyyy}-${mm}-${dd}`;
            } else {
              const dParsed = new Date(rawStr);
              if (!isNaN(dParsed.getTime())) {
                const yyyy = dParsed.getFullYear();
                const mm = String(dParsed.getMonth() + 1).padStart(2, '0');
                const dd = String(dParsed.getDate()).padStart(2, '0');
                dateStr = `${yyyy}-${mm}-${dd}`;
              } else {
                logs.push(`⚠️ Không xử lý được định dạng ngày tại dòng ${rowIdx + 1}: "${rawStr}". Bỏ qua.`);
                continue;
              }
            }
          }

          const rawItem = String(row[itemColIdx] || '').trim();
          if (!rawItem) continue;

          // Fuzzy search clinical procedure
          const matchedItem = procedures.find(t => 
            t.id.toLowerCase() === rawItem.toLowerCase() || 
            t.name.toLowerCase() === rawItem.toLowerCase() ||
            t.name.toLowerCase().includes(rawItem.toLowerCase()) ||
            rawItem.toLowerCase().includes(t.name.toLowerCase())
          );

          if (!matchedItem) {
            logs.push(`⚠️ Dòng ${rowIdx + 1}: Diễn giải "${rawItem}" không tìm được danh mục kỹ thuật khớp.`);
            continue;
          }

          const rawBh = parseInt(String(row[bhColIdx] || '0').replace(/[^\d\-]/g, ''), 10);
          const rawNd = parseInt(String(row[ndColIdx] || '0').replace(/[^\d\-]/g, ''), 10);
          const bh = isNaN(rawBh) ? 0 : Math.max(0, rawBh);
          const nd = isNaN(rawNd) ? 0 : Math.max(0, rawNd);

          if (!reportsByDate[dateStr]) {
            reportsByDate[dateStr] = {};
          }

          if (!reportsByDate[dateStr][matchedItem.id]) {
            reportsByDate[dateStr][matchedItem.id] = { bh: 0, nd: 0 };
          }

          reportsByDate[dateStr][matchedItem.id].bh += bh;
          reportsByDate[dateStr][matchedItem.id].nd += nd;
        }

        const finalReports: DailyReport[] = Object.keys(reportsByDate).map(d => {
          const itemValues = reportsByDate[d];
          const itemsList: ReportItem[] = procedures.map(t => {
            const vals = itemValues[t.id] || { bh: 0, nd: 0 };
            return {
              id: t.id,
              name: t.name,
              category: t.category as any,
              bh: vals.bh,
              nd: vals.nd
            };
          });

          return {
            date: d,
            status: 'approved',
            submittedBy: currentUser.name,
            submittedAt: new Date().toISOString(),
            approvedBy: currentUser.name,
            items: itemsList
          };
        });

        if (finalReports.length === 0) {
          throw new Error('Không phân tích được bất kỳ dòng dữ liệu hợp lệ nào.');
        }

        logs.push(`✅ Phân tích thành công! Phát hiện số liệu của ${finalReports.length} ngày giao ban:`);
        finalReports.sort((a,b) => a.date.localeCompare(b.date)).forEach(r => {
          const totalBh = r.items.reduce((s,i) => s + i.bh, 0);
          const totalNd = r.items.reduce((s,i) => s + i.nd, 0);
          logs.push(`  • Ngày ${formatDateToDDMMYYYY(r.date)}: ${totalBh} BH, ${totalNd} ND (Tổng cộng ${totalBh + totalNd} ca)`);
        });

        setParsedReports(finalReports);
        setImportLogs(logs);
      } catch (err: any) {
        setImportError(err.message || 'Lỗi đọc tệp tin.');
        setImportLogs(prev => [...prev, `❌ Thất bại: ${err.message || 'Định dạng tệp hỏng'}`]);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleDownloadExcelTemplate = () => {
    // Generate a perfect xlsx template
    const wsData = [
      ["Ngày báo cáo (YYYY-MM-DD)*", "Chỉ tiêu kỹ thuật chuẩn (Tên hoặc ID)*", "Số ca Bảo hiểm (BH)", "Số ca Dịch vụ (ND)"],
      ["2026-03-01", "Siêu âm tim", 15, 8],
      ["2026-03-01", "Nội soi dạ dày", 25, 12],
      ["2026-03-01", "X quang", 50, 20],
      ["2026-03-02", "Siêu âm tim", 10, 5],
      ["2026-03-02", "Siêu âm mạch", 8, 3]
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const wscols = [
      {wch: 28},
      {wch: 42},
      {wch: 24},
      {wch: 24}
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Bieu_mau_kê_khai");
    XLSX.writeFile(wb, "Bieu_mau_nhap_lieu_excel_clinics.xlsx");
  };

  const handleExecuteImport = async () => {
    if (parsedReports.length === 0 || !onBulkSaveReports) return;
    setIsImportingProgress(true);
    try {
      await onBulkSaveReports(parsedReports);
      setIsExcelImportModalOpen(false);
      setParsedReports([]);
      setImportLogs([]);
    } catch (err: any) {
      setImportError(err.message || 'Đã xảy ra lỗi khi lưu vào cơ sở dữ liệu.');
    } finally {
      setIsImportingProgress(false);
    }
  };

  const exportConsolidatedReport = (start: string, end: string, items: ReportItem[], format: 'pdf' | 'print') => {
    const isRange = start !== end;
    const dateFormatted = isRange 
      ? `Từ ngày ${formatDateToDDMMYYYY(start)} đến ngày ${formatDateToDDMMYYYY(end)}`
      : `Ngày giao ban: ${formatDateToDDMMYYYY(start)}`;

    const calculateCategoryTotalsForItems = (catKey: CategoryKey) => {
      const catItems = items.filter(it => it.category === catKey);
      const bh = catItems.reduce((sum, it) => sum + (it.bh || 0), 0);
      const nd = catItems.reduce((sum, it) => sum + (it.nd || 0), 0);
      return { bh, nd, total: bh + nd };
    };

    const calculateGrandTotalsForItems = () => {
      const bh = items.reduce((sum, it) => sum + (it.bh || 0), 0);
      const nd = items.reduce((sum, it) => sum + (it.nd || 0), 0);
      return { bh, nd, total: bh + nd };
    };

    const grandTotalsVal = calculateGrandTotalsForItems();

    let rowsHtml = '';
    CATEGORIES.forEach(category => {
      const catTotals = calculateCategoryTotalsForItems(category.key);
      const catItems = items.filter(item => item.category === category.key);

      rowsHtml += `
        <tr class="category-row">
          <td style="text-align: left; background-color: #f8fafc; font-weight: bold; padding: 8px 10px; border: 1px solid #000000;">◆ ${category.name}</td>
          <td colspan="3" style="text-align: left; background-color: #f8fafc; font-style: italic; color: #475569; padding: 8px 10px; border: 1px solid #000000;">
            Bác sĩ phụ trách: ${USERS.find(u => u.role === category.key)?.name || "Bác sĩ khoa"}
          </td>
        </tr>
      `;

      catItems.forEach(item => {
        const itemTotal = (item.bh || 0) + (item.nd || 0);
        rowsHtml += `
          <tr>
            <td style="padding-left: 20px; border: 1px solid #000000;">${item.name}</td>
            <td class="center font-mono" style="text-align: center; border: 1px solid #000000;">${item.bh || '-'}</td>
            <td class="center font-mono" style="text-align: center; border: 1px solid #000000;">${item.nd || '-'}</td>
            <td class="center font-mono" style="text-align: center; font-weight: bold; border: 1px solid #000000;">${itemTotal || '-'}</td>
          </tr>
        `;
      });

      rowsHtml += `
        <tr class="total-row" style="background-color: #fafafa; font-weight: bold;">
          <td style="text-align: right; padding-right: 15px; font-size: 10pt; color: #475569; text-transform: uppercase; border: 1px solid #000000;">TỔNG (${category.name})</td>
          <td class="center font-mono" style="text-align: center; color: #1d4ed8; font-weight: bold; border: 1px solid #000000;">${catTotals.bh || '0'}</td>
          <td class="center font-mono" style="text-align: center; color: #047857; font-weight: bold; border: 1px solid #000000;">${catTotals.nd || '0'}</td>
          <td class="center font-mono" style="text-align: center; font-weight: bold; background-color: #f1f5f9; border: 1px solid #000000;">${catTotals.total || '0'}</td>
        </tr>
      `;
    });

    rowsHtml += `
      <tr class="total-row" style="background-color: #e2e8f0; font-size: 11pt; font-weight: bold;">
        <td style="text-align: left; padding-left: 10px; font-weight: bold; text-transform: uppercase; border: 1px solid #000000;">TỔNG CỘNG TOÀN KHOA CẬN LÂM SÀNG</td>
        <td class="center font-mono" style="text-align: center; color: #1d4ed8; font-weight: bold; border: 1px solid #000000;">${grandTotalsVal.bh || '0'}</td>
        <td class="center font-mono" style="text-align: center; color: #047857; font-weight: bold; border: 1px solid #000000;">${grandTotalsVal.nd || '0'}</td>
        <td class="center font-mono" style="text-align: center; font-weight: bold; background-color: #cbd5e1; color: #0f172a; border: 1px solid #000000;">${grandTotalsVal.total || '0'}</td>
      </tr>
    `;

    let stampTrungKhoa = '';
    let stampGiamDoc = '';

    const representsReport = currentReport && (!isRange && currentReport.date === start);
    const statusText = representsReport ? currentReport.status : 'draft';

    if (statusText === 'submitted' || statusText === 'approved') {
      stampTrungKhoa = `
        <div class="clinical-stamp-box" style="margin: 10px 0;">
          <div class="red-stamp">
            KHOA CẬN LÂM SÀNG<br>
            <span style="font-size: 8pt; font-weight: normal;">BỆNH VIỆN EXECUTIVE</span><br>
            <span style="font-size: 9pt; font-weight: bold;">★ ĐÃ XÁC NHẬN ★</span>
          </div>
        </div>
      `;
    }

    if (statusText === 'approved') {
      stampGiamDoc = `
        <div class="clinical-stamp-box" style="margin: 10px 0;">
          <span style="color: #e11d48; font-size: 9pt; font-weight: bold; display: block; margin-bottom: 2px;">DUYỆT Y CHÍNH THỨC</span>
          <div class="red-stamp" style="border: 3px double #e11d48; border-radius: 50%; width: 90px; height: 90px; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; font-size: 7pt; line-height: 1.2; padding: 2px;">
            <span style="font-size: 6pt;">BỆNH VIỆN ĐA KHOA</span>
            <span style="font-weight: bold; font-size: 8pt;">EXECUTIVE</span>
            <span style="color: #e11d48; font-size: 6pt;">* BAN GIÁM ĐỐC *</span>
          </div>
        </div>
      `;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Báo cáo giao ban cận lâm sảng (${isRange ? `${start}_den_${end}` : start})</title>
    <style>
        body {
            font-family: "Times New Roman", Times, serif;
            font-size: 13pt;
            line-height: 1.4;
            color: #000000;
            padding: 2cm;
            margin: 0 auto;
            background-color: #ffffff;
        }
        @page {
            size: A4;
            margin: 1.5cm;
        }
        @media print {
            body {
                padding: 0;
                margin: 0;
            }
            .no-print {
                display: none !important;
            }
        }
        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }
        .header-table td {
            border: none !important;
            padding: 2px !important;
            vertical-align: top;
            text-align: center;
        }
        .left-header {
            width: 45%;
            font-size: 11pt;
            text-transform: uppercase;
        }
        .left-header .hospital-name {
            font-weight: bold;
        }
        .left-header .department-name {
            font-weight: bold;
            text-decoration: underline;
        }
        .right-header {
            width: 55%;
            font-size: 11pt;
        }
        .right-header .national-title {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 11pt;
        }
        .right-header .national-subtitle {
            font-weight: bold;
            font-size: 12pt;
        }
        .right-header .divider {
            margin-top: 2px;
            letter-spacing: -1px;
            font-weight: bold;
        }
        .report-title-container {
            text-align: center;
            margin-top: 30px;
            margin-bottom: 25px;
        }
        .report-title {
            font-size: 16pt;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0;
            line-height: 1.3;
        }
        .report-subtitle {
            font-size: 12pt;
            font-style: italic;
            margin-top: 5px;
            margin-bottom: 0;
        }
        .meta-info {
            font-size: 11pt;
            margin-bottom: 20px;
            text-align: left;
            padding-left: 10px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11pt;
            margin-bottom: 40px;
        }
        .data-table th, .data-table td {
            border: 1px solid #000000;
            padding: 6px 8px;
            text-align: left;
        }
        .data-table th {
            font-weight: bold;
            text-align: center;
            background-color: #f2f2f2 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .data-table td.center {
            text-align: center;
        }
        .data-table td.right {
            text-align: right;
        }
        .font-mono {
            font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
        }
        .data-table tr.category-row {
            font-weight: bold;
            background-color: #fcfcfc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .data-table tr.total-row {
            font-weight: bold;
            background-color: #eaeaea !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .signature-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 30px;
        }
        .signature-table td {
            border: none !important;
            width: 33.33%;
            text-align: center;
            vertical-align: top;
            padding: 5px !important;
            font-size: 11pt;
        }
        .signature-title {
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 8px;
        }
        .signature-name {
            font-weight: bold;
            margin-top: 15px;
        }
        .clinical-stamp-box {
            position: relative;
            display: inline-block;
        }
        .red-stamp {
            border: 3px double #e11d48;
            color: #d90429;
            background: rgba(253, 244, 245, 0.5);
            border-radius: 6px;
            padding: 8px 15px;
            font-weight: bold;
            font-size: 10pt;
            text-transform: uppercase;
            transform: rotate(-4deg);
            display: inline-block;
            margin-top: 10px;
            letter-spacing: 0.5px;
            font-family: inherit;
        }
        .print-btn-bar {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 12px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            font-family: sans-serif;
            font-size: 14px;
        }
        .print-btn-bar button {
            background-color: #4f46e5;
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .print-btn-bar button:hover {
            background-color: #4338ca;
        }
    </style>
</head>
<body>
    <div class="print-btn-bar no-print">
        <span>📄 Bác sĩ có thể bấm <strong>In báo cáo</strong> để lưu trực tiếp dưới dạng tệp <strong>PDF</strong> hoặc in ra giấy.</span>
        <button onclick="window.print()">
            In báo cáo / Lưu PDF
        </button>
    </div>

    <!-- Hospital Standard Header -->
    <table class="header-table">
        <tr>
            <td class="left-header" style="text-align: center;">
                <div class="hospital-name">SỞ Y TẾ THÀNH PHỐ HÀ NỘI</div>
                <div class="hospital-name" style="font-weight: bold;">BV ĐA KHOA CHẤT LƯỢNG CAO EXECUTIVE</div>
                <div class="department-name" style="font-weight: bold; text-decoration: underline;">KHOA CẬN LÂM SÀNG</div>
            </td>
            <td class="right-header" style="text-align: center;">
                <div class="national-title" style="font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div class="national-subtitle" style="font-weight: bold;">Độc lập - Tự do - Hạnh phúc</div>
                <div class="divider">---------------</div>
                <div style="font-size: 11pt; margin-top: 10px; font-style: italic;">
                    Hà Nội, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}
                </div>
            </td>
        </tr>
    </table>

    <!-- Centralized Report Title -->
    <div class="report-title-container">
        <h1 class="report-title">${isRange ? 'BÁO CÁO TỔNG HỢP CHỈ TIÊU KỸ THUẬT Y KHOA' : 'BÁO CÁO GIAO BAN CHỈ TIÊU KỸ THUẬT Y KHOA'}</h1>
        <p class="report-title" style="font-size: 13pt; margin-top: 3px;">KHOA CẬN LÂM SÀNG</p>
        <p class="report-subtitle">${dateFormatted}</p>
    </div>

    <!-- Administrative metadata -->
    <div class="meta-info">
        <p style="margin: 3px 0;"><strong>Yêu cầu bởi:</strong> ${currentUser.name}</p>
        <p style="margin: 3px 0;"><strong>Hình thức báo cáo:</strong> Báo cáo số liệu giao ban ${isRange ? 'tổng hợp định kỳ' : 'chuyển ca trực hằng ngày'}</p>
        <p style="margin: 3px 0;"><strong>Trạng thái phê chuẩn:</strong> Chữ ký điện tử nội bộ bệnh viện</p>
    </div>

    <!-- Main Table data -->
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 50%;">CHỈ TIÊU KỸ THUẬT Y KHOA KHAI BÁO</th>
                <th style="width: 15%;">BẢO HIỂM (BH)</th>
                <th style="width: 15%;">NGOÀI DỊCH VỤ (ND)</th>
                <th style="width: 20%;">TỔNG CỘNG</th>
            </tr>
        </thead>
        <tbody>
            ${rowsHtml}
        </tbody>
    </table>

    <!-- Legal Signature Block -->
    <table class="signature-table">
        <tr>
            <td>
                <div class="signature-title">NGƯỜI LẬP BIỂU</div>
                <div style="font-size: 9pt; font-style: italic; color: #555555; margin-top: -5px; margin-bottom: 25px;">(Ký và ghi rõ họ tên)</div>
                <div class="signature-name" style="margin-top: 60px;">${currentUser.name}</div>
            </td>
            <td>
                <div class="signature-title">TRƯỞNG KHOA CẬN LÂM SÀNG</div>
                <div style="font-size: 9pt; font-style: italic; color: #555555; margin-top: -5px; margin-bottom: 25px;">(Ký, ghi rõ họ tên & đóng dấu)</div>
                <div>
                    ${stampTrungKhoa || `
                      <div class="clinical-stamp-box" style="margin: 10px 0;">
                        <div class="red-stamp">
                          KHOA CẬN LÂM SÀNG<br>
                          <span style="font-size: 8pt; font-weight: normal;">BỆNH VIỆN EXECUTIVE</span><br>
                          <span style="font-size: 9pt; font-weight: bold;">★ BÁO CÁO TỔNG HỢP ★</span>
                        </div>
                      </div>
                    `}
                </div>
                <div class="signature-name" style="margin-top: 15px;">TS. BS. Nguyễn Văn Trực</div>
            </td>
            <td>
                <div class="signature-title">BAN GIÁM ĐỐC BỆNH VIỆN</div>
                <div style="font-size: 9pt; font-style: italic; color: #555555; margin-top: -5px; margin-bottom: 25px;">(Phê duyệt, ký tên & đóng dấu)</div>
                <div>
                    ${stampGiamDoc || `
                      <div class="clinical-stamp-box" style="margin: 10px 0;">
                        <span style="color: #e11d48; font-size: 9pt; font-weight: bold; display: block; margin-bottom: 2px;">ỦY QUYỀN ĐIỆN TỬ</span>
                        <div class="red-stamp" style="border: 3px double #e11d48; border-radius: 50%; width: 90px; height: 90px; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; font-size: 7pt; line-height: 1.2; padding: 2px;">
                          <span style="font-size: 6pt;">BỆNH VIỆN ĐA KHOA</span>
                          <span style="font-weight: bold; font-size: 8pt;">EXECUTIVE</span>
                          <span style="color: #e11d48; font-size: 6pt;">* BAN GIÁM ĐỐC *</span>
                        </div>
                      </div>
                    `}
                </div>
                <div class="signature-name" style="margin-top: 15px;">GS. TS. Lê Hoàng Quân</div>
            </td>
        </tr>
    </table>

    <script>
        ${format === 'print' ? `
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 300);
        };
        ` : ''}
    </script>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    if (format === 'pdf') {
      link.download = `Bao_cao_giao_ban_tong_hop_${start}_den_${end}.html`;
    } else {
      link.download = `In_Bao_cao_giao_ban_tong_hop_${start}_den_${end}.html`;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportReportToPDF = () => {
    if (!currentReport) return;
    exportConsolidatedReport(currentReport.date, currentReport.date, currentReport.items, 'print');
  };

  const grandTotals = calculateGrandTotals();

  const filteredCategories = selectedCategory === 'all'
    ? CATEGORIES
    : CATEGORIES.filter(c => c.key === selectedCategory);

  // Status Badge Class Selector
  const getStatusBadge = () => {
    switch (currentReport.status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 border border-emerald-300 text-emerald-800 shadow-sm animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Đã Phê Duyệt Chính Thức
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 border border-blue-300 text-blue-800 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Chờ Trưởng Khoa Phê Duyệt
          </span>
        );
      default:
        if (isEditing) {
          if (isDraftSavingActive) {
            return (
              <button
                type="button"
                onClick={handleDraftCheckpointClick}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-md active:scale-95 transition-all cursor-pointer border border-red-700"
                title="Dữ liệu đang được lưu nháp. Nhấn để hủy!"
              >
                <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                Đang lưu
              </button>
            );
          } else {
            return (
              <button
                type="button"
                onClick={handleDraftCheckpointClick}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black bg-amber-500 hover:bg-amber-600 hover:scale-[1.03] text-white shadow-md active:scale-95 transition-all cursor-pointer border border-amber-600"
                title="Nhấp để tự động lưu nháp dữ liệu hiện tại!"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                Bản Nháp
              </button>
            );
          }
        }

        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 border border-amber-305 text-amber-800 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Bản Nháp
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-205 shadow-xs overflow-hidden space-y-4 p-4 transition-all">
      {/* Department Selector for high productivity data declaration layout - Render only if admin or truongKhoa */}
      {(currentUser.role === 'admin' || currentUser.role === 'truongKhoa') && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2.5 shadow-2xs">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block" id="label-dept-selector">
            Chọn Phòng ban / Chuyên khoa kê khai số liệu:
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category.key;
              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => setSelectedCategory(category.key)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition cursor-pointer select-none flex items-center gap-2 ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-650 text-white shadow-sm font-heavy'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  id={`btn-dept-${category.key}`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-200' : category.color.split(' ')[0]}`} />
                  {isSelected ? <strong>{category.name}</strong> : category.name}
                </button>
              );
            })}
            
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition cursor-pointer select-none flex items-center gap-2 ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 border-slate-950 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
              id="btn-dept-all"
            >
              <Database className="w-3.5 h-3.5" />
              Tất cả phòng ban
            </button>
          </div>
        </div>
      )}

      {/* Date, status, and Excel import bar on the same line */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-150">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-605" />
          <span className="text-xs font-extrabold text-slate-800">Chọn ngày giao ban:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveDate(shiftDateString(activeDate, -1))}
              className="inline-flex items-center justify-center p-1.5 rounded-md border border-slate-205 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-600 hover:text-indigo-600 transition shadow-xs cursor-pointer select-none h-7 w-7"
              title="Quay lại ngày trước"
              id="btn-prev-day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={activeDate}
              onChange={(e) => setActiveDate(e.target.value)}
              className="border border-slate-205 rounded-md px-2 py-1 h-7 text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-550 cursor-pointer bg-slate-50 hover:bg-slate-100/50 transition"
              id="input-active-date"
            />
            <button
              type="button"
              onClick={() => setActiveDate(shiftDateString(activeDate, 1))}
              className="inline-flex items-center justify-center p-1.5 rounded-md border border-slate-205 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-600 hover:text-indigo-600 transition shadow-xs cursor-pointer select-none h-7 w-7"
              title="Chuyển sang ngày kế tiếp"
              id="btn-next-day"
            >
              <ChevronRight className="w-4 h-4 text-center" />
            </button>
          </div>
        </div>

        {/* Report state "Bản nháp", "Nhập Excel" and "Đồng bộ Google" on the same line */}
        <div className="flex flex-wrap items-center gap-2 md:self-end">
          {getStatusBadge()}
          
          {currentUser.role === 'admin' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setImportLogs([]);
                  setImportError(null);
                  setParsedReports([]);
                  setIsExcelImportModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition duration-150 shadow-xs cursor-pointer select-none"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Nhập Excel 📂
              </button>

              <button
                type="button"
                onClick={() => {
                  setSheetsSyncMessage(null);
                  setIsGoogleSyncModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition duration-150 shadow-xs cursor-pointer select-none"
              >
                <svg className="w-3.5 h-3.5 text-indigo-150" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Đồng bộ Google 📊
                {googleAccessToken && (
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={!reports.some(r => r.date === activeDate)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs transition duration-150 shadow-xs cursor-pointer select-none"
                id="btn-delete-report"
                title="Xóa dữ liệu báo cáo của ngày này"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa dữ liệu 🗑️
              </button>
            </>
          )}
        </div>
      </div>

      {/* 5. Google Sheets Integration Panel */}
      {isGoogleSyncModalOpen && currentUser.role === 'admin' && createPortal(
        <div 
          onClick={() => {
            if (!isSyncingSheets && !isPullingSheets) setIsGoogleSyncModalOpen(false);
          }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in text-slate-800 dark:text-slate-100"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-205 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col animate-scale-up p-5"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
                    Đồng bộ Google Sheets 📊
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
                    Xử lý gửi/tải dữ liệu Clinis hai chiều trực tiếp
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSyncingSheets && !isPullingSheets) setIsGoogleSyncModalOpen(false);
                }}
                className="text-slate-450 hover:text-slate-700 dark:hover:text-slate-200 font-bold transition text-lg px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded select-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5 text-left">
                  <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
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
                      Đồng bộ hai chiều dữ liệu Clinis (BH & ND) giữa ứng dụng và Google Sheets
                    </p>
                  </div>
                </div>
              </div>

              {!googleAccessToken && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg space-y-1.5 text-left">
                  <span className="text-[11px] font-black text-amber-800 dark:text-amber-400 block flex items-center gap-1.5 font-sans">
                    ⚠️ CHƯA KẾT NỐI TÀI KHOẢN GOOGLE:
                  </span>
                  <p className="text-[10.5px] text-slate-650 dark:text-slate-400 font-semibold leading-relaxed">
                    Bạn chưa thực hiện liên kết Google Account để đồng bộ. Vui lòng chuyển sang mục <strong className="text-amber-800 dark:text-amber-300">Quản trị hệ thống &gt; Đồng bộ Google Sheets</strong> để thiết lập và kết nối tài khoản trước khi thực hiện đồng bộ.
                  </p>
                </div>
              )}

          {/* Main Action Type Selection: Push vs Pull */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <button
              type="button"
              onClick={() => setSyncDirection('push')}
              className={`p-4 rounded-xl border text-left transition duration-200 cursor-pointer ${
                syncDirection === 'push'
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-500/70 dark:border-indigo-500 ring-2 ring-indigo-500/10 shadow-sm'
                  : 'bg-white dark:bg-slate-950/45 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`p-2 rounded-lg shrink-0 ${
                  syncDirection === 'push'
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  <UploadCloud className="w-5 h-5" />
                </span>
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-slate-850 dark:text-slate-200 block font-sans">ĐỒNG BỘ LÊN GOOGLE SHEETS 📤</span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-450 font-semibold block leading-normal">Đẩy dữ liệu từ Clinis lên file Google Sheets</span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSyncDirection('pull')}
              className={`p-4 rounded-xl border text-left transition duration-200 cursor-pointer ${
                syncDirection === 'pull'
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-500/70 dark:border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm'
                  : 'bg-white dark:bg-slate-950/45 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`p-2 rounded-lg shrink-0 ${
                  syncDirection === 'pull'
                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  <DownloadCloud className="w-5 h-5" />
                </span>
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-slate-850 dark:text-slate-200 block font-sans">TẢI DỮ LIỆU XUỐNG CLINIS 📥</span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-450 font-semibold block leading-normal">Tải số liệu từ Google Sheets về lưu trữ ở Clinis</span>
                </div>
              </div>
            </button>
          </div>

          {/* Configuration sub-options */}
          <div className="p-4 bg-white dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-4 shadow-4xs">
            {/* 1. Time selection */}
            <div className="space-y-2">
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-sans">
                📅 LỰA CHỌN PHẠM VI THỜI GIAN:
              </span>
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Left side: Range Selector Dropdown */}
                <div className="w-full sm:w-1/3 flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500">Đơn vị thời gian</label>
                  <div className="relative">
                    <select
                      value={syncTimeRange}
                      onChange={(e) => setSyncTimeRange(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer appearance-none"
                    >
                      <option value="day">📅 Theo Ngày</option>
                      <option value="week">🗓️ Theo Tuần</option>
                      <option value="month">📊 Theo Tháng</option>
                      <option value="year">⭐ Theo Năm</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Right side: Dependent Adjustor */}
                <div className="w-full sm:w-2/3 flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500">Chi tiết thời gian lựa chọn</label>
                  
                  {syncTimeRange === 'day' && (
                    <div className="flex items-center justify-between px-3.5 py-2 rounded-lg border border-indigo-500/30 bg-indigo-50/15 dark:bg-indigo-950/10 text-indigo-700 dark:text-indigo-400 font-bold text-xs min-h-[42px]">
                      <span className="text-slate-600 dark:text-slate-400">Chọn ngày:</span>
                      <input 
                        type="date"
                        value={syncSelectedDate}
                        onChange={(e) => {
                          if (e.target.value) {
                            setSyncSelectedDate(e.target.value);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                      />
                    </div>
                  )}

                  {syncTimeRange === 'week' && (
                    <div className="flex flex-col gap-2 px-3.5 py-2 rounded-lg border border-indigo-500/30 bg-indigo-50/15 dark:bg-indigo-950/10 text-indigo-700 dark:text-indigo-400 font-bold text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Chọn ngày thuộc tuần đó:</span>
                        <input 
                          type="date"
                          value={syncSelectedDate}
                          onChange={(e) => {
                            if (e.target.value) {
                              setSyncSelectedDate(e.target.value);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-indigo-550/10 text-[10px] text-indigo-600/90 dark:text-indigo-400/90">
                        <span>Phạm vi tuần:</span>
                        {(() => {
                          try {
                            const d = new Date(syncSelectedDate);
                            const dayOfWeek = d.getDay();
                            const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                            const monday = new Date(d);
                            monday.setDate(d.getDate() + distanceToMonday);
                            const sunday = new Date(monday);
                            sunday.setDate(monday.getDate() + 6);
                            const weekStr = `${monday.getDate().toString().padStart(2, '0')}/${(monday.getMonth()+1).toString().padStart(2, '0')} - ${sunday.getDate().toString().padStart(2, '0')}/${(sunday.getMonth()+1).toString().padStart(2, '0')}`;
                            return (
                              <span className="font-extrabold bg-indigo-100/50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                                {weekStr}
                              </span>
                            );
                          } catch (e) {
                            return <span>Tính tuần...</span>;
                          }
                        })()}
                      </div>
                    </div>
                  )}

                  {syncTimeRange === 'month' && (
                    <div className="flex items-center justify-between px-3.5 py-2 rounded-lg border border-indigo-500/30 bg-indigo-50/15 dark:bg-indigo-950/10 text-indigo-700 dark:text-indigo-400 font-bold text-xs min-h-[42px]">
                      <span className="text-slate-600 dark:text-slate-400">Chọn tháng:</span>
                      <input 
                        type="month"
                        value={`${new Date(syncSelectedDate).getFullYear()}-${String(new Date(syncSelectedDate).getMonth() + 1).padStart(2, '0')}`}
                        onChange={(e) => {
                          if (e.target.value) {
                            const [yr, mn] = e.target.value.split('-');
                            const oldDay = new Date(syncSelectedDate).getDate();
                            setSyncSelectedDate(`${yr}-${mn}-${String(oldDay).padStart(2, '0')}`);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                      />
                    </div>
                  )}

                  {syncTimeRange === 'year' && (
                    <div className="flex items-center justify-between px-3.5 py-2 rounded-lg border border-indigo-500/30 bg-indigo-50/15 dark:bg-indigo-950/10 text-indigo-700 dark:text-indigo-400 font-bold text-xs min-h-[42px]">
                      <span className="text-slate-600 dark:text-slate-400">Chọn năm:</span>
                      <select
                        value={new Date(syncSelectedDate).getFullYear()}
                        onChange={(e) => {
                          const yr = e.target.value;
                          const d = new Date(syncSelectedDate);
                          const currentM = String(d.getMonth() + 1).padStart(2, '0');
                          const currentD = String(d.getDate()).padStart(2, '0');
                          setSyncSelectedDate(`${yr}-${currentM}-${currentD}`);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                      >
                        {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(yr => (
                          <option key={yr} value={yr} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">{yr}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Overwrite selection */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-sans">
                🔄 PHƯƠNG THỨC XỬ LÝ DỮ LIỆU CŨ:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSyncOverwrite(true)}
                  className={`p-3 rounded-lg border text-left transition duration-150 cursor-pointer flex items-start gap-2.5 ${
                    syncOverwrite === true
                      ? 'bg-rose-50/35 dark:bg-rose-950/10 border-rose-450/60 dark:border-rose-500/40 ring-1 ring-rose-500/10'
                      : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-900/55'
                  }`}
                >
                  <span className={`p-1.5 rounded shrink-0 ${syncOverwrite === true ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </span>
                  <div>
                    <span className="text-[11.5px] font-black text-rose-950 dark:text-rose-400 block">Có ghi đè dữ liệu trùng lặp</span>
                    <span className="text-[9.5px] font-sans text-slate-500 dark:text-slate-450 block font-semibold mt-0.5 leading-relaxed">Hệ thống sẽ thay thế và cập nhật đè số liệu cũ bằng dữ liệu mới nhất.</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSyncOverwrite(false)}
                  className={`p-3 rounded-lg border text-left transition duration-150 cursor-pointer flex items-start gap-2.5 ${
                    syncOverwrite === false
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-450/60 dark:border-emerald-500/40 ring-1 ring-emerald-500/10'
                      : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-900/55'
                  }`}
                >
                  <span className={`p-1.5 rounded shrink-0 ${syncOverwrite === false ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <div>
                    <span className="text-[11.5px] font-black text-emerald-950 dark:text-emerald-400 block">Không ghi đè (An toàn)</span>
                    <span className="text-[9.5px] font-sans text-slate-500 dark:text-slate-450 block font-semibold mt-0.5 leading-relaxed">Chỉ nạp thêm dòng mới, giữ nguyên bảo mật các báo cáo đang có trên hệ thống Clinis.</span>
                  </div>
                </button>
              </div>
            </div>

            {/* 3. Global Trigger Exec Button */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <button
                type="button"
                onClick={handleGoogleConnect}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-100 font-extrabold text-xs shadow-3xs transition duration-150 cursor-pointer select-none border border-slate-200 dark:border-slate-800 h-10"
              >
                <div className="w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center p-0.5 shrink-0 border border-slate-200/50 dark:border-transparent">
                  <svg viewBox="0 0 48 48" className="w-full h-full">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                </div>
                Kết nối Google Account ➔
              </button>

              <button
                type="button"
                disabled={isSyncingSheets || isPullingSheets}
                onClick={() => {
                  if (syncDirection === 'push') {
                    handleSyncToSheets(syncTimeRange, syncOverwrite);
                  } else {
                    handlePullFromSheets(syncTimeRange, syncOverwrite);
                  }
                }}
                className={`w-full px-4 py-2.5 rounded-lg text-xs font-extrabold shadow-3xs cursor-pointer select-none transition flex items-center justify-center gap-2 hover:brightness-105 disabled:opacity-50 text-white h-10 ${
                  syncDirection === 'push'
                    ? 'bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700'
                    : 'bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700'
                }`}
              >
                {isSyncingSheets || isPullingSheets ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Đang kết nối API Google Sheets...
                  </>
                ) : (
                  <>
                    {syncDirection === 'push' ? (
                      <>
                        <UploadCloud className="w-4 h-4 text-indigo-150" />
                        Bắt đầu đồng bộ lên Google Sheets 📤
                      </>
                    ) : (
                      <>
                        <DownloadCloud className="w-4 h-4 text-emerald-150" />
                        Bắt đầu tải dữ liệu xuống Clinis 📥
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sync message callback feedback */}
          {sheetsSyncMessage && (
            <div className="space-y-2">
              <div className={`p-3 rounded-lg text-xs font-bold leading-relaxed shadow-3xs border flex items-center justify-between gap-2 transition duration-200 ${
                sheetsSyncMessage.type === 'success' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250/50 text-emerald-800 dark:text-emerald-400' 
                  : 'bg-rose-50 dark:bg-rose-950/20 border-rose-250/50 text-rose-800 dark:text-rose-450'
              }`}>
                <span>
                  {sheetsSyncMessage.type === 'success' ? '➔ ✅' : '➔ ⚠️'} {sheetsSyncMessage.text}
                </span>
                <button 
                  type="button" 
                  onClick={() => setSheetsSyncMessage(null)}
                  className="text-[10px] opacity-70 hover:opacity-100 select-none px-1 py-0.5 hover:bg-slate-205/50 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Detailed Sync Statistics Panel */}
              {sheetsSyncMessage.type === 'success' && sheetsSyncMessage.details && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-3 shadow-3xs animate-slide-in">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                    <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 block uppercase font-sans">
                      📊 Chi tiết kết quả đồng bộ (Chế độ: {sheetsSyncMessage.overwrite ? "Ghi đè" : "Không ghi đè"})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Loại: {sheetsSyncMessage.syncType === 'day' ? 'Hàng ngày' : sheetsSyncMessage.syncType === 'week' ? 'Hàng tuần' : sheetsSyncMessage.syncType === 'month' ? 'Hàng tháng' : sheetsSyncMessage.syncType === 'year' ? 'Cả năm' : 'Toàn bộ'}
                    </span>
                  </div>

                  {/* 1. Single Day Details */}
                  {sheetsSyncMessage.syncType === 'day' && sheetsSyncMessage.details.dayDetails && (
                    <div className="space-y-2">
                      <p className="text-[10.5px] text-slate-650 dark:text-slate-400 font-semibold leading-relaxed">
                        Danh sách dịch vụ kỹ thuật đã được rà soát và đồng bộ ngày này:
                      </p>
                      <div className="max-h-60 overflow-y-auto border border-slate-150 dark:border-slate-800/85 rounded divide-y divide-slate-100 dark:divide-slate-850">
                        {sheetsSyncMessage.details.dayDetails.filter(item => item.status !== 'trong').length === 0 ? (
                          <div className="p-3 text-center text-slate-500">
                            Không có dịch vụ nào có dữ liệu phát sinh để cập nhật.
                          </div>
                        ) : (
                          sheetsSyncMessage.details.dayDetails
                            .filter(item => item.status !== 'trong')
                            .map((item, index) => (
                              <div key={item.id || index} className="p-2 flex items-start justify-between gap-2 bg-white dark:bg-slate-950">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-slate-800 dark:text-slate-300 block text-[11px]">{item.name}</span>
                                  <div className="flex gap-2 text-[10px] text-slate-500 font-mono">
                                    <span>Clinis App: (BH: {item.appBh}, ND: {item.appNd})</span>
                                    <span>•</span>
                                    <span>Google Sheet cũ: (BH: {item.sheetBh}, ND: {item.sheetNd})</span>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  {item.status === 'dong_bo_moi' && (
                                    <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-850 dark:text-emerald-400 font-black font-sans uppercase">
                                      🟢 ĐỒNG BỘ MỚI
                                    </span>
                                  )}
                                  {item.status === 'giu_nguyen' && (
                                    <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-sky-100 dark:bg-sky-950/50 text-sky-850 dark:text-sky-400 font-black font-sans uppercase">
                                      🔵 GIỮ NGUYÊN
                                    </span>
                                  )}
                                  {item.status === 'ghi_de' && (
                                    <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-amber-100 dark:bg-amber-950/50 text-amber-850 dark:text-amber-400 font-black font-sans uppercase">
                                      🟠 ĐH ĐÃ GHI ĐÈ
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">
                                    Kết quả Sheet: (BH: {item.resolvedBh}, ND: {item.resolvedNd})
                                  </span>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* 2. Multi-day (Week/Month) Details */}
                  {(sheetsSyncMessage.syncType === 'week' || sheetsSyncMessage.syncType === 'month') && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/50 rounded">
                          <span className="text-emerald-800 dark:text-emerald-400 font-black block text-sm">{sheetsSyncMessage.details.syncedDays?.length || 0}</span>
                          <span className="text-[10px] text-slate-500 font-bold">Ngày đã đồng bộ</span>
                        </div>
                        <div className="p-2 bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-950/50 rounded">
                          <span className="text-amber-800 dark:text-amber-400 font-black block text-sm">{sheetsSyncMessage.details.unsyncedDays?.length || 0}</span>
                          <span className="text-[10px] text-slate-500 font-bold">Ngày bỏ qua/chưa duyệt</span>
                        </div>
                      </div>

                      <div className="max-h-52 overflow-y-auto border border-slate-150 dark:border-slate-800/85 rounded divide-y divide-slate-100 dark:divide-slate-850 text-[11px] bg-white dark:bg-slate-950">
                        {sheetsSyncMessage.details.syncedDays?.map(day => (
                          <div key={day} className="p-2 flex items-center justify-between gap-1.5">
                            <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{day}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-emerald-50 text-emerald-750 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold">
                              ✓ Đã đồng bộ thành công
                            </span>
                          </div>
                        ))}
                        {sheetsSyncMessage.details.unsyncedDays?.map(item => (
                          <div key={item.date} className="p-2 flex items-start justify-between gap-1.5">
                            <span className="font-bold text-slate-500 font-mono">{item.date}</span>
                            <span className="text-amber-700 dark:text-amber-450 text-[10px] text-right font-medium">
                              ⚠️ Bỏ qua ({item.reason})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Large Sync Details (Year/All) */}
                  {(sheetsSyncMessage.syncType === 'year' || sheetsSyncMessage.syncType === 'all') && sheetsSyncMessage.details.largeSync && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/50 rounded">
                          <span className="text-emerald-800 dark:text-emerald-400 font-black block text-sm">{sheetsSyncMessage.details.largeSync.syncedCount}</span>
                          <span className="text-[10px] text-slate-500 font-bold">Số ngày đã đồng bộ</span>
                        </div>
                        <div className="p-2 bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/50 rounded">
                          <span className="text-rose-800 dark:text-rose-450 font-black block text-sm">{sheetsSyncMessage.details.largeSync.unsyncedCount}</span>
                          <span className="text-[10px] text-slate-500 font-bold">Số ngày chưa đồng bộ</span>
                        </div>
                      </div>

                      <div className="p-2 bg-slate-100 dark:bg-slate-850 rounded text-[10.5px] text-slate-650 dark:text-slate-400 space-y-1">
                        <p className="font-bold text-slate-700 dark:text-slate-300">Lý do số ngày chưa đồng bộ:</p>
                        {sheetsSyncMessage.details.largeSync.reasons.map((r, i) => (
                          <div key={i} className="flex justify-between">
                            <span>• {r.reason}:</span>
                            <span className="font-bold font-mono">{r.count} ngày</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Primary Data Input Button / Edit Actions placed on a line below */}
      {(currentReport.status !== 'approved' || currentUser.role === 'admin') && (
        <div className={`flex flex-col sm:flex-row sm:items-center gap-3 pt-1 w-full pb-2 ${isEditing ? 'justify-end' : 'justify-center'}`}>
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl text-white font-black text-xs md:text-sm transition-all duration-300 transform hover:scale-[1.04] active:scale-98 cursor-pointer bg-gradient-to-r from-indigo-600 via-indigo-750 to-violet-700 hover:from-indigo-500 hover:to-violet-650 animate-pulse-subtle shadow-lg w-full sm:w-auto"
              style={{
                boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.5), 0 8px 16px -6px rgba(124, 58, 237, 0.4)'
              }}
            >
              <FilePenLine className="w-4 h-4 text-white shrink-0 animate-bounce" />
              {currentReport.status === 'approved' 
                ? `Hiệu chỉnh số liệu đã DUYỆT ngày ${formatDateToDDMMYYYY(activeDate)} (Quyền Admin) 🛠️` 
                : `Nhập số liệu chuyên môn ngày ${formatDateToDDMMYYYY(activeDate)}`}
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setIsDraftSavingActive(false);
                  setDraftSavedCheckpoint(null);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs transition disabled:opacity-50 shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Đang lưu...' : 'Gửi báo cáo số liệu'}
              </button>
            </div>
          )}

          {(currentUser.role === 'admin' || currentUser.role === 'truongKhoa') && currentReport.status === 'submitted' && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition duration-150 disabled:opacity-50 shadow-xs cursor-pointer w-full sm:w-auto"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Duyệt số liệu
            </button>
          )}
        </div>
      )}

      {/* Editing rules alerting banner */}
      {isEditing && currentUser.role !== 'admin' && currentUser.role !== 'truongKhoa' && (
        <div className="bg-amber-50/50 border border-amber-200/60 text-amber-900 px-3 py-2 rounded-md text-[11px] leading-relaxed flex items-center gap-2 shadow-inner">
          <ShieldAlert className="w-4 h-4 text-amber-655 flex-shrink-0 animate-bounce" />
          <p>
            Tài khoản phụ trách: <strong>{currentUser.name}</strong>. Phân quyền chặt chẽ: Bạn chỉ được ghi nhận số liệu phòng <strong>{currentUser.departmentName}</strong>. Khóa nhập liệu các khoa phòng khác <Lock className="w-3 h-3 inline-block" />.
          </p>
        </div>
      )}

      {isEditing && currentUser.role === 'admin' && currentReport.status === 'approved' && (
        <div className="bg-rose-50 border border-rose-200/80 text-rose-955 px-3.5 py-2.5 rounded-lg text-[11px] leading-relaxed flex items-center gap-2.5 shadow-xs">
          <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 animate-bounce" />
          <p>
            🚨 <strong>Quyền hạn đặc biệt:</strong> Bạn đang thao tác chỉnh sửa dữ liệu của báo cáo <strong>Đã duyệt y chính thức</strong> dưới danh nghĩa <strong>Quản trị viên (Admin)</strong>. Hệ thống sẽ cập nhật trạng thái báo cáo và lưu vết thông tin kiểm toán hoạt động đầy đủ.
          </p>
        </div>
      )}

      {/* Spreadsheets lookalike report table - Soft neutral borders and balanced contrast */}
      <div className="overflow-x-auto rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-950 transition-all duration-300">
        <table className="min-w-full divide-y divide-slate-150/50 border-collapse bg-white dark:bg-slate-950">
          {/* Header Row */}
          <thead className="bg-slate-50/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 font-semibold text-xs tracking-wider border-b-2 border-slate-300">
            <tr>
              <th scope="col" rowSpan={2} className="px-6 py-5 text-left font-black tracking-wide text-slate-900 dark:text-white min-w-[280px] text-sm uppercase">
                CHỈ TIÊU BÁO CÁO GIAO BAN KHOA
              </th>
              <th scope="col" colSpan={3} className="px-4 py-3.5 text-center border-b border-slate-250/30 font-black text-[13px] uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                SỐ LIỆU NGÀY {currentReport?.date ? formatDateToDDMMYYYY(currentReport.date) : 'N/A'}
              </th>
            </tr>
            <tr className="bg-slate-50/40 dark:bg-slate-900/50 text-slate-600 dark:text-slate-350">
              <th scope="col" className="px-4 py-3.5 text-center min-w-[120px] text-[12px] uppercase font-black text-indigo-600 dark:text-indigo-400">Bảo Hiểm (BH)</th>
              <th scope="col" className="px-4 py-3.5 text-center min-w-[120px] text-[12px] uppercase font-black text-emerald-600 dark:text-emerald-400">Ngoài DV (ND)</th>
              <th scope="col" className="px-4 py-3.5 text-center min-w-[125px] text-[12px] uppercase font-black text-slate-700 dark:text-slate-300">Tổng cộng</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/50 bg-white dark:bg-slate-950">
            {filteredCategories.map(category => {
              const catTotals = calculateCategoryTotals(category.key);
              const hasCatPermission = hasPermissionForCategory(category.key);
              
              // Filter report items in this category
              const catItems = currentReport.items.filter(item => item.category === category.key);

              return (
                <React.Fragment key={category.key}>
                  {/* Category Title Header Row */}
                  <tr className="bg-slate-100/75 dark:bg-slate-900/45 font-bold border-y-2 border-slate-200 dark:border-slate-805">
                    <td colSpan={4} className="px-6 py-4 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-900 dark:text-white font-black uppercase tracking-widest text-[13px] flex items-center gap-2.5">
                          <span className="w-2 h-4 rounded bg-indigo-600 inline-block" />
                          {category.name}
                        </span>
                        <span className="text-[11.5px] text-slate-600 dark:text-slate-300 font-bold bg-slate-200/70 dark:bg-slate-800 px-3 py-1 rounded-md">
                          Bác sĩ phụ trách: <strong className="text-slate-800 dark:text-slate-100 font-extrabold">{USERS.find(u => u.role === category.key)?.name || "Bác sĩ khoa"}</strong>
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Rows inside category - High Density */}
                  {catItems.map(item => {
                    const rowCombined = (Number(item.bh) || 0) + (Number(item.nd) || 0);

                    return (
                      <tr 
                        key={item.id} 
                        className="group hover:bg-indigo-50/25 dark:hover:bg-indigo-950/20 transition-all duration-200 border-b border-slate-200 dark:border-slate-800/85 even:bg-slate-50/15 dark:even:bg-slate-900/5"
                      >
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 pr-4 leading-relaxed text-[13.5px] sm:text-[14px] border-l-4 border-l-transparent transition-all duration-200 group-hover:pl-8 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:border-l-indigo-600 dark:group-hover:border-l-indigo-500">
                          {item.name}
                        </td>
                        
                        {/* BH Input */}
                        <td className="px-4 py-3 text-center transition-all duration-200 group-hover:bg-indigo-50/10 dark:group-hover:bg-indigo-950/10">
                          {isEditing && hasCatPermission ? (
                            <input
                              type="number"
                              min="0"
                              value={item.bh === 0 ? '' : item.bh}
                              placeholder="0"
                              onChange={(e) => handleInputChange(item.id, 'bh', e.target.value)}
                              className="w-full max-w-[105px] mx-auto bg-slate-50 dark:bg-slate-905 text-slate-900 dark:text-white font-black font-mono text-center border-2 border-slate-250 dark:border-slate-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-850 text-sm leading-none transition duration-150 shadow-3xs"
                            />
                          ) : (
                            <span className="font-mono text-indigo-700 dark:text-indigo-400 font-black text-sm text-center block">
                              {item.bh || <span className="text-slate-300 dark:text-slate-700 font-normal">-</span>}
                            </span>
                          )}
                        </td>

                        {/* ND Input */}
                        <td className="px-4 py-3 text-center transition-all duration-200 group-hover:bg-indigo-50/10 dark:group-hover:bg-indigo-950/10">
                          {isEditing && hasCatPermission ? (
                            <input
                              type="number"
                              min="0"
                              value={item.nd === 0 ? '' : item.nd}
                              placeholder="0"
                              onChange={(e) => handleInputChange(item.id, 'nd', e.target.value)}
                              className="w-full max-w-[105px] mx-auto bg-slate-50 dark:bg-slate-905 text-slate-900 dark:text-white font-black font-mono text-center border-2 border-slate-250 dark:border-slate-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-850 text-sm leading-none transition duration-150 shadow-3xs"
                            />
                          ) : (
                            <span className="font-mono text-emerald-700 dark:text-emerald-400 font-black text-sm text-center block">
                              {item.nd || <span className="text-slate-300 dark:text-slate-700 font-normal">-</span>}
                            </span>
                          )}
                        </td>

                        {/* Combined Row Sum */}
                        <td className="px-4 py-3 text-center font-black font-mono text-slate-950 dark:text-slate-50 bg-slate-150/15 dark:bg-slate-900/10 text-sm transition-all duration-200 group-hover:bg-indigo-100/20 dark:group-hover:bg-indigo-900/15">
                          {rowCombined || <span className="text-slate-300 dark:text-slate-700 font-normal">-</span>}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Category Totals summary Row - High Density */}
                  <tr className="group bg-indigo-50/45 dark:bg-indigo-950/30 font-bold border-y-2 border-indigo-150/80 dark:border-indigo-900/70 text-indigo-950 dark:text-indigo-250 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/50 hover:shadow-xs transition-all duration-300">
                    <td className="px-6 py-4.5 text-right uppercase tracking-wider text-indigo-900 dark:text-indigo-350 font-extrabold text-[12px] border-l-4 border-l-indigo-400/80 dark:border-l-indigo-800 transition-all duration-300 group-hover:pl-8 group-hover:border-l-indigo-600 dark:group-hover:border-l-indigo-500">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        TỔNG ({category.name})
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono font-black text-indigo-700 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/40 text-sm transition-all duration-300 group-hover:bg-indigo-100/60 dark:group-hover:bg-indigo-900/60">
                      {catTotals.bh || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono font-black text-emerald-705 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/40 text-sm transition-all duration-300 group-hover:bg-emerald-100/50 dark:group-hover:bg-emerald-900/50">
                      {catTotals.nd || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono font-black text-slate-950 dark:text-white bg-slate-100/60 dark:bg-slate-900/40 text-sm transition-all duration-300 group-hover:bg-indigo-200/50 dark:group-hover:bg-indigo-900/70">
                      {catTotals.total || '-'}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}

            {/* GRAND TOTAL ROW */}
            <tr className="group bg-slate-900 dark:bg-indigo-950 text-white font-bold border-t-4 border-indigo-500 h-16 transition-all duration-300 hover:bg-slate-950 dark:hover:bg-slate-900 hover:shadow-lg">
              <td className="px-6 py-4 uppercase tracking-widest text-left text-white font-black text-[12px] border-l-4 border-l-indigo-500 transition-all duration-300 group-hover:pl-8 group-hover:border-l-sky-450">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-indigo-400 group-hover:text-sky-400 group-hover:scale-110 transition-all duration-300 animate-pulse" />
                  TỔNG CỘNG TOÀN KHOA CẬN LÂM SÀNG
                </div>
              </td>
              <td className="px-4 py-3 text-center font-mono font-black text-sky-300 text-sm transition-all duration-300 group-hover:text-sky-200 group-hover:bg-slate-900/80">
                {grandTotals.bh || '0'}
              </td>
              <td className="px-4 py-3 text-center font-mono font-black text-emerald-400 text-sm transition-all duration-300 group-hover:text-emerald-300 group-hover:bg-slate-900/80">
                {grandTotals.nd || '0'}
              </td>
              <td className="px-4 py-3 text-center font-mono font-black bg-slate-950 dark:bg-slate-900 text-white text-sm transition-all duration-300 group-hover:bg-indigo-900">
                {grandTotals.total || '0'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Official approval stamp representation */}
      {currentReport.status === 'approved' && (
        <div className="flex justify-end pt-2 pr-2">
          <div className="relative border-4 border-rose-500/80 text-rose-550 bg-rose-50/20 rounded-md px-4 py-1.5 font-extrabold uppercase tracking-widest text-center text-xs transform -rotate-2 border-double select-none shadow-xs flex flex-col items-center gap-0.5 leading-none">
            <span className="text-[8px] tracking-normal font-normal normal-case block">Sở Y Tế - BV Đa Khoa</span>
            <span className="text-[11px]">DUYỆT Y CHÍNH THỨC</span>
            <span className="text-[8px] font-mono tracking-normal lowercase block">
              {currentReport.approvedBy ? `${formatDateToDDMMYYYY(new Date().toISOString().split('T')[0])} bởi ${currentReport.approvedBy}` : 'hệ thống HIS'}
            </span>
          </div>
        </div>
      )}

      {/* TIME FRAME REPORT POPUP MODAL */}
      {isExportModalOpen && createPortal(
        <div 
          onClick={() => setIsExportModalOpen(false)}
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-[100] p-4 transition-all duration-205"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl border border-slate-205 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-155 text-slate-800"
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">Tạo Báo Cáo Tổng Hợp Số Liệu 📊</h3>
                  <p className="text-[10px] text-slate-300">Tổng hợp danh mục kỹ thuật y sỹ chỉ định toàn khoa cận lâm sàng</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-white transition font-black text-lg p-1.5 hover:bg-slate-800 rounded-md cursor-pointer select-none"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 min-h-0 bg-slate-50/50">
              {/* Date Interval Selectors */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-3xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black tracking-wide text-slate-500 block">Từ ngày:</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-250 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-505 focus:border-indigo-505 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black tracking-wide text-slate-500 block">Đến ngày:</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-250 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-505 focus:border-indigo-505 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Real-time preview list */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-slate-700 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-indigo-500" />
                    Xem trước số liệu tổng hợp trong khoảng thời gian
                  </h4>
                  <span className="text-[10px] text-slate-500 font-semibold italic bg-slate-100 px-2.5 py-1 rounded-full">
                    Từ {formatDateToDDMMYYYY(exportStartDate)} đến {formatDateToDDMMYYYY(exportEndDate)}
                  </span>
                </div>

                {/* Table Preview */}
                <div className="border border-slate-205 rounded-lg overflow-hidden bg-white shadow-3xs max-h-[350px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 sticky top-0 border-b border-slate-205 z-10 text-[10px] font-black uppercase text-slate-650 tracking-wider">
                      <tr className="divide-x divide-slate-200">
                        <th className="px-3 py-2.5">Chỉ tiêu kỹ thuật y khoa</th>
                        <th className="px-2 py-2.5 text-center w-24">Bảo Hiểm (BH)</th>
                        <th className="px-2 py-2.5 text-center w-24">Ngoài Dịch Vụ (ND)</th>
                        <th className="px-2 py-2.5 text-center w-28 bg-slate-200/50">Tổng số</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {CATEGORIES.map(category => {
                        const catItems = previewItems.filter(it => it.category === category.key);
                        const catBhSum = catItems.reduce((acc, it) => acc + (it.bh || 0), 0);
                        const catNdSum = catItems.reduce((acc, it) => acc + (it.nd || 0), 0);
                        const catTotal = catBhSum + catNdSum;

                        return (
                          <React.Fragment key={category.key}>
                            {/* Department banner row */}
                            <tr className="bg-slate-50/75 font-extrabold text-[10px] text-slate-900 border-t border-slate-200">
                              <td className="px-3 py-1.5 uppercase tracking-wide text-indigo-700" style={{ borderLeft: `3px solid ${category.color || '#4f46e5'}` }}>
                                {category.name}
                              </td>
                              <td className="px-2 py-1.5 text-center font-mono">{catBhSum || '-'}</td>
                              <td className="px-2 py-1.5 text-center font-mono">{catNdSum || '-'}</td>
                              <td className="px-2 py-1.5 text-center font-mono bg-slate-100 text-indigo-850">{catTotal || '-'}</td>
                            </tr>
                            
                            {/* Items under this category */}
                            {catItems.map(item => {
                              const total = (item.bh || 0) + (item.nd || 0);
                              return (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition duration-75 text-[11px]">
                                  <td className="px-5 py-1 text-slate-600 font-medium font-sans">↳ {item.name}</td>
                                  <td className="px-2 py-1 text-center font-mono font-semibold text-sky-700">{item.bh || '-'}</td>
                                  <td className="px-2 py-1 text-center font-mono font-semibold text-emerald-700">{item.nd || '-'}</td>
                                  <td className="px-2 py-1 text-center font-mono font-bold bg-slate-50/50 text-slate-800">{total || '-'}</td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-4 flex flex-col sm:flex-row justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-extrabold text-xs transition duration-150 cursor-pointer select-none text-center"
              >
                Hủy bỏ / Quay lại
              </button>
              
              <div className="flex flex-wrap gap-2.5 justify-end">
                {/* EXCEL ACTION */}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition duration-150 shadow-xs cursor-pointer select-none"
                >
                  <FileDown className="w-4 h-4 text-emerald-100" />
                  Xuất file Excel (.csv) 📄
                </button>

                {/* PDF ACTION */}
                <button
                  type="button"
                  onClick={() => exportConsolidatedReport(exportStartDate, exportEndDate, previewItems, 'pdf')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition duration-150 shadow-xs cursor-pointer select-none"
                >
                  <FileDown className="w-4 h-4 text-indigo-100" />
                  Xuất file PDF 📕
                </button>

                {/* PRINT ACTION */}
                <button
                  type="button"
                  onClick={() => exportConsolidatedReport(exportStartDate, exportEndDate, previewItems, 'print')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-850 hover:bg-slate-900 text-white font-extrabold text-xs transition duration-150 shadow-xs cursor-pointer select-none"
                >
                  <Printer className="w-4 h-4 text-slate-300 animate-pulse" />
                  In biểu mẫu 🖨️
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* EXCEL IMPORT MULTI-DATE POPUP MODAL */}
      {isExcelImportModalOpen && createPortal(
        <div 
          onClick={() => {
            if (!isImportingProgress) setIsExcelImportModalOpen(false);
          }}
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-[100] p-4 transition-all duration-205"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl border border-slate-205 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-155 text-slate-800"
          >
            {/* Modal Header */}
            <div className="bg-emerald-700 text-white px-5 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-emerald-100" />
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">Nhập dữ liệu báo cáo qua Excel hàng tháng 📂</h3>
                  <p className="text-[10px] text-emerald-100/90">Dành riêng cho Quản trị viên (Admin) nhập số liệu của nhiều ngày đồng thời</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  if (!isImportingProgress) setIsExcelImportModalOpen(false);
                }}
                className="text-emerald-200 hover:text-white transition font-black text-lg p-1.5 hover:bg-emerald-800 rounded-md cursor-pointer select-none"
                disabled={isImportingProgress}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 min-h-0 bg-slate-50/50">
              
              {/* Instructions and Download Template */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-white rounded-lg p-3.5 border border-slate-200/80 shadow-3xs space-y-2 text-xs">
                  <h4 className="font-extrabold text-[#047857] uppercase text-[10px] tracking-wider flex items-center gap-1.5 font-sans">
                    💡 Hướng dẫn cấu trúc tệp Excel biểu mẫu:
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1 leading-relaxed">
                    <li>Nhận diện cột tự động theo tên: <strong className="text-slate-800">Ngày</strong> (hoặc Date), <strong className="text-slate-800">Chỉ tiêu</strong> (hoặc Tên), <strong className="text-slate-800">BH</strong>, <strong className="text-slate-800">ND</strong>.</li>
                    <li>Đột phá: Hỗ trợ tự động phân tích định dạng ngày chuẩn quốc tế (<code className="text-emerald-700 bg-emerald-50 px-1 font-mono text-[10px] rounded">YYYY-MM-DD</code>) lẫn Việt Nam (<code className="text-emerald-700 bg-emerald-50 px-1 font-mono text-[10px] rounded">DD/MM/YYYY</code>).</li>
                    <li>Chế độ so khớp thông minh: Hệ thống tự động so khớp gần đúng tên kỹ thuật (ví dụ: <span className="italic">"Siêu âm tim"</span>, <span className="italic">"Nội soi dạ dày"</span>...) với 30 chỉ tiêu chuẩn.</li>
                  </ul>
                </div>

                <div className="bg-emerald-50/40 rounded-lg p-3.5 border border-emerald-150 flex flex-col justify-between space-y-2 text-center">
                  <div>
                    <h5 className="font-extrabold text-emerald-850 text-[11px] uppercase tracking-wide">Tải File Excel Mẫu</h5>
                    <p className="text-[10px] text-emerald-800 mt-1 leading-relaxed">Sử dụng tệp excel chuẩn để đảm bảo tỷ lệ so khớp cao tối đa.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadExcelTemplate}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-650 hover:bg-emerald-700 text-white font-heavy text-xs transition duration-15 shadow-2xs cursor-pointer select-none"
                  >
                    <FileDown className="w-4 h-4 text-emerald-100" />
                    Tải mẫu Excel (.xlsx) 📥
                  </button>
                </div>
              </div>

              {/* Upload Field */}
              <div className="bg-white border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-8 transition duration-150 text-center relative max-w-xl mx-auto">
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleExcelImportFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={isImportingProgress}
                />
                <div className="space-y-3">
                  <UploadCloud className="w-10 h-10 text-slate-400 mx-auto animate-pulse" />
                  <div>
                    <p className="text-xs font-black text-slate-800">Kéo & thả tệp Excel của bạn vào đây hoặc click để duyệt</p>
                    <p className="text-[10px] text-slate-400 mt-1">Chấp nhận tệp định dạng .xlsx, .xls, .csv</p>
                  </div>
                </div>
              </div>

              {/* Parsing status & Error notifications */}
              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-bold leading-relaxed shadow-3xs">
                  ⚠️ {importError}
                </div>
              )}

              {/* Live import consolidation log */}
              {importLogs.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 block">Nhật ký phân tích dữ liệu:</h4>
                  <div className="bg-slate-900 text-slate-200 font-mono text-[10px] p-4 rounded-lg overflow-y-auto max-h-[160px] space-y-1.5 shadow-inner">
                    {importLogs.map((log, lIdx) => (
                      <div key={lIdx} className={log.includes('✅') ? 'text-emerald-400' : log.includes('⚠️') ? 'text-amber-400' : log.includes('❌') ? 'text-rose-400 font-black' : 'text-slate-300'}>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parsed daily reports preview list */}
              {parsedReports.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-700 flex items-center gap-1">
                    📊 Xem trước dữ liệu chuẩn bị nạp vào hệ thống:
                  </h4>
                  <div className="border border-slate-205 rounded-lg overflow-hidden bg-white shadow-3xs max-h-[220px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 sticky top-0 border-b border-slate-205 z-10 text-[9px] font-black uppercase text-slate-650 tracking-wider">
                        <tr className="divide-x divide-slate-200">
                          <th className="px-3 py-2">Ngày kê khai</th>
                          <th className="px-3 py-2 text-center">Trạng thái phê duyệt</th>
                          <th className="px-3 py-2 text-center">Người nạp dữ liệu</th>
                          <th className="px-3 py-2 text-center">Bảo Hiểm (BH)</th>
                          <th className="px-3 py-2 text-center">Dịch Vụ (ND)</th>
                          <th className="px-3 py-2 text-center bg-slate-200">Tổng số ca</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700 font-medium font-sans">
                        {parsedReports.sort((a,b)=>a.date.localeCompare(b.date)).map((r) => {
                          const bh = r.items.reduce((s,i)=>s+i.bh,0);
                          const nd = r.items.reduce((s,i)=>s+i.nd,0);
                          return (
                            <tr key={r.date} className="hover:bg-slate-50 divide-x divide-slate-100">
                              <td className="px-3 py-1.5 font-bold text-slate-900">{formatDateToDDMMYYYY(r.date)}</td>
                              <td className="px-3 py-1.5 text-center text-[10px] text-emerald-800 font-black uppercase">DUYỆT TỰ ĐỘNG</td>
                              <td className="px-3 py-1.5 text-center text-slate-500">{currentUser.name}</td>
                              <td className="px-3 py-1.5 text-center font-mono text-sky-700">{bh} ca</td>
                              <td className="px-3 py-1.5 text-center font-mono text-emerald-700">{nd} ca</td>
                              <td className="px-3 py-1.5 text-center font-mono font-bold bg-slate-100 text-slate-800">{bh+nd} ca</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-4 flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => setIsExcelImportModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-extrabold text-xs transition duration-150 cursor-pointer select-none text-center"
                disabled={isImportingProgress}
              >
                Hủy bỏ / Quay lại
              </button>
              
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={parsedReports.length === 0 || isImportingProgress}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition duration-150 shadow-xs cursor-pointer select-none disabled:opacity-50"
              >
                {isImportingProgress ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-150" />
                    Đang lưu dữ liệu...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-100" />
                    Ghi nhận & Phát hành số liệu ({parsedReports.length} ngày) ✅
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {confirmSheetSync && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[20000] animate-fade-in text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-205 dark:border-slate-800 space-y-4 animate-scale-up text-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </span>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Xác nhận đồng bộ Google Sheets</h4>
            </div>
            <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed font-semibold whitespace-pre-line">
              {(() => {
                const tr = confirmSheetSync.timeRange;
                const datePart = formatDateToDDMMYYYY(syncSelectedDate);
                const overwriteMsg = confirmSheetSync.overwrite
                  ? "Lưu ý: Thao tác sẽ GHI ĐÈ lên các cột số liệu cũ tương ứng trong bảng tính Google Sheets của bạn."
                  : "Lưu ý: Thao tác sẽ chỉ gửi số liệu bổ sung và không ảnh hưởng đến dữ liệu cũ.";

                switch (tr) {
                  case 'day': return `Bạn có chắc chắn muốn đồng bộ số liệu báo cáo Clinis ngày ${datePart} lên Google Sheets?\n\n${overwriteMsg}`;
                  case 'week': return `Bạn có chắc chắn muốn đồng bộ số liệu báo cáo Clinis Tuần chứa ngày ${datePart} lên Google Sheets?\n\n${overwriteMsg}`;
                  case 'month': return `Bạn có chắc chắn muốn đồng bộ số liệu báo cáo Clinis của toàn bộ Tháng ${(new Date(syncSelectedDate).getMonth()+1).toString().padStart(2, '0')}/${new Date(syncSelectedDate).getFullYear()} lên Google Sheets?\n\n${overwriteMsg}`;
                  case 'year': return `Bạn có chắc chắn muốn đồng bộ toàn bộ tất cả báo cáo Clinis của Năm ${new Date(syncSelectedDate).getFullYear()} lên Google Sheets?\n\n${overwriteMsg}`;
                }
              })()}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConfirmSheetSync(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 text-xs font-bold transition hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const { timeRange, overwrite } = confirmSheetSync;
                  setConfirmSheetSync(null);
                  proceedSyncToSheets(timeRange, overwrite);
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold transition hover:bg-indigo-700 cursor-pointer"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
  
      {confirmSheetPull && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[20000] animate-fade-in text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-205 dark:border-slate-800 space-y-4 animate-scale-up text-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </span>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Xác nhận tải số liệu Google Sheets</h4>
            </div>
            <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed font-semibold whitespace-pre-line">
              {(() => {
                const tr = confirmSheetPull.timeRange;
                const datePart = formatDateToDDMMYYYY(syncSelectedDate);
                const overwriteMsg = confirmSheetPull.overwrite
                  ? "Lưu ý: Dữ liệu Clinis các ngày trùng lặp SẼ bị ghi đè và thay thế hoàn toàn."
                  : "Lưu ý: Dữ liệu Clinis các ngày trùng lặp sẽ được GIỮ NGUYÊN và KHÔNG bị ghi đè.";

                switch (tr) {
                  case 'day': return `Bạn có chắc chắn muốn tải số liệu tương ứng ngày ${datePart} từ Google Sheets về phần mềm Clinis?\n\n${overwriteMsg}`;
                  case 'week': return `Bạn có chắc chắn muốn tải số liệu của các ngày trong Tuần chứa ngày ${datePart} từ Google Sheets về phần mềm Clinis?\n\n${overwriteMsg}`;
                  case 'month': return `Bạn có chắc chắn muốn tải toàn bộ số liệu của Tháng ${(new Date(syncSelectedDate).getMonth()+1).toString().padStart(2, '0')}/${new Date(syncSelectedDate).getFullYear()} từ Google Sheets về phần mềm Clinis?\n\n${overwriteMsg}`;
                  case 'year': return `Bạn có chắc chắn muốn tải toàn bộ số liệu của tất cả các trang tính 'Tháng X' của Năm ${new Date(syncSelectedDate).getFullYear()} trên Google Sheets về phần mềm Clinis?\n\n${overwriteMsg}`;
                }
              })()}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConfirmSheetPull(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-605 dark:text-slate-300 bg-white dark:bg-slate-900 text-xs font-bold transition hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { timeRange, overwrite } = confirmSheetPull;
                  setConfirmSheetPull(null);
                  await proceedPullFromSheets(timeRange, overwrite);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold transition hover:bg-emerald-700 cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isDeleteConfirmOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[20000] animate-fade-in text-slate-800 dark:text-slate-100">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 shadow-xl border border-rose-200 dark:border-rose-950/40 space-y-4 animate-scale-up text-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </span>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Xác nhận xóa số liệu báo cáo</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
              Bạn có chắc chắn muốn xóa toàn bộ số liệu báo cáo chuyên môn của ngày <strong className="text-rose-600 dark:text-rose-450">{formatDateToDDMMYYYY(activeDate)}</strong>?
              <br /><br />
              <span className="text-rose-500 dark:text-rose-400 font-bold">⚠️ Lưu ý:</span> Thống kê hoạt động của ngày này sẽ bị xóa khỏi hệ thống Clinis và không thể khôi phục lại.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeletingReport}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-605 dark:text-slate-300 bg-white dark:bg-slate-900 text-xs font-bold transition hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingReport}
                onClick={async () => {
                  if (onDeleteReport) {
                    setIsDeletingReport(true);
                    try {
                      await onDeleteReport(activeDate);
                      setIsDeleteConfirmOpen(false);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsDeletingReport(false);
                    }
                  }
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition hover:bg-rose-700 cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center"
              >
                {isDeletingReport ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
