import React, { useState, useEffect } from 'react';
import { Meeting, DailyReport, User } from '../types';
import { USERS } from '../data';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { 
  Calendar, 
  MapPin, 
  User as UserIcon, 
  BookOpen, 
  Sparkles, 
  Cpu, 
  ClipboardCopy, 
  Check, 
  PenTool, 
  PlusCircle,
  FileText,
  Clock,
  Trash2,
  Edit,
  ShieldAlert,
  Lock,
  Unlock,
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  CheckSquare,
  Image as ImageIcon,
  ChevronDown,
  Layout,
  History,
  CheckCircle,
  X
} from 'lucide-react';

const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        h1: ({ children }) => <h1 className="text-xs font-black text-slate-900 border-b border-indigo-100 pb-1 mt-4 mb-2 first:mt-0 uppercase tracking-wide flex items-center gap-1.5">{children}</h1>,
        h2: ({ children }) => <h2 className="text-[11px] font-bold text-slate-800 mt-3 mb-1.5 first:mt-0 flex items-center gap-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-[10px] font-bold text-slate-700 mt-2.5 mb-1">{children}</h3>,
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-slate-700 text-xs">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2.5 space-y-1 text-xs text-slate-700">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2.5 space-y-1 text-xs text-slate-700">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        blockquote: ({ children }) => <blockquote className="border-l-3 border-indigo-400 bg-slate-50/70 pl-3 py-1.5 my-2.5 text-slate-600 italic rounded-r text-xs">{children}</blockquote>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-805 underline font-bold">{children}</a>,
        img: ({ src, alt }) => (
          <div className="my-3 space-y-1 bg-slate-50 border border-slate-200 p-1.5 rounded-lg max-w-sm mx-auto shadow-4xs">
            <img referrerPolicy="no-referrer" src={src} alt={alt} className="w-full h-auto rounded max-h-56 object-cover" />
            {alt && <div className="text-[9px] text-slate-500 text-center font-bold italic">{alt}</div>}
          </div>
        ),
        input: ({ type, checked }) => {
          if (type === 'checkbox') {
            return (
              <input
                type="checkbox"
                checked={!!checked}
                readOnly
                className="w-3.5 h-3.5 mr-1 rounded border-slate-350 text-indigo-600 focus:ring-0 inline-block align-middle cursor-default"
              />
            );
          }
          return <input type={type} />;
        },
        u: ({ children }) => <span className="underline decoration-indigo-400/50 decoration-1 underline-offset-2">{children}</span>,
        mark: ({ children }) => <mark className="bg-yellow-100 text-slate-900 px-0.5 rounded-sm">{children}</mark>
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

const getCurrentLocalDateTimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

interface MeetingManagerProps {
  meetings: Meeting[];
  reports: DailyReport[];
  currentUser: User;
  onSaveMeeting: (meeting: Meeting) => Promise<void>;
  onGenerateAIExtract: (meetingId: string, notes: string, dateMetrics?: any) => Promise<string>;
  onDeleteMeeting: (meetingId: string) => Promise<void>;
  selectedMeetingIdProp?: string;
}

