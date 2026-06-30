import React, { useState, useMemo, useEffect } from 'react';
import { DailyReport, ReportItem, CategoryKey, PrintSettings } from '../types';
import { CATEGORIES, DEFAULT_PRINT_SETTINGS } from '../data';
import { formatDateToDDMMYYYY } from '../utils/date';
import * as XLSX from 'xlsx';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  FileCheck2, 
  CalendarClock, 
  Filter, 
  Calendar,
  DollarSign,
  Stethoscope,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  TrendingUp as TrendUpIcon,
  RefreshCw,
  Award,
  ChevronUp,
  ChevronDown,
  Brain,
  Cpu,
  AlertTriangle,
  Printer,
  FileSpreadsheet,
  FileDown,
  Columns,
  Eye,
  EyeOff
} from 'lucide-react';

interface DashboardProps {
  reports: DailyReport[];
  procedures: Omit<ReportItem, 'bh' | 'nd'>[];
}

// Custom pricing estimator for hospital administrative analytics (VND)
const ESTIMATE_PRICES = {
  sieuAm: { bh: 120500, nd: 250000 },
  noiSoi: { bh: 350000, nd: 750000 },
  xQuang: { bh: 150000, nd: 350000 },
  dienTimLHN: { bh: 80000, nd: 150000 },
  xetNghiem: { bh: 55000, nd: 90000 }
};

