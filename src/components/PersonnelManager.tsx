import React, { useState, useEffect } from 'react';
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
  Shield
} from 'lucide-react';

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
  birthYear?: number;
  gender?: string;
  qualification?: string;
  degree?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

interface PersonnelManagerProps {
  currentUser: User;
  initialSubTab?: 'staff' | 'depts' | 'logs' | 'procedures' | 'printSettings' | 'themeSettings';
  onRefresh?: () => void;
  systemSettings?: any; // SystemSettings
  onUpdateSettings?: (settings: any) => Promise<void>;
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
  procedures,
  onAddProcedure,
  onDeleteProcedure
}: PersonnelManagerProps) {
  const [staffList, setStaffList] = useState<ServerStaff[]>([]);
  const [deptList, setDeptList] = useState<ServerDepartment[]>([]);
  const [auditLogs, setAuditLogs] = useState<ServerAuditLog[]>([]);
  
  const [activeSubTab, setActiveSubTab] = useState<'staff' | 'depts' | 'logs' | 'procedures' | 'printSettings' | 'themeSettings'>(initialSubTab);

  // Sync state if prop changes from parent dropdown triggers
  useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

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
  const [staffBirthYear, setStaffBirthYear] = useState<number | ''>('');
  const [staffGender, setStaffGender] = useState<string>('Nam');
  const [staffQualification, setStaffQualification] = useState<string>('Bác sĩ');
  const [staffDegree, setStaffDegree] = useState<string>('ĐH');
  const [staffPhone, setStaffPhone] = useState<string>('');
  const [staffAddress, setStaffAddress] = useState<string>('');
  const [staffNotes, setStaffNotes] = useState<string>('');

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
    setStaffBirthYear('');
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
        birthYear: staffBirthYear ? Number(staffBirthYear) : undefined,
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
    setStaffBirthYear(staff.birthYear || '');
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
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Năm sinh:</label>
                    <input
                      type="number"
                      placeholder="VD: 1985"
                      value={staffBirthYear}
                      onChange={(e) => setStaffBirthYear(e.target.value === '' ? '' : Number(e.target.value))}
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
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider select-none border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center w-12 min-w-[48px] max-w-[48px] border-r border-slate-700/50 sticky left-0 bg-slate-800 z-20">STT</th>
                  <th className="py-3 px-4 min-w-[160px] border-r border-slate-700/50 sticky left-12 bg-slate-800 z-20">Họ và tên</th>
                  <th className="py-3 px-2 text-center w-14 border-r border-slate-700/50">Tuổi</th>
                  <th className="py-3 px-3 min-w-[120px] border-r border-slate-700/50">Chức danh</th>
                  <th className="py-3 px-2 text-center w-16 border-r border-slate-700/50">Giới</th>
                  <th className="py-3 px-2 text-center w-18 border-r border-slate-700/50">Năm sinh</th>
                  <th className="py-3 px-3 text-center min-w-[110px] border-r border-slate-700/50">Trình độ</th>
                  <th className="py-3 px-2 text-center w-18 border-r border-slate-700/50">Bằng cấp</th>
                  <th className="py-3 px-4 min-w-[140px] border-r border-slate-700/50">Bộ phận</th>
                  <th className="py-3 px-4 min-w-[180px] border-r border-slate-700/50">Số điện thoại / Email</th>
                  <th className="py-3 px-4 min-w-[160px] border-r border-slate-700/50">Địa chỉ</th>
                  <th className="py-3 px-4 min-w-[150px] border-r border-slate-700/50">Ghi chú</th>
                  <th className="py-3 px-3 text-center min-w-[110px] border-r border-slate-700/50">Trạng thái</th>
                  <th className="py-3 px-4 text-center w-24">Phím nhấn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-[11.5px] text-slate-700">
                {filteredStaff.map((staff, idx) => {
                  const currentYear = new Date().getFullYear();
                  const age = staff.birthYear ? (currentYear - staff.birthYear) : '---';
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

                  // Degree colors lookup
                  let degreeBadge = 'bg-slate-100 text-slate-800';
                  if (staff.degree === 'Trên ĐH') degreeBadge = 'bg-purple-100 text-purple-800 border border-purple-200 font-extrabold';
                  else if (staff.degree === 'ĐH') degreeBadge = 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold';
                  else if (staff.degree === 'CĐ') degreeBadge = 'bg-blue-105 text-blue-800 border border-blue-200';
                  else if (staff.degree === 'TC') degreeBadge = 'bg-slate-200 text-slate-700';

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
                      <td className={`py-3 px-4 border-r border-slate-200 select-all sticky left-12 z-10 min-w-[160px] transition-all group-hover:bg-slate-100/80 ${
                        idx % 2 === 1 ? 'bg-[#f8fafc]' : 'bg-white'
                      }`}>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            {staff.name}
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
                          </span>
                          {staff.passwordResetRequested && (
                            <span className="text-[9px] text-amber-600 font-black mt-0.5 animate-pulse">
                              ⚠️ Request Reset
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center text-slate-800 font-bold border-r border-slate-100">{age}</td>
                      <td className="py-3 px-3 border-r border-slate-100 font-semibold">{staff.title}</td>
                      <td className="py-3 px-2 text-center font-extrabold border-r border-slate-100">
                        <span className={staff.gender === 'Nữ' ? 'text-pink-600' : 'text-slate-600'}>
                          {staff.gender || 'Nam'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center font-semibold text-slate-600 border-r border-slate-100">{staff.birthYear || '---'}</td>
                      <td className="py-3 px-3 text-center border-r border-slate-100 font-medium">{staff.qualification || 'Bác sĩ'}</td>
                      <td className="py-3 px-2 text-center border-r border-slate-100">
                        <span className={`text-[9.5px] px-2 py-0.5 rounded ${degreeBadge}`}>
                          {staff.degree || 'ĐH'}
                        </span>
                      </td>
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
                      <td className="py-3 px-4 border-r border-slate-100 font-medium text-slate-500 leading-tight">
                        {staff.address || '---'}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-100 font-semibold text-slate-600 leading-tight max-w-[200px] break-words">
                        {staff.notes || '---'}
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
      {activeSubTab === 'themeSettings' && systemSettings && (
        <div className="space-y-6 animate-fade-in my-3">
          <div className="bg-gradient-to-br from-rose-50/40 via-white to-pink-50/20 p-4 rounded-xl border border-rose-100/50 space-y-1.5 shadow-3xs">
            <h4 className="text-xs font-black text-rose-800 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="w-4 h-4 text-rose-500 animate-pulse" />
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
                    value={systemSettings.systemTitle || ''}
                    onChange={(e) => onUpdateSettings?.({ systemTitle: e.target.value })}
                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-2 hover:border-slate-305 transition focus:ring-1 focus:ring-rose-500 focus:outline-none"
                    placeholder="Giao Ban Khoa Cận Lâm Sàng"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Phụ đề giới thiệu chi tiết:</label>
                  <textarea
                    rows={2}
                    value={systemSettings.systemSubtitle || ''}
                    onChange={(e) => onUpdateSettings?.({ systemSubtitle: e.target.value })}
                    className="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2.5 py-2 font-medium hover:border-slate-305 transition focus:ring-1 focus:ring-rose-500 focus:outline-none leading-relaxed"
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
                        onClick={() => onUpdateSettings?.({ logoPreset: logo.key })}
                        className={`py-1.5 px-1 bg-white border rounded-lg text-center flex flex-col items-center justify-center transition cursor-pointer select-none ${
                          systemSettings.logoPreset === logo.key
                            ? 'border-rose-500 ring-1 ring-rose-500 text-rose-700 shadow-4xs font-bold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-sm mb-0.5">{logo.icon}</span>
                        <span className="text-[9px] font-bold tracking-tight">{logo.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {systemSettings.logoPreset === 'custom' && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Đường dẫn logo tùy chỉnh (URL ảnh PNG):</label>
                    <input
                      type="text"
                      value={systemSettings.logoUrl || ''}
                      onChange={(e) => onUpdateSettings?.({ logoUrl: e.target.value })}
                      className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-2 hover:border-slate-305 transition focus:ring-1 focus:ring-rose-500 focus:outline-none"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Box 2: Colors, Banner and backgrounds */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-4">
              <h5 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-widest border-b border-slate-200/50 pb-2 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-500" />
                Màu sắt & Thiết lập Hình nền
              </h5>

              <div className="space-y-4">
                
                {/* 1. Theme Color Presets */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Màu sắc chủ đạo y tế:</label>
                    <span className="text-[9.5px] font-mono font-bold text-slate-550 uppercase bg-slate-100 border border-slate-200 px-1 rounded">{systemSettings.themeColor}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 py-1">
                    {[
                      { hex: '#4f46e5', name: 'Indigo y đức' },
                      { hex: '#10b981', name: 'Emerald lục bảo' },
                      { hex: '#0d9488', name: 'Teal dịu mát' },
                      { hex: '#0284c7', name: 'Sky hòa bình' },
                      { hex: '#7c3aed', name: 'Violet tinh anh' },
                      { hex: '#d97706', name: 'Amber nhiệt thành' },
                      { hex: '#e11d48', name: 'Rose sưởi ấm' },
                      { hex: '#1e293b', name: 'Slate chuyên trị' },
                    ].map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => onUpdateSettings?.({ themeColor: color.hex })}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition cursor-pointer relative shadow-4xs ${
                          systemSettings.themeColor === color.hex
                            ? 'scale-110 border-slate-900 ring-2 ring-slate-350 z-10'
                            : 'border-white hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {systemSettings.themeColor === color.hex && (
                          <Check className="w-3.5 h-3.5 text-white stroke-2 dropdown-glow" />
                        )}
                      </button>
                    ))}
                    {/* Custom Picker placeholder */}
                    <div className="relative flex items-center">
                      <input 
                        type="color" 
                        value={systemSettings.themeColor} 
                        onChange={(e) => onUpdateSettings?.({ themeColor: e.target.value })}
                        className="w-6 h-6 rounded-full border-2 border-white cursor-pointer hover:scale-105 shadow-4xs opacity-0 absolute inset-0 text-[0px]"
                      />
                      <div className="w-6 h-6 rounded-full border border-slate-320 flex items-center justify-center bg-white text-[10px] hover:bg-slate-100 pointer-events-none tracking-tight font-black">+</div>
                    </div>
                  </div>
                </div>

                {/* 2. Banner presets */}
                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Phong cách Banner chào mừng:</label>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {[
                      { key: 'default', label: 'Tối cổ điển' },
                      { key: 'medical', label: 'Y tế nhẹ' },
                      { key: 'modern', label: 'Sáng đại' },
                      { key: 'geometric', label: 'Kỹ thuật' },
                      { key: 'custom', label: 'Ảnh Link' },
                    ].map((bPreset) => (
                      <button
                        key={bPreset.key}
                        type="button"
                        onClick={() => onUpdateSettings?.({ bannerPreset: bPreset.key })}
                        className={`py-1 text-[9px] rounded-lg border font-bold tracking-tight cursor-pointer select-none ${
                          systemSettings.bannerPreset === bPreset.key
                            ? 'bg-rose-50 border-rose-220 text-rose-700 shadow-4xs'
                            : 'bg-white border-slate-200 text-slate-550 hover:bg-slate-100'
                        }`}
                      >
                        {bPreset.label}
                      </button>
                    ))}
                  </div>

                  {systemSettings.bannerPreset === 'custom' && (
                    <div className="space-y-1 animate-fade-in pt-1">
                      <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Đường dẫn ảnh banner (URL ảnh chất lượng):</label>
                      <input
                        type="text"
                        value={systemSettings.bannerUrl || ''}
                        onChange={(e) => onUpdateSettings?.({ bannerUrl: e.target.value })}
                        className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-2 hover:border-slate-305 transition focus:ring-1 focus:ring-rose-500 focus:outline-none"
                        placeholder="https://example.com/banner-hospital.jpg"
                      />
                    </div>
                  )}
                </div>

                {/* 3. Site-Wide Background Style */}
                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block">Chọn Hình nền ứng dụng:</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { key: 'default', label: 'Mục Slate' },
                      { key: 'elegant', label: 'Y đức ấm' },
                      { key: 'clean-mint', label: 'Bạc hà dịu' },
                      { key: 'warm-wood', label: 'Gỗ nhạt' },
                      { key: 'modern-blue', label: 'Biển buổi sáng' },
                      { key: 'soft-slate', label: 'Đá lạnh' },
                      { key: 'cyberpunk', label: 'Đen Obsidian' },
                    ].map((bgStyleItem) => (
                      <button
                        key={bgStyleItem.key}
                        type="button"
                        onClick={() => onUpdateSettings?.({ bgStyle: bgStyleItem.key })}
                        className={`py-1 bg-white border rounded text-[9.5px] font-bold tracking-tight cursor-pointer select-none transition ${
                          systemSettings.bgStyle === bgStyleItem.key
                            ? 'border-slate-700 text-slate-900 shadow-3xs font-black ring-1 ring-slate-800'
                            : 'border-slate-200 text-slate-550 hover:bg-slate-100'
                        }`}
                      >
                        {bgStyleItem.label}
                      </button>
                    ))}
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
            <button
              onClick={() => onUpdateSettings?.(systemSettings)}
              className="px-5 py-2 hover:opacity-95 text-white active:scale-98 font-bold text-[11px] rounded-lg cursor-pointer transition flex items-center gap-1.5 text-center shrink-0 shadow-3xs"
              style={{ backgroundColor: systemSettings.themeColor || '#4f46e5' }}
            >
              <Check className="w-3.5 h-3.5" />
              Áp Dụng Thiết Kế Mới
            </button>
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
