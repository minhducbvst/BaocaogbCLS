import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, WorkReport } from '../types';
import { 
  Plus, 
  Search, 
  FileText, 
  MessageSquare, 
  Clock, 
  User as UserIcon, 
  Calendar, 
  Send, 
  X, 
  Loader2, 
  Activity, 
  CheckSquare, 
  AlertTriangle,
  Shield,
  HelpCircle,
  Trash2,
  CheckCircle2,
  Info,
  AlertCircle
} from 'lucide-react';
import { formatDateToDDMMYYYY } from '../utils/date';

interface WorkReportManagerProps {
  currentUser: User;
  systemSettings: any;
}

export default function WorkReportManager({ currentUser, systemSettings }: WorkReportManagerProps) {
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New report form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'report' | 'suggestion' | 'request'>('report');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [viewTab, setViewTab] = useState<'all' | 'mine' | 'assigned'>('all');

  // Selected report details state
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Custom dialog & alert states (To avoid iframe window.confirm & window.alert crash)
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<{ reportId: string; commentId: string } | null>(null);
  const [customToast, setCustomToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setCustomToast({ message, type });
  };

  useEffect(() => {
    if (customToast) {
      const timer = setTimeout(() => {
        setCustomToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [customToast]);

  // Action forms states
  const [directiveContent, setDirectiveContent] = useState('');
  const [actionStatus, setActionStatus] = useState<'approve' | 'revise' | 'acknowledge' | 'decline'>('acknowledge');
  const [showDirectiveForm, setShowDirectiveForm] = useState(false);

  const [taskDescription, setTaskDescription] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [showAssignForm, setShowAssignForm] = useState(false);

  const [newCommentText, setNewCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);

  const isLeadership = currentUser.role === 'admin' || currentUser.role === 'truongKhoa' || currentUser.role === 'phoKhoa';
  const canDelete = currentUser.role === 'admin' || currentUser.role === 'truongKhoa';

  useEffect(() => {
    fetchReports();
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDetailModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/work-reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      } else {
        setError('Không thể tải danh sách báo cáo công việc');
      }
    } catch (e) {
      setError('Đã xảy ra lỗi kết nối internet');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error('Error fetching users', e);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/work-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report: {
            title: newTitle,
            content: newContent,
            category: newCategory
          },
          user: currentUser
        })
      });

      if (res.ok) {
        const data = await res.json();
        setReports(prev => [data.report, ...prev]);
        setSelectedReportId(data.report.id);
        setNewTitle('');
        setNewContent('');
        setNewCategory('report');
        setShowAddForm(false);
        // Automatically open the report modal details for the recently created report
        setShowDetailModal(true);
        showToast('Gửi báo cáo / ý kiến công việc thành công!');
      } else {
        showToast('Lỗi khi gửi báo cáo', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directiveContent.trim() || !selectedReportId) return;

    try {
      const res = await fetch(`/api/work-reports/${selectedReportId}/directive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directiveContent,
          actionStatus,
          user: currentUser
        })
      });

      if (res.ok) {
        const data = await res.json();
        setReports(prev => prev.map(r => r.id === selectedReportId ? data.report : r));
        setDirectiveContent('');
        setShowDirectiveForm(false);
        showToast('Đã ban hành ý kiến chỉ đạo hành chính và phê duyệt!');
      } else {
        showToast('Lỗi gửi chỉ đạo', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối', 'error');
    }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDescription.trim() || !selectedReportId) return;

    const assignedUser = users.find(u => u.id === taskAssigneeId);

    try {
      const res = await fetch(`/api/work-reports/${selectedReportId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskDescription,
          deadline: taskDeadline,
          priority: taskPriority,
          assigneeName: assignedUser ? assignedUser.name : undefined,
          assigneeId: taskAssigneeId || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        setReports(prev => prev.map(r => r.id === selectedReportId ? data.report : r));
        setTaskDescription('');
        setTaskDeadline('');
        setTaskPriority('medium');
        setTaskAssigneeId('');
        setShowAssignForm(false);
        showToast('Đã phân công trực tiếp nhiệm vụ thành công!');
      } else {
        showToast('Lỗi giao việc', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối', 'error');
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedReportId) return;

    setIsSendingComment(true);
    try {
      const res = await fetch(`/api/work-reports/${selectedReportId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newCommentText,
          user: currentUser
        })
      });

      if (res.ok) {
        const data = await res.json();
        setReports(prev => prev.map(r => r.id === selectedReportId ? data.report : r));
        setNewCommentText('');
      }
    } catch (err) {
      showToast('Lỗi gửi trao đổi', 'error');
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleUpdateProgress = async (progress: 'not_started' | 'in_progress' | 'completed') => {
    if (!selectedReportId) return;

    try {
      const res = await fetch(`/api/work-reports/${selectedReportId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress })
      });

      if (res.ok) {
        const data = await res.json();
        setReports(prev => prev.map(r => r.id === selectedReportId ? data.report : r));
        showToast('Đã cập nhật tiến độ công việc thành công!');
      } else {
        showToast('Lỗi cập nhật tiến độ', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối', 'error');
    }
  };

  const handleDeleteReport = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReportToDelete(reportId);
  };

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;
    const reportId = reportToDelete;
    
    try {
      const res = await fetch(`/api/work-reports/${reportId}?role=${currentUser.role}&userName=${encodeURIComponent(currentUser.name)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setReports(prev => prev.filter(r => r.id !== reportId));
        if (selectedReportId === reportId) {
          setSelectedReportId(null);
          setShowDetailModal(false);
        }
        showToast('Đã xóa báo cáo/ý kiến thành công!', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Lỗi khi xóa báo cáo/ý kiến', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối', 'error');
    } finally {
      setReportToDelete(null);
    }
  };

  const handleDeleteComment = (reportId: string, commentId: string) => {
    setCommentToDelete({ reportId, commentId });
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    const { reportId, commentId } = commentToDelete;
    
    try {
      const res = await fetch(`/api/work-reports/${reportId}/comment/${commentId}?role=${currentUser.role}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        setReports(prev => prev.map(r => r.id === reportId ? data.report : r));
        showToast('Đã xóa ý kiến thảo luận thành công!', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Lỗi khi xóa ý kiến thảo luận', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối', 'error');
    } finally {
      setCommentToDelete(null);
    }
  };

  // Filter logic
  const filteredReports = reports.filter(report => {
    // Search text
    const matchesSearch = 
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.submittedBy.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Category
    const matchesCategory = categoryFilter === 'all' || report.category === categoryFilter;

    // Status
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;

    // Department
    const matchesDept = deptFilter === 'all' || report.departmentName === deptFilter;

    // View tab (Role-based & toggle)
    let matchesTab = true;
    if (viewTab === 'mine') {
      matchesTab = report.submittedById === currentUser.id;
    } else if (viewTab === 'assigned') {
      matchesTab = report.assignedTask?.assigneeId === currentUser.id;
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesDept && matchesTab;
  });

  const selectedReport = reports.find(r => r.id === selectedReportId);

  // Departments list for filters
  const departments = Array.from(new Set(reports.map(r => r.departmentName)));

  // Utility to map categories to vietnamese badges
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'report':
        return { text: 'Báo cáo công việc', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'suggestion':
        return { text: 'Kiến nghị đóng góp', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'request':
        return { text: 'Xin ý kiến chỉ đạo', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { text: 'Khác', bg: 'bg-slate-50 text-slate-705 border-slate-250' };
    }
  };

  // Utility to map statuses
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'Chờ duyệt', bg: 'bg-amber-100 text-amber-800 border-amber-250' };
      case 'reviewed':
        return { text: 'Đã phản hồi', bg: 'bg-blue-100 text-blue-800 border-blue-250' };
      case 'processing':
        return { text: 'Đang thực hiện', bg: 'bg-indigo-100 text-indigo-800 border-indigo-250 animate-pulse' };
      case 'approved':
        return { text: 'Đã hoàn thành', bg: 'bg-emerald-100 text-emerald-800 border-emerald-250 font-bold' };
      case 'rejected':
        return { text: 'Từ chối / Hoãn', bg: 'bg-rose-100 text-rose-800 border-rose-250' };
      default:
        return { text: 'Chưa rõ', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const getPriorityBadge = (prio?: string) => {
    switch (prio) {
      case 'high':
        return { text: 'Khẩn cấp', bg: 'bg-rose-100 text-rose-700 font-extrabold' };
      case 'medium':
        return { text: 'Trung bình', bg: 'bg-amber-100 text-amber-700 font-bold' };
      default:
        return { text: 'Thường', bg: 'bg-slate-100 text-slate-600' };
    }
  };

  const getProgressLabel = (progress?: string) => {
    switch (progress) {
      case 'not_started':
        return 'Chưa bắt đầu';
      case 'in_progress':
        return 'Đang thực hiện';
      case 'completed':
        return 'Đã hoàn thành 🌟';
      default:
        return 'Chưa rõ';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px] text-slate-800">
      
      {/* LEFT SIDEBAR: FILTERS & QUICK CONTROLS (3 Cols) */}
      <div className="lg:col-span-3 flex flex-col space-y-4">
        
        {/* Statistics & Quick Actions Card */}
        <div className="bg-white border border-slate-205 rounded-xl p-4 shadow-3xs space-y-4">
          <div className="flex flex-col space-y-3">
            <div className="space-y-0.5">
              <h2 className="text-[13.5px] font-black uppercase text-slate-900 tracking-tight flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-600" />
                Báo cáo & Chỉ đạo công việc
              </h2>
              <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">
                Kết nối các phòng ban
              </p>
            </div>
            
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                if (!showAddForm) {
                  setNewTitle('');
                  setNewContent('');
                }
              }}
              className="cursor-pointer w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-black rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-3xs transition active:scale-98"
            >
              <Plus className="w-4 h-4" />
              Gửi báo cáo / ý kiến
            </button>
          </div>

          <hr className="border-slate-100" />

          {/* Quick tab filters */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Nhóm hiển thị</span>
            <button
              onClick={() => setViewTab('all')}
              className={`w-full text-left px-3 py-2 text-[11.5px] font-bold rounded-lg transition ${
                viewTab === 'all' 
                  ? 'bg-indigo-50 text-indigo-750 border-l-4 border-indigo-650' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Tất cả ({reports.length})
            </button>
            <button
              onClick={() => setViewTab('mine')}
              className={`w-full text-left px-3 py-2 text-[11.5px] font-bold rounded-lg transition ${
                viewTab === 'mine' 
                  ? 'bg-indigo-50 text-indigo-750 border-l-4 border-indigo-650' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Tôi gửi ({reports.filter(r => r.submittedById === currentUser.id).length})
            </button>
            <button
              onClick={() => setViewTab('assigned')}
              className={`w-full text-left px-3 py-2 text-[11.5px] font-bold rounded-lg transition ${
                viewTab === 'assigned' 
                  ? 'bg-indigo-50 text-indigo-750 border-l-4 border-indigo-650' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Tôi được giao ({reports.filter(r => r.assignedTask?.assigneeId === currentUser.id).length})
            </button>
          </div>

          <hr className="border-slate-100" />

          {/* Detailed filters form */}
          <div className="space-y-3 pt-1">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">Bộ lọc chuyên sâu</span>
            
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tiêu đề, nội dung..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-[11.5px] pl-8 pr-7 py-2 border border-slate-200/80 rounded-lg bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown selectors stack */}
            <div className="space-y-2.5">
              <div>
                <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Loại chuyên mục</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full text-[10.5px] font-semibold border border-slate-200 rounded-md bg-slate-50 p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="all">Tất cả thể loại</option>
                  <option value="report">Báo cáo công việc</option>
                  <option value="suggestion">Ý kiến đóng góp</option>
                  <option value="request">Xin ý kiến chỉ đạo</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Trạng thái xử lý</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-[10.5px] font-semibold border border-slate-200 rounded-md bg-slate-50 p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="all font-bold">Tất cả trạng thái</option>
                  <option value="pending">Chờ thẩm xét</option>
                  <option value="reviewed">Đã cho ý kiến</option>
                  <option value="processing">Đang thực hiện</option>
                  <option value="approved">Đã hoàn thành</option>
                  <option value="rejected">Bị hoãn / Từ chối</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Bộ phận công tác</label>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full text-[10.5px] font-semibold border border-slate-200 rounded-md bg-slate-50 p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="all">Tất cả đơn vị</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT AREA: WIDE DISCIPLINED GRID OF REPORTS (9 Cols) */}
      <div className="lg:col-span-9 flex flex-col space-y-4 animate-fade-in">
        
        {/* Reports Grid container with max-height and custom scrollbar */}
        <div className="flex-1 overflow-y-auto max-h-[760px] pr-1.5 space-y-3">
          {isLoading ? (
            <div className="p-16 text-center space-y-3 bg-white border border-slate-200 rounded-xl">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs text-slate-500 font-extrabold uppercase tracking-wide">Đang đồng bộ dữ liệu chỉ đạo trực tuyến...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-16 text-center border-2 border-dashed border-slate-205 rounded-xl bg-white">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-black text-slate-650 mb-1">Không tìm thấy ý kiến, báo cáo hoặc thư đề đạt nào</p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                Hiện tại không có thông tin phù hợp với bộ lọc tìm kiếm trên. Thay đổi tham số lọc hoặc nhấn Gửi báo cáo bên trái để đăng kiến nghị của bạn.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredReports.map(report => {
                const catBadge = getCategoryBadge(report.category);
                const statusBadge = getStatusBadge(report.status);
                const isSelected = selectedReportId === report.id;

                return (
                  <div
                    key={report.id}
                    onClick={() => {
                      setSelectedReportId(report.id);
                      setShowDetailModal(true);
                      // Reset subforms
                      setShowDirectiveForm(false);
                      setShowAssignForm(false);
                    }}
                    className={`p-4 rounded-xl border hover:shadow-md transition-all duration-200 cursor-pointer select-none flex flex-col justify-between space-y-3 ${
                      isSelected 
                        ? 'bg-indigo-50/20 md:bg-indigo-50/30 border-indigo-400 shadow-3xs' 
                        : 'bg-white border-slate-205 hover:border-slate-350 shadow-3xs'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${catBadge.bg}`}>
                            {catBadge.text}
                          </span>
                          <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-full border ${statusBadge.bg}`}>
                            {statusBadge.text}
                          </span>
                        </div>
                        {canDelete && (
                          <button
                            title="Xóa ý kiến/báo cáo"
                            onClick={(e) => handleDeleteReport(report.id, e)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition duration-150 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-[12.5px] font-black text-slate-900 leading-snug line-clamp-2 hover:text-indigo-650 transition">
                          {report.title}
                        </h4>
                        <p className="text-[10.5px] text-slate-500 line-clamp-3 leading-relaxed">
                          {report.content}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3.5 pt-2 border-t border-slate-100 mt-auto">
                      {/* Short summary of delegated task */}
                      {report.assignedTask && (
                        <div className="bg-slate-54 border border-slate-200/60 p-2 rounded-lg space-y-1">
                          <div className="flex items-center justify-between text-[7.5px] font-black text-slate-450 uppercase tracking-widest">
                            <span>Phân công chỉ đạo:</span>
                            <span className={report.assignedTask.progress === 'completed' ? 'text-emerald-700 font-bold' : 'text-indigo-700 font-bold'}>
                              {getProgressLabel(report.assignedTask.progress)}
                            </span>
                          </div>
                          <p className="text-[9.5px] text-slate-650 font-extrabold truncate">
                            {report.assignedTask.description}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold gap-1.5">
                        <div className="flex items-center gap-1.5 max-w-[65%] truncate">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            <strong className="text-slate-650 font-bold">{report.submittedBy}</strong> <span className="text-slate-400">({report.departmentName})</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-slate-400 font-mono text-[9px]">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDateToDDMMYYYY(report.submittedAt.split('T')[0])}</span>
                        </div>
                      </div>

                      {/* Comment counter indicator */}
                      {report.comments && report.comments.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[9px] text-indigo-600 font-black justify-end pt-1 bg-white">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{report.comments.length} trao đổi dã mở</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FLOATING DETAIL POP-UP WINDOW (CỬA SỔ NỔI OVERLAY MODAL) */}
      {showDetailModal && selectedReport && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowDetailModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl border border-slate-200/90 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header */}
            <div className="flex items-center justify-between border-b border-slate-150 px-5 py-4 bg-slate-50/85">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Phiếu xử lý sự việc</span>
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border ${getCategoryBadge(selectedReport.category).bg}`}>
                  {getCategoryBadge(selectedReport.category).text}
                </span>
                <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full border ${getStatusBadge(selectedReport.status).bg}`}>
                  {getStatusBadge(selectedReport.status).text}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canDelete && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteReport(selectedReport.id, e)}
                    className="mr-1.5 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-black rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 transition cursor-pointer shadow-3xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 animate-pulse" />
                    Xóa ý kiến
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="text-slate-400 hover:text-slate-755 bg-white p-1.5 rounded-full border border-slate-200 shadow-3xs hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable details wrapper */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {/* Main headers */}
              <div className="border-b border-slate-100 pb-4 space-y-2">
                <div className="flex items-start justify-between gap-2.5">
                  <h1 className="text-base lg:text-[17px] font-black text-slate-900 tracking-tight leading-snug">
                    {selectedReport.title}
                  </h1>
                  <span className="text-[10px] text-slate-45 p font-mono uppercase tracking-wide bg-slate-100 px-2.0 py-0.5 rounded border border-slate-201 shrink-0">
                    ID: {selectedReport.id}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-slate-500 text-[11px] font-semibold flex-wrap">
                  <span className="flex items-center gap-1 text-slate-650 bg-slate-100/80 border border-slate-150 px-1.5 py-0.5 rounded">
                    <strong>Phân khoa:</strong> {selectedReport.departmentName}
                  </span>
                  <span>
                    <strong>Người lập:</strong> {selectedReport.submittedBy}
                  </span>
                  <span>
                    <strong>Thời gian đăng:</strong> {new Date(selectedReport.submittedAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} ngày {formatDateToDDMMYYYY(selectedReport.submittedAt.split('T')[0])}
                  </span>
                </div>
              </div>

              {/* Detailed Content body text */}
              <div className="bg-slate-50/50 p-4.5 border border-slate-150 rounded-xl space-y-1.5">
                <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-widest block">Nội dung báo cáo chi tiết:</span>
                <p className="text-xs text-slate-800 leading-relaxed font-semibold whitespace-pre-wrap select-all focus:outline-none">
                  {selectedReport.content}
                </p>
              </div>

              {/* 1. LÃNH ĐẠO CHỈ ĐẠO (Leadership directive) Section */}
              <div className={`p-4 border rounded-xl space-y-3.5 transition-all ${
                selectedReport.directive 
                  ? 'bg-indigo-50/15 border-indigo-200/70 shadow-4xs' 
                  : 'bg-slate-50/30 border-slate-205 border-dashed text-slate-500'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-605" />
                    Ý kiến chỉ đạo hành chính của lãnh đạo khoa
                  </span>

                  {selectedReport.directive?.actionStatus && (
                    <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 bg-indigo-50`}>
                      Quyết định: {
                        selectedReport.directive.actionStatus === 'approve' ? 'Phê duyệt ☑️' :
                        selectedReport.directive.actionStatus === 'revise' ? 'Yêu cầu chỉnh sửa 📝' :
                        selectedReport.directive.actionStatus === 'decline' ? 'Từ chối / Hoãn ❌' : 'Đã ghi nhận 👁️'
                      }
                    </span>
                  )}
                </div>

                {selectedReport.directive ? (
                  <div className="space-y-2">
                    <p className="text-xs text-indigo-950 font-bold bg-white p-3.5 border border-indigo-100 rounded-lg shadow-4xs leading-relaxed">
                      "{selectedReport.directive.content}"
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-indigo-805/75 font-semibold">
                      <span>Người phê duyệt kết luận: <strong>{selectedReport.directive.directedBy}</strong></span>
                      <span>Chỉ đạo lúc: {new Date(selectedReport.directive.directedAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} ngày {formatDateToDDMMYYYY(selectedReport.directive.directedAt.split('T')[0])}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <Activity className="w-5 h-5 text-slate-350 mx-auto mb-1.5 animate-pulse" />
                    <p className="text-[11px] font-semibold text-slate-500">Chưa có chỉ đạo hành chính cho việc này.</p>
                    {isLeadership && (
                      <p className="text-[10px] text-slate-450 mt-0.5">Bấm nút "Ban hành chỉ đạo" bên dưới để nhập kết luận chỉ thị của bạn.</p>
                    )}
                  </div>
                )}
              </div>

              {/* 2. PHÂN CÔNG NHIỆM VỤ (Dynamic task assignment) Section */}
              {selectedReport.assignedTask && (
                <div className="bg-emerald-50/15 border-emerald-250/70 border p-4.5 rounded-xl space-y-4 shadow-4xs">
                  <div className="flex items-center justify-between pb-1 inline-border border-b border-emerald-100/50">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                      Nhiệm vụ bàn giao thực hiện
                    </span>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${getPriorityBadge(selectedReport.assignedTask.priority).bg}`}>
                      Độ ưu tiên: {getPriorityBadge(selectedReport.assignedTask.priority).text}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Nội dung công việc:</span>
                      <p className="text-xs text-slate-800 font-extrabold bg-white p-3 border border-slate-205 rounded-lg shadow-4xs">
                        {selectedReport.assignedTask.description}
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Phụ trách gánh vác:</span>
                        <div className="text-xs text-slate-855 font-extrabold flex items-center gap-1.5 bg-white px-2.5 py-1.5 border border-slate-200 rounded-lg shadow-4xs">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{selectedReport.assignedTask.assigneeName}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Thời hạn hoàn thành (Deadline):</span>
                        <span className="inline-block text-xs font-mono font-bold text-slate-800 bg-rose-50 border border-rose-100 text-rose-700 px-2.5 py-1 rounded-lg">
                          ⏳ {selectedReport.assignedTask.deadline ? formatDateToDDMMYYYY(selectedReport.assignedTask.deadline) : 'Không giới hạn'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Task progress control interface */}
                  <div className="bg-white border border-slate-200 p-3 rounded-lg space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-black uppercase text-slate-550 tracking-wider">Trạng thái công việc hành chính:</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        selectedReport.assignedTask.progress === 'completed' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold' 
                          : selectedReport.assignedTask.progress === 'in_progress'
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200 font-extrabold animate-pulse'
                          : 'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}>
                        {getProgressLabel(selectedReport.assignedTask.progress)}
                      </span>
                    </div>

                    {/* Progress actions for assignee */}
                    {selectedReport.assignedTask.assigneeId === currentUser.id && (
                      <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                        <span className="text-[8.5px] font-black text-slate-450 uppercase mb-1 block">Cập nhật tiến trình của bạn:</span>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handleUpdateProgress('not_started')}
                            className={`py-1 px-1.5 text-[9.5px] font-black rounded-lg border transition ${
                              selectedReport.assignedTask?.progress === 'not_started'
                                ? 'bg-slate-800 text-white'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 cursor-pointer'
                            }`}
                          >
                            Chưa làm
                          </button>
                          <button
                            onClick={() => handleUpdateProgress('in_progress')}
                            className={`py-1 px-1.5 text-[9.5px] font-black rounded-lg border transition ${
                              selectedReport.assignedTask?.progress === 'in_progress'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 cursor-pointer'
                            }`}
                          >
                            Đang xử lý
                          </button>
                          <button
                            onClick={() => handleUpdateProgress('completed')}
                            className={`py-1 px-1.5 text-[9.5px] font-black rounded-lg border transition ${
                              selectedReport.assignedTask?.progress === 'completed'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 cursor-pointer'
                            }`}
                          >
                            Hoàn thành ✅
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. EXCHANGE & CHAT THREAD (Trang trao đổi thảo luận bộ phận) */}
              <div className="space-y-3.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block border-b border-slate-100 pb-1 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  Kênh thảo luận đa chiều ({selectedReport.comments?.length || 0} tin nhắn)
                </span>

                {/* Comment collection */}
                <div className="space-y-2.5 max-h-[250px] overflow-y-auto bg-slate-50/50 p-4 border border-slate-205 rounded-xl custom-scrollbar">
                  {(!selectedReport.comments || selectedReport.comments.length === 0) ? (
                    <div className="py-8 text-center text-slate-400">
                      <p className="text-[10.5px] font-bold">Chưa có ý kiến phản hồi nào.</p>
                      <p className="text-[9.5px]">Nhập thông điệp bên dưới để mở đầu luồng trao đổi trực tuyến.</p>
                    </div>
                  ) : (
                    selectedReport.comments.map(comment => {
                      const isMyComment = comment.userId === currentUser.id;
                      return (
                        <div 
                          key={comment.id} 
                          className={`flex flex-col space-y-1 p-2.5 rounded-lg text-xs max-w-[85%] ${
                            isMyComment 
                              ? 'bg-indigo-500 text-white ml-auto rounded-br-none' 
                              : 'bg-white border border-slate-200 text-slate-800 mr-auto rounded-bl-none shadow-4xs'
                          }`}
                        >
                          <div className={`flex items-center justify-between gap-1 border-b pb-1 mb-1 ${
                            isMyComment ? 'text-indigo-100 border-indigo-400' : 'text-indigo-950 border-slate-100'
                          }`}>
                            <div className="flex items-center gap-1 text-[9px] font-black">
                              <span>{comment.user}</span>
                              <span className="font-mono opacity-70">
                                {new Date(comment.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}
                              </span>
                            </div>
                            {canDelete && (
                              <button
                                type="button"
                                title="Xóa ý kiến thảo luận này"
                                onClick={() => handleDeleteComment(selectedReport.id, comment.id)}
                                className={`p-0.5 rounded transition cursor-pointer ${
                                  isMyComment 
                                    ? 'text-indigo-200 hover:text-white hover:bg-indigo-600' 
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'
                                }`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="font-medium select-text leading-relaxed whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Textbox send message form */}
                <form onSubmit={handleSendComment} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Gửi tin nhắn hoặc ý kiến đóng góp thảo luận..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-3.5 py-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white bg-slate-50 transition-all font-semibold"
                  />
                  <button
                    type="submit"
                    disabled={isSendingComment || !newCommentText.trim()}
                    className="px-4.5 bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-3xs disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

            </div>

            {/* Leadership toolbars action control at bottom of modal */}
            {isLeadership && (
              <div className="border-t border-slate-200/90 p-5 space-y-3.5 bg-slate-50">
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDirectiveForm(!showDirectiveForm);
                      setShowAssignForm(false);
                      setDirectiveContent('');
                    }}
                    className={`flex-1 cursor-pointer py-2.5 text-[11px] font-black rounded-lg border transition shadow-4xs flex items-center justify-center gap-1.5 ${
                      showDirectiveForm 
                        ? 'bg-amber-100 border-amber-305 text-amber-900' 
                        : 'bg-indigo-600 text-white border-indigo-605 hover:bg-indigo-700'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    {selectedReport.directive ? 'Cập nhật Chỉ đạo' : 'Ban hành chỉ đạo'}
                  </button>

                  <button
                    onClick={() => {
                      setShowAssignForm(!showAssignForm);
                      setShowDirectiveForm(false);
                      setTaskDescription(selectedReport.content.slice(0, 150));
                      setTaskDeadline(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]); // Default 2 days
                      setTaskAssigneeId(selectedReport.submittedById); // Default assignee is author
                    }}
                    className={`flex-1 cursor-pointer py-2.5 text-[11px] font-black rounded-lg border transition shadow-4xs flex items-center justify-center gap-1.5 ${
                      showAssignForm 
                        ? 'bg-emerald-100 border-emerald-305 text-emerald-900' 
                        : 'bg-emerald-600 text-white border-emerald-650 hover:bg-emerald-700'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4" />
                    {selectedReport.assignedTask ? 'Cập nhật Giao việc' : 'Giao việc trực tiếp'}
                  </button>
                </div>

                {/* Directive issuing form overlay */}
                {showDirectiveForm && (
                  <form onSubmit={handleAddDirective} className="bg-white border border-slate-200 p-4.5 rounded-xl space-y-4 shadow-sm animate-zoom-in">
                    <span className="text-[10px] font-black text-slate-805 uppercase tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-indigo-505" />
                      Ra quyết định hành chính chỉ đạo & kết luận
                    </span>

                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-[8.5px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Quyết định xét duyệt
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { value: 'acknowledge', label: 'Ghi nhận ✓' },
                            { value: 'approve', label: 'Phê duyệt ⚬' },
                            { value: 'revise', label: 'Bổ sung ( ? )' },
                            { value: 'decline', label: 'Bị hoãn ❌' }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setActionStatus(opt.value as any)}
                              className={`py-1.5 text-[9.5px] font-black rounded border transition ${
                                actionStatus === opt.value
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[8.5px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center justify-between">
                          <span>Lời nhận xét hoặc hướng giải quyết cụ thể:</span>
                          <span className="text-[8px] text-slate-400">Tối thiểu: 5 ký tự</span>
                        </label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Nhập cụ thể ý kiến nhận xét, quyết định hành chính chỉ đạo gửi đến bộ phận đăng tin..."
                          value={directiveContent}
                          onChange={(e) => setDirectiveContent(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-200/90 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-505 bg-white font-semibold"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setShowDirectiveForm(false)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 font-bold"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-lg shadow-3xs flex items-center gap-1 cursor-pointer"
                      >
                        Ban hành Chỉ đạo
                      </button>
                    </div>
                  </form>
                )}

                {/* Assignment detail form overlay */}
                {showAssignForm && (
                  <form onSubmit={handleAssignTask} className="bg-white border border-slate-200 p-4.5 rounded-xl space-y-4 shadow-sm animate-zoom-in text-xs">
                    <span className="text-[10px] font-black text-slate-805 uppercase tracking-wider block border-b border-slate-100 pb-1 flex items-center gap-1">
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-605" />
                      Chi tiết phân công giao việc hành chính
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="block text-[8.5px] font-bold text-slate-500 uppercase tracking-wide">
                          Người nhận nhiệm vụ phụ trách
                        </label>
                        <select
                          value={taskAssigneeId}
                          required
                          onChange={(e) => setTaskAssigneeId(e.target.value)}
                          className="w-full text-xs p-2 border border-slate-205 rounded-lg bg-white font-semibold"
                        >
                          <option value="">-- Chọn nhân sự gánh vác --</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name} (Phòng {u.departmentName})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[8.5px] font-bold text-slate-500 uppercase tracking-wide">
                          Hạn chót hoàn thành nhiệm vụ (Deadline)
                        </label>
                        <input
                          type="date"
                          value={taskDeadline}
                          required
                          onChange={(e) => setTaskDeadline(e.target.value)}
                          className="w-full text-xs p-2 border border-slate-205 rounded-lg bg-white font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1 col-span-1 md:col-span-2">
                        <label className="block text-[8.5px] font-bold text-slate-500 uppercase tracking-wide">
                          Chi tiết nhiệm vụ bàn giao gánh vác
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Mô tả cụ thể nhiệm vụ đầu ra mong muốn..."
                          value={taskDescription}
                          onChange={(e) => setTaskDescription(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-205 rounded-lg bg-white font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[8.5px] font-bold text-slate-500 uppercase tracking-wide">
                          Mức độ khẩn cấp ưu tiên
                        </label>
                        <div className="flex gap-2">
                          {[
                            { value: 'low', label: 'Thường' },
                            { value: 'medium', label: 'Trung bình' },
                            { value: 'high', label: 'Hỏa tốc' }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setTaskPriority(opt.value as any)}
                              className={`flex-1 py-1.5 text-[10.5px] font-black rounded border transition ${
                                taskPriority === opt.value
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 cursor-pointer'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 text-[10px] pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAssignForm(false)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 font-bold"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg shadow-3xs flex items-center gap-1 cursor-pointer"
                      >
                        Bàn giao Nhiệm vụ
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
            
          </div>
        </div>,
        document.body
      )}

      {/* Toast Notice */}
      {customToast && (
        <div className={`fixed bottom-5 right-5 z-[200] max-w-sm p-4 rounded-xl shadow-xl flex items-center gap-3 animate-slide-in border transition-all duration-300 ${
          customToast.type === 'error' 
            ? 'bg-rose-50 text-rose-800 border-rose-200' 
            : customToast.type === 'info'
            ? 'bg-blue-50 text-blue-800 border-blue-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {customToast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-500" />
          ) : customToast.type === 'info' ? (
            <Info className="w-5 h-5 text-blue-500" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          )}
          <span className="text-xs font-bold leading-normal">{customToast.message}</span>
        </div>
      )}

      {/* Report Deletion Confirmation Modal */}
      {reportToDelete && createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-250 p-6 space-y-4 animate-zoom-in">
            <div className="flex items-start gap-3">
              <span className="p-2.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex-shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </span>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900">Xác nhận xóa báo cáo / ý kiến?</h3>
                <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                  Hành động này sẽ xóa vĩnh viễn báo cáo hoặc ý kiến đã chọn khỏi danh sách hệ thống. Bạn có chắc chắn muốn tiếp tục?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 text-[10.5px]">
              <button
                type="button"
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-extrabold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDeleteReport}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 hover:border-rose-800 text-white border border-rose-650 rounded-lg font-black cursor-pointer shadow-3xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Comment Deletion Confirmation Modal */}
      {commentToDelete && createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full border border-slate-250 p-6 space-y-4 animate-zoom-in">
            <div className="flex items-start gap-3">
              <span className="p-2.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex-shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </span>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900">Xác nhận xóa ý kiến thảo luận?</h3>
                <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                  Ý kiến phản hồi này sẽ bị xóa vĩnh viễn khỏi kênh thảo luận của báo cáo.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 text-[10.5px]">
              <button
                type="button"
                onClick={() => setCommentToDelete(null)}
                className="px-3.5 py-2 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-extrabold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDeleteComment}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 hover:border-rose-800 text-white border border-rose-650 rounded-lg font-black cursor-pointer shadow-3xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Create Report Modal (Cửa sổ nổi Tạo kiến nghị mới) */}
      {showAddForm && createPortal(
        <div 
          className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in text-slate-850"
          onClick={() => {
            if (!isSubmitting) setShowAddForm(false);
          }}
        >
          <form 
            onSubmit={handleCreateReport} 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col overflow-hidden animate-zoom-in p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <span className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-650 animate-pulse" />
                Tạo kiến nghị mới
              </span>
              <button 
                type="button" 
                onClick={() => {
                  if (!isSubmitting) setShowAddForm(false);
                }} 
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-full transition cursor-pointer select-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-[9.5px] font-black uppercase text-slate-400 tracking-wider mb-2">
                  Phân loại ý kiến
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCategory('report')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition cursor-pointer select-none active:scale-98 ${
                      newCategory === 'report' 
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-3xs' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Báo cáo việc
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCategory('suggestion')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition cursor-pointer select-none active:scale-98 ${
                      newCategory === 'suggestion' 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-3xs' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Mở đóng góp
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCategory('request')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition cursor-pointer select-none active:scale-98 ${
                      newCategory === 'request' 
                        ? 'bg-amber-500 text-white border-amber-500 shadow-3xs' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Ý kiến chỉ đạo
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[9.5px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Tiêu đề phát ngôn</label>
                <input
                  type="text"
                  required
                  placeholder="Ghi nhận vấn đề / yêu cầu..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs border border-slate-200/90 rounded-lg p-2.5 bg-slate-50/20 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition font-medium"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Nội dung chi tiết</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Mô tả cụ thể sự việc, đề xuất hướng giải quyết..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full text-xs border border-slate-200/90 rounded-lg p-2.5 bg-slate-50/20 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition leading-relaxed font-medium"
                />
              </div>
            </div>

            {/* Modal Footer actions */}
            <div className="flex justify-end items-center gap-3 border-t border-slate-100 pt-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (!isSubmitting) setShowAddForm(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer select-none"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-55 rounded-lg shadow-3xs transition flex items-center gap-1.5 cursor-pointer select-none active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Gửi yêu cầu
                  </>
                )}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

    </div>
  );
}