export default function Dashboard({ reports, procedures }: DashboardProps) {
  // 1. Sort reports historically
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => a.date.localeCompare(b.date));
  }, [reports]);

  // 2. Detect Dynamic Date Domain
  const dateBounds = useMemo(() => {
    if (sortedReports.length === 0) {
      return { min: '2026-03-01', max: '2026-03-17' };
    }
    return {
      min: sortedReports[0].date,
      max: sortedReports[sortedReports.length - 1].date
    };
  }, [sortedReports]);

  // 2b. Tìm ngày gần nhất đã có đầy đủ dữ liệu (trạng tháiapproved và có phát sinh ca bệnh > 0)
  const defaultFullDataDate = useMemo(() => {
    if (sortedReports.length === 0) {
      return dateBounds.max;
    }
    // Lướt ngược từ ngày gần nhất về sau
    for (let i = sortedReports.length - 1; i >= 0; i--) {
      const rep = sortedReports[i];
      const hasData = rep.items.some(it => (it.bh || 0) > 0 || (it.nd || 0) > 0);
      if (rep.status === 'approved' && hasData) {
        return rep.date;
      }
    }
    // Dự phòng 1: Ngày phát sinh bất kỳ ca bệnh nào
    for (let i = sortedReports.length - 1; i >= 0; i--) {
      const rep = sortedReports[i];
      const hasData = rep.items.some(it => (it.bh || 0) > 0 || (it.nd || 0) > 0);
      if (hasData) {
        return rep.date;
      }
    }
    return dateBounds.max;
  }, [sortedReports, dateBounds.max]);

  // 3. State Definitions
  const [timePreset, setTimePreset] = useState<'day' | 'all' | 'firstHalf' | 'secondHalf' | 'last7' | 'custom'>('day');
  const [startDate, setStartDate] = useState(defaultFullDataDate);
  const [endDate, setEndDate] = useState(defaultFullDataDate);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(['all']); // category keys
  const [selectedProcedure, setSelectedProcedure] = useState<string>('all'); // ReportItem details
  const [procTableSearch, setProcTableSearch] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  // Custom Column Visibility states
  const [visibleColumns, setVisibleColumns] = useState<{
    stt: boolean;
    name: boolean;
    category: boolean;
    bh: boolean;
    nd: boolean;
    total: boolean;
    change: boolean;
    revenue: boolean;
    avgPerDay: boolean;
  }>(() => {
    const saved = localStorage.getItem('dashboard-visible-columns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure revenue and avgPerDay are present
        if (parsed) {
          if (typeof parsed.revenue === 'undefined') {
            parsed.revenue = true;
          }
          if (typeof parsed.avgPerDay === 'undefined') {
            parsed.avgPerDay = true;
          }
          return parsed;
        }
      } catch (e) {
        // Fallback
      }
    }
    return {
      stt: true,
      name: true,
      category: true,
      bh: true,
      nd: true,
      total: true,
      change: true,
      revenue: true,
      avgPerDay: true,
    };
  });
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    const updated = { ...visibleColumns, [key]: !visibleColumns[key] };
    setVisibleColumns(updated);
    localStorage.setItem('dashboard-visible-columns', JSON.stringify(updated));
  };

  // AI Forecasting state definitions
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<{
    predictions: Array<{
      date: string;
      dayOfWeek: string;
      sieuAm: number;
      noiSoi: number;
      xQuang: number;
      dienTimLHN: number;
      xetNghiem: number;
      total: number;
      reasoning: string;
    }>;
    insights: Array<{
      topic: string;
      category: string;
      impact: 'HIGH' | 'MEDIUM' | 'LOW';
      recommendation: string;
    }>;
    generalTrend: string;
    simulated?: boolean;
    errorWarning?: string;
  } | null>(null);

  const handleTriggerForecast = async () => {
    setForecastLoading(true);
    setForecastError(null);
    try {
      const response = await fetch('/api/gemini/forecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        throw new Error('Đường truyền máy chủ AI gặp sự cố. Quý thầy thuốc vui lòng thử lại.');
      }
      const data = await response.json();
      if (data.success) {
        setForecastData(data);
      } else {
        throw new Error(data.error || 'Dự báo không thành công');
      }
    } catch (err: any) {
      console.error(err);
      setForecastError(err.message || 'Có lỗi xảy ra trong quá trình lấy dự báo AI');
    } finally {
      setForecastLoading(false);
    }
  };

  // Reset sub-procedure filter when the department shifts
  useEffect(() => {
    setSelectedProcedure('all');
  }, [selectedDepartments]);

  // Generate unique months dynamically from reports & bounds
  const uniqueMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    
    reports.forEach(report => {
      if (report.date) {
        const match = report.date.match(/^(\d{4}-\d{2})/);
        if (match) {
          monthsSet.add(match[1]);
        }
      }
    });

    try {
      const minDate = new Date(dateBounds.min);
      const maxDate = new Date(dateBounds.max);
      if (!isNaN(minDate.getTime()) && !isNaN(maxDate.getTime())) {
        const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        const endLimit = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
        
        while (current <= endLimit) {
          const y = current.getFullYear();
          const m = String(current.getMonth() + 1).padStart(2, '0');
          monthsSet.add(`${y}-${m}`);
          current.setMonth(current.getMonth() + 1);
        }
      }
    } catch (e) {
      console.error(e);
    }

    monthsSet.add('2026-03');
    return Array.from(monthsSet).sort();
  }, [reports, dateBounds]);

  // Generate unique calendar weeks dynamically from bounds
  const uniqueWeeks = useMemo(() => {
    if (!dateBounds.min || !dateBounds.max) return [];
    try {
      const minDate = new Date(dateBounds.min);
      const maxDate = new Date(dateBounds.max);
      if (isNaN(minDate.getTime()) || isNaN(maxDate.getTime())) return [];

      // Set start to the Monday of the starting week (Monday = 1, Sunday = 0)
      const day = minDate.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const currentWeekStart = new Date(minDate);
      currentWeekStart.setDate(minDate.getDate() + diffToMonday);

      const weeksList = [];
      const formatDate = (d: Date) => {
        const yStr = d.getFullYear();
        const mStr = String(d.getMonth() + 1).padStart(2, '0');
        const dStr = String(d.getDate()).padStart(2, '0');
        return `${yStr}-${mStr}-${dStr}`;
      };

      const getWeekNumber = (d: Date) => {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const day = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() + 4 - day);
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return weekNo;
      };

      while (currentWeekStart <= maxDate) {
        const wStart = new Date(currentWeekStart);
        const wEnd = new Date(currentWeekStart);
        wEnd.setDate(currentWeekStart.getDate() + 6);

        const wStartStr = formatDate(wStart);
        const wEndStr = formatDate(wEnd);

        const formatLabelDate = (d: Date) => {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          return `${dd}/${mm}`;
        };

        const yearLabel = wEnd.getFullYear();
        const weekNum = getWeekNumber(wStart);

        weeksList.push({
          startStr: wStartStr,
          endStr: wEndStr,
          label: `Tuần ${weekNum} (${formatLabelDate(wStart)} - ${formatLabelDate(wEnd)}/${yearLabel})`
        });

        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      }

      return weeksList.reverse();
    } catch (e) {
      console.error(e);
      return [];
    }
  }, [dateBounds]);

  const activeWeekMatch = useMemo(() => {
    return uniqueWeeks.find(w => w.startStr === startDate && w.endStr === endDate);
  }, [uniqueWeeks, startDate, endDate]);

  // Sync date range pickers when preset states are updated
  useEffect(() => {
    if (sortedReports.length === 0) return;

    if (timePreset === 'day') {
      if (startDate !== endDate) {
        setStartDate(defaultFullDataDate);
        setEndDate(defaultFullDataDate);
      }
    } else if (timePreset === 'all') {
      setStartDate(dateBounds.min);
      setEndDate(dateBounds.max);
    } else if (timePreset === 'firstHalf') {
      // Xác định tháng tham chiếu dựa trên ngày đang lọc hoặc ngày mặc định có dữ liệu
      const refDate = (startDate && startDate !== dateBounds.min) ? startDate : defaultFullDataDate;
      const match = refDate ? refDate.match(/^(\d{4}-\d{2})/) : null;
      const activeMonth = match ? match[1] : '2026-03';
      setStartDate(`${activeMonth}-01`);
      setEndDate(`${activeMonth}-15`);
    } else if (timePreset === 'secondHalf') {
      // Xác định tháng tham chiếu dựa trên ngày đang lọc hoặc ngày mặc định có dữ liệu
      const refDate = (startDate && startDate !== dateBounds.min) ? startDate : defaultFullDataDate;
      const match = refDate ? refDate.match(/^(\d{4}-\d{2})/) : null;
      const activeMonth = match ? match[1] : '2026-03';
      const [yearStr, monthStrNo] = activeMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStrNo, 10);
      const lastDayNo = String(new Date(year, month, 0).getDate()).padStart(2, '0');
      setStartDate(`${activeMonth}-16`);
      setEndDate(`${activeMonth}-${lastDayNo}`);
    } else if (timePreset === 'last7') {
      // Find the week in uniqueWeeks that contains defaultFullDataDate
      const activeWeek = uniqueWeeks.find(w => defaultFullDataDate >= w.startStr && defaultFullDataDate <= w.endStr) || uniqueWeeks[0];
      if (activeWeek) {
        setStartDate(activeWeek.startStr);
        setEndDate(activeWeek.endStr);
      }
    }
  }, [timePreset, sortedReports, dateBounds, defaultFullDataDate, uniqueWeeks]);

  // Sync month selection dropdown with the active dates
  useEffect(() => {
    if (!startDate || !endDate) {
      setSelectedMonth('');
      return;
    }
    
    const startParts = startDate.split('-');
    const endParts = endDate.split('-');
    
    if (startParts.length === 3 && endParts.length === 3) {
      const startYear = startParts[0];
      const startMonth = startParts[1];
      const startDay = startParts[2];
      
      const endYear = endParts[0];
      const endMonth = endParts[1];
      
      if (startYear === endYear && startMonth === endMonth && startDay === '01') {
        const yearNum = parseInt(startYear, 10);
        const monthNum = parseInt(startMonth, 10);
        const lastDayObj = new Date(yearNum, monthNum, 0);
        const lastDayStr = String(lastDayObj.getDate()).padStart(2, '0');
        
        if (endParts[2] === lastDayStr) {
          setSelectedMonth(`${startYear}-${startMonth}`);
          return;
        }
      }
    }
    
    if (startDate === dateBounds.min && endDate === dateBounds.max && timePreset === 'all') {
      setSelectedMonth('all');
    } else {
      setSelectedMonth('');
    }
  }, [startDate, endDate, dateBounds, timePreset]);

  const handleMonthChange = (monthStr: string) => {
    if (monthStr === 'all') {
      setSelectedMonth('all');
      setTimePreset('all');
      return;
    }
    
    setSelectedMonth(monthStr);
    setTimePreset('custom');
    
    const [yearStr, monthStrNo] = monthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStrNo, 10);
    
    const firstDay = `${yearStr}-${monthStrNo}-01`;
    const lastDateObj = new Date(year, month, 0);
    const lastDayNo = String(lastDateObj.getDate()).padStart(2, '0');
    const lastDay = `${yearStr}-${monthStrNo}-${lastDayNo}`;
    
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  // 4. Filter Procedure Options helper
  const availableProcedures = useMemo(() => {
    if (selectedDepartments.includes('all')) {
      return procedures;
    }
    return procedures.filter(item => selectedDepartments.includes(item.category));
  }, [selectedDepartments, procedures]);

  // 5. HELPER: Estimate and sum report indicators
  const computeReportStats = (reportList: DailyReport[]) => {
    let totalBh = 0;
    let totalNd = 0;
    let totalRevenues = 0;
    let reportCount = reportList.length;
    let approvedCount = 0;

    // Track category totals
    const catTotals: Record<string, { bh: number; nd: number; total: number }> = {
      sieuAm: { bh: 0, nd: 0, total: 0 },
      noiSoi: { bh: 0, nd: 0, total: 0 },
      xQuang: { bh: 0, nd: 0, total: 0 },
      dienTimLHN: { bh: 0, nd: 0, total: 0 },
      xetNghiem: { bh: 0, nd: 0, total: 0 },
    };

    // Track procedure ranking
    const procedureMap: Record<string, { name: string; count: number; category: string }> = {};

    reportList.forEach(report => {
      if (report.status === 'approved') approvedCount++;

      report.items.forEach(item => {
        // Apply secondary filters
        const matchesCategory = selectedDepartments.includes('all') || selectedDepartments.includes(item.category);
        const matchesProcedure = selectedProcedure === 'all' || item.id === selectedProcedure;

        if (matchesCategory && matchesProcedure) {
          totalBh += item.bh;
          totalNd += item.nd;

          // Estimate revenue
          const pricing = ESTIMATE_PRICES[item.category] || { bh: 100000, nd: 200000 };
          totalRevenues += (item.bh * pricing.bh) + (item.nd * pricing.nd);

          // Add to category buckets
          if (catTotals[item.category]) {
            catTotals[item.category].bh += item.bh;
            catTotals[item.category].nd += item.nd;
            catTotals[item.category].total += (item.bh + item.nd);
          }

          // Add to individual procedure leaderboard
          const combined = item.bh + item.nd;
          if (combined > 0) {
            if (!procedureMap[item.id]) {
              procedureMap[item.id] = { name: item.name, count: 0, category: item.category };
            }
            procedureMap[item.id].count += combined;
          }
        }
      });
    });

    const grandTotal = totalBh + totalNd;

    return {
      totalBh,
      totalNd,
      grandTotal,
      totalRevenues,
      reportCount,
      approvedCount,
      catTotals,
      procedureMap
    };
  };

  // 6. MAIN CALCULATION - Selected Period Stats
  const activeFilteredReports = useMemo(() => {
    return sortedReports.filter(r => r.date >= startDate && r.date <= endDate);
  }, [sortedReports, startDate, endDate]);

  const currentStats = useMemo(() => {
    return computeReportStats(activeFilteredReports);
  }, [activeFilteredReports, selectedDepartments, selectedProcedure]);

  // 7. COMPETE COMPARISON - Previous Period Stats of equal scale
  const previousStats = useMemo(() => {
    if (sortedReports.length === 0) return null;
    if (!startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

    const scaleMs = Math.abs(end.getTime() - start.getTime());
    const scaleDays = Math.ceil(scaleMs / (1000 * 60 * 60 * 24)) + 1;

    // Previous period boundaries
    const prevEnd = new Date(start.getTime() - (1000 * 60 * 60 * 24));
    const prevStart = new Date(prevEnd.getTime() - ((scaleDays - 1) * 1000 * 60 * 60 * 24));

    if (isNaN(prevEnd.getTime()) || isNaN(prevStart.getTime())) return null;

    try {
      const prevStartStr = prevStart.toISOString().split('T')[0];
      const prevEndStr = prevEnd.toISOString().split('T')[0];

      const prevPeriodReports = sortedReports.filter(r => r.date >= prevStartStr && r.date <= prevEndStr);
      return {
        stats: computeReportStats(prevPeriodReports),
        startDateStr: prevStartStr,
        endDateStr: prevEndStr
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [sortedReports, startDate, endDate, selectedDepartments, selectedProcedure]);

  // Helper to format VND
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // Helpers to resolve percentage indicators
  const getGrowthIndicator = (curr: number, prev: number) => {
    if (prev === 0) {
      return {
        isPositive: curr > 0,
        text: curr > 0 ? '+100%' : '0%',
        value: curr > 0 ? 100 : 0
      };
    }
    const ratio = ((curr - prev) / prev) * 100;
    return {
      isPositive: ratio >= 0,
      text: ratio >= 0 ? `+${ratio.toFixed(1)}%` : `${ratio.toFixed(1)}%`,
      value: ratio
    };
  };

  // 8. Recharts Chart Aggregations
  // A. Daily Timeline Chart Data
  const dailyTimelineData = useMemo(() => {
    return activeFilteredReports.map(report => {
      let dayBh = 0;
      let dayNd = 0;
      let dayRevenue = 0;

      report.items.forEach(item => {
        const matchesCategory = selectedDepartments.includes('all') || selectedDepartments.includes(item.category);
        const matchesProcedure = selectedProcedure === 'all' || item.id === selectedProcedure;

        if (matchesCategory && matchesProcedure) {
          dayBh += item.bh;
          dayNd += item.nd;
          const rates = ESTIMATE_PRICES[item.category] || { bh: 100000, nd: 200000 };
          dayRevenue += (item.bh * rates.bh) + (item.nd * rates.nd);
        }
      });

      // Split raw date (YYYY-MM-DD) into shorter format "DD/MM"
      const dateParts = report.date.split('-');
      const shortLabel = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : report.date;

      return {
        date: shortLabel,
        fullDate: report.date,
        'Bảo hiểm (BH)': dayBh,
        'Dịch vụ (ND)': dayNd,
        'Tổng ca': dayBh + dayNd,
        'Ước tính thu (kđ)': Math.round(dayRevenue / 1000) // displayed in thousands
      };
    });
  }, [activeFilteredReports, selectedDepartments, selectedProcedure]);

  // B. Specialty Comparison Chart Data
  const specialtyChartData = useMemo(() => {
    return Object.entries(currentStats.catTotals).map(([key, value]) => {
      const categoryInfo = CATEGORIES.find(c => c.key === key);
      return {
        key,
        name: categoryInfo?.name || key,
        'Bảo hiểm (BH)': value.bh,
        'Dịch vụ (ND)': value.nd,
        'Tổng ca': value.total,
        percentageOfTotal: currentStats.grandTotal > 0 ? Math.round((value.total / currentStats.grandTotal) * 100) : 0
      };
    }).filter(item => selectedDepartments.includes('all') || selectedDepartments.includes(item.key));
  }, [currentStats, selectedDepartments]);

  // C. Top 5 Procedure Leaderboard
  const topProcedures = useMemo(() => {
    return Object.values(currentStats.procedureMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [currentStats]);

  // C.1 Department Growth Rate Chart Data
  const departmentGrowthData = useMemo(() => {
    return CATEGORIES.map(cat => {
      const current = currentStats.catTotals[cat.key]?.total || 0;
      const previous = previousStats ? (previousStats.stats.catTotals[cat.key]?.total || 0) : 0;
      
      let growthPercent = 0;
      if (previous > 0) {
        growthPercent = ((current - previous) / previous) * 105; // multiplying for exact % base (or just keep normal ratio representation * 100)
        // Let's do standard mathematical percentage calculation: ((current - previous) / previous) * 100
        growthPercent = ((current - previous) / previous) * 100;
      } else if (current > 0) {
        growthPercent = 100;
      }
      
      return {
        key: cat.key,
        name: cat.name,
        'Tăng trưởng (%)': parseFloat(growthPercent.toFixed(1)),
        'Hiện tại (ca)': current,
        'Trước đó (ca)': previous,
      };
    }).filter(item => selectedDepartments.includes('all') || selectedDepartments.includes(item.key));
  }, [CATEGORIES, currentStats, previousStats, selectedDepartments]);

  // C.2 Full list of matching procedures and their metrics based on active filters
  const proceduresTableData = useMemo(() => {
    const matchingTemplates = procedures.filter(it => {
      const matchesCategory = selectedDepartments.includes('all') || selectedDepartments.includes(it.category);
      const matchesProcedure = selectedProcedure === 'all' || it.id === selectedProcedure;
      return matchesCategory && matchesProcedure;
    });

    return matchingTemplates.map(t => {
      let bh = 0;
      let nd = 0;
      activeFilteredReports.forEach(r => {
        const item = r.items.find(i => i.id === t.id);
        if (item) {
          bh += (item.bh || 0);
          nd += (item.nd || 0);
        }
      });
      return {
        id: t.id,
        name: t.name,
        category: t.category,
        bh,
        nd,
        total: bh + nd
      };
    });
  }, [activeFilteredReports, selectedDepartments, selectedProcedure]);

  // C.2b Calculate highest percentage increase and decrease procedure IDs compared to the previous period
  const growthMetrics = useMemo(() => {
    let maxIncreasePct = -Infinity;
    let maxDecreasePct = Infinity; // lowest/most negative percentage
    let highestIncreaseId: string | null = null;
    let highestDecreaseId: string | null = null;

    proceduresTableData.forEach(p => {
      const prevTotal = previousStats ? (previousStats.stats?.procedureMap[p.id]?.count || 0) : 0;
      const currentTotal = p.total;

      // Ignore if no data in both periods to avoid noise
      if (prevTotal === 0 && currentTotal === 0) return;

      let pct = 0;
      if (prevTotal === 0) {
        pct = 100; // went from 0 to >0 is a +100% increase
      } else {
        pct = ((currentTotal - prevTotal) / prevTotal) * 100;
      }

      if (pct > 0) {
        if (pct > maxIncreasePct) {
          maxIncreasePct = pct;
          highestIncreaseId = p.id;
        }
      } else if (pct < 0) {
        if (pct < maxDecreasePct) {
          maxDecreasePct = pct;
          highestDecreaseId = p.id;
        }
      }
    });

    return { highestIncreaseId, highestDecreaseId, maxIncreasePct, maxDecreasePct };
  }, [proceduresTableData, previousStats]);

  // C.3 Filtered table list matching search term
  const searchedTableData = useMemo(() => {
    if (!procTableSearch.trim()) return proceduresTableData;
    const term = procTableSearch.toLowerCase();
    return proceduresTableData.filter(p => p.name.toLowerCase().includes(term));
  }, [proceduresTableData, procTableSearch]);

  // D. Moving Average simple clinical forecast (3-day linear projection)
  const clinicalForecast = useMemo(() => {
    if (dailyTimelineData.length < 3) return null;
    const last3Days = dailyTimelineData.slice(-3);
    const avgTotal = last3Days.reduce((acc, curr) => acc + curr['Tổng ca'], 0) / 3;
    const avgRevenue = last3Days.reduce((acc, curr) => acc + curr['Ước tính thu (kđ)'], 0) / 3;
    return {
      projectedCases: Math.round(avgTotal),
      projectedRevenue: Math.round(avgRevenue * 1000)
    };
  }, [dailyTimelineData]);

  // Aesthetic colors map for Ring Charts
  const SPECIALTY_COLORS = [
    '#f59e0b', // Amber (sieuAm)
    '#10b981', // Emerald (noiSoi)
    '#3b82f6', // Indigo Blue (xQuang)
    '#8b5cf6', // Violet (dienTimLHN)
    '#06b6d4'  // Cyan (xetNghiem)
  ];

  // Excel Export Handler (using XLSX to specify custom sheet name based on filter duration)
  const handleExportExcel = () => {
    const formattedStartDate = formatDateToDDMMYYYY(startDate).replace(/\//g, '-');
    const formattedEndDate = formatDateToDDMMYYYY(endDate).replace(/\//g, '-');
    
    // Set a safe and descriptive sheet name (max 31 characters, remove special characters: \ / ? * : [ ])
    let sheetName = formattedStartDate === formattedEndDate 
      ? formattedStartDate 
      : `${formattedStartDate} den ${formattedEndDate}`;
    
    sheetName = sheetName.replace(/[\\\/\?\*:\[\]]/g, '').slice(0, 31);

    const headers: string[] = [];
    if (visibleColumns.stt) headers.push("STT");
    if (visibleColumns.name) headers.push("Danh mục kỹ thuật");
    if (visibleColumns.category) headers.push("Chuyên khoa");
    if (visibleColumns.bh) headers.push("Bảo hiểm (BH)");
    if (visibleColumns.nd) headers.push("Dịch vụ (ND)");
    if (visibleColumns.total) headers.push("Tổng số ca");
    if (visibleColumns.avgPerDay) headers.push("Trung bình/ngày");
    if (visibleColumns.change) headers.push("Tăng/Giảm (vs. trước)");
    if (visibleColumns.revenue) headers.push("Dự thu phân tích (VND)");
    
    const daysCount = Math.max(activeFilteredReports.length, 1);
    const rows = searchedTableData.map((item, index) => {
      const categoryInfo = CATEGORIES.find(c => c.key === item.category);
      const catName = categoryInfo?.name || item.category;
      const prices = ESTIMATE_PRICES[item.category as keyof typeof ESTIMATE_PRICES] || { bh: 0, nd: 0 };
      const revenue = (item.bh * (prices.bh || 0)) + (item.nd * (prices.nd || 0));
      const avgPerDayValue = item.total / daysCount;
      
      const prevTotal = previousStats ? (previousStats.stats?.procedureMap[item.id]?.count || 0) : 0;
      let changeText = "-";
      if (prevTotal === 0) {
        if (item.total > 0) {
          changeText = "+100%";
        } else {
          changeText = "Không phát sinh";
        }
      } else {
        const pct = ((item.total - prevTotal) / prevTotal) * 100;
        if (pct > 0) {
          changeText = `+${pct.toFixed(1)}%`;
        } else if (pct < 0) {
          changeText = `${pct.toFixed(1)}%`;
        } else {
          changeText = "0%";
        }
      }

      const activeRow: any[] = [];
      if (visibleColumns.stt) activeRow.push(index + 1);
      if (visibleColumns.name) activeRow.push(item.name);
      if (visibleColumns.category) activeRow.push(catName);
      if (visibleColumns.bh) activeRow.push(item.bh);
      if (visibleColumns.nd) activeRow.push(item.nd);
      if (visibleColumns.total) activeRow.push(item.total);
      if (visibleColumns.avgPerDay) activeRow.push(parseFloat(avgPerDayValue.toFixed(1)));
      if (visibleColumns.change) activeRow.push(changeText);
      if (visibleColumns.revenue) activeRow.push(revenue);
      
      return activeRow;
    });

    try {
      const worksheetData = [headers, ...rows];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Auto-fit column widths for better visual look inside Excel
      const columnWidths = headers.map((_, colIdx) => {
        let maxLen = headers[colIdx].length;
        rows.forEach(row => {
          const val = row[colIdx];
          const len = val !== null && val !== undefined ? String(val).length : 0;
          if (len > maxLen) maxLen = len;
        });
        return { wch: maxLen + 3 };
      });
      ws['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `Bao_cao_hieu_suat_can_lam_sang_${startDate}_den_${endDate}.xlsx`);
    } catch (error) {
      console.error('Error generating Excel file, falling back to CSV', error);
      const csvRows = rows.map((r) => r.map(val => {
        const str = String(val !== null && val !== undefined ? val : '');
        return str.includes(',') || str.includes('"') || str.includes('\n') 
          ? `"${str.replace(/"/g, '""')}"` 
          : str;
      }));
      const csvContent = "\uFEFF" + [headers.join(","), ...csvRows.map(e => e.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Bao_cao_hieu_suat_can_lam_sang_${startDate}_den_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Modern HTML Print & PDF Export popup (Prompts native browser print overlay nicely optimized)
  const handlePrint = (type: 'pdf' | 'print') => {
    let printSettings: PrintSettings = DEFAULT_PRINT_SETTINGS;
    const savedSettings = localStorage.getItem('print-settings');
    if (savedSettings) {
      try {
        printSettings = JSON.parse(savedSettings);
      } catch (e) {
        printSettings = DEFAULT_PRINT_SETTINGS;
      }
    }

    const categorySummaryRows = Object.entries(currentStats.catTotals).map(([key, value]) => {
      const catInfo = CATEGORIES.find(c => c.key === key);
      const prices = ESTIMATE_PRICES[key as keyof typeof ESTIMATE_PRICES] || { bh: 0, nd: 0 };
      const rev = (value.bh * (prices.bh || 0)) + (value.nd * (prices.nd || 0));
      return `
        <tr>
          ${visibleColumns.category ? `<td style="padding: 8px; font-weight: 600;">${catInfo?.name || key}</td>` : ''}
          ${visibleColumns.bh ? `<td style="padding: 8px; text-align: center;">${value.bh.toLocaleString('vi-VN')}</td>` : ''}
          ${visibleColumns.nd ? `<td style="padding: 8px; text-align: center;">${value.nd.toLocaleString('vi-VN')}</td>` : ''}
          ${visibleColumns.total ? `<td style="padding: 8px; text-align: center; font-weight: bold; background-color: #f8fafc;">${value.total.toLocaleString('vi-VN')}</td>` : ''}
          ${visibleColumns.revenue ? `<td style="padding: 8px; text-align: right; font-weight: 600; color: #0284c7;">${rev.toLocaleString('vi-VN')} VNĐ</td>` : ''}
        </tr>
      `;
    }).join('');

    const leftColsCount = (visibleColumns.stt ? 1 : 0) + (visibleColumns.name ? 1 : 0) + (visibleColumns.category ? 1 : 0);
    const sumRevenueProcedures = searchedTableData.reduce((acc, curr) => {
      const prices = ESTIMATE_PRICES[curr.category as keyof typeof ESTIMATE_PRICES] || { bh: 0, nd: 0 };
      return acc + (curr.bh * (prices.bh || 0)) + (curr.nd * (prices.nd || 0));
    }, 0);
    const totalBhProcedures = searchedTableData.reduce((acc, curr) => acc + curr.bh, 0);
    const totalNdProcedures = searchedTableData.reduce((acc, curr) => acc + curr.nd, 0);
    const totalSumProcedures = searchedTableData.reduce((acc, curr) => acc + curr.total, 0);

    const daysCount = Math.max(activeFilteredReports.length, 1);
    const procedureRows = searchedTableData.map((item, index) => {
      const categoryInfo = CATEGORIES.find(c => c.key === item.category);
      const prices = ESTIMATE_PRICES[item.category as keyof typeof ESTIMATE_PRICES] || { bh: 0, nd: 0 };
      const rev = (item.bh * (prices.bh || 0)) + (item.nd * (prices.nd || 0));
      const avgPerDayValue = item.total / daysCount;
      const formattedAvg = avgPerDayValue.toLocaleString('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
      });
      const avgCellText = item.total === 0 ? '-' : formattedAvg;

      const prevTotal = previousStats ? (previousStats.stats?.procedureMap[item.id]?.count || 0) : 0;
      let changeText = "-";
      let changeColor = "color: #64748b; background-color: #f8fafc;";
      if (prevTotal === 0) {
        if (item.total > 0) {
          changeText = "▲ +100%";
          changeColor = "color: #059669; background-color: #ecfdf5; font-weight: bold;";
        } else {
          changeText = "Không phát sinh";
          changeColor = "color: #94a3b8; font-style: italic;";
        }
      } else {
        const pct = ((item.total - prevTotal) / prevTotal) * 100;
        if (pct > 0) {
          changeText = `▲ +${pct.toFixed(1)}%`;
          changeColor = "color: #059669; background-color: #ecfdf5; font-weight: bold;";
        } else if (pct < 0) {
          changeText = `▼ ${pct.toFixed(1)}%`;
          changeColor = "color: #dc2626; background-color: #fff1f2; font-weight: bold;";
        } else {
          changeText = "— 0%";
          changeColor = "color: #475569; background-color: #f1f5f9;";
        }
      }

      return `
        <tr>
          ${visibleColumns.stt ? `<td style="padding: 6px; text-align: center; font-family: monospace;">${index + 1}</td>` : ''}
          ${visibleColumns.name ? `<td style="padding: 6px; font-weight: bold; color: #0f172a;">${item.name}</td>` : ''}
          ${visibleColumns.category ? `<td style="padding: 6px; text-align: center; font-size: 10px; font-weight: 600;">${categoryInfo?.name || item.category}</td>` : ''}
          ${visibleColumns.bh ? `<td style="padding: 6px; text-align: center; color: #0369a1; font-weight: 500;">${item.bh.toLocaleString('vi-VN')}</td>` : ''}
          ${visibleColumns.nd ? `<td style="padding: 6px; text-align: center; color: #15803d; font-weight: 500;">${item.nd.toLocaleString('vi-VN')}</td>` : ''}
          ${visibleColumns.total ? `<td style="padding: 6px; text-align: center; font-weight: bold; background-color: #f8fafc;">${item.total.toLocaleString('vi-VN')}</td>` : ''}
          ${visibleColumns.avgPerDay ? `<td style="padding: 6px; text-align: center; font-family: monospace; font-weight: bold; color: #c2410c;">${avgCellText}</td>` : ''}
          ${visibleColumns.change ? `<td style="padding: 6px; text-align: center; font-size: 9.5px; ${changeColor}">${changeText}</td>` : ''}
          ${visibleColumns.revenue ? `<td style="padding: 6px; text-align: right; font-weight: bold; color: #1e293b;">${rev.toLocaleString('vi-VN')} VNĐ</td>` : ''}
        </tr>
      `;
    }).join('');

    const formattedStartDate = formatDateToDDMMYYYY(startDate);
    const formattedEndDate = formatDateToDDMMYYYY(endDate);
    const titleText = type === 'pdf' ? 'Xuất PDF Báo Cáo Hiệu Suất' : 'In Báo Cáo Hiệu Suất';

    const generateHtmlBody = (includePrintScript = false) => `
      <html>
        <head>
          <title>${titleText} - ${startDate}_den_${endDate}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            * {
              box-sizing: border-box;
            }
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: ${includePrintScript ? '40px' : '20px'};
              line-height: 1.5;
              font-size: 11px;
              color-adjust: exact;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background-color: #ffffff;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
            }
            .header-title {
              text-align: center;
              margin-bottom: 25px;
            }
            .header-title h1 {
              font-size: 18px;
              font-weight: 800;
              margin: 0 0 5px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #0f172a;
            }
            .header-title p {
              margin: 0;
              color: #64748b;
              font-size: 11px;
              font-weight: 500;
            }
            .report-info {
              background-color: #f8fafc;
              border: 1.2px solid #cbd5e1;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 25px;
            }
            .report-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
            }
            .info-item {
              font-size: 11px;
            }
            .info-item span {
              font-weight: bold;
              color: #0f172a;
            }
            .section-title {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              margin: 20px 0 10px 0;
              color: #0f172a;
              border-left: 3px solid #10b981;
              padding-left: 8px;
              letter-spacing: 0.3px;
            }
            table.data-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
              font-size: 10px;
            }
            table.data-table th, table.data-table td {
              border: 1.2px solid #cbd5e1 !important;
              padding: 6px 8px;
            }
            table.data-table th {
              background-color: #0f172a;
              color: #ffffff;
              font-weight: 700;
              text-align: center;
              text-transform: uppercase;
              font-size: 9px;
              letter-spacing: 0.5px;
            }
            .signature-section {
              margin-top: 50px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              text-align: center;
              page-break-inside: avoid;
            }
            .signature-box {
              font-size: 11px;
            }
            .signature-box .title {
              font-weight: 700;
              margin-bottom: 60px;
              color: #0f172a;
            }
            .signature-box .name {
              font-weight: 800;
              text-decoration: underline;
            }
            @media print {
              body {
                margin: 20px;
              }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="width: 50%; font-weight: bold; font-size: 10px; vertical-align: top; line-height: 1.4;">
                ${printSettings.supervisoryOrgan}<br>
                <span style="letter-spacing: 0.3px; font-weight: 800;">${printSettings.institutionName}</span><br>
                <span style="font-weight: normal; color: #475569; font-size: 9px;">${printSettings.councilSubtitle}</span>
              </td>
              <td style="width: 50%; text-align: right; font-size: 9px; vertical-align: top; color: #475569; line-height: 1.4;">
                <strong>Mẫu số:</strong> ${printSettings.modelNumber}<br>
                <strong>Ngày in:</strong> ${new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} ${new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}<br>
                <strong>Trạng thái:</strong> ${printSettings.statusText}
              </td>
            </tr>
          </table>

          <div class="header-title">
            <h1>BÁO CÁO HIỆU SUẤT CẬN LÂM SÀNG CHI TIẾT</h1>
            <p>${printSettings.reportSubtitle}</p>
          </div>

          <div class="report-info">
            <div class="report-grid" style="grid-template-columns: repeat(${visibleColumns.revenue ? 3 : 2}, 1fr);">
              <div class="info-item">Khoảng báo cáo: <span>Từ ${formattedStartDate} đến ${formattedEndDate}</span></div>
              <div class="info-item">Tổng số ca (Toàn khoa): <span>${currentStats.grandTotal.toLocaleString('vi-VN')} ca</span></div>
              ${visibleColumns.revenue ? `<div class="info-item">Doanh vụ (Dự thu): <span>${Math.round(currentStats.totalRevenues).toLocaleString('vi-VN')} VNĐ</span></div>` : ''}
            </div>
            <div style="margin-top: 10px; font-size: 11px; border-top: 1px dashed #cbd5e1; padding-top: 8px; color: #475569;">
              Bộ lọc chuyên môn: <span style="font-weight: bold; color: #0f172a;">${selectedDepartments.includes('all') ? 'Tất cả khoa Cận lâm sàng' : selectedDepartments.join(', ')}</span> 
              ${selectedProcedure !== 'all' ? `| Dịch vụ lọc: <span style="font-weight: bold; color: #0f172a;">${procedures.find(p => p.id === selectedProcedure)?.name}</span>` : ''}
            </div>
          </div>

          <div class="section-title">I. TỔNG HỢP SẢN LƯỢNG KHOA CHUYÊN MÔN</div>
          <table class="data-table">
            <thead>
              <tr>
                ${visibleColumns.category ? `<th style="text-align: left;">Chuyên khoa cận lâm sàng</th>` : ''}
                ${visibleColumns.bh ? `<th style="width: 15%;">Bảo hiểm (BH)</th>` : ''}
                ${visibleColumns.nd ? `<th style="width: 15%;">Dịch vụ (ND)</th>` : ''}
                ${visibleColumns.total ? `<th style="width: 15%;">Tổng số ca</th>` : ''}
                ${visibleColumns.revenue ? `<th style="width: 30%; text-align: right;">Dự thu kĩ thuật (VNĐ)</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${categorySummaryRows}
              <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #0f172a;">
                ${visibleColumns.category ? `<td>TỔNG CỘNG TOÀN KHOA</td>` : ''}
                ${visibleColumns.bh ? `<td style="text-align: center; color: #0284c7;">${currentStats.totalBh.toLocaleString('vi-VN')}</td>` : ''}
                ${visibleColumns.nd ? `<td style="text-align: center; color: #16a34a;">${currentStats.totalNd.toLocaleString('vi-VN')}</td>` : ''}
                ${visibleColumns.total ? `<td style="text-align: center; background-color: #cbd5e1; color: #0f172a;">${currentStats.grandTotal.toLocaleString('vi-VN')}</td>` : ''}
                ${visibleColumns.revenue ? `<td style="text-align: right; font-size: 11px; color: #0f172a;">${Math.round(currentStats.totalRevenues).toLocaleString('vi-VN')} VNĐ</td>` : ''}
              </tr>
            </tbody>
          </table>

          <div class="section-title">II. BẢNG CHI TIẾT SỐ LIỆU DANH MỤC KỸ THUẬT PHÁT SINH</div>
          <table class="data-table">
            <thead>
              <tr>
                ${visibleColumns.stt ? `<th style="width: 40px;">STT</th>` : ''}
                ${visibleColumns.name ? `<th style="text-align: left;">Danh mục kỹ thuật y khoa</th>` : ''}
                ${visibleColumns.category ? `<th style="width: 120px;">Chuyên khoa</th>` : ''}
                ${visibleColumns.bh ? `<th style="width: 90px;">Bảo hiểm (BH)</th>` : ''}
                ${visibleColumns.nd ? `<th style="width: 90px;">Dịch vụ (ND)</th>` : ''}
                ${visibleColumns.total ? `<th style="width: 80px;">Tổng số ca</th>` : ''}
                ${visibleColumns.avgPerDay ? `<th style="width: 80px;">Trung bình/ngày</th>` : ''}
                ${visibleColumns.change ? `<th style="width: 100px;">Tăng/Giảm (vs. trước)</th>` : ''}
                ${visibleColumns.revenue ? `<th style="width: 130px; text-align: right;">Dự thu phân tích</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${procedureRows}
              <tr style="background-color: #f8fafc; font-weight: bold; border-top: 2px solid #0f172a;">
                ${leftColsCount > 0 ? `<td colspan="${leftColsCount}" style="text-align: right; font-weight: bold; text-transform: uppercase;">Tổng cộng:</td>` : ''}
                ${visibleColumns.bh ? `<td style="text-align: center; color: #0369a1;">${totalBhProcedures.toLocaleString('vi-VN')}</td>` : ''}
                ${visibleColumns.nd ? `<td style="text-align: center; color: #15803d;">${totalNdProcedures.toLocaleString('vi-VN')}</td>` : ''}
                ${visibleColumns.total ? `<td style="text-align: center; font-weight: bold; background-color: #f1f5f9;">${totalSumProcedures.toLocaleString('vi-VN')}</td>` : ''}
                ${visibleColumns.avgPerDay ? `<td style="text-align: center; font-weight: bold; color: #c2410c;">${(totalSumProcedures / daysCount).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}</td>` : ''}
                ${visibleColumns.change ? `<td style="text-align: center;">-</td>` : ''}
                ${visibleColumns.revenue ? `<td style="text-align: right; font-weight: bold; color: #1e293b;">${sumRevenueProcedures.toLocaleString('vi-VN')} VNĐ</td>` : ''}
              </tr>
            </tbody>
          </table>

          <div class="signature-section">
            <div class="signature-box">
              <p style="font-style: italic; font-size: 10px; opacity: 0.85; margin-bottom: 2px;">
                ${(() => {
                  const vnDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
                  return `${printSettings.location}, ngày ${vnDate.getDate()} tháng ${vnDate.getMonth() + 1} năm ${vnDate.getFullYear()}`;
                })()}
              </p>
              <div class="title">${printSettings.compilerTitle}</div>
              <div class="name">${printSettings.compilerName}</div>
            </div>
            <div class="signature-box">
              <p style="font-style: italic; font-size: 10px; opacity: 0.85; margin-bottom: 2.5px;">Phê chuẩn hội đồng quản trị lâm sàng</p>
              <div class="title">${printSettings.approverTitle}</div>
              <div class="name">${printSettings.approverName}</div>
              <p style="margin: 4px 0 0 0; font-size: 9px; color: #64748b;">${printSettings.approverSubtitle}</p>
            </div>
          </div>

          ${includePrintScript ? `
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
          ` : ''}
        </body>
      </html>
    `;

    if (type === 'pdf') {
      // Dynamic import of html2pdf.js for instant client-side PDF downloads
      // @ts-ignore
      import('html2pdf.js').then((html2pdfModule) => {
        const html2pdf = html2pdfModule.default;
        
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        container.style.width = '790px'; // fixed elegant width mapping perfectly to A4
        container.innerHTML = generateHtmlBody(false);
        document.body.appendChild(container);

        const options = {
          margin: 12,
          filename: `Bao_cao_hieu_suat_can_lam_sang_${startDate}_den_${endDate}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(options as any).from(container).save().then(() => {
          document.body.removeChild(container);
        }).catch((err: any) => {
          console.error("PDF generation failed, falling back to window print:", err);
          document.body.removeChild(container);
          triggerWindowPrint();
        });
      }).catch((err) => {
        console.error("Failed to dynamically import html2pdf.js, falling back to window print:", err);
        triggerWindowPrint();
      });
    } else {
      triggerWindowPrint();
    }

    function triggerWindowPrint() {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Không thể mở cửa sổ in. Vui lòng tắt trình chặn popup của trình duyệt.');
        return;
      }
      printWindow.document.write(generateHtmlBody(true));
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-4">
      
      {/* 1. TOP TITLE BANNER */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase">
            <Award className="w-3.5 h-3.5 text-emerald-500" />
            Hệ thống Quản lý Hiệu suất Cận lâm sàng Executive
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-850">
            Bảng chỉ số & Thống kê Chỉ tiêu Giao ban
          </h2>
          <p className="text-[11px] text-slate-500 leading-normal max-w-3xl">
            Giao diện tổng hợp dữ liệu sản lượng kỹ thuật y tế chuẩn hóa, đồng bộ so sánh tăng trưởng, 
            phân tích doanh vụ kĩ thuật dự thu và hỗ trợ điều phối tải lượng giữa các phòng trực thuộc.
          </p>
        </div>

        {/* Dynamic comparison range tag */}
        {previousStats && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] text-slate-600 shrink-0 self-start md:self-auto">
            <span className="font-extrabold text-slate-700 block mb-0.5">Khoảng đối chiếu trước:</span>
            <span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">
              {formatDateToDDMMYYYY(previousStats.startDateStr)}
            </span>
            <span className="mx-1.5 font-bold text-slate-400">→</span>
            <span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">
              {formatDateToDDMMYYYY(previousStats.endDateStr)}
            </span>
          </div>
        )}
      </div>

      {/* 2. DYNAMIC CRITERIA SELECTOR DECK (THE FILTERS) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-3xs overflow-hidden">
        {/* Filter Accordion Header */}
        <div 
          onClick={() => setShowFilters(!showFilters)}
          className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/70 transition-all select-none"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Bộ lọc &amp; Cấu hình dữ liệu</h3>
              <p className="text-[10px] text-slate-400 font-bold leading-normal mt-0.5">
                Bấm để {showFilters ? 'thu gọn' : 'mở rộng'} cấu hình thời gian &amp; chuyên khoa
              </p>
            </div>

            {/* Micro badge indicator when collapsed */}
            {!showFilters && (
              <div className="flex flex-wrap items-center gap-1.5 ml-0 sm:ml-4 mt-1.5 sm:mt-0">
                <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black tracking-wider uppercase border border-indigo-100 px-2 py-0.5 rounded leading-none">
                  Từ {formatDateToDDMMYYYY(startDate)} đến {formatDateToDDMMYYYY(endDate)}
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-100 px-2 py-0.5 rounded leading-none">
                  {selectedDepartments.includes('all')
                    ? 'Toàn khoa CLS'
                    : selectedDepartments.map(k => CATEGORIES.find(c => c.key === k)?.name).join(', ')}
                </span>
                {selectedProcedure !== 'all' && (
                  <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold border border-indigo-100 px-2 py-0.5 rounded leading-none">
                    Dịch vụ: {procedures.find(p => p.id === selectedProcedure)?.name}
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="self-end sm:self-auto px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 rounded-lg text-[10.5px] font-black transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-98"
          >
            {showFilters ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-indigo-600" />
                Ẩn bộ lọc
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                Hiện bộ lọc
              </>
            )}
          </button>
        </div>

        {/* Filters Body */}
        {showFilters && (
          <div className="p-5 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* LEFT COLUMN: PERIOD & TIME CONFIGURATION */}
              <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Cấu hình thời kỳ báo cáo</span>
                  </div>

                  {/* Presets and Month Pickers */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    {/* Presets */}
                    <div className="md:col-span-7 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 selector-label uppercase tracking-widest block">
                        Mốc thời gian thống nhất
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-0.5 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold text-slate-500">
                        <button
                          onClick={() => setTimePreset('day')}
                          className={`py-1.5 rounded-md text-center transition cursor-pointer select-none ${timePreset === 'day' ? 'bg-white text-slate-900 shadow-3xs font-bold' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                          Theo ngày
                        </button>
                        <button
                          onClick={() => setTimePreset('all')}
                          className={`py-1.5 rounded-md text-center transition cursor-pointer select-none ${timePreset === 'all' ? 'bg-white text-slate-900 shadow-3xs font-bold' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                          Tất cả
                        </button>
                        <button
                          onClick={() => setTimePreset('firstHalf')}
                          className={`py-1.5 rounded-md text-center transition cursor-pointer select-none ${timePreset === 'firstHalf' ? 'bg-white text-slate-900 shadow-3xs font-bold' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                          Nửa đầu
                        </button>
                        <button
                          onClick={() => setTimePreset('secondHalf')}
                          className={`py-1.5 rounded-md text-center transition cursor-pointer select-none ${timePreset === 'secondHalf' ? 'bg-white text-slate-900 shadow-3xs font-bold' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                          Nửa cuối
                        </button>
                        <button
                          onClick={() => setTimePreset('last7')}
                          className={`py-1.5 rounded-md text-center transition cursor-pointer select-none ${timePreset === 'last7' ? 'bg-white text-slate-900 shadow-3xs font-bold' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                          Theo tuần
                        </button>
                        <button
                          onClick={() => setTimePreset('custom')}
                          className={`py-1.5 rounded-md text-center transition cursor-pointer select-none ${timePreset === 'custom' ? 'bg-white text-slate-900 shadow-3xs font-bold' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                          Tùy chỉnh
                        </button>
                      </div>
                    </div>

                    {/* Month or Week Dropdown */}
                    <div className="md:col-span-5 space-y-1.5 font-bold text-slate-500">
                      <label className="text-[10px] font-bold text-slate-400 selector-label uppercase tracking-widest block font-bold text-slate-500">
                        {timePreset === 'last7' ? 'Chọn tuần dữ liệu' : 'Chọn tháng dữ liệu'}
                      </label>
                      {timePreset === 'last7' ? (
                        <select
                          value={activeWeekMatch ? `${activeWeekMatch.startStr}_${activeWeekMatch.endStr}` : ''}
                          onChange={(e) => {
                            const [wStart, wEnd] = e.target.value.split('_');
                            if (wStart && wEnd) {
                              setStartDate(wStart);
                              setEndDate(wEnd);
                            }
                          }}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition cursor-pointer"
                        >
                          {!activeWeekMatch && (
                            <option value="" disabled>Khoảng tuần tùy chọn</option>
                          )}
                          {uniqueWeeks.map(w => (
                            <option key={`${w.startStr}_${w.endStr}`} value={`${w.startStr}_${w.endStr}`}>
                              {w.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={selectedMonth}
                          onChange={(e) => handleMonthChange(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition cursor-pointer"
                        >
                          {selectedMonth === '' && (
                            <option value="" disabled>Khoảng thời gian lẻ/tùy chọn</option>
                          )}
                          <option value="all">Tất cả các tháng</option>
                          {uniqueMonths.map(month => {
                            const [year, m] = month.split('-');
                            return (
                              <option key={month} value={month}>
                                Tháng {m}/{year}
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                {/* Custom Dates Inputs Group Card or Single Day Picker */}
                {timePreset === 'day' ? (
                  <div className="bg-slate-50/70 border border-slate-200/50 rounded-xl p-3">
                    <div className="space-y-1">
                      <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest block">Chọn ngày hiển thị</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setEndDate(e.target.value);
                        }}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-mono font-bold text-slate-700 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 transition"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50/70 border border-slate-200/50 rounded-xl p-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest block">Từ ngày</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setTimePreset('custom');
                        }}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-mono font-bold text-slate-700 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest block">Đến ngày</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setTimePreset('custom');
                        }}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-mono font-bold text-slate-700 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 transition"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: PROFESSIONAL FILTERS */}
              <div className="lg:col-span-5 space-y-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Bộ lọc phạm vi chuyên môn</span>
                  </div>

                  {/* Department Selector Buttons */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 selector-label uppercase tracking-widest block">
                      Khoa phòng / Buồng khám chuyên khoa (Chọn một hoặc nhiều)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedDepartments(['all'])}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer select-none border ${
                          selectedDepartments.includes('all')
                            ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-650'
                        }`}
                      >
                        Tất cả các phòng
                      </button>
                      {CATEGORIES.map(cat => {
                        const isSelected = !selectedDepartments.includes('all') && selectedDepartments.includes(cat.key);
                        
                        let activeStyles = 'bg-slate-800 border-slate-800 text-white shadow-xs';
                        if (cat.key === 'sieuAm') activeStyles = 'bg-amber-600 border-amber-600 text-white shadow-xs';
                        else if (cat.key === 'noiSoi') activeStyles = 'bg-emerald-600 border-emerald-600 text-white shadow-xs';
                        else if (cat.key === 'xQuang') activeStyles = 'bg-blue-600 border-blue-600 text-white shadow-xs';
                        else if (cat.key === 'dienTimLHN') activeStyles = 'bg-purple-600 border-purple-600 text-white shadow-xs';
                        else if (cat.key === 'xetNghiem') activeStyles = 'bg-cyan-600 border-cyan-600 text-white shadow-xs';

                        const handleToggle = () => {
                          if (selectedDepartments.includes('all')) {
                            setSelectedDepartments([cat.key]);
                          } else {
                            if (selectedDepartments.includes(cat.key)) {
                              const updated = selectedDepartments.filter(k => k !== cat.key);
                              setSelectedDepartments(updated.length === 0 ? ['all'] : updated);
                            } else {
                              setSelectedDepartments([...selectedDepartments, cat.key]);
                            }
                          }
                        };

                        return (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={handleToggle}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer select-none border ${
                              isSelected
                                ? activeStyles
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-650'
                            }`}
                          >
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Procedure Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 selector-label uppercase tracking-widest block">
                      Chỉ mục dịch vụ kỹ thuật y khoa
                    </label>
                    <select
                      value={selectedProcedure}
                      onChange={(e) => setSelectedProcedure(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition cursor-pointer"
                    >
                      <option value="all">Tất cả chỉ mục kỹ thuật ({availableProcedures.length} dịch vụ)</option>
                      {availableProcedures.map(proc => (
                        <option key={proc.id} value={proc.id}>
                          {proc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="hidden lg:block text-[9.5px] text-slate-400 italic text-right font-medium">
                  * Dữ liệu phân tích đồng bộ thực tế qua cổng HIS bệnh viện
                </div>
              </div>

            </div>

            {/* Filters Active status block info */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 text-[10.5px] items-center text-slate-500 font-medium">
              <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px]">Thiết lập đang chạy:</span>
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold border border-slate-200">
                Từ {formatDateToDDMMYYYY(startDate)} đến {formatDateToDDMMYYYY(endDate)}
              </span>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded font-bold">
                {selectedDepartments.includes('all')
                  ? 'Toàn khoa Cận lâm sàng'
                  : selectedDepartments.map(k => CATEGORIES.find(c => c.key === k)?.name).join(', ')}
              </span>
              {selectedProcedure !== 'all' && (
                <span className="bg-indigo-50 text-indigo-800 border border-indigo-100 px-2 py-0.5 rounded font-bold">
                  Dịch vụ: {procedures.find(p => p.id === selectedProcedure)?.name}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full Detailed Procedure Statistics Table - Repositioned by User Request */}
      <div id="procedures-statistics-table" className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-3xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-150 pb-3">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-slate-850 flex items-center gap-1.5 uppercase tracking-wide">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block animate-pulse" />
              Bảng thống kê chi tiết chỉ số danh mục kỹ thuật phát sinh
            </h3>
            <p className="text-[10px] text-slate-400 leading-normal flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Số liệu chi tiết Bảo hiểm (BH) & Dịch vụ ngoài (ND) của từng danh mục, tự động tổng hợp theo bộ lọc.</span>
              <span className="inline-flex items-center gap-1 font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                <span className="inline-flex items-center justify-center w-3 a-3 rounded-full bg-emerald-500 text-white text-[7px]">★</span> Tăng nhiều nhất
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                <span className="inline-flex items-center justify-center w-3 a-3 rounded-full bg-rose-500 text-white text-[7px]">★</span> Giảm nhiều nhất
              </span>
            </p>
          </div>

          {/* Controls: Search and download buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {/* Quick search field */}
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="Tìm kiếm kỹ thuật..."
                value={procTableSearch}
                onChange={(e) => setProcTableSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100/75 focus:bg-white text-[11px] font-semibold text-slate-750 border border-slate-250 rounded-lg w-full sm:w-48 focus:outline-hidden focus:ring-1 focus:ring-indigo-505 transition"
              />
              <span className="absolute left-2.5 top-2 text-slate-400 text-xs">
                🔍
              </span>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
              <button
                onClick={handleExportExcel}
                title="Tải báo cáo Excel (.csv)"
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold shadow-3xs hover:shadow-2xs cursor-pointer transition select-none"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>

              <button
                onClick={() => handlePrint('print')}
                title="In báo cáo chỉ số"
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-250 text-slate-700 rounded-lg text-[11px] font-bold shadow-3xs hover:shadow-2xs cursor-pointer transition select-none"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In ấn</span>
              </button>

              {/* Column Settings Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsColMenuOpen(!isColMenuOpen)}
                  title="Cấu hình hiển thị cột"
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-indigo-55 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-700 rounded-lg text-[11px] font-bold shadow-3xs hover:shadow-2xs cursor-pointer transition select-none"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Cài đặt ẩn/hiện cột</span>
                </button>

                {isColMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsColMenuOpen(false)} 
                    />
                    <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg z-20 space-y-2 text-left">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 mb-1.5">
                        Thiết lập cột hiển thị
                      </div>
                      
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {[
                          { key: 'stt', label: 'STT (Số thứ tự)' },
                          { key: 'name', label: 'Danh mục kỹ thuật' },
                          { key: 'category', label: 'Chuyên khoa' },
                          { key: 'bh', label: 'Bảo hiểm (BH)' },
                          { key: 'nd', label: 'Dịch vụ (ND)' },
                          { key: 'total', label: 'Tổng số ca' },
                          { key: 'avgPerDay', label: 'Trung bình/ngày' },
                          { key: 'change', label: 'Tăng/Giảm (vs. trước)' },
                          { key: 'revenue', label: 'Dự thu phân tích' },
                        ].map(({ key, label }) => {
                          const isChecked = visibleColumns[key as keyof typeof visibleColumns];
                          return (
                            <label
                              key={key}
                              className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded-md cursor-pointer transition select-none group"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 border-slate-300"
                              />
                              <span className={`text-[11px] font-semibold text-slate-700 group-hover:text-slate-900 ${!isChecked ? 'line-through text-slate-400' : ''}`}>
                                {label}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      <div className="pt-1.5 border-t border-slate-100 flex justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const showAll = {
                              stt: true,
                              name: true,
                              category: true,
                              bh: true,
                              nd: true,
                              total: true,
                              avgPerDay: true,
                              change: true,
                              revenue: true,
                            };
                            setVisibleColumns(showAll);
                            localStorage.setItem('dashboard-visible-columns', JSON.stringify(showAll));
                          }}
                          className="text-[9.5px] font-extrabold text-indigo-650 hover:text-indigo-800 cursor-pointer uppercase tracking-wider"
                        >
                          Hiện tất cả
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const standardDefaults = {
                              stt: true,
                              name: true,
                              category: true,
                              bh: true,
                              nd: true,
                              total: true,
                              avgPerDay: true,
                              change: true,
                              revenue: true,
                            };
                            setVisibleColumns(standardDefaults);
                            localStorage.setItem('dashboard-visible-columns', JSON.stringify(standardDefaults));
                          }}
                          className="text-[9.5px] font-extrabold text-slate-500 hover:text-slate-700 cursor-pointer uppercase tracking-wider"
                        >
                          Khôi phục
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border-2 border-slate-300 rounded-xl bg-slate-50/10 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[12px] font-black uppercase tracking-wider divide-x divide-slate-800">
                {visibleColumns.stt && <th className="px-4 py-3.5 w-14 text-center">STT</th>}
                {visibleColumns.name && <th className="px-5 py-3.5 text-sm">Danh mục kỹ thuật y khoa</th>}
                {visibleColumns.category && <th className="px-4 py-3.5 w-36 text-center">Chuyên khoa</th>}
                {visibleColumns.bh && <th className="px-4 py-3.5 w-32 text-center text-sky-300">Bảo hiểm (BH)</th>}
                {visibleColumns.nd && <th className="px-4 py-3.5 w-32 text-center text-emerald-300">Dịch vụ (ND)</th>}
                {visibleColumns.total && <th className="px-5 py-3.5 w-32 text-center bg-slate-900 text-amber-400">Tổng số ca</th>}
                {visibleColumns.avgPerDay && <th className="px-4 py-3.5 w-36 text-center text-orange-300">Trung bình/ngày</th>}
                {visibleColumns.change && <th className="px-4 py-3.5 w-36 text-center text-rose-300">Tăng/Giảm (vs. trước)</th>}
                {visibleColumns.revenue && <th className="px-5 py-3.5 w-42 text-right text-yellow-300">Dự thu phân tích</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-[13px]">
              {searchedTableData.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="text-center py-10 text-sm text-slate-400 font-semibold bg-white italic">
                    Không tìm thấy danh mục kỹ thuật hoặc không có dữ liệu phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                searchedTableData.map((item, index) => {
                  const categoryInfo = CATEGORIES.find(c => c.key === item.category);
                  const isHighestIncrease = growthMetrics.highestIncreaseId !== null && item.id === growthMetrics.highestIncreaseId;
                  const isHighestDecrease = growthMetrics.highestDecreaseId !== null && item.id === growthMetrics.highestDecreaseId;
                  const prevTotal = previousStats ? (previousStats.stats?.procedureMap[item.id]?.count || 0) : 0;
                  const prices = ESTIMATE_PRICES[item.category as keyof typeof ESTIMATE_PRICES] || { bh: 0, nd: 0 };
                  const revenue = (item.bh * (prices.bh || 0)) + (item.nd * (prices.nd || 0));

                  let changeText = "-";
                  let changeColor = "text-slate-400";
                  let trendIcon = "";

                  if (prevTotal === 0) {
                    if (item.total > 0) {
                      changeText = "+100%";
                      changeColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
                      trendIcon = "▲";
                    } else {
                      changeText = "0%";
                      changeColor = "text-slate-400 bg-slate-50 border-slate-100";
                      trendIcon = "";
                    }
                  } else {
                    const pct = ((item.total - prevTotal) / prevTotal) * 100;
                    if (pct > 0) {
                      changeText = `+${pct.toFixed(1)}%`;
                      changeColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
                      trendIcon = "▲";
                    } else if (pct < 0) {
                      changeText = `${pct.toFixed(1)}%`;
                      changeColor = "text-rose-700 bg-rose-50 border-rose-200";
                      trendIcon = "▼";
                    } else {
                      changeText = "0%";
                      changeColor = "text-slate-600 bg-slate-50 border-slate-200";
                      trendIcon = "—";
                    }
                  }
                  
                  // Simple category badge design
                  let catColorClass = "bg-slate-100 text-slate-850 border-slate-250";
                  if (item.category === 'sieuAm') catColorClass = "bg-amber-50 text-amber-900 border-amber-300";
                  else if (item.category === 'noiSoi') catColorClass = "bg-emerald-50 text-emerald-900 border-emerald-300";
                  else if (item.category === 'xQuang') catColorClass = "bg-blue-50 text-blue-900 border-blue-300";
                  else if (item.category === 'dienTimLHN') catColorClass = "bg-purple-50 text-purple-900 border-purple-300";
                  else if (item.category === 'xetNghiem') catColorClass = "bg-cyan-50 text-cyan-900 border-cyan-300";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors bg-white hover:font-bold divide-x divide-slate-100 text-slate-700">
                      {visibleColumns.stt && (
                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-500">
                          {isHighestIncrease ? (
                            <span title={`Tăng mạnh nhất`} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-[11px] font-black leading-none shadow-xs">
                              ★
                            </span>
                          ) : isHighestDecrease ? (
                            <span title={`Giảm nhiều nhất`} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-500 text-white text-[11px] font-black leading-none shadow-xs">
                              ★
                            </span>
                          ) : (
                            index + 1
                          )}
                        </td>
                      )}
                      {visibleColumns.name && (
                        <td className="px-5 py-3.5 font-bold text-slate-900 text-[13.5px] sm:text-[14px]">
                          {item.name}
                        </td>
                      )}
                      {visibleColumns.category && (
                        <td className="px-4 py-3 text-center text-slate-650">
                          <span className={`inline-block px-3 py-1 rounded-md font-black text-[11px] border ${catColorClass}`}>
                            {categoryInfo?.name || item.category}
                          </span>
                        </td>
                      )}
                      {visibleColumns.bh && (
                        <td className="px-4 py-3 text-center font-mono font-black text-sm text-sky-700">
                          {item.bh || '-'}
                        </td>
                      )}
                      {visibleColumns.nd && (
                        <td className="px-4 py-3 text-center font-mono font-black text-sm text-emerald-700">
                          {item.nd || '-'}
                        </td>
                      )}
                      {visibleColumns.total && (
                        <td className="px-5 py-3 text-center font-mono font-extrabold text-[14.5px] text-slate-950 bg-slate-50/50">
                          {item.total || '-'}
                        </td>
                      )}
                      {visibleColumns.avgPerDay && (
                        <td className="px-4 py-3 text-center font-mono font-black text-sm text-orange-700 bg-orange-50/15">
                          {item.total === 0 ? '-' : (item.total / Math.max(activeFilteredReports.length, 1)).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                        </td>
                      )}
                      {visibleColumns.change && (
                        <td className="px-4 py-3 text-center">
                          {prevTotal === 0 && item.total === 0 ? (
                            <span className="text-[11px] text-slate-400 font-bold">Không phát sinh</span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black border ${changeColor}`}>
                              <span>{trendIcon}</span>
                              <span className="font-mono">{changeText}</span>
                            </span>
                          )}
                        </td>
                      )}
                      {visibleColumns.revenue && (
                        <td className="px-5 py-3 text-right font-mono font-black text-sm text-slate-900">
                          {revenue.toLocaleString('vi-VN')} VNĐ
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
              
              {/* Grand summary row for the table */}
              {searchedTableData.length > 0 && (() => {
                const sumCurrentTotal = searchedTableData.reduce((acc, curr) => acc + curr.total, 0);
                const sumPrevTotal = searchedTableData.reduce((acc, curr) => acc + (previousStats ? (previousStats.stats?.procedureMap[curr.id]?.count || 0) : 0), 0);

                let sumChangeText = "-";
                let sumChangeColor = "text-slate-400";
                let sumTrendIcon = "";

                if (sumPrevTotal === 0) {
                  if (sumCurrentTotal > 0) {
                    sumChangeText = "+100%";
                    sumChangeColor = "text-emerald-700";
                    sumTrendIcon = "▲ ";
                  }
                } else {
                  const pct = ((sumCurrentTotal - sumPrevTotal) / sumPrevTotal) * 100;
                  if (pct > 0) {
                    sumChangeText = `+${pct.toFixed(1)}%`;
                    sumChangeColor = "text-emerald-700";
                    sumTrendIcon = "▲ ";
                  } else if (pct < 0) {
                    sumChangeText = `${pct.toFixed(1)}%`;
                    sumChangeColor = "text-rose-705";
                    sumTrendIcon = "▼ ";
                  } else {
                    sumChangeText = "0%";
                    sumChangeColor = "text-slate-500";
                    sumTrendIcon = "";
                  }
                }

                const leftColsCount = (visibleColumns.stt ? 1 : 0) + (visibleColumns.name ? 1 : 0) + (visibleColumns.category ? 1 : 0);
                const sumRevenue = searchedTableData.reduce((acc, curr) => {
                  const prices = ESTIMATE_PRICES[curr.category as keyof typeof ESTIMATE_PRICES] || { bh: 0, nd: 0 };
                  return acc + (curr.bh * prices.bh) + (curr.nd * prices.nd);
                }, 0);

                return (
                  <tr className="bg-slate-150 font-black text-sm text-slate-950 border-t-2 border-slate-400 divide-x divide-slate-200">
                    {leftColsCount > 0 && (
                      <td colSpan={leftColsCount} className="px-5 py-4.5 text-right uppercase tracking-wider font-extrabold text-[12.5px]">
                        Tổng số cộng của các danh mục hiển thị:
                      </td>
                    )}
                    {visibleColumns.bh && (
                      <td className="px-4 py-4.5 text-center font-mono text-sky-900 text-sm font-black bg-slate-50/10">
                        {searchedTableData.reduce((acc, curr) => acc + curr.bh, 0).toLocaleString('vi-VN')}
                      </td>
                    )}
                    {visibleColumns.nd && (
                      <td className="px-4 py-4.5 text-center font-mono text-emerald-900 text-sm font-black bg-slate-50/10">
                        {searchedTableData.reduce((acc, curr) => acc + curr.nd, 0).toLocaleString('vi-VN')}
                      </td>
                    )}
                    {visibleColumns.total && (
                      <td className="px-5 py-4.5 text-center font-mono text-slate-950 text-sm bg-slate-200/50 font-black">
                        {searchedTableData.reduce((acc, curr) => acc + curr.total, 0).toLocaleString('vi-VN')}
                      </td>
                    )}
                    {visibleColumns.change && (
                      <td className={`px-4 py-4.5 text-center font-mono text-sm bg-slate-50/10 ${sumChangeColor}`}>
                        <span className="font-extrabold">{sumTrendIcon}{sumChangeText}</span>
                      </td>
                    )}
                    {visibleColumns.revenue && (
                      <td className="px-5 py-4.5 text-right font-mono text-slate-950 text-sm font-black bg-slate-50/10">
                        {sumRevenue.toLocaleString('vi-VN')} VNĐ
                      </td>
                    )}
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. EXECUTIVE METRICS GRID (KPIs with comparisons) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1 : Total Clinical procedures */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-3xs hover:border-slate-350 transition relative overflow-hidden flex flex-col justify-between min-h-[105px]">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TỔNG LƯỢT CHỈ SỐ</p>
              <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
                {currentStats.grandTotal.toLocaleString()}
              </h4>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-50">
            {previousStats ? (() => {
              const grow = getGrowthIndicator(currentStats.grandTotal, previousStats.stats.grandTotal);
              return (
                <>
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                    grow.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {grow.isPositive ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {grow.text}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">so với kỳ trước</span>
                </>
              );
            })() : (
              <span className="text-[10px] text-slate-400 font-medium italic">Không có dữ liệu đối xứng</span>
            )}
          </div>
        </div>

        {/* KPI 2 : BHYT Case mix counts */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-3xs hover:border-slate-350 transition relative overflow-hidden flex flex-col justify-between min-h-[105px]">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BẢO HIỂM Y TẾ (BHYT)</p>
              <h4 className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tight font-mono">
                {currentStats.totalBh.toLocaleString()}
                <span className="text-[11px] font-bold text-slate-400 ml-1.5">
                  ({currentStats.grandTotal > 0 ? Math.round((currentStats.totalBh / currentStats.grandTotal) * 100) : 0}%)
                </span>
              </h4>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-50">
            {previousStats ? (() => {
              const grow = getGrowthIndicator(currentStats.totalBh, previousStats.stats.totalBh);
              return (
                <>
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                    grow.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {grow.isPositive ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {grow.text}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">BHYT kỳ trước</span>
                </>
              );
            })() : (
              <span className="text-[10px] text-slate-400 font-medium italic">Không có dữ liệu đối xứng</span>
            )}
          </div>
        </div>

        {/* KPI 3 : ND (Ngoài dịch vụ / Thu phí) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-3xs hover:border-slate-350 transition relative overflow-hidden flex flex-col justify-between min-h-[105px]">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NGOÀI DỊCH VỤ (ND)</p>
              <h4 className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight font-mono">
                {currentStats.totalNd.toLocaleString()}
                <span className="text-[11px] font-bold text-slate-400 ml-1.5">
                  ({currentStats.grandTotal > 0 ? Math.round((currentStats.totalNd / currentStats.grandTotal) * 100) : 0}%)
                </span>
              </h4>
            </div>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-50">
            {previousStats ? (() => {
              const grow = getGrowthIndicator(currentStats.totalNd, previousStats.stats.totalNd);
              return (
                <>
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                    grow.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {grow.isPositive ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {grow.text}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">lượt dịch vụ qua</span>
                </>
              );
            })() : (
              <span className="text-[10px] text-slate-400 font-medium italic">Không có dữ liệu đối xứng</span>
            )}
          </div>
        </div>

        {/* KPI 4 : Expected clinical billing ESTIMATE (Revenue equivalent) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-3xs hover:border-slate-350 transition relative overflow-hidden flex flex-col justify-between min-h-[105px]">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ƯỚC TÍN DOANH VỤ KỸ THUẬT</p>
              <h4 className="text-[15px] sm:text-[16px] font-black text-slate-905 tracking-tight font-sans line-clamp-1">
                {formatCurrency(currentStats.totalRevenues)}
              </h4>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-50">
            {previousStats ? (() => {
              const grow = getGrowthIndicator(currentStats.totalRevenues, previousStats.stats.totalRevenues);
              return (
                <>
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                    grow.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {grow.isPositive ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {grow.text}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">tỷ suất doanh vụ</span>
                </>
              );
            })() : (
              <span className="text-[10px] text-slate-400 font-medium italic">Không có dữ liệu đối xứng</span>
            )}
          </div>
        </div>

      </div>

      {/* 4. CHARTS SECTION - MULTI PANEL AREA & RING GRAPHS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Graph 1: Timeline trends */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 lg:col-span-2 space-y-4 shadow-3xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xs font-black text-slate-850 flex items-center gap-1.5 uppercase tracking-wide">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 block" />
                Biểu đồ xu hướng sản lượng cận lâm sàng hàng ngày
              </h3>
              <p className="text-[10px] text-slate-400 leading-none">
                Theo dõi tải lượng BHYT và dịch vụ yêu cầu thực tế theo thời gian.
              </p>
            </div>

            {/* Price estimations legend block */}
            <div className="hidden sm:flex items-center gap-3 text-[10.5px]">
              <span className="inline-flex items-center gap-1 font-bold text-indigo-600">
                <span className="w-2 bg-indigo-600 h-2 rounded-full" />
                BHYT
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                <span className="w-2 bg-emerald-505 h-2 rounded-full" />
                Nhân dân (ND)
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-rose-500">
                <span className="w-2 bg-rose-500 h-0.5 block" />
                Doanh vụ
              </span>
            </div>
          </div>

          <div className="h-68 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              {dailyTimelineData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                  Không tìm thấy dữ liệu phát sinh trong thời gian đã chọn
                </div>
              ) : (
                <ComposedChart data={dailyTimelineData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} className="font-mono" tickLine={false} />
                  <YAxis yAxisId="left" stroke="#94a3b8" fontSize={9} className="font-mono" tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#fda4af" fontSize={9} className="font-mono" tickLine={false} />
                  <Tooltip 
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', backgroundColor: '#ffffff' }} 
                    formatter={(value: any, name: any) => {
                      if (name === 'Ước tính thu (kđ)') return [`${value.toLocaleString()}k ₫`, 'Dịch thu dự phóng'];
                      return [`${value} ca`, name];
                    }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', marginTop: '5px' }} />
                  <Bar yAxisId="left" name="Bảo hiểm (BH)" dataKey="Bảo hiểm (BH)" fill="#4f46e5" radius={[2, 2, 0, 0]} maxBarSize={22} />
                  <Bar yAxisId="left" name="Dịch vụ (ND)" dataKey="Dịch vụ (ND)" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={22} />
                  <Line yAxisId="right" name="Doanh thu kỹ thuật (VND)" type="monotone" dataKey="Ước tính thu (kđ)" stroke="#f43f5e" strokeWidth={2} dot={{ r: 2, fill: '#f43f5e' }} activeDot={{ r: 4 }} />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Specialties pie mix share */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4 shadow-3xs flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-slate-850 flex items-center gap-1.5 uppercase tracking-wide">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
              Tỷ trọng dịch vụ cận lâm sàng (%)
            </h3>
            <p className="text-[10px] text-slate-400 leading-none">
              Phân bổ tương thích sản lượng giữa các đơn vị kỹ thuật.
            </p>
          </div>

          <div className="h-52 w-full relative flex items-center justify-center">
            {currentStats.grandTotal === 0 ? (
              <p className="text-xs text-slate-400 font-medium">Chưa phát sinh tỷ trọng</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={specialtyChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="Tổng ca"
                  >
                    {specialtyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SPECIALTY_COLORS[index % SPECIALTY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '4px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Custom centurion donut hole label */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">TỔNG CỘNG</span>
              <span className="text-xl font-extrabold text-slate-850 font-mono mt-1 leading-none">{currentStats.grandTotal}</span>
              <span className="text-[9px] text-slate-400 mt-1 leading-none">Ca lâm sàng</span>
            </div>
          </div>

          {/* Simple and elegant indicator badges legend */}
          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-[10px]">
            {specialtyChartData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded shrink-0 block" style={{ backgroundColor: SPECIALTY_COLORS[idx % SPECIALTY_COLORS.length] }} />
                <span className="text-slate-600 truncate font-semibold">{item.name}:</span>
                <span className="font-mono font-bold text-slate-800 ml-auto">{item.percentageOfTotal}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4.5. COMPARATIVE GROWTH RATES BY SPECIALTY/DEPARTMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Graph 3: Percentage Growth Rate by Department */}
        <div id="growth-rate-chart" className="bg-white p-4 rounded-xl border border-slate-200 lg:col-span-2 space-y-4 shadow-3xs">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-slate-850 flex items-center gap-1.5 uppercase tracking-wide">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 block" />
              Tỷ lệ tăng trưởng sản lượng theo phòng, bộ phận (%)
            </h3>
            <p className="text-[10px] text-slate-400 leading-none">
              So sánh phần trăm tăng giảm số ca cận lâm sàng thực hiện giữa kỳ hoạt động được chọn và kỳ đối xứng liền trước.
            </p>
          </div>

          <div className="h-68 w-full mt-2">
            {!previousStats ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg p-6 bg-slate-50/50">
                <Info className="w-6 h-6 text-slate-300 mb-2 animate-pulse" />
                Vui lòng chọn khoảng thời gian rộng hơn để so sánh dữ liệu với chu kỳ trước.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentGrowthData} margin={{ top: 20, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const val = data['Tăng trưởng (%)'];
                        const isPos = val >= 0;
                        return (
                          <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-md text-xs space-y-1">
                            <p className="font-extrabold text-slate-700">{data.name}</p>
                            <p className="font-extrabold" style={{ color: isPos ? '#10b981' : '#f43f5e' }}>
                              Biến động: {isPos ? `+${val}%` : `${val}%`}
                            </p>
                            <p className="text-slate-500 text-[10px]">Kỳ này: <span className="font-bold text-slate-800">{data['Hiện tại (ca)']} ca</span></p>
                            <p className="text-slate-500 text-[10px]">Kỳ trước: <span className="font-bold text-slate-800">{data['Trước đó (ca)']} ca</span></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
                  <Bar dataKey="Tăng trưởng (%)" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={38}>
                    {departmentGrowthData.map((entry, index) => {
                      const isPositive = entry['Tăng trưởng (%)'] >= 0;
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={isPositive ? '#10b981' : '#f43f5e'} 
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Column 3: Growth Summary breakdown list */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-slate-850 flex items-center gap-1.5 uppercase tracking-wide">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 block" />
              Chi biến động y vụ phòng ban
            </h3>
            <p className="text-[10px] text-slate-400 leading-none">
              Bảng theo dõi trực quan số ca lâm sàng tăng trưởng theo kỳ.
            </p>
          </div>

          <div className="flex-1 mt-2 overflow-y-auto max-h-[220px] space-y-2 pr-0.5">
            {departmentGrowthData.map((item) => {
              const val = item['Tăng trưởng (%)'];
              const isPositive = val >= 0;
              return (
                <div key={item.key} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition">
                  <div className="space-y-0.5">
                    <span className="text-[11.5px] font-extrabold text-slate-800 block">{item.name}</span>
                    <span className="text-[9.5px] text-slate-400 block font-medium">
                      Kỳ này: <span className="font-bold text-slate-705">{item['Hiện tại (ca)']}</span> | Kỳ trước: <span className="font-bold text-slate-550">{item['Trước đó (ca)']}</span>
                    </span>
                  </div>

                  {previousStats ? (
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                        isPositive 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {isPositive ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {isPositive ? `+${val}%` : `${val}%`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">N/A</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2.5 text-[10px] text-indigo-950 font-bold leading-normal">
            💡 Tỉ lệ phần trăm cho thấy mức dao động nhu cầu y vụ thực tế. Phép tính được so sánh tuần hoàn tương thích tự động.
          </div>
        </div>
      </div>

      {/* 5. INDIVIDUAL BREAKDOWNS, PROCEDURES RANKING & FUTURE OUTLOOK FORECASTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Specialty performance bar comparisons */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 lg:col-span-2 space-y-4 shadow-3xs">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-slate-850 flex items-center gap-1.5 uppercase tracking-wide">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
              So sánh cơ cấu Bảo hiểm (BHYT) vs Thu phí của Từng Chuyên khoa
            </h3>
            <p className="text-[10px] text-slate-400 leading-none">
              Định dạng thanh cột ngang cho biết tỷ trọng hỗ trợ phúc lợi Bảo hiểm y tế trong đơn vị.
            </p>
          </div>

          <div className="h-56 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={specialtyChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={85} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '4px' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                <Bar name="Bảo hiểm (BH)" dataKey="Bảo hiểm (BH)" fill="#4f46e5" stackId="a" radius={[0, 0, 0, 0]} barSize={14} />
                <Bar name="Ngoài dịch vụ (ND)" dataKey="Dịch vụ (ND)" fill="#10b981" stackId="a" radius={[0, 2, 2, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Procedure indicators */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-slate-850 flex items-center gap-1.5 uppercase tracking-wide">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
              Chỉ mục kỹ thuật phát sinh cao nhất
            </h3>
            <p className="text-[10px] text-slate-400 leading-none">
              Các xét nghiệm, chuẩn đoán hình ảnh chiếm tỷ trọng bệnh lớn nhất toàn viện.
            </p>
          </div>

          <div className="space-y-2.5 flex-1 mt-3">
            {topProcedures.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 italic">Không có dữ liệu ca kỹ thuật trong phạm kỳ này</div>
            ) : (
              topProcedures.map((proc, index) => {
                const totalCases = currentStats.grandTotal;
                const ratio = totalCases > 0 ? ((proc.count / totalCases) * 100).toFixed(1) : "0";
                
                // Color mapping
                let styleBg = 'bg-slate-500';
                if (proc.category === 'sieuAm') styleBg = 'bg-amber-500';
                else if (proc.category === 'noiSoi') styleBg = 'bg-emerald-500';
                else if (proc.category === 'xQuang') styleBg = 'bg-blue-600';
                else if (proc.category === 'xetNghiem') styleBg = 'bg-cyan-500';
                else if (proc.category === 'dienTimLHN') styleBg = 'bg-purple-505';

                return (
                  <div key={proc.name} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold text-slate-700 truncate max-w-[200px] flex items-center gap-1">
                        <span className="w-4 h-4 bg-slate-900 text-white rounded-full text-[9px] font-black flex items-center justify-center leading-none">
                          {index + 1}
                        </span>
                        {proc.name}
                      </span>
                      <span className="font-mono font-black text-slate-800">{proc.count} ca</span>
                    </div>
                    
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden relative">
                      <div className={`h-full rounded-full ${styleBg}`} style={{ width: `${ratio}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                      <span className="capitalize font-medium">Chuyên khoa: {CATEGORIES.find(c => c.key === proc.category)?.name || proc.category}</span>
                      <span className="font-mono">{ratio}% tải lượng</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-slate-50/70 border border-slate-150 rounded-lg p-2 text-[10px] text-slate-500 text-center font-bold">
            💡 Tần suất chỉ số ca trực phản ánh tải lượng chính.
          </div>
        </div>

      </div>

      {/* 6. ADVANCED CLINICAL INSIGHTS & FORECASTING ENGINE */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Advanced forecast forecasting stats */}
        <div className="md:col-span-4 bg-slate-900 text-white rounded-xl p-4 shadow-md space-y-3.5 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
            <Sparkles className="w-32 h-32 text-white" />
          </div>

          <div className="space-y-1.5 border-b border-white/10 pb-2">
            <div className="inline-flex items-center gap-1 bg-white/10 text-emerald-400 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-emerald-300" />
              Thuật toán dự báo dịch vụ
            </div>
            <h3 className="text-xs font-black uppercase tracking-wide">Xu hướng tải kế cận (Clinical Projection)</h3>
            <p className="text-[10px] text-slate-400 leading-normal">
              Phân tích chỉ số trung bình trượt 3 ngày cuối thuộc kỳ khảo sát để ước lượng nhu cầu nhân lực trực y tế cho chu kỳ tiếp theo.
            </p>
          </div>

          {clinicalForecast ? (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
                <span className="text-[9px] text-slate-400 block font-bold uppercase">Sản lượng dự kiến</span>
                <span className="text-base font-extrabold font-mono text-emerald-400">~{clinicalForecast.projectedCases} ca / ngày</span>
                <span className="text-[8px] text-slate-450 block mt-0.5 font-medium">Cho ngày làm tiếp theo</span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
                <span className="text-[9px] text-slate-400 block font-bold uppercase">Doanh vụ dự kiến</span>
                <span className="text-base font-extrabold font-mono text-cyan-300">~{(clinicalForecast.projectedRevenue / 1000).toFixed(0)}k đ</span>
                <span className="text-[8px] text-slate-450 block mt-0.5 font-medium">Mức thu trung bình ngày</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Cần tối thiểu ghi nhận số liệu của 3 ngày trong kỳ để kích hoạt thuật toán dự phóng.</p>
          )}

          <div className="text-[8.5px] text-slate-400 leading-relaxed font-medium">
            *Lưu ý: Chỉ số dự báo tuyến tính mang tính đại lượng hỗ trợ sắp xếp ca trực chuẩn, chưa phản ánh các tình huống thiên tai hoặc dịch bệnh đột biến xã hội.
          </div>
        </div>

        {/* Clinical insights bullets based on filtered reports */}
        <div className="md:col-span-8 bg-white border border-slate-200 rounded-xl p-4 shadow-3xs space-y-3">
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Info className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-black text-slate-850 uppercase tracking-wider">Khám phá số liệu & Đánh giá Y vụ Lâm sàng</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] leading-relaxed text-slate-600 font-medium">
            
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
              <h5 className="font-bold text-indigo-900 flex items-center gap-1">
                📊 Tuyến trực y tế tối ưu
              </h5>
              <p>
                {currentStats.grandTotal > 0 ? (
                  <>
                    Tổng số <strong className="text-slate-800">{currentStats.grandTotal} ca</strong> thực hiện trên <strong className="text-slate-800">{currentStats.reportCount} ngày trực</strong>, đạt hiệu suất bình quân mỗi ngày giao ban y tế ghi nhận <strong className="text-slate-800">{(currentStats.grandTotal / (currentStats.reportCount || 1)).toFixed(1)} ca cận lâm sàng/ngày</strong>.
                  </>
                ) : (
                  'Không có đủ cơ sở dữ liệu để ước lượng tải tuyến.'
                )}
              </p>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
              <h5 className="font-bold text-emerald-900 flex items-center gap-1">
                🛡️ Chỉ tiêu Bảo hiểm y tế (BHYT)
              </h5>
              <p>
                Tỷ lệ Bảo hiểm đạt <strong className="text-emerald-700">{currentStats.grandTotal > 0 ? ((currentStats.totalBh / currentStats.grandTotal) * 100).toFixed(1) : 0}%</strong> trong kỳ. Việc cân đối chỉ tiêu BHYT giúp tối ưu ngân sách chi trả của quỹ Bảo hiểm xã hội và tăng tính tuân thủ pháp lý y khoa.
              </p>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
              <h5 className="font-bold text-amber-900 flex items-center gap-1">
                💡 Định hình cơ cấu Thu phí (ND)
              </h5>
              <p>
                Dịch vụ kĩ thuật tự nguyện / Nhân dân (ND) chiếm <strong className="text-amber-700">{currentStats.grandTotal > 0 ? ((currentStats.totalNd / currentStats.grandTotal) * 100).toFixed(1) : 0}%</strong>. Đây là động lực tài chính đóng góp vào quỹ phát triển chuyên môn kỹ thuật cao, trang bị vật tư chất lượng cao của bệnh viện.
              </p>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
              <h5 className="font-bold text-blue-905 flex items-center gap-1">
                🚀 Trọng tâm Kỹ thuật Y khoa
              </h5>
              <p>
                {topProcedures.length > 0 ? (
                  <>
                    Xét chuẩn kĩ thuật <strong className="text-slate-800">"{topProcedures[0].name}"</strong> chiếm sản lượng dẫn đầu với tổng cộng <strong className="text-slate-800">{topProcedures[0].count} lượt thực hiện</strong>, là trọng tâm phân bổ vật tư máy móc cốt lõi.
                  </>
                ) : (
                  'Chưa có dữ liệu phân loại trọng tâm kỹ thuật.'
                )}
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* 7. SECURE AI PREDICTIVE DEMAND FORECASTING ENGINE */}
      <div id="ai-predictive-forecaster" className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-150 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border border-indigo-150">
              <Brain className="w-4 h-4 text-indigo-600" />
              Mô hình Trí tuệ Nhân tạo Gemini Flash 1.5
            </div>
            <h3 className="text-sm font-black text-slate-850 flex items-center gap-2 uppercase tracking-wide">
              Hệ thống Dự báo Xu hướng Nhu cầu Dịch vụ Cận lâm sàng (AI)
            </h3>
            <p className="text-[11px] text-slate-550 max-w-2xl leading-normal font-medium">
              Sử dụng các thuật toán máy học chuyên sâu thông qua API Gemini để phân tích toàn bộ chuỗi số liệu của {reports.length} ngày trực trước, tự động nhận diện tính chu kỳ và đưa ra dự đoán nhu cầu lượt khám cho 3 ngày kế tiếp.
            </p>
          </div>

          <button
            onClick={handleTriggerForecast}
            disabled={forecastLoading}
            className={`cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-lg transition-all shadow-3xs hover:shadow-2xs border ${
              forecastLoading
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-700 text-white active:scale-98'
            }`}
          >
            {forecastLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Đang xử lý xu hướng lâm sàng...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                Kích hoạt AI dự báo nhu cầu
              </>
            )}
          </button>
        </div>

        {forecastError && (
          <div className="bg-red-50 border border-red-150 text-red-800 rounded-lg p-3.5 flex items-start gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5 font-bold">
              <p className="font-extrabold pb-0.5">Khởi tạo Dự báo Thất bại</p>
              <p className="font-semibold text-[11px] text-red-700">{forecastError}</p>
            </div>
          </div>
        )}

        {!forecastData && !forecastLoading && !forecastError && (
          <div className="border border-dashed border-slate-200 rounded-xl py-10 px-4 text-center space-y-3">
            <div className="font-black text-slate-400 bg-slate-50 border border-slate-150 w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-2xs">
              <Cpu className="w-6 h-6 text-slate-500" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Sẵn sàng phân tích dự án học máy</h4>
              <p className="text-[11px] text-slate-450 leading-normal font-medium">
                Dữ liệu lịch sử sẽ được đóng gói dạng chuỗi thời gian nén và chuyển tiếp an toàn để giải phóng các nhận định tuyến lâm sàng tối ưu, nhu cầu hóa chất vật tư và nguy cơ quá tải thiết bị.
              </p>
            </div>
          </div>
        )}

        {forecastLoading && (
          <div className="border border-slate-100 rounded-xl py-16 px-4 text-center space-y-4 bg-slate-50/50">
            <div className="relative w-12 h-12 mx-auto">
              <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
              <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <Brain className="w-4 h-4 text-indigo-600 animate-pulse" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-extrabold text-indigo-950 uppercase tracking-widest">Đang tính toán hệ cơ số nội suy</p>
              <p className="text-[10.5px] text-slate-400 font-medium">Mô hình AI đang kiểm toán và phân tích biến thiên hồi quy tuyến tính của bệnh viện...</p>
            </div>
          </div>
        )}

        {forecastData && (
          <div className="space-y-5 animate-fade-in">
            {forecastData.simulated && (
              <div className="bg-amber-50 border border-amber-200 text-amber-850 rounded-lg p-3 text-[11px] font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  <strong>Đang chạy ở Chế độ Mô phỏng Toán học:</strong> Do chưa thiết lập <code>GEMINI_API_KEY</code> trong cài đặt biến môi trường, hệ thống chuyển sang mô phỏng thuật toán nội suy nâng cao dựa trên {reports.length} báo cáo giao ban hiện có.
                </span>
              </div>
            )}

            {forecastData.errorWarning && (
              <div className="bg-rose-50 border border-rose-200 text-rose-850 rounded-lg p-3 text-[11px] font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>
                  <strong>Lưu ý từ máy chủ AI:</strong> {forecastData.errorWarning}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Predictions Line Chart */}
              <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-[11.5px] font-black text-slate-800 uppercase tracking-wide">Đường xu hướng tổng ca dự phóng cận lâm sàng</h4>
                    <p className="text-[10px] text-slate-400">Dự phóng tổng nhu cầu liên tiếp của tất cả chuyên khoa cho 3 ngày làm việc tiếp theo.</p>
                  </div>
                  <span className="font-mono text-[10px] font-extrabold bg-indigo-150 border border-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">
                    Kỳ kế cận (3 ngày)
                  </span>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecastData.predictions} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        fontSize={9} 
                        stroke="#94a3b8" 
                        tickLine={false} 
                        tickFormatter={(val) => {
                          const item = forecastData.predictions.find(p => p.date === val);
                          if (!item) return val;
                          const parts = val.split('-');
                          const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
                          return `${formattedDate} (${item.dayOfWeek})`;
                        }}
                      />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                        formatter={(value: any, name: any) => {
                          if (name === "total" || name === "Tổng ca") return [`${value} ca chẩn đoán`, "Tổng ca dự phóng"];
                          const categoryNames: Record<string, string> = {
                            sieuAm: 'Siêu âm',
                            noiSoi: 'Nội soi',
                            xQuang: 'X-quang',
                            dienTimLHN: 'Điện tim & LHN',
                            xetNghiem: 'Xét nghiệm'
                          };
                          return [`${value} ca`, categoryNames[name] || name];
                        }}
                      />
                      <Area type="monotone" name="Tổng ca" dataKey="total" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Grid layout showing micro statistics breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-150">
                  {forecastData.predictions.map((p) => {
                    const parts = p.date.split('-');
                    const shortDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : p.date;
                    return (
                      <div key={p.date} className="bg-white border border-slate-200/80 rounded-lg p-2 space-y-1">
                        <span className="text-[9.5px] text-slate-400 font-bold block uppercase">{shortDate} • {p.dayOfWeek}</span>
                        <span className="text-sm font-black text-slate-900 font-mono block">{p.total} ca</span>
                        <div className="flex flex-wrap items-center justify-center gap-1 text-[8px] font-bold text-slate-500 mt-1">
                          <span className="bg-amber-50 text-amber-700 px-1 rounded">SA: {p.sieuAm}</span>
                          <span className="bg-emerald-50 text-emerald-700 px-1 rounded">NS: {p.noiSoi}</span>
                          <span className="bg-blue-50 text-blue-700 px-1 rounded">XQ: {p.xQuang}</span>
                          <span className="bg-cyan-50 text-cyan-700 px-1 rounded">XN: {p.xetNghiem}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: AI Analysis & General Clinical Recommendations */}
              <div className="lg:col-span-5 space-y-4">
                {/* General Trend box */}
                <div className="bg-indigo-950 text-indigo-50 border border-indigo-900 rounded-xl p-4 space-y-2 pr-5">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-black uppercase text-amber-400 tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    Báo cáo Tóm lược Xu hướng AI
                  </div>
                  <p className="text-[11px] leading-relaxed font-semibold italic text-slate-250">
                    "{forecastData.generalTrend}"
                  </p>
                </div>

                {/* Micro explanation text under predicted dates */}
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2.5">
                  <h5 className="text-[10px] font-black text-slate-550 uppercase tracking-wider">Diễn giải Chi tiết Tải lượng:</h5>
                  <div className="space-y-2 text-[10.5px] leading-normal font-medium text-slate-600">
                    {forecastData.predictions.map((p) => {
                      const parts = p.date.split('-');
                      const shortDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : p.date;
                      return (
                        <div key={p.date} className="border-l-2 border-indigo-400 pl-2 space-y-0.5">
                          <span className="font-extrabold text-slate-850">{shortDate} ({p.dayOfWeek}):</span>
                          <p className="text-slate-500 text-[10px] italic">{p.reasoning}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Actionable Insights list block */}
            <div className="space-y-2 pt-1 animate-fade-in">
              <h4 className="text-[11.5px] font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-500" />
                Khuyến nghị Hành động Thiết thực (Actionable Medical Insights)
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {forecastData.insights.map((insight, idx) => {
                  let impactColor = "bg-slate-100 text-slate-700 border-slate-200";
                  if (insight.impact === "HIGH") impactColor = "bg-rose-50 text-rose-700 border-rose-150";
                  else if (insight.impact === "MEDIUM") impactColor = "bg-amber-50 text-amber-700 border-amber-150";

                  let iconBadgeColor = "text-indigo-600 bg-indigo-50";
                  if (insight.category === "Vật tư") iconBadgeColor = "text-emerald-700 bg-emerald-50";
                  else if (insight.category === "Thiết bị") iconBadgeColor = "text-pink-750 bg-pink-50";
                  else if (insight.category === "Vận hành") iconBadgeColor = "text-blue-700 bg-blue-50";

                  return (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-4xs space-y-2 flex flex-col justify-between hover:border-slate-350 transition">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${impactColor}`}>
                              Ưu tiên: {insight.impact}
                            </span>
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full text-slate-600 border border-slate-150`}>
                              Ủy thác: {insight.category}
                            </span>
                          </div>
                          <h5 className="text-[11.5px] font-extrabold text-slate-800">{insight.topic}</h5>
                        </div>
                        <div className={`p-1.5 rounded-lg shrink-0 ${iconBadgeColor}`}>
                          <Brain className="w-4 h-4" />
                        </div>
                      </div>

                      <p className="text-[10.5px] leading-relaxed text-slate-550 font-medium">
                        {insight.recommendation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