export default function MeetingManager({
  meetings,
  reports,
  currentUser,
  onSaveMeeting,
  onGenerateAIExtract,
  onDeleteMeeting,
  selectedMeetingIdProp
}: MeetingManagerProps) {
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>(selectedMeetingIdProp || meetings[0]?.id || '');
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [copied, setCopied] = useState(false);

  // RBAC permissions variables
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isNotesFocused, setIsNotesFocused] = useState(false);
  const [prevSelectedMeetingId, setPrevSelectedMeetingId] = useState<string>('');

  // New/Edit meeting form states
  const [newTitle, setNewTitle] = useState('');
  const [newDateTime, setNewDateTime] = useState(getCurrentLocalDateTimeString());
  const [newVenue, setNewVenue] = useState('');
  const [newChair, setNewChair] = useState(currentUser.name);
  const [newSecretary, setNewSecretary] = useState(USERS.find(u => u.name !== currentUser.name)?.name || '');
  const [newAgenda, setNewAgenda] = useState('');
  const [newStatus, setNewStatus] = useState<'scheduled' | 'ongoing' | 'completed' | 'cancelled'>('scheduled');

  // Rich-editor states
  const [notesText, setNotesText] = useState('');
  const [editorTab, setEditorTab] = useState<'soanthao' | 'xemtruoc'>('soanthao');
  const [showImagePresets, setShowImagePresets] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);

  // Load the first available meeting if none selected, or when prop overrides it, or if selected meeting is deleted
  useEffect(() => {
    if (selectedMeetingIdProp) {
      setSelectedMeetingId(selectedMeetingIdProp);
    } else if (meetings.length > 0) {
      const exists = meetings.some(m => m.id === selectedMeetingId);
      if (!selectedMeetingId || !exists) {
        setSelectedMeetingId(meetings[0].id);
      }
    } else {
      setSelectedMeetingId('');
    }
  }, [meetings, selectedMeetingId, selectedMeetingIdProp]);

  const activeMeeting = meetings.find(m => m.id === selectedMeetingId);

  // Sync edit details states when active meeting changes
  useEffect(() => {
    if (activeMeeting) {
      const idSwitched = activeMeeting.id !== prevSelectedMeetingId;
      if (idSwitched) {
        setPrevSelectedMeetingId(activeMeeting.id);
        setIsEditingDetails(false);
      }

      if (idSwitched || !isEditingDetails) {
        setNewTitle(activeMeeting.title);
        setNewDateTime(activeMeeting.dateTime);
        setNewVenue(activeMeeting.venue);
        setNewChair(activeMeeting.chairperson);
        setNewSecretary(activeMeeting.secretary);
        setNewAgenda(activeMeeting.agenda);
        setNewStatus(activeMeeting.status);
      }

      if (idSwitched || !isNotesFocused) {
        setNotesText(activeMeeting.notes || '');
      }
    }
  }, [selectedMeetingId, activeMeeting, isEditingDetails, isNotesFocused, prevSelectedMeetingId]);

  // Permission calculation logic (RBAC)
  const getMeetingPermissions = (meet: Meeting) => {
    if (currentUser.role === 'admin' || currentUser.role === 'truongKhoa') {
      return {
        canEditDetails: true,
        canDelete: true,
        canSaveNotes: true,
        label: currentUser.role === 'admin' ? 'Quản trị viên' : 'Trưởng Khoa',
        color: 'bg-indigo-50 border-indigo-200 text-indigo-700'
      };
    }

    const isChair = meet.chairperson === currentUser.name;
    const isSec = meet.secretary === currentUser.name;
    const isCreator = meet.createdBy === currentUser.id;

    if (isCreator) {
      return {
        canEditDetails: true,
        canDelete: true,
        canSaveNotes: true,
        label: 'Người tạo cuộc họp',
        color: 'bg-emerald-50 border-emerald-200 text-emerald-700'
      };
    }

    if (isChair) {
      return {
        canEditDetails: true,
        canDelete: false,
        canSaveNotes: true,
        label: 'Chủ trì cuộc họp',
        color: 'bg-amber-50 border-amber-200 text-amber-700'
      };
    }

    if (isSec) {
      return {
        canEditDetails: true,
        canDelete: false,
        canSaveNotes: true,
        label: 'Thư ký cuộc họp',
        color: 'bg-cyan-50 border-cyan-200 text-cyan-700'
      };
    }

    return {
      canEditDetails: true,
      canDelete: false,
      canSaveNotes: true,
      label: 'Bác sĩ chuyên khoa',
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700'
    };
  };

  const perms = activeMeeting ? getMeetingPermissions(activeMeeting) : {
    canEditDetails: false,
    canDelete: false,
    canSaveNotes: false,
    label: 'Chưa chọn cuộc họp',
    color: 'bg-slate-100 text-slate-500'
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDateTime || !newVenue) return;

    const newMeeting: Omit<Meeting, 'id'> = {
      title: newTitle,
      dateTime: newDateTime,
      venue: newVenue,
      chairperson: newChair,
      secretary: newSecretary || USERS.find(u => u.id !== currentUser.id)?.name || "BS. Trần Thị Mai",
      attendees: USERS.map(u => u.name),
      agenda: newAgenda || "- Báo cáo số liệu chuyên môn\n- Thảo luận giao ban chuyên ngành",
      notes: '',
      minutes: '',
      status: 'scheduled',
      createdBy: currentUser.id
    };

    await onSaveMeeting(newMeeting as Meeting);
    
    // Reset inputs
    setNewTitle('');
    setNewDateTime('');
    setNewVenue('');
    setNewAgenda('');
    setIsCreating(false);
  };

  const handleUpdateMeetingDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMeeting || !perms.canEditDetails) return;

    const updated: Meeting = {
      ...activeMeeting,
      title: newTitle,
      dateTime: newDateTime,
      venue: newVenue,
      chairperson: newChair,
      secretary: newSecretary,
      agenda: newAgenda,
      status: newStatus
    };

    await onSaveMeeting(updated);
    setIsEditingDetails(false);
  };

  const handleSaveNotesOnly = async () => {
    if (!activeMeeting) return;
    const updated: Meeting = {
      ...activeMeeting,
      notes: notesText
    };
    await onSaveMeeting(updated);
    setNotesSavedSuccess(true);
    setTimeout(() => {
      setNotesSavedSuccess(false);
    }, 1500);
  };

  const handleDeleteActiveMeeting = async () => {
    if (!activeMeeting || !perms.canDelete) return;
    const remainingMeetings = meetings.filter(m => m.id !== activeMeeting.id);
    const nextSelectId = remainingMeetings[0]?.id || '';
    
    await onDeleteMeeting(activeMeeting.id);
    setShowDeleteConfirm(false);
    setSelectedMeetingId(nextSelectId);
  };

  // Cursor formatting helper for Rich Digital Editor
  const insertFormat = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('digital-notes-textarea') as HTMLTextAreaElement;
    if (!textarea) {
      setNotesText(prev => prev + prefix + suffix);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = prefix + (selected || "Văn bản") + suffix;
    
    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setNotesText(newValue);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected || "Văn bản").length);
    }, 50);
  };

  // Keyboard shortcut listener and checklist automation for Rich Editor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isShortcut = isMac ? e.metaKey : e.ctrlKey;

    if (isShortcut) {
      if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        insertFormat('**', '**');
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        insertFormat('*', '*');
      } else if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        insertFormat('<u>', '</u>');
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveNotesOnly();
      }
    } else if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const text = textarea.value;
      
      // Find the start of the current line
      let lineStart = text.lastIndexOf('\n', start - 1);
      if (lineStart === -1) lineStart = 0;
      else lineStart += 1;
      
      const currentLine = text.substring(lineStart, start);
      
      // Matchers for checklist and bullet items
      const checklistMatch = currentLine.match(/^(\s*-\s*\[[ x]\]\s+)/i);
      const bulletMatch = currentLine.match(/^(\s*-\s+)/);
      
      if (checklistMatch) {
        const itemContent = currentLine.substring(checklistMatch[1].length).trim();
        if (itemContent === '') {
          // If empty checklist item, erase it (exit checklist mode)
          e.preventDefault();
          const newValue = text.substring(0, lineStart) + '\n' + text.substring(start);
          setNotesText(newValue);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart + 1, lineStart + 1);
          }, 10);
        } else {
          // Continue checklist on Enter
          e.preventDefault();
          const prefix = '\n- [ ] ';
          const newValue = text.substring(0, start) + prefix + text.substring(start);
          setNotesText(newValue);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length);
          }, 10);
        }
      } else if (bulletMatch) {
        const itemContent = currentLine.substring(bulletMatch[1].length).trim();
        if (itemContent === '') {
          // If empty bullet, erase it (exit bullet mode)
          e.preventDefault();
          const newValue = text.substring(0, lineStart) + '\n' + text.substring(start);
          setNotesText(newValue);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart + 1, lineStart + 1);
          }, 10);
        } else {
          // Continue bullet list
          e.preventDefault();
          const prefix = '\n- ';
          const newValue = text.substring(0, start) + prefix + text.substring(start);
          setNotesText(newValue);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length);
          }, 10);
        }
      }
    }
  };

  // Clinical presets templates
  const medicalChecklistTemplates = [
    {
      title: '📋 Kiểm tra máy Siêu âm (IQC)',
      text: `### KPI KIỂM CHUẨN SIÊU ÂM ĐẦU NGÀY\n- [ ] Kiểm tra nguồn điện và hệ thống lưu điện (UPS).\n- [ ] Độc lập nội kiểm chất lượng đầu dò cơ xương khớp.\n- [ ] Khử khuẩn bề mặt thân máy và dây cáp đầu dò.\n- [ ] Vệ sinh bụi màng lọc gió tủ máy định kỳ.\n- [ ] Đồng bộ hình ảnh lên PACS bệnh viện thông suốt.`
    },
    {
      title: '📋 Dự trù Vật tư Nội soi',
      text: `### DỰ TRÙ VẬT TƯ TIÊU HAO PHÒNG NỘI SOI\n- [ ] Bộ kẹp sinh thiết dùng một lần (Biopsy Forceps): 30 chiếc.\n- [ ] Thuốc thử Clotest chẩn đoán H.pylori: 50 ống.\n- [ ] Dung dịch sát khuẩn dây soi chuyên dụng (Cidex OPA): 2 can.\n- [ ] Kính bảo hộ & áo choàng dùng 1 lần cho kíp soi dạ dày.`
    },
    {
      title: '📋 Kiểm chuẩn Máy Xét nghiệm',
      text: `### QUY TRÌNH KIỂM CHUẨN XÉT NGHIỆM ĐẦU TRỰC\n- [ ] Chạy mẫu nội kiểm (IQC) 3 cấp độ đối với máy huyết học.\n- [ ] Đối chiếu mẫu ngoại kiểm (EQAS) máy sinh hóa định kỳ tháng.\n- [ ] Kiểm tra nhiệt độ tủ mát bảo quản hóa chất (đạt 2-8 độ C).\n- [ ] Ghi chép nhật trình máy ly tâm phòng vi sinh.`
    },
    {
      title: '📋 Khắc phục an toàn bức xạ X-quang',
      text: `### AN TOÀN BỨC XẠ & THIẾT BỊ X-QUANG\n- [ ] Kiểm tra đèn tín hiệu cảnh báo bức xạ trước cửa phòng CT-scan.\n- [ ] Trang bị đầy đủ áo chì, yếm chì đỡ tuyến giáp cho kíp trực.\n- [ ] Đôn đốc KTV đo liều kế cá nhân định kỳ hàng quý.\n- [ ] Hướng dẫn an toàn bảo hiểm bức xạ chụp X-quang cho bệnh nhi.`
    }
  ];

  // Clinical preset images
  const medicalImagePresets = [
    {
      name: '🖼️ CT-Scan Lồng Ngực',
      desc: 'Hình ảnh cắt lớp vi tính phân giải cao',
      url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600&auto=format&fit=crop'
    },
    {
      name: '🖼️ Siêu Âm Tim Màu',
      desc: 'Khoang tim 4 buồng Doppler màu',
      url: 'https://images.unsplash.com/photo-1579684389782-64d84b5e901d?w=600&auto=format&fit=crop'
    },
    {
      name: '🖼️ Máy Chụp X-Quang Kỹ Thuật Số',
      desc: 'Thiết bị chụp X-quang thế hệ mới nhất',
      url: 'https://images.unsplash.com/photo-1616012480717-fd9867059ca0?w=600&auto=format&fit=crop'
    },
    {
      name: '🖼️ Phòng Xét Nghiệm Vi Sinh',
      desc: 'Kính hiển vi chụp tế bào học sinh thiết',
      url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop'
    }
  ];

  const triggerAIGenerate = async () => {
    if (!activeMeeting) return;
    setIsGeneratingAI(true);
    
    try {
      const meetingDateOnly = activeMeeting.dateTime.split('T')[0];
      const matchReport = reports.find(r => r.date === meetingDateOnly);

      let dateMetrics = undefined;
      if (matchReport) {
        let totalBh = 0;
        let totalNd = 0;
        let sieuAmCount = 0;
        let noiSoiCount = 0;
        let xQuangCount = 0;
        let dienTimCount = 0;
        let xetNghiemCount = 0;

        matchReport.items.forEach(item => {
          totalBh += item.bh;
          totalNd += item.nd;
          const sum = item.bh + item.nd;
          if (item.category === 'sieuAm') sieuAmCount += sum;
          if (item.category === 'noiSoi') noiSoiCount += sum;
          if (item.category === 'xQuang') xQuangCount += sum;
          if (item.category === 'dienTimLHN') dienTimCount += sum;
          if (item.category === 'xetNghiem') xetNghiemCount += sum;
        });

        dateMetrics = {
          date: meetingDateOnly,
          totalBh,
          totalNd,
          sieuAmText: `${sieuAmCount} ca (${matchReport.items.find(i=>i.id==='sieuAm_tongquat')?.bh || 0} ca siêu âm tổng quát)`,
          noiSoiText: `${noiSoiCount} ca (${matchReport.items.find(i=>i.id==='noiSoi_daDay')?.bh || 0} nội soi dạ dày)`,
          xQuangText: `${xQuangCount} ca`,
          dienTimText: `${dienTimCount} ca`,
          xetNghiemText: `${xetNghiemCount} lượt xét nghiệm Sinh hóa & Huyết học`
        };
      }

      await onGenerateAIExtract(activeMeeting.id, notesText, dateMetrics);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const copyMinutesToClipboard = () => {
    if (!activeMeeting || !activeMeeting.minutes) return;
    navigator.clipboard.writeText(activeMeeting.minutes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 font-sans">
      
      {/* Left Column: Meetings List & Schedulers - High Density */}
      <div className="space-y-4">
        
        {/* Creation or selection card */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              Lịch giao ban khoa
            </h3>
            {!isCreating && (
              <button
                onClick={() => {
                  setNewTitle('');
                  setNewDateTime(getCurrentLocalDateTimeString());
                  setNewVenue('');
                  setNewAgenda('');
                  setIsCreating(true);
                }}
                className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Lên lịch họp
              </button>
            )}
          </div>

          {isCreating ? (
            <form onSubmit={handleCreateMeeting} className="space-y-2.5 border-t border-slate-150 pt-2.5">
              <div>
                <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Tiêu đề cuộc họp</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Giao ban chi đoàn cận lâm sàng đột xuất"
                  className="mt-1 w-full border border-slate-205 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Thời gian</label>
                  <input
                    type="datetime-local"
                    required
                    value={newDateTime}
                    onChange={(e) => setNewDateTime(e.target.value)}
                    className="mt-1 w-full border border-slate-250 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-indigo-550 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Địa điểm</label>
                  <input
                    type="text"
                    required
                    value={newVenue}
                    onChange={(e) => setNewVenue(e.target.value)}
                    placeholder="Phòng hội ý tầng 2"
                    className="mt-1 w-full border border-slate-205 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Chủ trì</label>
                  <select
                    value={newChair}
                    onChange={(e) => setNewChair(e.target.value)}
                    className="mt-1 w-full border border-slate-205 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 font-medium"
                  >
                    {USERS.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Thư ký</label>
                  <select
                    value={newSecretary}
                    onChange={(e) => setNewSecretary(e.target.value)}
                    className="mt-1 w-full border border-slate-205 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">-- Chọn thư ký --</option>
                    {USERS.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Chương trình nghị sự (Agenda)</label>
                <textarea
                  value={newAgenda}
                  onChange={(e) => setNewAgenda(e.target.value)}
                  placeholder="- Đánh giá vật tư tiêu hao&#10;- Báo cáo chỉ định xét nghiệm dịch vụ"
                  rows={3}
                  className="mt-1 w-full border border-slate-205 rounded px-2 py-1 text-[11px] focus:ring-1 focus:ring-indigo-500 leading-normal"
                />
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-2.5 py-1 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold rounded cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded shadow-xs cursor-pointer"
                >
                  Xác nhận lưu
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-1.5 max-h-[440px] overflow-y-auto pr-1 select-none">
              {meetings.map(meet => {
                const meetPerms = getMeetingPermissions(meet);
                return (
                  <div
                    key={meet.id}
                    onClick={() => {
                      setSelectedMeetingId(meet.id);
                      setIsEditingDetails(false);
                    }}
                    className={`p-2.5 rounded border text-left cursor-pointer transition duration-150 relative ${
                      meet.id === selectedMeetingId
                        ? 'border-indigo-600 bg-indigo-50/25 shadow-xs'
                        : 'border-slate-200/80 hover:bg-slate-50/75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="text-[11px] font-bold text-slate-850 line-clamp-1 py-0.5">{meet.title}</span>
                      <span className={`px-1 rounded-full text-[8px] font-extrabold uppercase shrink-0 tracking-wide border self-center ${
                        meet.status === 'completed'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : meet.status === 'cancelled'
                          ? 'bg-rose-50 border-rose-300 text-rose-800'
                          : meet.status === 'ongoing'
                          ? 'bg-red-50 border-red-300 text-red-800 animate-pulse'
                          : 'bg-amber-50 border-amber-300 text-amber-800'
                      }`}>
                        {meet.status === 'completed' ? 'Đã xong' : 
                         meet.status === 'ongoing' ? 'Họp trực tiếp' : 
                         meet.status === 'cancelled' ? 'Hủy' : 'Sắp tới'}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-col gap-0.5 text-[10px] text-slate-500 font-sans">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        {new Date(meet.dateTime).toLocaleString('vi-VN')}
                      </span>
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {meet.venue}
                      </span>
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                        Chủ trì: {meet.chairperson}
                      </span>
                    </div>

                    {/* Permission hint micro badge */}
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                      <span>Người tạo: {meet.createdBy === 'u1' ? 'Trưởng Khoa' : 'KTV/Bác sĩ'}</span>
                      <span className={`px-1 rounded ${meetPerms.canEditDetails ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-slate-400 font-semibold'}`}>
                        {meetPerms.canEditDetails ? 'Có quyền sửa' : 'Chỉ xem'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Informative RBAC Guidelines Card */}
        <div className="bg-slate-900 text-slate-350 p-3 rounded-lg border border-slate-800 space-y-2.5">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Lock className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Hệ thống phân quyền (RBAC)</span>
          </div>
          <p className="text-[10px] leading-relaxed">
            Quyền năng được xác thực độc lập dựa trên chức vụ chuyên môn y khoa:
          </p>
          <ul className="text-[9px] space-y-1 text-slate-400 list-disc list-inside">
            <li><strong className="text-white">Trưởng khoa (Admin):</strong> Toàn phần CRUD, quản lý mọi lịch họp, ký duyệt số biên bản giao ban.</li>
            <li><strong className="text-white">Người tạo / Chủ trì / Thư ký:</strong> Có quyền Sửa đổi thông tin chi tiết và ghi chú số của cuộc họp đó.</li>
            <li><strong className="text-white">Nhập liệu viên / Bác sĩ khác:</strong> Chế độ xem đồng bộ, không được thao tác ghi chú tránh sai lệch thông tin hành chính.</li>
          </ul>
        </div>
      </div>

      {/* Right Column: Digital Notes Keeper & AI Auto minutes - High Density */}
      <div className="lg:col-span-2 space-y-4">
        {activeMeeting ? (
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
            
            {/* RBAC Privilege Indicator Alert Bar */}
            <div className={`px-3 py-1.5 border-b flex items-center justify-between text-[11px] font-sans ${perms.color}`}>
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  Phân cấp của bạn: <strong className="font-bold">{perms.label}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[9.5px]">
                {perms.canEditDetails ? (
                  <span className="flex items-center gap-0.5 text-emerald-700 font-bold">
                    <Unlock className="w-3 h-3 text-emerald-600" /> TOÀN QUYỀN CHỈNH SỬA
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-slate-500 font-bold">
                    <Lock className="w-3 h-3 text-slate-400" /> BẢO MẬT: CHỈ ĐỌC
                  </span>
                )}
              </div>
            </div>

            {/* Header info / Editing details panel */}
            {isEditingDetails ? (
              <form onSubmit={handleUpdateMeetingDetails} className="bg-slate-550 text-white p-4 space-y-3 bg-[#1e293b]">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">SỬA THÔNG TIN HÀNH CHÍNH LỊCH HỌP</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingDetails(false)}
                      className="px-2 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-650 text-white font-bold rounded"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-2 py-0.5 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded shadow-xs"
                    >
                      Cập nhật lưu
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[8px] font-extrabold uppercase text-slate-400">Tiêu đề cuộc họp</label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="mt-1 w-full bg-slate-800 text-white border border-slate-700 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] font-extrabold uppercase text-slate-400">Địa điểm họp</label>
                      <input
                        type="text"
                        required
                        value={newVenue}
                        onChange={(e) => setNewVenue(e.target.value)}
                        className="mt-1 w-full bg-slate-800 text-white border border-slate-700 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-extrabold uppercase text-slate-400">Trạng thái họp</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as any)}
                        className="mt-1 w-full bg-slate-800 text-white border border-slate-700 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="scheduled">Sắp diễn ra</option>
                        <option value="ongoing">Đang tiến hành</option>
                        <option value="completed">Đã kết thúc</option>
                        <option value="cancelled">Đã hủy bỏ</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[8px] font-extrabold uppercase text-slate-400">Thời gian</label>
                      <input
                        type="datetime-local"
                        required
                        value={newDateTime}
                        onChange={(e) => setNewDateTime(e.target.value)}
                        className="mt-1 w-full bg-slate-800 text-white border border-slate-700 rounded px-1.5 py-1 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-extrabold uppercase text-slate-400">Chủ trì</label>
                      <select
                        value={newChair}
                        onChange={(e) => setNewChair(e.target.value)}
                        className="mt-1 w-full bg-slate-800 text-white border border-slate-700 rounded px-1.5 py-1 text-xs font-sans"
                      >
                        {USERS.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8px] font-extrabold uppercase text-slate-400">Thư ký</label>
                      <select
                        value={newSecretary}
                        onChange={(e) => setNewSecretary(e.target.value)}
                        className="mt-1 w-full bg-slate-800 text-white border border-slate-700 rounded px-1.5 py-1 text-xs font-sans"
                      >
                        {USERS.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] font-extrabold uppercase text-slate-400">Nội dung nghị sự (Agenda)</label>
                    <textarea
                      value={newAgenda}
                      onChange={(e) => setNewAgenda(e.target.value)}
                      rows={2}
                      className="mt-1 w-full bg-slate-800 text-white border border-slate-700 rounded px-2 py-1 text-[11px] leading-relaxed resize-y"
                    />
                  </div>
                </div>
              </form>
            ) : (
              <div className="bg-[#1e293b] text-white p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest leading-none">BIÊN BẢN HỌP GIAO BAN CHI TIẾT</span>
                    <h2 className="text-sm font-bold text-white mt-1 leading-tight">{activeMeeting.title}</h2>
                  </div>
                  
                  {/* Action row (Sửa & Xóa) */}
                  <div className="flex items-center gap-1.5">
                    {perms.canEditDetails && (
                      <button
                        type="button"
                        onClick={() => setIsEditingDetails(true)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 px-2 py-1 rounded cursor-pointer transition"
                      >
                        <Edit className="w-3.5 h-3.5 text-indigo-400" /> Sửa lịch họp
                      </button>
                    )}
                    {perms.canDelete && (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300 hover:text-white hover:bg-rose-900 bg-slate-800 border border-slate-700 px-2 py-1 rounded cursor-pointer transition"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Xóa cuộc họp
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-[11px] text-slate-300 border-t border-slate-700/60 pt-3">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Thời gian họp</span>
                    <span className="font-bold text-slate-100 font-mono">{new Date(activeMeeting.dateTime).toLocaleString('vi-VN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Phòng họp</span>
                    <span className="font-bold text-slate-100">{activeMeeting.venue}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Người chủ trì</span>
                    <span className="font-bold text-slate-100">{activeMeeting.chairperson}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Người Thư ký</span>
                    <span className="font-bold text-slate-100">{activeMeeting.secretary}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Deletion Warning Prompt popover/state overlay */}
            {showDeleteConfirm && (
              <div className="bg-rose-50 border-b border-rose-200 p-4 flex flex-col md:flex-row items-center justify-between gap-3 font-sans">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <h5 className="text-[11px] font-extrabold text-rose-900">Xác nhận xóa cuộc họp giao ban?</h5>
                    <p className="text-[10px] text-rose-700 mt-0.5">Hành động này sẽ xóa toàn bộ chương trình và các ghi chú số vĩnh viễn khỏi Express Server. Bạn có chắc chắn muốn tiếp tục?</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 text-[10px] font-bold px-3 py-1 rounded shadow-xs"
                  >
                    Hủy xóa
                  </button>
                  <button
                    onClick={handleDeleteActiveMeeting}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-3 py-1 rounded shadow-xs"
                  >
                    Đồng ý xóa
                  </button>
                </div>
              </div>
            )}

            {/* Agenda section */}
            <div className="p-3.5 border-b border-slate-150 bg-slate-50/50">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 leading-none">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                Nghị sự cuộc họp (Agenda)
              </h4>
              <p className="text-[11px] text-slate-700 mt-1 whitespace-pre-line leading-relaxed font-semibold">
                {activeMeeting.agenda}
              </p>
            </div>

            {/* Twin panels: Live Notes vs AI Minutes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-150 flex-1">
              
              {/* Box 1: Digital Notes (Ghi chú số RICH TEXT) */}
              <div className="p-4 flex flex-col space-y-3 min-h-[460px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <PenTool className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest leading-none">
                      Số tay ghi chép (Rich Editor)
                    </h4>
                  </div>
                  
                  {/* Editor view toggles */}
                  <div className="flex rounded-md p-0.5 bg-slate-100 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEditorTab('soanthao')}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer transition ${
                        editorTab === 'soanthao' ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Bảng soạn
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab('xemtruoc')}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer transition ${
                        editorTab === 'xemtruoc' ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Bản xem thử
                    </button>
                  </div>
                </div>

                {editorTab === 'soanthao' ? (
                  <div className="flex-1 flex flex-col space-y-2">
                    
                    {/* Rich text formatting bar (Định dạng & Chèn vật tư, Ảnh) */}
                    <div className="p-1.5 bg-slate-50 border border-slate-205 rounded-md flex flex-wrap items-center gap-1 text-slate-600 relative select-none">
                      
                      {/* Bold / Italic / Underline */}
                      <button
                        type="button"
                        onClick={() => insertFormat('**', '**')}
                        disabled={!perms.canSaveNotes}
                        className="p-1 hover:bg-white hover:text-indigo-600 rounded cursor-pointer border border-transparent hover:border-slate-200 disabled:opacity-40"
                        title="In đậm (CTRL+B)"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormat('*', '*')}
                        disabled={!perms.canSaveNotes}
                        className="p-1 hover:bg-white hover:text-indigo-600 rounded cursor-pointer border border-transparent hover:border-slate-200 disabled:opacity-40"
                        title="In nghiêng (CTRL+I)"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormat('<u>', '</u>')}
                        disabled={!perms.canSaveNotes}
                        className="p-1 hover:bg-white hover:text-indigo-600 rounded cursor-pointer border border-transparent hover:border-slate-200 disabled:opacity-40"
                        title="Gạch chân"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>

                      <div className="h-4 w-px bg-slate-200 mx-0.5" />

                      {/* Headings */}
                      <button
                        type="button"
                        onClick={() => insertFormat('\n# ', '')}
                        disabled={!perms.canSaveNotes}
                        className="p-1 hover:bg-white hover:text-indigo-600 rounded font-bold text-[10px] cursor-pointer border border-transparent hover:border-slate-200 disabled:opacity-40"
                        title="Tiêu đề lớn 1"
                      >
                        H1
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormat('\n## ', '')}
                        disabled={!perms.canSaveNotes}
                        className="p-1 hover:bg-white hover:text-indigo-600 rounded font-bold text-[10px] cursor-pointer border border-transparent hover:border-slate-200 disabled:opacity-40"
                        title="Tiêu đề lớn 2"
                      >
                        H2
                      </button>

                      <div className="h-4 w-px bg-slate-200 mx-0.5" />

                      {/* Checkboxes Checklist & Bullets */}
                      <button
                        type="button"
                        onClick={() => insertFormat('\n- [ ] ', '')}
                        disabled={!perms.canSaveNotes}
                        className="p-1 hover:bg-white hover:text-indigo-600 rounded cursor-pointer border border-transparent hover:border-slate-200 disabled:opacity-40 flex items-center gap-0.5"
                        title="Danh sách nhiệm vụ (Checklist)"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[8px] font-extrabold uppercase text-slate-555">Checklist</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => insertFormat('\n- ', '')}
                        disabled={!perms.canSaveNotes}
                        className="p-1 hover:bg-white hover:text-indigo-600 rounded cursor-pointer border border-transparent hover:border-slate-200 disabled:opacity-40"
                        title="Gạch đầu dòng"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>

                      <div className="h-4 w-px bg-slate-200 mx-0.5" />

                      {/* Quick Medical Templates Trigger */}
                      <div className="relative">
                        <button
                          type="button"
                          disabled={!perms.canSaveNotes}
                          onClick={() => {
                            setShowTemplateMenu(!showTemplateMenu);
                            setShowImagePresets(false);
                          }}
                          className="px-2 py-1 text-[8.5px] font-extrabold uppercase bg-slate-100 hover:bg-white text-indigo-700 rounded border border-slate-200 disabled:opacity-40 inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          Checklist Mẫu <ChevronDown className="w-2.5 h-2.5 pointer-events-none" />
                        </button>
                        
                        {showTemplateMenu && (
                          <div className="absolute top-7 left-0 z-30 w-56 bg-white border border-slate-210 rounded shadow-lg p-1 space-y-1">
                            <div className="p-1 text-[8px] font-extrabold uppercase text-slate-400 border-b border-slate-100">Chọn mẫu chuyên khoa</div>
                            {medicalChecklistTemplates.map((tpl, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  insertFormat(tpl.text, '');
                                  setShowTemplateMenu(false);
                                }}
                                className="w-full text-left p-1.5 hover:bg-indigo-50 text-[10px] font-semibold text-slate-700 rounded cursor-pointer transition block truncate"
                              >
                                {tpl.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Clinical Preset Images Trigger */}
                      <div className="relative">
                        <button
                          type="button"
                          disabled={!perms.canSaveNotes}
                          onClick={() => {
                            setShowImagePresets(!showImagePresets);
                            setShowTemplateMenu(false);
                          }}
                          className="px-2 py-1 text-[8.5px] font-extrabold uppercase bg-amber-50 hover:bg-amber-100 text-amber-700 rounded border border-amber-200 disabled:opacity-40 inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3 text-amber-600 shrink-0" /> Chèn ảnh y khoa <ChevronDown className="w-2.5 h-2.5 pointer-events-none" />
                        </button>

                        {showImagePresets && (
                          <div className="absolute top-7 left-0 z-40 w-64 bg-white border border-slate-200 rounded-lg shadow-xl p-2.5 space-y-2 max-h-80 overflow-y-auto">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                              <span className="text-[9px] font-extrabold uppercase text-slate-500">Chèn Bản Vụ Cận Lâm Sàng</span>
                              <button type="button" onClick={() => setShowImagePresets(false)} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
                            </div>
                            <p className="text-[8.5px] text-slate-400 leading-normal">Nhấp vào một mẫu ảnh lâm sàng thực tế để chèn vào vị trí nhập văn bản hiện tại:</p>
                            
                            <div className="grid grid-cols-2 gap-1.5">
                              {medicalImagePresets.map((img, index) => (
                                <div
                                  key={index}
                                  onClick={() => {
                                    insertFormat(`\n![${img.name}](${img.url})\n_${img.desc}_\n`, '');
                                    setShowImagePresets(false);
                                  }}
                                  className="border border-slate-200 rounded p-1 hover:border-indigo-500 hover:bg-indigo-50/20 cursor-pointer transition flex flex-col text-left space-y-1"
                                >
                                  <img referrerPolicy="no-referrer" src={img.url} alt={img.name} className="w-full h-12 object-cover rounded" />
                                  <span className="text-[8px] font-bold text-slate-800 truncate leading-none block">{img.name.replace('🖼️ ', '')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                    </div>

                    <textarea
                      id="digital-notes-textarea"
                      value={notesText}
                      onKeyDown={handleKeyDown}
                      onChange={(e) => setNotesText(e.target.value)}
                      onFocus={() => setIsNotesFocused(true)}
                      onBlur={() => setIsNotesFocused(false)}
                      disabled={!perms.canSaveNotes}
                      placeholder={
                        perms.canSaveNotes
                          ? "Ghi chép nhanh các quyết định y khoa, kiểm chuẩn trang thiết bị y tế hoặc ca bệnh khó... Sử dụng các công cụ định dạng ở trên để biên soạn ghi chú số hoặc chèn ảnh / checklist."
                          : "Bạn không có quyền sửa sổ tay ghi chép này. Chỉ Admin, người tạo, chủ trì mới được phép sửa."
                      }
                      className="w-full flex-1 border border-slate-205 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none min-h-[240px] leading-relaxed resize-none bg-slate-50/15 hover:bg-white focus:bg-white transition"
                    />

                    {perms.canSaveNotes && (
                      <div className="flex items-center gap-1.5 select-none pt-1">
                        <button
                          type="button"
                          onClick={handleSaveNotesOnly}
                          className={`flex-1 inline-flex items-center justify-center gap-1 px-4 py-1.5 rounded font-bold text-xs transition cursor-pointer border shadow-xs ${
                            notesSavedSuccess 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                              : 'bg-slate-100 hover:bg-slate-200 hover:text-indigo-950 text-slate-700 border-slate-210'
                          }`}
                        >
                          <CheckCircle className={`w-4 h-4 shrink-0 transition-transform duration-300 ${notesSavedSuccess ? 'text-emerald-600 scale-110' : 'text-slate-400'}`} />
                          {notesSavedSuccess ? '✓ Đã lưu thành công!' : 'Lưu Ghi Chú Số'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setNotesText(p => p + '\n\n**[Sự cố ghi nhận thêm]:** ');
                            insertFormat('', '');
                          }}
                          className="px-3 py-1.5 bg-slate-50 text-slate-655 font-bold hover:bg-slate-105 rounded text-xs border border-slate-200 shrink-0"
                        >
                          + Ghi nhận sự cố
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 border border-slate-205 rounded-lg p-3 bg-white overflow-y-auto max-h-[360px] shadow-inner text-slate-800 text-[11px] leading-relaxed markdown-container select-text prose prose-sm max-w-none">
                    {notesText ? (
                      <MarkdownRenderer content={notesText} />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center py-16 space-y-1 text-slate-400">
                        <PenTool className="w-5 h-5 text-slate-300" />
                        <p className="text-xs font-bold font-mono">Bản Xem Thử Trống</p>
                        <p className="text-[10px] text-slate-400">Hãy nhập ghi chép hoặc chèn ảnh cận lâm sàng ở tab 'Bảng soạn' để xem trước ở đây.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Automation trigger button */}
                <button
                  type="button"
                  onClick={triggerAIGenerate}
                  disabled={isGeneratingAI || !notesText}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-extrabold text-xs shadow-sm shadow-indigo-100 disabled:opacity-50 transition cursor-pointer"
                >
                  {isGeneratingAI ? (
                    <>
                      <Cpu className="w-4 h-4 animate-spin text-indigo-200" />
                      AI đang đồng bộ dữ liêu & tổng hợp...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      AI tự động hóa biên bản mẫu HIS
                    </>
                  )}
                </button>
              </div>

              {/* Box 2: Automated minutes (Biên bản AI) */}
              <div className="p-4 flex flex-col space-y-3 min-h-[460px] bg-slate-50/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest leading-none">
                      Biên bản hành chính (AI HIS)
                    </h4>
                  </div>
                  {activeMeeting.minutes && (
                    <button
                      onClick={copyMinutesToClipboard}
                      className="inline-flex items-center gap-1 text-[9px] font-extrabold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 rounded px-2 py-0.5 cursor-pointer transition"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          Đã sao chép
                        </>
                      ) : (
                        <>
                          <ClipboardCopy className="w-3 h-3" />
                          Sao chép sổ họp
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="border border-slate-205 bg-white rounded-lg p-3.5 flex-1 overflow-y-auto max-h-[380px] shadow-inner text-slate-800 text-[11px] leading-relaxed markdown-container font-medium">
                  {activeMeeting.minutes ? (
                    <MarkdownRenderer content={activeMeeting.minutes} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-16 space-y-1.5 select-none">
                      <Cpu className="w-6 h-6 text-slate-300" />
                      <p className="text-xs font-bold text-slate-500">Chưa tạo biên bản liên kết</p>
                      <p className="text-[10px] text-slate-400 px-4 leading-relaxed">Bộ não AI sẽ gộp số liệu chuyên môn ngày họp (kết xuất từ báo cáo khoa) cùng sổ tay ghi chép lâm sàng của bác sĩ để xuất chuẩn biểu mẫu nội quy ngành y.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg border border-slate-200/80 text-center text-slate-400 py-24 flex flex-col items-center gap-2 shadow-xs select-none">
            <Clock className="w-10 h-10 text-slate-200" />
            <h5 className="text-xs font-bold text-slate-500 font-sans">ỨNG DỤNG QUẢN LÝ GIAO BAN</h5>
            <p className="text-[10px] text-slate-405 leading-relaxed">Hãy lựa chọn một phiên sổ họp sẵn có ở cột trái, hoặc nhấp vào lệnh "Lên lịch họp" để tạo một phiên giao ban mới.</p>
          </div>
        )}
      </div>
    </div>
  );
}
