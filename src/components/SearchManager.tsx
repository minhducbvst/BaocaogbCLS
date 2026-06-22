import React, { useState, useMemo } from 'react';
import { DailyReport, Meeting, User, CategoryKey, ReportItem } from '../types';
import { CATEGORIES, USERS } from '../data';
import { formatDateToDDMMYYYY } from '../utils/date';
import { 
  Search, 
  SlidersHorizontal, 
  Filter, 
  Calendar, 
  User as UserIcon, 
  CheckCircle2, 
  Clock, 
  ArrowUpDown, 
  FileText, 
  ChevronRight, 
  CalendarDays, 
  TrendingUp,
  Activity,
  ThumbsUp,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

interface SearchManagerProps {
  reports: DailyReport[];
  meetings: Meeting[];
  currentUser: User;
  onNavigateToReport: (date: string) => void;
  onNavigateToMeeting: (id: string) => void;
}

export default function SearchManager({
  reports,
  meetings,
  currentUser,
  onNavigateToReport,
  onNavigateToMeeting
}: SearchManagerProps) {
  // Search Mode: Unified, Reports Only, Meetings Only
  const [searchTarget, setSearchTarget] = useState<'all' | 'reports' | 'meetings'>('all');

  // Search Filters
  const [query, setQuery] = useState('');
  const [author, setAuthor] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategories, setSelectedCategories] = useState<CategoryKey[]>([]);

  // Sorting
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc' | 'cases-desc' | 'status'>('date-desc');

  // Toggle Category selection
  const handleToggleCategory = (catKey: CategoryKey) => {
    if (selectedCategories.includes(catKey)) {
      setSelectedCategories(prev => prev.filter(c => c !== catKey));
    } else {
      setSelectedCategories(prev => [...prev, catKey]);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setQuery('');
    setAuthor('all');
    setStartDate('');
    setEndDate('');
    setSelectedStatus('all');
    setSelectedCategories([]);
    setSortBy('date-desc');
  };

  // Status lists for selector
  const reportStatuses = [
    { label: 'Nháp (Draft)', value: 'draft' },
    { label: 'Đang chờ duyệt', value: 'submitted' },
    { label: 'Đã phê duyệt', value: 'approved' }
  ];

  const meetingStatuses = [
    { label: 'Đã lên lịch', value: 'scheduled' },
    { label: 'Đang diễn ra', value: 'ongoing' },
    { label: 'Đã hoàn thành', value: 'completed' },
    { label: 'Đã hủy', value: 'cancelled' }
  ];

  // Map category code to Vietnamese label
  const getCategoryLabel = (key: CategoryKey) => {
    const cat = CATEGORIES.find(c => c.key === key);
    return cat ? cat.name : key;
  };

  // Calculate sum counts for items in DailyReport
  const getReportSummary = (items: ReportItem[]) => {
    let totalBH = 0;
    let totalND = 0;
    items.forEach(item => {
      totalBH += item.bh || 0;
      totalND += item.nd || 0;
    });
    return {
      totalBH,
      totalND,
      totalCount: totalBH + totalND
    };
  };

  // Unified Query Resolver
  const searchResults = useMemo(() => {
    const matched: Array<{
      type: 'report' | 'meeting';
      id: string; // date for reports, id for meetings
      title: string;
      date: string; // YYYY-MM-DD
      status: string;
      author: string;
      summaryText: string;
      details: React.ReactNode;
      totalCases?: number; // Only for reports
      original: any;
    }> = [];

    const lowerQuery = query.toLowerCase().trim();

    // 1. Process Reports
    if (searchTarget === 'all' || searchTarget === 'reports') {
      reports.forEach(report => {
        const reportSummary = getReportSummary(report.items);
        const reportTitle = `Báo cáo số liệu giao ban nội bộ ngày ${report.date}`;
        const formattedDate = report.date; // "YYYY-MM-DD"
        
        // Match Date range
        if (startDate && formattedDate < startDate) return;
        if (endDate && formattedDate > endDate) return;

        // Match Author
        if (author !== 'all' && report.submittedBy !== author && report.approvedBy !== author) return;

        // Match Status
        if (selectedStatus !== 'all' && report.status !== selectedStatus) return;

        // Match Categories (Category filter checks if the report has items in selected category with count > 0)
        if (selectedCategories.length > 0) {
          const hasAnyCategory = report.items.some(item => 
            selectedCategories.includes(item.category) && ((item.bh || 0) + (item.nd || 0) > 0)
          );
          if (!hasAnyCategory) return;
        }

        // Match text query (tên báo cáo, người duyệt, người lập, tên hạng mục khám cận lâm sàng)
        let matchesQuery = true;
        if (lowerQuery) {
          const matchedByTitle = reportTitle.toLowerCase().includes(lowerQuery);
          const matchedByAuthor = report.submittedBy.toLowerCase().includes(lowerQuery) || (report.approvedBy?.toLowerCase() || '').includes(lowerQuery);
          const matchedByDate = report.date.toLowerCase().includes(lowerQuery);
          const matchedByStatusText = (report.status === 'approved' ? 'đã duyệt phê duyệt' : report.status === 'submitted' ? 'chờ duyệt gửi nộp' : 'nháp').includes(lowerQuery);
          
          // Check report items name
          const matchedByItems = report.items.some(item => 
            item.name.toLowerCase().includes(lowerQuery) && ((item.bh || 0) + (item.nd || 0) > 0)
          );

          matchesQuery = matchedByTitle || matchedByAuthor || matchedByDate || matchedByStatusText || matchedByItems;
        }

        if (matchesQuery) {
          // Construct item breakdowns
          const itemBreakdown = report.items
            .filter(item => (item.bh || 0) + (item.nd || 0) > 0)
            .map(item => `${item.name}: ${item.bh + item.nd} ca`)
            .slice(0, 4)
            .join(', ');

          matched.push({
            type: 'report',
            id: report.date,
            title: reportTitle,
            date: report.date,
            status: report.status,
            author: report.submittedBy,
            summaryText: itemBreakdown || 'Không có số liệu ca khám khai báo.',
            totalCases: reportSummary.totalCount,
            original: report,
            details: (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px]">
                <div className="bg-slate-50 p-1.5 rounded">
                  <span className="text-slate-400 block font-medium">Tổng ca khoa phòng</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">{reportSummary.totalCount} ca</span>
                </div>
                <div className="bg-blue-50/50 p-1.5 rounded">
                  <span className="text-blue-500/70 block font-medium">Bảo hiểm y tế (BH)</span>
                  <span className="font-mono font-bold text-blue-700 text-xs">{reportSummary.totalBH} ca</span>
                </div>
                <div className="bg-emerald-50/50 p-1.5 rounded">
                  <span className="text-emerald-500/70 block font-medium">Ngoài dịch vụ (ND)</span>
                  <span className="font-mono font-bold text-emerald-700 text-xs">{reportSummary.totalND} ca</span>
                </div>
                <div className="bg-amber-50/40 p-1.5 rounded">
                  <span className="text-amber-600 block font-medium">Được duyệt bởi</span>
                  <span className="font-bold text-amber-800 tracking-tight text-[10px] truncate block">
                    {report.approvedBy || 'Chưa phê duyệt'}
                  </span>
                </div>
              </div>
            )
          });
        }
      });
    }

    // 2. Process Meetings
    if (searchTarget === 'all' || searchTarget === 'meetings') {
      meetings.forEach(meet => {
        const formattedDate = meet.dateTime.substring(0, 10); // YYYY-MM-DD
        
        // Match Date range
        if (startDate && formattedDate < startDate) return;
        if (endDate && formattedDate > endDate) return;

        // Match Author (chairperson, secretary, createdBy)
        if (author !== 'all' && 
            meet.chairperson !== author && 
            meet.secretary !== author && 
            meet.createdBy !== author) return;

        // Match Status
        if (selectedStatus !== 'all' && meet.status !== selectedStatus) return;

        // (Meetings do not directly belong to the 5 reporting clinical categories unless keywords match, so dynamic skip)
        if (selectedCategories.length > 0) {
          // If category filter is active, only show meetings mentioning the clinical terms
          const matchCategoryKeywords = selectedCategories.some(cat => {
            const label = getCategoryLabel(cat).toLowerCase();
            return meet.title.toLowerCase().includes(label) || 
                   meet.agenda.toLowerCase().includes(label) || 
                   (meet.notes || '').toLowerCase().includes(label);
          });
          if (!matchCategoryKeywords) return;
        }

        // Match query (title, agenda, notes, minutes, chairperson, secretary, venue)
        let matchesQuery = true;
        if (lowerQuery) {
          const matchedByTitle = meet.title.toLowerCase().includes(lowerQuery);
          const matchedByAgenda = meet.agenda.toLowerCase().includes(lowerQuery);
          const matchedByNotes = (meet.notes || '').toLowerCase().includes(lowerQuery);
          const matchedByMinutes = (meet.minutes || '').toLowerCase().includes(lowerQuery);
          const matchedByChair = meet.chairperson.toLowerCase().includes(lowerQuery);
          const matchedBySec = meet.secretary.toLowerCase().includes(lowerQuery);
          const matchedByVenue = meet.venue.toLowerCase().includes(lowerQuery);
          const matchedByStatusText = (
            meet.status === 'scheduled' ? 'đã lên lịch sắp họp' :
            meet.status === 'ongoing' ? 'đang diễn ra tiến hành' :
            meet.status === 'completed' ? 'hoàn thành kết thúc' : 'hủy bỏ'
          ).includes(lowerQuery);

          matchesQuery = matchedByTitle || matchedByAgenda || matchedByNotes || matchedByMinutes || matchedByChair || matchedBySec || matchedByVenue || matchedByStatusText;
        }

        if (matchesQuery) {
          // Construct aggregate snippets of notes/agenda
          let snippet = meet.agenda;
          if (meet.notes) {
            snippet = `Nội dung: ${meet.notes.substring(0, 140)}...`;
          } else if (meet.minutes) {
            snippet = `Tóm tắt AI: ${meet.minutes.substring(0, 140)}...`;
          }

          matched.push({
            type: 'meeting',
            id: meet.id,
            title: meet.title,
            date: formattedDate,
            status: meet.status,
            author: meet.chairperson,
            summaryText: snippet,
            original: meet,
            details: (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px]">
                <div className="bg-slate-50 p-1.5 rounded">
                  <span className="text-slate-400 block font-medium">Phòng họp / Địa điểm</span>
                  <span className="font-bold text-slate-700 block truncate">{meet.venue}</span>
                </div>
                <div className="bg-purple-50/50 p-1.5 rounded">
                  <span className="text-purple-500 block font-medium">Chủ trì cuộc họp</span>
                  <span className="font-bold text-purple-700 block truncate">{meet.chairperson}</span>
                </div>
                <div className="bg-indigo-50/50 p-1.5 rounded">
                  <span className="text-indigo-500 block font-medium">Thư ký ghi nhận</span>
                  <span className="font-bold text-indigo-700 block truncate">{meet.secretary}</span>
                </div>
                <div className="bg-amber-50/40 p-1.5 rounded">
                  <span className="text-amber-600 block font-medium">Tỷ lệ tham gia</span>
                  <span className="font-mono font-bold text-amber-700 text-xs block">
                    {meet.attendees?.length || 0} bác sĩ trực
                  </span>
                </div>
              </div>
            )
          });
        }
      });
    }

    // 3. Sorting applied
    return matched.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return b.date.localeCompare(a.date);
      }
      if (sortBy === 'date-asc') {
        return a.date.localeCompare(b.date);
      }
      if (sortBy === 'title-asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'cases-desc') {
        const casesA = a.totalCases || 0;
        const casesB = b.totalCases || 0;
        return casesB - casesA;
      }
      if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });

  }, [searchTarget, query, author, startDate, endDate, selectedStatus, selectedCategories, sortBy, reports, meetings]);

  // Aggregate statistics derived from filtered results
  const statsSummary = useMemo(() => {
    let reportCount = 0;
    let meetingCount = 0;
    let totalCasesCombined = 0;
    let pendingApprovals = 0;

    searchResults.forEach(item => {
      if (item.type === 'report') {
        reportCount++;
        totalCasesCombined += item.totalCases || 0;
        if (item.status === 'submitted') {
          pendingApprovals++;
        }
      } else {
        meetingCount++;
      }
    });

    return {
      reportCount,
      meetingCount,
      totalCasesCombined,
      pendingApprovals,
      totalResults: searchResults.length
    };
  }, [searchResults]);

  return (
    <div id="search-manager-system" className="space-y-4">
      {/* Search Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase">
            <SlidersHorizontal className="w-3 h-3 text-indigo-500" />
            Bảng điều khiển tra cứu y tế
          </div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
            Tìm kiếm & Truy vấn Báo cáo Giao ban nâng cao
          </h3>
          <p className="text-[11px] text-slate-500 leading-normal">
            Hệ thống truy vết dữ liệu chỉ số ca trực cận lâm sàng, chuẩn hóa tìm kiếm theo ngày, chuyên khoa phòng ban, người tạo lập và đồng bộ kết quả tức thì.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-md px-3 py-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Thiết lập lại bộ lọc
          </button>
        </div>
      </div>

      {/* Grid Layout: Left sidebar filters, Right results list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* LEFT COLUMN: CRITERIA FILTERS PANEL (Col-span 4) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
          <div className="flex items-center gap-1.5 border-b border-slate-150 pb-2.5">
            <Filter className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Tiêu chí bộ lọc</span>
          </div>

          {/* Target type switcher */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phân loại dữ liệu</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
              <button 
                onClick={() => { setSearchTarget('all'); setSelectedStatus('all'); }} 
                className={`py-1.5 rounded-md text-center transition ${searchTarget === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Tất cả
              </button>
              <button 
                onClick={() => { setSearchTarget('reports'); setSelectedStatus('all'); }} 
                className={`py-1.5 rounded-md text-center transition ${searchTarget === 'reports' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Kê khai số liệu
              </button>
              <button 
                onClick={() => { setSearchTarget('meetings'); setSelectedStatus('all'); }} 
                className={`py-1.5 rounded-md text-center transition ${searchTarget === 'meetings' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Biên bản cuộc họp
              </button>
            </div>
          </div>

          {/* Query input field */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Từ khóa cần tìm</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  searchTarget === 'all' ? "Tên báo cáo, dịch vụ lâm sàng, biên bản họp..." :
                  searchTarget === 'reports' ? "Ví dụ: Siêu âm tim, Xét nghiệm sinh hóa..." :
                  "Ví dụ: Kế hoạch tuần, Biên bản giao ban, Ghi chú..."
                }
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-205 rounded-md text-xs placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white font-medium transition"
              />
            </div>
          </div>

          {/* Date range inputs */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Khoảng thời gian tạo lập</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 block">Từ ngày</span>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-1 border border-slate-205 rounded-md bg-slate-50 text-[11px] font-mono font-bold focus:outline-hidden"
                />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 block">Đến ngày</span>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-1 border border-slate-205 rounded-md bg-slate-50 text-[11px] font-mono font-bold focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Author/Creator Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bác sĩ / Nhân sự khởi tạo</label>
            <div className="relative">
              <UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <select
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-205 rounded-md text-xs font-bold text-slate-700 focus:outline-hidden"
              >
                <option value="all">Tất cả nhân sự y tế</option>
                {USERS.map(user => (
                  <option key={user.id} value={user.name}>{user.name} ({user.departmentName})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status selector based on selection type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trạng thái phê duyệt</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-205 rounded-md text-xs font-bold text-slate-700 focus:outline-hidden"
            >
              <option value="all">Tất cả các trạng thái</option>
              {searchTarget !== 'meetings' && reportStatuses.map(st => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
              {searchTarget !== 'reports' && meetingStatuses.map(st => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </select>
          </div>

          {/* Clinical Categories filters */}
          {searchTarget !== 'meetings' && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Lọc theo chuyên khoa cận lâm sàng
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => {
                  const isSelected = selectedCategories.includes(cat.key);
                  return (
                    <button
                      key={cat.key}
                      onClick={() => handleToggleCategory(cat.key)}
                      className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full border transition cursor-pointer ${
                        isSelected 
                          ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info panel */}
          <div className="border border-indigo-100 bg-indigo-50/50 p-2.5 rounded-lg text-[10px] text-indigo-800 space-y-1">
            <div className="font-bold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              Mẹo tra cứu nâng cao
            </div>
            <p className="leading-relaxed">
              Bạn có thể nhập tên cụ thể của một dịch danh mục (ví dụ: "Siêu âm thai", "Clotest") để lọc chính xác những báo cáo ngày có số liệu đã kê khai ca bệnh đó.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: STATISTICS SUMMARY AND RESULTS LIST (Col-span 8) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Quick Metrics from search context */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 text-white rounded-xl p-3 shadow-md">
            <div className="flex items-center gap-2 p-1.5 border-r border-slate-800">
              <TrendingUp className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Tổng kết quả</span>
                <span className="text-sm font-mono font-bold leading-none">{statsSummary.totalResults}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1.5 border-r border-slate-800">
              <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Báo cáo số liệu</span>
                <span className="text-sm font-mono font-bold leading-none">{statsSummary.reportCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1.5 border-r border-slate-800">
              <CalendarDays className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Biên bản cuộc họp</span>
                <span className="text-sm font-mono font-bold leading-none">{statsSummary.meetingCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1.5">
              <Activity className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Tổng ca khám</span>
                <span className="text-sm font-mono font-bold leading-none">{statsSummary.totalCasesCombined}</span>
              </div>
            </div>
          </div>

          {/* Inner Results Area header (Sorting option and label) */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs font-bold text-slate-700">
              Danh sách kết quả tìm thấy ({searchResults.length})
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase shrink-0">
                <ArrowUpDown className="w-3 h-3 text-slate-400 inline mr-1" />
                Sắp xếp:
              </span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-205 rounded px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-hidden"
              >
                <option value="date-desc">Thời gian mới xếp trước</option>
                <option value="date-asc">Thời gian cũ xếp trước</option>
                <option value="title-asc">Tên tiêu đề A → Z</option>
                {searchTarget !== 'meetings' && <option value="cases-desc">Số lượng ca nhiều nhất</option>}
                <option value="status">Xếp theo Trạng thái duyệt</option>
              </select>
            </div>
          </div>

          {/* Results renderer */}
          <div className="space-y-3">
            {searchResults.length === 0 ? (
              <div className="bg-white border border-slate-200 border-dashed rounded-xl p-8 text-center space-y-2">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-700">Không tìm thấy kết quả phù hợp</div>
                <p className="text-[10px] text-slate-400 max-w-sm mx-auto">
                  Vui lòng thay đổi từ khóa, mở rộng bộ lọc ngày hoặc kích hoạt hiển thị tất cả các phân loại bảng kê khai để tìm kiếm lại.
                </p>
                <button 
                  onClick={handleResetFilters}
                  className="mt-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md transition"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            ) : (
              searchResults.map((item, idx) => {
                const isReport = item.type === 'report';
                return (
                  <div 
                    key={`${item.type}-${item.id}`}
                    className="bg-white border border-slate-200 hover:border-indigo-200 rounded-xl p-4 shadow-xs transition hover:shadow-sm group space-y-2.5 relative overflow-hidden"
                  >
                    {/* Left Accent indicator line */}
                    <div className={`absolute top-0 bottom-0 left-0 w-1 ${isReport ? 'bg-emerald-500' : 'bg-purple-500'}`} />

                    {/* Metadata line (Category Badge + Date + Author) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-extrabold border ${
                          isReport 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                            : 'bg-purple-50 border-purple-200 text-purple-800'
                        }`}>
                          {isReport ? 'Số liệu Giao ban' : 'Biên bản & Ghi chú'}
                        </span>
                        
                        <span className="text-slate-400 font-mono flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDateToDDMMYYYY(item.date)}
                        </span>
                      </div>

                      {/* Status Badging */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        item.status === 'approved' || item.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.status === 'submitted' || item.status === 'ongoing'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {item.status === 'approved' && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {item.status === 'submitted' && <Clock className="w-2.5 h-2.5 text-amber-600" />}
                        {item.status === 'approved' ? 'Đã duyệt' :
                         item.status === 'submitted' ? 'Đang chờ duyệt' :
                         item.status === 'draft' ? 'Nháp' : 
                         item.status === 'scheduled' ? 'Đã lên lịch' :
                         item.status === 'ongoing' ? 'Đang họp' :
                         item.status === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
                      </span>
                    </div>

                    {/* Header info (Title and creator) */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h4 className="text-[12px] font-extrabold text-slate-900 group-hover:text-indigo-600 transition">
                          {item.title}
                        </h4>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Khởi tạo bởi: <span className="font-bold text-slate-700">{item.author}</span>
                        </div>
                      </div>

                      {/* Navigate call-to-action button */}
                      <button
                        onClick={() => {
                          if (isReport) {
                            onNavigateToReport(item.id);
                          } else {
                            onNavigateToMeeting(item.id);
                          }
                        }}
                        className="inline-flex items-center gap-0.5 text-[10px] font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition whitespace-nowrap align-middle self-start shadow-xs cursor-pointer select-none"
                      >
                        {isReport ? 'Kê khai' : 'Chi tiết'}
                        <ChevronRight className="w-3 h-3 text-indigo-500" />
                      </button>
                    </div>

                    {/* Summary snippets */}
                    <div className="text-[11px] text-slate-500 bg-slate-50/50 p-2 rounded-lg border border-slate-100 font-medium">
                      {item.summaryText}
                    </div>

                    {/* Collapsed grid item counts / attendee logs */}
                    {item.details}

                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
