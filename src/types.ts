/**
 * Types definition for the Clinical Handover and Department Reporting System
 * "Báo cáo Giao ban Cận lâm sàng"
 */

export interface ReportItem {
  id: string;
  name: string;
  category: 'sieuAm' | 'noiSoi' | 'xQuang' | 'dienTimLHN' | 'xetNghiem';
  bh: number; // Bảo hiểm y tế
  nd: number; // Ngoài dịch vụ / Nhân dân
}

export type CategoryKey = 'sieuAm' | 'noiSoi' | 'xQuang' | 'dienTimLHN' | 'xetNghiem';

export interface CategoryInfo {
  key: CategoryKey;
  name: string;
  color: string;
}

export interface DailyReport {
  date: string; // YYYY-MM-DD
  items: ReportItem[];
  submittedBy: string;
  submittedAt: string;
  status: 'draft' | 'submitted' | 'approved';
  approvedBy?: string;
}

export interface Meeting {
  id: string;
  title: string;
  dateTime: string;
  venue: string;
  chairperson: string;
  secretary: string;
  attendees: string[];
  agenda: string;
  notes?: string; // Digital meeting notes
  minutes?: string; // AI generated handover minutes
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  createdBy?: string; // Optional user who created the meeting
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  type: 'meeting' | 'report' | 'system' | 'alert' | 'task' | 'update';
  read: boolean;
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'truongKhoa' | 'phoKhoa' | 'general' | 'nhanVien' | 'sieuAm' | 'noiSoi' | 'xQuang' | 'dienTimLHN' | 'xetNghiem';
  email: string;
  departmentName: string;
  title?: string;
  shiftCount?: number;
  status?: string;
  password?: string;
  passwordResetRequested?: boolean;
  birthYear?: number;
  gender?: string;
  qualification?: string;
  degree?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface PrintSettings {
  supervisoryOrgan: string;
  institutionName: string;
  councilSubtitle: string;
  reportSubtitle: string;
  modelNumber: string;
  statusText: string;
  compilerName: string;
  compilerTitle: string;
  approverName: string;
  approverTitle: string;
  approverSubtitle: string;
  location: string;
}

export interface SystemSettings {
  themeColor: string;
  bannerPreset: 'default' | 'medical' | 'modern' | 'geometric' | 'custom';
  bannerUrl: string;
  logoPreset: 'default' | 'shield' | 'cross' | 'custom';
  logoUrl: string;
  bgStyle: 'default' | 'elegant' | 'modern-blue' | 'clean-mint' | 'warm-wood' | 'soft-slate' | 'cyberpunk' | 'dark-slate';
  systemTitle: string;
  systemSubtitle: string;
  autoSyncEnabled?: boolean;
  autoSyncTime?: string;
  googleSpreadsheetUrl?: string;
  googleAccessToken?: string;
  googleApiKey?: string;
  googleRefreshToken?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
}

export interface WorkReport {
  id: string;
  title: string;
  content: string;
  category: 'report' | 'suggestion' | 'request'; // Báo cáo / Kiến nghị đóng góp / Xin ý kiến chỉ đạo
  departmentName: string;
  submittedBy: string;
  submittedById: string;
  submittedAt: string;
  status: 'pending' | 'reviewed' | 'approved' | 'rejected' | 'processing';
  
  directive?: {
    content: string;
    directedBy: string;
    directedAt: string;
    actionStatus?: 'approve' | 'revise' | 'acknowledge' | 'decline';
  };
  
  assignedTask?: {
    description: string;
    deadline?: string;
    priority: 'low' | 'medium' | 'high';
    assigneeName?: string;
    assigneeId?: string;
    progress: 'not_started' | 'in_progress' | 'completed';
    updatedAt?: string;
  };
  
  comments?: Array<{
    id: string;
    user: string;
    userId: string;
    content: string;
    createdAt: string;
  }>;
}


