import { ReportItem, DailyReport, Meeting, Notification, User, CategoryInfo, PrintSettings } from './types';

export const CATEGORIES: CategoryInfo[] = [
  { key: 'sieuAm', name: 'Siêu Âm', color: 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200' },
  { key: 'noiSoi', name: 'Nội Soi', color: 'bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200' },
  { key: 'xQuang', name: 'X-quang', color: 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200' },
  { key: 'dienTimLHN', name: 'Điện tim & LHN', color: 'bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200' },
  { key: 'xetNghiem', name: 'Xét nghiệm', color: 'bg-cyan-100 border-cyan-300 text-cyan-800 hover:bg-cyan-200' },
];

export const USERS: User[] = [
  { id: 'u1', name: 'BS. Lê Minh Tâm', role: 'admin', email: 'tam.leminh@hospital.gov.vn', departmentName: 'Cơ xương khớp & Cận lâm sàng' },
  { id: 'u7', name: 'BS. CKII. Nguyễn Trọng Nhân', role: 'truongKhoa', email: 'nhan.nguyentrong@hospital.gov.vn', departmentName: 'Cơ xương khớp & Cận lâm sàng' },
  { id: 'u2', name: 'KTV. Nguyễn Văn Hùng', role: 'phoKhoa', email: 'hung.nguyenvan@hospital.gov.vn', departmentName: 'Phòng Siêu Âm' },
  { id: 'u3', name: 'BS. Trần Thị Mai', role: 'general', email: 'mai.tranthi@hospital.gov.vn', departmentName: 'Phòng Nội Soi' },
  { id: 'u4', name: 'BS. Hoàng Đức Toàn', role: 'phoKhoa', email: 'toan.hoangduc@hospital.gov.vn', departmentName: 'Phòng X-quang' },
  { id: 'u5', name: 'KTV. Phạm Lê Vy', role: 'general', email: 'vy.phamle@hospital.gov.vn', departmentName: 'Phòng Điện Tim & LHN' },
  { id: 'u6', name: 'BS. Thân Trọng Kha', role: 'general', email: 'kha.thantrong@hospital.gov.vn', departmentName: 'Khoa Xét Nghiệm' }
];

export const TEMPLATE_ITEMS: Omit<ReportItem, 'bh' | 'nd'>[] = [
  // Siêu Âm
  { id: 'sieuAm_tim', name: 'Siêu âm tim', category: 'sieuAm' },
  { id: 'sieuAm_mach', name: 'Siêu âm mạch', category: 'sieuAm' },
  { id: 'sieuAm_thai4d', name: 'Siêu âm thai 4D và đầu dò AD', category: 'sieuAm' },
  { id: 'sieuAm_tongquat', name: 'Siêu âm tổng quát', category: 'sieuAm' },
  { id: 'sieuAm_danHoi', name: 'Siêu âm đàn hồi mô', category: 'sieuAm' },
  { id: 'sieuAm_canThiep', name: 'Siêu âm can thiệp', category: 'sieuAm' },

  // Nội Soi
  { id: 'noiSoi_daDay', name: 'Nội soi dạ dày', category: 'noiSoi' },
  { id: 'noiSoi_daiTrucTrang', name: 'Nội soi đại trực tràng', category: 'noiSoi' },
  { id: 'noiSoi_trucTrang', name: 'Nội soi trực tràng', category: 'noiSoi' },
  { id: 'noiSoi_sigma', name: 'Nội soi đại tràng Sigma', category: 'noiSoi' },
  { id: 'noiSoi_thutThao', name: 'Thụt tháo', category: 'noiSoi' },
  { id: 'noiSoi_catPolyp', name: 'Cắt polyp', category: 'noiSoi' },
  { id: 'noiSoi_clotest', name: 'Clotest H.pylori', category: 'noiSoi' },
  { id: 'noiSoi_gayMeDaDayDaiTrang', name: 'Dịch vụ gây mê Dạ dày + Đại tràng', category: 'noiSoi' },
  { id: 'noiSoi_gayMeDon', name: 'Dịch vụ gây mê ( Đơn )', category: 'noiSoi' },

  // X quang
  { id: 'xQuang_thuong', name: 'X quang', category: 'xQuang' },
  { id: 'xQuang_dacBiet', name: 'Xquang đặc biệt', category: 'xQuang' },
  { id: 'xQuang_clvt', name: 'CLVT (CT-Scan)', category: 'xQuang' },

  // Điện tim & LHN
  { id: 'dienTim_thuong', name: 'Điện tim', category: 'dienTimLHN' },
  { id: 'dienTim_luuHuyetNao', name: 'Lưu huyết não', category: 'dienTimLHN' },

  // Xét nghiệm
  { id: 'xetNghiem_sinhHoa', name: 'Sinh hóa', category: 'xetNghiem' },
  { id: 'xetNghiem_huyetHoc', name: 'Huyết học', category: 'xetNghiem' },
  { id: 'xetNghiem_nuocTieu', name: 'Nước tiểu', category: 'xetNghiem' },
  { id: 'xetNghiem_viSinh', name: 'Vi sinh', category: 'xetNghiem' },
  { id: 'xetNghiem_mienDich', name: 'Miễn dịch', category: 'xetNghiem' },
  { id: 'xetNghiem_melatec', name: 'Gửi liên kết Melatec', category: 'xetNghiem' },
  { id: 'xetNghiem_hopeHpv', name: 'Gửi liên kết trung tâm Hope (HPV)', category: 'xetNghiem' },
  { id: 'xetNghiem_hopePap', name: 'Gửi liên kết trung tâm Hope (PaP)', category: 'xetNghiem' },
  { id: 'xetNghiem_teBao', name: 'Tế bào', category: 'xetNghiem' },
  { id: 'xetNghiem_thinPrep', name: 'Thin prep', category: 'xetNghiem' },
];

export function createEmptyReportItems(): ReportItem[] {
  return TEMPLATE_ITEMS.map(item => ({
    ...item,
    bh: 0,
    nd: 0,
  }));
}

// Seeding historic data for March 1 to March 17, 2026 as seen in the Excel sheet
export const SEED_REPORTS: DailyReport[] = [
  {
    date: '2026-03-01',
    status: 'approved',
    submittedBy: 'KTV. Nguyễn Văn Hùng',
    submittedAt: '2026-03-01T17:30:00Z',
    approvedBy: 'BS. Lê Minh Tâm',
    items: [
      { id: 'sieuAm_tim', name: 'Siêu âm tim', category: 'sieuAm', bh: 4, nd: 3 },
      { id: 'sieuAm_mach', name: 'Siêu âm mạch', category: 'sieuAm', bh: 4, nd: 1 },
      { id: 'sieuAm_thai4d', name: 'Siêu âm thai 4D và đầu dò AD', category: 'sieuAm', bh: 0, nd: 11 },
      { id: 'sieuAm_tongquat', name: 'Siêu âm tổng quát', category: 'sieuAm', bh: 113, nd: 43 },
      { id: 'sieuAm_danHoi', name: 'Siêu âm đàn hồi mô', category: 'sieuAm', bh: 0, nd: 0 },
      { id: 'sieuAm_canThiep', name: 'Siêu âm can thiệp', category: 'sieuAm', bh: 0, nd: 0 },
      
      { id: 'noiSoi_daDay', name: 'Nội soi dạ dày', category: 'noiSoi', bh: 20, nd: 1 },
      { id: 'noiSoi_daiTrucTrang', name: 'Nội soi đại trực tràng', category: 'noiSoi', bh: 11, nd: 0 },
      { id: 'noiSoi_trucTrang', name: 'Nội soi trực tràng', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_sigma', name: 'Nội soi đại tràng Sigma', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_thutThao', name: 'Thụt tháo', category: 'noiSoi', bh: 0, nd: 11 },
      { id: 'noiSoi_catPolyp', name: 'Cắt polyp', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_clotest', name: 'Clotest H.pylori', category: 'noiSoi', bh: 0, nd: 20 },
      { id: 'noiSoi_gayMeDaDayDaiTrang', name: 'Dịch vụ gây mê Dạ dày + Đại tràng', category: 'noiSoi', bh: 0, nd: 7 },
      { id: 'noiSoi_gayMeDon', name: 'Dịch vụ gây mê ( Đơn )', category: 'noiSoi', bh: 0, nd: 5 },

      { id: 'xQuang_thuong', name: 'X quang', category: 'xQuang', bh: 123, nd: 27 },
      { id: 'xQuang_dacBiet', name: 'Xquang đặc biệt', category: 'xQuang', bh: 0, nd: 0 },
      { id: 'xQuang_clvt', name: 'CLVT (CT-Scan)', category: 'xQuang', bh: 0, nd: 3 },

      { id: 'dienTim_thuong', name: 'Điện tim', category: 'dienTimLHN', bh: 19, nd: 0 },
      { id: 'dienTim_luuHuyetNao', name: 'Lưu huyết não', category: 'dienTimLHN', bh: 0, nd: 3 },

      { id: 'xetNghiem_sinhHoa', name: 'Sinh hóa', category: 'xetNghiem', bh: 395, nd: 268 },
      { id: 'xetNghiem_huyetHoc', name: 'Huyết học', category: 'xetNghiem', bh: 94, nd: 28 },
      { id: 'xetNghiem_nuocTieu', name: 'Nước tiểu', category: 'xetNghiem', bh: 42, nd: 22 },
      { id: 'xetNghiem_viSinh', name: 'Vi sinh', category: 'xetNghiem', bh: 12, nd: 94 },
      { id: 'xetNghiem_mienDich', name: 'Miễn dịch', category: 'xetNghiem', bh: 0, nd: 34 },
      { id: 'xetNghiem_melatec', name: 'Gửi liên kết Melatec', category: 'xetNghiem', bh: 0, nd: 13 },
      { id: 'xetNghiem_hopeHpv', name: 'Gửi liên kết trung tâm Hope (HPV)', category: 'xetNghiem', bh: 0, nd: 2 },
      { id: 'xetNghiem_hopePap', name: 'Gửi liên kết trung tâm Hope (PaP)', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_teBao', name: 'Tế bào', category: 'xetNghiem', bh: 0, nd: 2 },
      { id: 'xetNghiem_thinPrep', name: 'Thin prep', category: 'xetNghiem', bh: 0, nd: 0 },
    ]
  },
  {
    date: '2026-03-02',
    status: 'approved',
    submittedBy: 'KTV. Nguyễn Văn Hùng',
    submittedAt: '2026-03-02T17:15:00Z',
    approvedBy: 'BS. Lê Minh Tâm',
    items: [
      { id: 'sieuAm_tim', name: 'Siêu âm tim', category: 'sieuAm', bh: 17, nd: 4 },
      { id: 'sieuAm_mach', name: 'Siêu âm mạch', category: 'sieuAm', bh: 1, nd: 1 },
      { id: 'sieuAm_thai4d', name: 'Siêu âm thai 4D và đầu dò AD', category: 'sieuAm', bh: 0, nd: 12 },
      { id: 'sieuAm_tongquat', name: 'Siêu âm tổng quát', category: 'sieuAm', bh: 133, nd: 9 },
      { id: 'sieuAm_danHoi', name: 'Siêu âm đàn hồi mô', category: 'sieuAm', bh: 0, nd: 0 },
      { id: 'sieuAm_canThiep', name: 'Siêu âm can thiệp', category: 'sieuAm', bh: 0, nd: 0 },
      
      { id: 'noiSoi_daDay', name: 'Nội soi dạ dày', category: 'noiSoi', bh: 16, nd: 0 },
      { id: 'noiSoi_daiTrucTrang', name: 'Nội soi đại trực tràng', category: 'noiSoi', bh: 6, nd: 0 },
      { id: 'noiSoi_trucTrang', name: 'Nội soi trực tràng', category: 'noiSoi', bh: 2, nd: 0 },
      { id: 'noiSoi_sigma', name: 'Nội soi đại tràng Sigma', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_thutThao', name: 'Thụt tháo', category: 'noiSoi', bh: 0, nd: 8 },
      { id: 'noiSoi_catPolyp', name: 'Cắt polyp', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_clotest', name: 'Clotest H.pylori', category: 'noiSoi', bh: 0, nd: 16 },
      { id: 'noiSoi_gayMeDaDayDaiTrang', name: 'Dịch vụ gây mê Dạ dày + Đại tràng', category: 'noiSoi', bh: 0, nd: 5 },
      { id: 'noiSoi_gayMeDon', name: 'Dịch vụ gây mê ( Đơn )', category: 'noiSoi', bh: 0, nd: 3 },

      { id: 'xQuang_thuong', name: 'X quang', category: 'xQuang', bh: 138, nd: 29 },
      { id: 'xQuang_dacBiet', name: 'Xquang đặc biệt', category: 'xQuang', bh: 0, nd: 0 },
      { id: 'xQuang_clvt', name: 'CLVT (CT-Scan)', category: 'xQuang', bh: 0, nd: 7 },

      { id: 'dienTim_thuong', name: 'Điện tim', category: 'dienTimLHN', bh: 48, nd: 0 },
      { id: 'dienTim_luuHuyetNao', name: 'Lưu huyết não', category: 'dienTimLHN', bh: 0, nd: 7 },

      { id: 'xetNghiem_sinhHoa', name: 'Sinh hóa', category: 'xetNghiem', bh: 497, nd: 250 },
      { id: 'xetNghiem_huyetHoc', name: 'Huyết học', category: 'xetNghiem', bh: 89, nd: 31 },
      { id: 'xetNghiem_nuocTieu', name: 'Nước tiểu', category: 'xetNghiem', bh: 55, nd: 27 },
      { id: 'xetNghiem_viSinh', name: 'Vi sinh', category: 'xetNghiem', bh: 7, nd: 115 },
      { id: 'xetNghiem_mienDich', name: 'Miễn dịch', category: 'xetNghiem', bh: 0, nd: 3 },
      { id: 'xetNghiem_melatec', name: 'Gửi liên kết Melatec', category: 'xetNghiem', bh: 0, nd: 9 },
      { id: 'xetNghiem_hopeHpv', name: 'Gửi liên kết trung tâm Hope (HPV)', category: 'xetNghiem', bh: 0, nd: 3 },
      { id: 'xetNghiem_hopePap', name: 'Gửi liên kết trung tâm Hope (PaP)', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_teBao', name: 'Tế bào', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_thinPrep', name: 'Thin prep', category: 'xetNghiem', bh: 0, nd: 0 },
    ]
  },
  {
    date: '2026-03-03',
    status: 'approved',
    submittedBy: 'KTV. Nguyễn Văn Hùng',
    submittedAt: '2026-03-03T17:10:00Z',
    approvedBy: 'BS. Lê Minh Tâm',
    items: [
      { id: 'sieuAm_tim', name: 'Siêu âm tim', category: 'sieuAm', bh: 18, nd: 4 },
      { id: 'sieuAm_mach', name: 'Siêu âm mạch', category: 'sieuAm', bh: 1, nd: 1 },
      { id: 'sieuAm_thai4d', name: 'Siêu âm thai 4D và đầu dò AD', category: 'sieuAm', bh: 0, nd: 7 },
      { id: 'sieuAm_tongquat', name: 'Siêu âm tổng quát', category: 'sieuAm', bh: 93, nd: 11 },
      { id: 'sieuAm_danHoi', name: 'Siêu âm đàn hồi mô', category: 'sieuAm', bh: 0, nd: 0 },
      { id: 'sieuAm_canThiep', name: 'Siêu âm can thiệp', category: 'sieuAm', bh: 0, nd: 0 },
      
      { id: 'noiSoi_daDay', name: 'Nội soi dạ dày', category: 'noiSoi', bh: 6, nd: 0 },
      { id: 'noiSoi_daiTrucTrang', name: 'Nội soi đại trực tràng', category: 'noiSoi', bh: 1, nd: 0 },
      { id: 'noiSoi_trucTrang', name: 'Nội soi trực tràng', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_sigma', name: 'Nội soi đại tràng Sigma', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_thutThao', name: 'Thụt tháo', category: 'noiSoi', bh: 0, nd: 1 },
      { id: 'noiSoi_catPolyp', name: 'Cắt polyp', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_clotest', name: 'Clotest H.pylori', category: 'noiSoi', bh: 0, nd: 5 },
      { id: 'noiSoi_gayMeDaDayDaiTrang', name: 'Dịch vụ gây mê Dạ dày + Đại tràng', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_gayMeDon', name: 'Dịch vụ gây mê ( Đơn )', category: 'noiSoi', bh: 0, nd: 2 },

      { id: 'xQuang_thuong', name: 'X quang', category: 'xQuang', bh: 103, nd: 31 },
      { id: 'xQuang_dacBiet', name: 'Xquang đặc biệt', category: 'xQuang', bh: 0, nd: 0 },
      { id: 'xQuang_clvt', name: 'CLVT (CT-Scan)', category: 'xQuang', bh: 0, nd: 2 },

      { id: 'dienTim_thuong', name: 'Điện tim', category: 'dienTimLHN', bh: 45, nd: 0 },
      { id: 'dienTim_luuHuyetNao', name: 'Lưu huyết não', category: 'dienTimLHN', bh: 0, nd: 3 },

      { id: 'xetNghiem_sinhHoa', name: 'Sinh hóa', category: 'xetNghiem', bh: 428, nd: 217 },
      { id: 'xetNghiem_huyetHoc', name: 'Huyết học', category: 'xetNghiem', bh: 74, nd: 31 },
      { id: 'xetNghiem_nuocTieu', name: 'Nước tiểu', category: 'xetNghiem', bh: 50, nd: 24 },
      { id: 'xetNghiem_viSinh', name: 'Vi sinh', category: 'xetNghiem', bh: 4, nd: 84 },
      { id: 'xetNghiem_mienDich', name: 'Miễn dịch', category: 'xetNghiem', bh: 0, nd: 11 },
      { id: 'xetNghiem_melatec', name: 'Gửi liên kết Melatec', category: 'xetNghiem', bh: 0, nd: 5 },
      { id: 'xetNghiem_hopeHpv', name: 'Gửi liên kết trung tâm Hope (HPV)', category: 'xetNghiem', bh: 0, nd: 3 },
      { id: 'xetNghiem_hopePap', name: 'Gửi liên kết trung tâm Hope (PaP)', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_teBao', name: 'Tế bào', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_thinPrep', name: 'Thin prep', category: 'xetNghiem', bh: 0, nd: 0 },
    ]
  },
  {
    date: '2026-03-04',
    status: 'approved',
    submittedBy: 'KTV. Nguyễn Văn Hùng',
    submittedAt: '2026-03-04T17:22:00Z',
    approvedBy: 'BS. Lê Minh Tâm',
    items: [
      { id: 'sieuAm_tim', name: 'Siêu âm tim', category: 'sieuAm', bh: 16, nd: 4 },
      { id: 'sieuAm_mach', name: 'Siêu âm mạch', category: 'sieuAm', bh: 2, nd: 1 },
      { id: 'sieuAm_thai4d', name: 'Siêu âm thai 4D và đầu dò AD', category: 'sieuAm', bh: 0, nd: 9 },
      { id: 'sieuAm_tongquat', name: 'Siêu âm tổng quát', category: 'sieuAm', bh: 116, nd: 17 },
      { id: 'sieuAm_danHoi', name: 'Siêu âm đàn hồi mô', category: 'sieuAm', bh: 0, nd: 0 },
      { id: 'sieuAm_canThiep', name: 'Siêu âm can thiệp', category: 'sieuAm', bh: 0, nd: 0 },
      
      { id: 'noiSoi_daDay', name: 'Nội soi dạ dày', category: 'noiSoi', bh: 10, nd: 3 },
      { id: 'noiSoi_daiTrucTrang', name: 'Nội soi đại trực tràng', category: 'noiSoi', bh: 5, nd: 0 },
      { id: 'noiSoi_trucTrang', name: 'Nội soi trực tràng', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_sigma', name: 'Nội soi đại tràng Sigma', category: 'noiSoi', bh: 1, nd: 0 },
      { id: 'noiSoi_thutThao', name: 'Thụt tháo', category: 'noiSoi', bh: 0, nd: 5 },
      { id: 'noiSoi_catPolyp', name: 'Cắt polyp', category: 'noiSoi', bh: 0, nd: 1 },
      { id: 'noiSoi_clotest', name: 'Clotest H.pylori', category: 'noiSoi', bh: 0, nd: 12 },
      { id: 'noiSoi_gayMeDaDayDaiTrang', name: 'Dịch vụ gây mê Dạ dày + Đại tràng', category: 'noiSoi', bh: 0, nd: 3 },
      { id: 'noiSoi_gayMeDon', name: 'Dịch vụ gây mê ( Đơn )', category: 'noiSoi', bh: 0, nd: 4 },

      { id: 'xQuang_thuong', name: 'X quang', category: 'xQuang', bh: 124, nd: 30 },
      { id: 'xQuang_dacBiet', name: 'Xquang đặc biệt', category: 'xQuang', bh: 0, nd: 0 },
      { id: 'xQuang_clvt', name: 'CLVT (CT-Scan)', category: 'xQuang', bh: 0, nd: 6 },

      { id: 'dienTim_thuong', name: 'Điện tim', category: 'dienTimLHN', bh: 58, nd: 0 },
      { id: 'dienTim_luuHuyetNao', name: 'Lưu huyết não', category: 'dienTimLHN', bh: 0, nd: 5 },

      { id: 'xetNghiem_sinhHoa', name: 'Sinh hóa', category: 'xetNghiem', bh: 487, nd: 263 },
      { id: 'xetNghiem_huyetHoc', name: 'Huyết học', category: 'xetNghiem', bh: 108, nd: 36 },
      { id: 'xetNghiem_nuocTieu', name: 'Nước tiểu', category: 'xetNghiem', bh: 61, nd: 33 },
      { id: 'xetNghiem_viSinh', name: 'Vi sinh', category: 'xetNghiem', bh: 6, nd: 76 },
      { id: 'xetNghiem_mienDich', name: 'Miễn dịch', category: 'xetNghiem', bh: 0, nd: 12 },
      { id: 'xetNghiem_melatec', name: 'Gửi liên kết Melatec', category: 'xetNghiem', bh: 0, nd: 4 },
      { id: 'xetNghiem_hopeHpv', name: 'Gửi liên kết trung tâm Hope (HPV)', category: 'xetNghiem', bh: 0, nd: 2 },
      { id: 'xetNghiem_hopePap', name: 'Gửi liên kết trung tâm Hope (PaP)', category: 'xetNghiem', bh: 0, nd: 2 },
      { id: 'xetNghiem_teBao', name: 'Tế bào', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_thinPrep', name: 'Thin prep', category: 'xetNghiem', bh: 0, nd: 2 },
    ]
  },
  {
    date: '2026-03-05',
    status: 'approved',
    submittedBy: 'KTV. Nguyễn Văn Hùng',
    submittedAt: '2026-03-05T17:05:00Z',
    approvedBy: 'BS. Lê Minh Tâm',
    items: [
      { id: 'sieuAm_tim', name: 'Siêu âm tim', category: 'sieuAm', bh: 22, nd: 1 },
      { id: 'sieuAm_mach', name: 'Siêu âm mạch', category: 'sieuAm', bh: 1, nd: 1 },
      { id: 'sieuAm_thai4d', name: 'Siêu âm thai 4D và đầu dò AD', category: 'sieuAm', bh: 0, nd: 10 },
      { id: 'sieuAm_tongquat', name: 'Siêu âm tổng quát', category: 'sieuAm', bh: 130, nd: 23 },
      { id: 'sieuAm_danHoi', name: 'Siêu âm đàn hồi mô', category: 'sieuAm', bh: 0, nd: 0 },
      { id: 'sieuAm_canThiep', name: 'Siêu âm can thiệp', category: 'sieuAm', bh: 0, nd: 0 },
      
      { id: 'noiSoi_daDay', name: 'Nội soi dạ dày', category: 'noiSoi', bh: 4, nd: 3 },
      { id: 'noiSoi_daiTrucTrang', name: 'Nội soi đại trực tràng', category: 'noiSoi', bh: 2, nd: 0 },
      { id: 'noiSoi_trucTrang', name: 'Nội soi trực tràng', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_sigma', name: 'Nội soi đại tràng Sigma', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_thutThao', name: 'Thụt tháo', category: 'noiSoi', bh: 0, nd: 2 },
      { id: 'noiSoi_catPolyp', name: 'Cắt polyp', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_clotest', name: 'Clotest H.pylori', category: 'noiSoi', bh: 0, nd: 12 },
      { id: 'noiSoi_gayMeDaDayDaiTrang', name: 'Dịch vụ gây mê Dạ dày + Đại tràng', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_gayMeDon', name: 'Dịch vụ gây mê ( Đơn )', category: 'noiSoi', bh: 0, nd: 4 },

      { id: 'xQuang_thuong', name: 'X quang', category: 'xQuang', bh: 114, nd: 31 },
      { id: 'xQuang_dacBiet', name: 'Xquang đặc biệt', category: 'xQuang', bh: 0, nd: 0 },
      { id: 'xQuang_clvt', name: 'CLVT (CT-Scan)', category: 'xQuang', bh: 0, nd: 5 },

      { id: 'dienTim_thuong', name: 'Điện tim', category: 'dienTimLHN', bh: 55, nd: 0 },
      { id: 'dienTim_luuHuyetNao', name: 'Lưu huyết não', category: 'dienTimLHN', bh: 0, nd: 5 },

      { id: 'xetNghiem_sinhHoa', name: 'Sinh hóa', category: 'xetNghiem', bh: 484, nd: 203 },
      { id: 'xetNghiem_huyetHoc', name: 'Huyết học', category: 'xetNghiem', bh: 83, nd: 26 },
      { id: 'xetNghiem_nuocTieu', name: 'Nước tiểu', category: 'xetNghiem', bh: 55, nd: 23 },
      { id: 'xetNghiem_viSinh', name: 'Vi sinh', category: 'xetNghiem', bh: 3, nd: 73 },
      { id: 'xetNghiem_mienDich', name: 'Miễn dịch', category: 'xetNghiem', bh: 0, nd: 7 },
      { id: 'xetNghiem_melatec', name: 'Gửi liên kết Melatec', category: 'xetNghiem', bh: 0, nd: 10 },
      { id: 'xetNghiem_hopeHpv', name: 'Gửi liên kết trung tâm Hope (HPV)', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_hopePap', name: 'Gửi liên kết trung tâm Hope (PaP)', category: 'xetNghiem', bh: 0, nd: 1 },
      { id: 'xetNghiem_teBao', name: 'Tế bào', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_thinPrep', name: 'Thin prep', category: 'xetNghiem', bh: 0, nd: 2 },
    ]
  },
  {
    date: '2026-03-06',
    status: 'approved',
    submittedBy: 'KTV. Nguyễn Văn Hùng',
    submittedAt: '2026-03-06T17:10:00Z',
    approvedBy: 'BS. Lê Minh Tâm',
    items: [
      { id: 'sieuAm_tim', name: 'Siêu âm tim', category: 'sieuAm', bh: 18, nd: 1 },
      { id: 'sieuAm_mach', name: 'Siêu âm mạch', category: 'sieuAm', bh: 2, nd: 0 },
      { id: 'sieuAm_thai4d', name: 'Siêu âm thai 4D và đầu dò AD', category: 'sieuAm', bh: 0, nd: 8 },
      { id: 'sieuAm_tongquat', name: 'Siêu âm tổng quát', category: 'sieuAm', bh: 122, nd: 8 },
      { id: 'sieuAm_danHoi', name: 'Siêu âm đàn hồi mô', category: 'sieuAm', bh: 0, nd: 0 },
      { id: 'sieuAm_canThiep', name: 'Siêu âm can thiệp', category: 'sieuAm', bh: 0, nd: 0 },
      
      { id: 'noiSoi_daDay', name: 'Nội soi dạ dày', category: 'noiSoi', bh: 8, nd: 1 },
      { id: 'noiSoi_daiTrucTrang', name: 'Nội soi đại trực tràng', category: 'noiSoi', bh: 4, nd: 1 },
      { id: 'noiSoi_trucTrang', name: 'Nội soi trực tràng', category: 'noiSoi', bh: 5, nd: 0 },
      { id: 'noiSoi_sigma', name: 'Nội soi đại tràng Sigma', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_thutThao', name: 'Thụt tháo', category: 'noiSoi', bh: 0, nd: 9 },
      { id: 'noiSoi_catPolyp', name: 'Cắt polyp', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_clotest', name: 'Clotest H.pylori', category: 'noiSoi', bh: 0, nd: 9 },
      { id: 'noiSoi_gayMeDaDayDaiTrang', name: 'Dịch vụ gây mê Dạ dày + Đại tràng', category: 'noiSoi', bh: 0, nd: 2 },
      { id: 'noiSoi_gayMeDon', name: 'Dịch vụ gây mê ( Đơn )', category: 'noiSoi', bh: 0, nd: 1 },

      { id: 'xQuang_thuong', name: 'X quang', category: 'xQuang', bh: 139, nd: 29 },
      { id: 'xQuang_dacBiet', name: 'Xquang đặc biệt', category: 'xQuang', bh: 0, nd: 0 },
      { id: 'xQuang_clvt', name: 'CLVT (CT-Scan)', category: 'xQuang', bh: 0, nd: 8 },

      { id: 'dienTim_thuong', name: 'Điện tim', category: 'dienTimLHN', bh: 68, nd: 0 },
      { id: 'dienTim_luuHuyetNao', name: 'Lưu huyết não', category: 'dienTimLHN', bh: 0, nd: 7 },

      { id: 'xetNghiem_sinhHoa', name: 'Sinh hóa', category: 'xetNghiem', bh: 552, nd: 227 },
      { id: 'xetNghiem_huyetHoc', name: 'Huyết học', category: 'xetNghiem', bh: 105, nd: 34 },
      { id: 'xetNghiem_nuocTieu', name: 'Nước tiểu', category: 'xetNghiem', bh: 72, nd: 25 },
      { id: 'xetNghiem_viSinh', name: 'Vi sinh', category: 'xetNghiem', bh: 6, nd: 74 },
      { id: 'xetNghiem_mienDich', name: 'Miễn dịch', category: 'xetNghiem', bh: 0, nd: 4 },
      { id: 'xetNghiem_melatec', name: 'Gửi liên kết Melatec', category: 'xetNghiem', bh: 0, nd: 5 },
      { id: 'xetNghiem_hopeHpv', name: 'Gửi liên kết trung tâm Hope (HPV)', category: 'xetNghiem', bh: 0, nd: 3 },
      { id: 'xetNghiem_hopePap', name: 'Gửi liên kết trung tâm Hope (PaP)', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_teBao', name: 'Tế bào', category: 'xetNghiem', bh: 0, nd: 1 },
      { id: 'xetNghiem_thinPrep', name: 'Thin prep', category: 'xetNghiem', bh: 0, nd: 1 },
    ]
  },
  {
    date: '2026-03-07',
    status: 'approved',
    submittedBy: 'KTV. Nguyễn Văn Hùng',
    submittedAt: '2026-03-07T17:40:00Z',
    approvedBy: 'BS. Lê Minh Tâm',
    items: [
      { id: 'sieuAm_tim', name: 'Siêu âm tim', category: 'sieuAm', bh: 12, nd: 3 },
      { id: 'sieuAm_mach', name: 'Siêu âm mạch', category: 'sieuAm', bh: 1, nd: 0 },
      { id: 'sieuAm_thai4d', name: 'Siêu âm thai 4D và đầu dò AD', category: 'sieuAm', bh: 0, nd: 6 },
      { id: 'sieuAm_tongquat', name: 'Siêu âm tổng quát', category: 'sieuAm', bh: 104, nd: 28 },
      { id: 'sieuAm_danHoi', name: 'Siêu âm đàn hồi mô', category: 'sieuAm', bh: 0, nd: 0 },
      { id: 'sieuAm_canThiep', name: 'Siêu âm can thiệp', category: 'sieuAm', bh: 0, nd: 0 },
      
      { id: 'noiSoi_daDay', name: 'Nội soi dạ dày', category: 'noiSoi', bh: 9, nd: 0 },
      { id: 'noiSoi_daiTrucTrang', name: 'Nội soi đại trực tràng', category: 'noiSoi', bh: 4, nd: 0 },
      { id: 'noiSoi_trucTrang', name: 'Nội soi trực tràng', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_sigma', name: 'Nội soi đại tràng Sigma', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_thutThao', name: 'Thụt tháo', category: 'noiSoi', bh: 0, nd: 3 },
      { id: 'noiSoi_catPolyp', name: 'Cắt polyp', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_clotest', name: 'Clotest H.pylori', category: 'noiSoi', bh: 0, nd: 9 },
      { id: 'noiSoi_gayMeDaDayDaiTrang', name: 'Dịch vụ gây mê Dạ dày + Đại tràng', category: 'noiSoi', bh: 0, nd: 3 },
      { id: 'noiSoi_gayMeDon', name: 'Dịch vụ gây mê ( Đơn )', category: 'noiSoi', bh: 0, nd: 1 },

      { id: 'xQuang_thuong', name: 'X quang', category: 'xQuang', bh: 123, nd: 18 },
      { id: 'xQuang_dacBiet', name: 'Xquang đặc biệt', category: 'xQuang', bh: 0, nd: 0 },
      { id: 'xQuang_clvt', name: 'CLVT (CT-Scan)', category: 'xQuang', bh: 0, nd: 6 },

      { id: 'dienTim_thuong', name: 'Điện tim', category: 'dienTimLHN', bh: 46, nd: 0 },
      { id: 'dienTim_luuHuyetNao', name: 'Lưu huyết não', category: 'dienTimLHN', bh: 0, nd: 5 },

      { id: 'xetNghiem_sinhHoa', name: 'Sinh hóa', category: 'xetNghiem', bh: 450, nd: 177 },
      { id: 'xetNghiem_huyetHoc', name: 'Huyết học', category: 'xetNghiem', bh: 79, nd: 18 },
      { id: 'xetNghiem_nuocTieu', name: 'Nước tiểu', category: 'xetNghiem', bh: 48, nd: 13 },
      { id: 'xetNghiem_viSinh', name: 'Vi sinh', category: 'xetNghiem', bh: 6, nd: 63 },
      { id: 'xetNghiem_mienDich', name: 'Miễn dịch', category: 'xetNghiem', bh: 0, nd: 10 },
      { id: 'xetNghiem_melatec', name: 'Gửi liên kết Melatec', category: 'xetNghiem', bh: 0, nd: 5 },
      { id: 'xetNghiem_hopeHpv', name: 'Gửi liên kết trung tâm Hope (HPV)', category: 'xetNghiem', bh: 0, nd: 3 },
      { id: 'xetNghiem_hopePap', name: 'Gửi liên kết trung tâm Hope (PaP)', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_teBao', name: 'Tế bào', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_thinPrep', name: 'Thin prep', category: 'xetNghiem', bh: 0, nd: 3 },
    ]
  },
  {
    date: '2026-03-08',
    status: 'approved',
    submittedBy: 'KTV. Nguyễn Văn Hùng',
    submittedAt: '2026-03-08T17:15:00Z',
    approvedBy: 'BS. Lê Minh Tâm',
    items: [
      { id: 'sieuAm_tim', name: 'Siêu âm tim', category: 'sieuAm', bh: 1, nd: 5 },
      { id: 'sieuAm_mach', name: 'Siêu âm mạch', category: 'sieuAm', bh: 1, nd: 1 },
      { id: 'sieuAm_thai4d', name: 'Siêu âm thai 4D và đầu dò AD', category: 'sieuAm', bh: 0, nd: 14 },
      { id: 'sieuAm_tongquat', name: 'Siêu âm tổng quát', category: 'sieuAm', bh: 100, nd: 48 },
      { id: 'sieuAm_danHoi', name: 'Siêu âm đàn hồi mô', category: 'sieuAm', bh: 0, nd: 2 },
      { id: 'sieuAm_canThiep', name: 'Siêu âm can thiệp', category: 'sieuAm', bh: 0, nd: 0 },
      
      { id: 'noiSoi_daDay', name: 'Nội soi dạ dày', category: 'noiSoi', bh: 15, nd: 0 },
      { id: 'noiSoi_daiTrucTrang', name: 'Nội soi đại trực tràng', category: 'noiSoi', bh: 8, nd: 0 },
      { id: 'noiSoi_trucTrang', name: 'Nội soi trực tràng', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_sigma', name: 'Nội soi đại tràng Sigma', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_thutThao', name: 'Thụt tháo', category: 'noiSoi', bh: 0, nd: 8 },
      { id: 'noiSoi_catPolyp', name: 'Cắt polyp', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_clotest', name: 'Clotest H.pylori', category: 'noiSoi', bh: 0, nd: 15 },
      { id: 'noiSoi_gayMeDaDayDaiTrang', name: 'Dịch vụ gây mê Dạ dày + Đại tràng', category: 'noiSoi', bh: 0, nd: 4 },
      { id: 'noiSoi_gayMeDon', name: 'Dịch vụ gây mê ( Đơn )', category: 'noiSoi', bh: 0, nd: 5 },

      { id: 'xQuang_thuong', name: 'X quang', category: 'xQuang', bh: 109, nd: 17 },
      { id: 'xQuang_dacBiet', name: 'Xquang đặc biệt', category: 'xQuang', bh: 0, nd: 0 },
      { id: 'xQuang_clvt', name: 'CLVT (CT-Scan)', category: 'xQuang', bh: 0, nd: 6 },

      { id: 'dienTim_thuong', name: 'Điện tim', category: 'dienTimLHN', bh: 23, nd: 0 },
      { id: 'dienTim_luuHuyetNao', name: 'Lưu huyết não', category: 'dienTimLHN', bh: 0, nd: 7 },

      { id: 'xetNghiem_sinhHoa', name: 'Sinh hóa', category: 'xetNghiem', bh: 238, nd: 212 },
      { id: 'xetNghiem_huyetHoc', name: 'Huyết học', category: 'xetNghiem', bh: 70, nd: 33 },
      { id: 'xetNghiem_nuocTieu', name: 'Nước tiểu', category: 'xetNghiem', bh: 36, nd: 15 },
      { id: 'xetNghiem_viSinh', name: 'Vi sinh', category: 'xetNghiem', bh: 11, nd: 61 },
      { id: 'xetNghiem_mienDich', name: 'Miễn dịch', category: 'xetNghiem', bh: 0, nd: 13 },
      { id: 'xetNghiem_melatec', name: 'Gửi liên kết Melatec', category: 'xetNghiem', bh: 0, nd: 16 },
      { id: 'xetNghiem_hopeHpv', name: 'Gửi liên kết trung tâm Hope (HPV)', category: 'xetNghiem', bh: 0, nd: 3 },
      { id: 'xetNghiem_hopePap', name: 'Gửi liên kết trung tâm Hope (PaP)', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_teBao', name: 'Tế bào', category: 'xetNghiem', bh: 0, nd: 1 },
      { id: 'xetNghiem_thinPrep', name: 'Thin prep', category: 'xetNghiem', bh: 0, nd: 7 },
    ]
  },
  {
    date: '2026-03-09',
    status: 'approved',
    submittedBy: 'BS. Trần Thị Mai',
    submittedAt: '2026-03-09T17:28:00Z',
    approvedBy: 'BS. Lê Minh Tâm',
    items: [
      { id: 'sieuAm_tim', name: 'Siêu âm tim', category: 'sieuAm', bh: 27, nd: 4 },
      { id: 'sieuAm_mach', name: 'Siêu âm mạch', category: 'sieuAm', bh: 1, nd: 2 },
      { id: 'sieuAm_thai4d', name: 'Siêu âm thai 4D và đầu dò AD', category: 'sieuAm', bh: 0, nd: 10 },
      { id: 'sieuAm_tongquat', name: 'Siêu âm tổng quát', category: 'sieuAm', bh: 117, nd: 30 },
      { id: 'sieuAm_danHoi', name: 'Siêu âm đàn hồi mô', category: 'sieuAm', bh: 0, nd: 2 },
      { id: 'sieuAm_canThiep', name: 'Siêu âm can thiệp', category: 'sieuAm', bh: 0, nd: 0 },
      
      { id: 'noiSoi_daDay', name: 'Nội soi dạ dày', category: 'noiSoi', bh: 12, nd: 0 },
      { id: 'noiSoi_daiTrucTrang', name: 'Nội soi đại trực tràng', category: 'noiSoi', bh: 1, nd: 0 },
      { id: 'noiSoi_trucTrang', name: 'Nội soi trực tràng', category: 'noiSoi', bh: 1, nd: 0 },
      { id: 'noiSoi_sigma', name: 'Nội soi đại tràng Sigma', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_thutThao', name: 'Thụt tháo', category: 'noiSoi', bh: 0, nd: 3 },
      { id: 'noiSoi_catPolyp', name: 'Cắt polyp', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_clotest', name: 'Clotest H.pylori', category: 'noiSoi', bh: 0, nd: 12 },
      { id: 'noiSoi_gayMeDaDayDaiTrang', name: 'Dịch vụ gây mê Dạ dày + Đại tràng', category: 'noiSoi', bh: 0, nd: 1 },
      { id: 'noiSoi_gayMeDon', name: 'Dịch vụ gây mê ( Đơn )', category: 'noiSoi', bh: 0, nd: 3 },

      { id: 'xQuang_thuong', name: 'X quang', category: 'xQuang', bh: 140, nd: 30 },
      { id: 'xQuang_dacBiet', name: 'Xquang đặc biệt', category: 'xQuang', bh: 0, nd: 0 },
      { id: 'xQuang_clvt', name: 'CLVT (CT-Scan)', category: 'xQuang', bh: 0, nd: 8 },

      { id: 'dienTim_thuong', name: 'Điện tim', category: 'dienTimLHN', bh: 58, nd: 0 },
      { id: 'dienTim_luuHuyetNao', name: 'Lưu huyết não', category: 'dienTimLHN', bh: 0, nd: 6 },

      { id: 'xetNghiem_sinhHoa', name: 'Sinh hóa', category: 'xetNghiem', bh: 536, nd: 215 },
      { id: 'xetNghiem_huyetHoc', name: 'Huyết học', category: 'xetNghiem', bh: 100, nd: 22 },
      { id: 'xetNghiem_nuocTieu', name: 'Nước tiểu', category: 'xetNghiem', bh: 68, nd: 14 },
      { id: 'xetNghiem_viSinh', name: 'Vi sinh', category: 'xetNghiem', bh: 8, nd: 69 },
      { id: 'xetNghiem_mienDich', name: 'Miễn dịch', category: 'xetNghiem', bh: 0, nd: 9 },
      { id: 'xetNghiem_melatec', name: 'Gửi liên kết Melatec', category: 'xetNghiem', bh: 0, nd: 4 },
      { id: 'xetNghiem_hopeHpv', name: 'Gửi liên kết trung tâm Hope (HPV)', category: 'xetNghiem', bh: 0, nd: 1 },
      { id: 'xetNghiem_hopePap', name: 'Gửi liên kết trung tâm Hope (PaP)', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_teBao', name: 'Tế bào', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_thinPrep', name: 'Thin prep', category: 'xetNghiem', bh: 0, nd: 1 },
    ]
  },
  {
    date: '2026-03-10',
    status: 'approved',
    submittedBy: 'BS. Hoàng Đức Toàn',
    submittedAt: '2026-03-10T17:15:00Z',
    approvedBy: 'BS. Lê Minh Tâm',
    items: [
      { id: 'sieuAm_tim', name: 'Siêu âm tim', category: 'sieuAm', bh: 16, nd: 1 },
      { id: 'sieuAm_mach', name: 'Siêu âm mạch', category: 'sieuAm', bh: 2, nd: 0 },
      { id: 'sieuAm_thai4d', name: 'Siêu âm thai 4D và đầu dò AD', category: 'sieuAm', bh: 0, nd: 9 },
      { id: 'sieuAm_tongquat', name: 'Siêu âm tổng quát', category: 'sieuAm', bh: 124, nd: 14 },
      { id: 'sieuAm_danHoi', name: 'Siêu âm đàn hồi mô', category: 'sieuAm', bh: 0, nd: 0 },
      { id: 'sieuAm_canThiep', name: 'Siêu âm can thiệp', category: 'sieuAm', bh: 0, nd: 0 },
      
      { id: 'noiSoi_daDay', name: 'Nội soi dạ dày', category: 'noiSoi', bh: 11, nd: 1 },
      { id: 'noiSoi_daiTrucTrang', name: 'Nội soi đại trực tràng', category: 'noiSoi', bh: 5, nd: 0 },
      { id: 'noiSoi_trucTrang', name: 'Nội soi trực tràng', category: 'noiSoi', bh: 1, nd: 0 },
      { id: 'noiSoi_sigma', name: 'Nội soi đại tràng Sigma', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_thutThao', name: 'Thụt tháo', category: 'noiSoi', bh: 0, nd: 5 },
      { id: 'noiSoi_catPolyp', name: 'Cắt polyp', category: 'noiSoi', bh: 0, nd: 1 },
      { id: 'noiSoi_clotest', name: 'Clotest H.pylori', category: 'noiSoi', bh: 0, nd: 12 },
      { id: 'noiSoi_gayMeDaDayDaiTrang', name: 'Dịch vụ gây mê Dạ dày + Đại tràng', category: 'noiSoi', bh: 0, nd: 2 },
      { id: 'noiSoi_gayMeDon', name: 'Dịch vụ gây mê ( Đơn )', category: 'noiSoi', bh: 0, nd: 3 },

      { id: 'xQuang_thuong', name: 'X quang', category: 'xQuang', bh: 159, nd: 21 },
      { id: 'xQuang_dacBiet', name: 'Xquang đặc biệt', category: 'xQuang', bh: 0, nd: 0 },
      { id: 'xQuang_clvt', name: 'CLVT (CT-Scan)', category: 'xQuang', bh: 0, nd: 7 },

      { id: 'dienTim_thuong', name: 'Điện tim', category: 'dienTimLHN', bh: 65, nd: 0 },
      { id: 'dienTim_luuHuyetNao', name: 'Lưu huyết não', category: 'dienTimLHN', bh: 0, nd: 5 },

      { id: 'xetNghiem_sinhHoa', name: 'Sinh hóa', category: 'xetNghiem', bh: 539, nd: 173 },
      { id: 'xetNghiem_huyetHoc', name: 'Huyết học', category: 'xetNghiem', bh: 116, nd: 20 },
      { id: 'xetNghiem_nuocTieu', name: 'Nước tiểu', category: 'xetNghiem', bh: 61, nd: 21 },
      { id: 'xetNghiem_viSinh', name: 'Vi sinh', category: 'xetNghiem', bh: 12, nd: 61 },
      { id: 'xetNghiem_mienDich', name: 'Miễn dịch', category: 'xetNghiem', bh: 0, nd: 4 },
      { id: 'xetNghiem_melatec', name: 'Gửi liên kết Melatec', category: 'xetNghiem', bh: 0, nd: 4 },
      { id: 'xetNghiem_hopeHpv', name: 'Gửi liên kết trung tâm Hope (HPV)', category: 'xetNghiem', bh: 0, nd: 2 },
      { id: 'xetNghiem_hopePap', name: 'Gửi liên kết trung tâm Hope (PaP)', category: 'xetNghiem', bh: 0, nd: 2 },
      { id: 'xetNghiem_teBao', name: 'Tế bào', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_thinPrep', name: 'Thin prep', category: 'xetNghiem', bh: 0, nd: 1 },
    ]
  },
  {
    date: '2026-03-11',
    status: 'approved',
    submittedBy: 'BS. Thân Trọng Kha',
    submittedAt: '2026-03-11T16:55:00Z',
    approvedBy: 'BS. Lê Minh Tâm',
    items: [
      { id: 'sieuAm_tim', name: 'Siêu âm tim', category: 'sieuAm', bh: 21, nd: 4 },
      { id: 'sieuAm_mach', name: 'Siêu âm mạch', category: 'sieuAm', bh: 2, nd: 0 },
      { id: 'sieuAm_thai4d', name: 'Siêu âm thai 4D và đầu dò AD', category: 'sieuAm', bh: 0, nd: 11 },
      { id: 'sieuAm_tongquat', name: 'Siêu âm tổng quát', category: 'sieuAm', bh: 106, nd: 21 },
      { id: 'sieuAm_danHoi', name: 'Siêu âm đàn hồi mô', category: 'sieuAm', bh: 0, nd: 1 },
      { id: 'sieuAm_canThiep', name: 'Siêu âm can thiệp', category: 'sieuAm', bh: 0, nd: 0 },
      
      { id: 'noiSoi_daDay', name: 'Nội soi dạ dày', category: 'noiSoi', bh: 9, nd: 0 },
      { id: 'noiSoi_daiTrucTrang', name: 'Nội soi đại trực tràng', category: 'noiSoi', bh: 2, nd: 3 },
      { id: 'noiSoi_trucTrang', name: 'Nội soi trực tràng', category: 'noiSoi', bh: 1, nd: 1 },
      { id: 'noiSoi_sigma', name: 'Nội soi đại tràng Sigma', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_thutThao', name: 'Thụt tháo', category: 'noiSoi', bh: 0, nd: 3 },
      { id: 'noiSoi_catPolyp', name: 'Cắt polyp', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_clotest', name: 'Clotest H.pylori', category: 'noiSoi', bh: 0, nd: 9 },
      { id: 'noiSoi_gayMeDaDayDaiTrang', name: 'Dịch vụ gây mê Dạ dày + Đại tràng', category: 'noiSoi', bh: 0, nd: 2 },
      { id: 'noiSoi_gayMeDon', name: 'Dịch vụ gây mê ( Đơn )', category: 'noiSoi', bh: 0, nd: 2 },

      { id: 'xQuang_thuong', name: 'X quang', category: 'xQuang', bh: 125, nd: 18 },
      { id: 'xQuang_dacBiet', name: 'Xquang đặc biệt', category: 'xQuang', bh: 0, nd: 0 },
      { id: 'xQuang_clvt', name: 'CLVT (CT-Scan)', category: 'xQuang', bh: 0, nd: 9 },

      { id: 'dienTim_thuong', name: 'Điện tim', category: 'dienTimLHN', bh: 55, nd: 0 },
      { id: 'dienTim_luuHuyetNao', name: 'Lưu huyết não', category: 'dienTimLHN', bh: 0, nd: 6 },

      { id: 'xetNghiem_sinhHoa', name: 'Sinh hóa', category: 'xetNghiem', bh: 513, nd: 167 },
      { id: 'xetNghiem_huyetHoc', name: 'Huyết học', category: 'xetNghiem', bh: 91, nd: 25 },
      { id: 'xetNghiem_nuocTieu', name: 'Nước tiểu', category: 'xetNghiem', bh: 66, nd: 15 },
      { id: 'xetNghiem_viSinh', name: 'Vi sinh', category: 'xetNghiem', bh: 8, nd: 70 },
      { id: 'xetNghiem_mienDich', name: 'Miễn dịch', category: 'xetNghiem', bh: 0, nd: 7 },
      { id: 'xetNghiem_melatec', name: 'Gửi liên kết Melatec', category: 'xetNghiem', bh: 0, nd: 10 },
      { id: 'xetNghiem_hopeHpv', name: 'Gửi liên kết trung tâm Hope (HPV)', category: 'xetNghiem', bh: 0, nd: 1 },
      { id: 'xetNghiem_hopePap', name: 'Gửi liên kết trung tâm Hope (PaP)', category: 'xetNghiem', bh: 0, nd: 1 },
      { id: 'xetNghiem_teBao', name: 'Tế bào', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_thinPrep', name: 'Thin prep', category: 'xetNghiem', bh: 0, nd: 1 },
    ]
  },
  {
    date: '2026-03-12',
    status: 'approved',
    submittedBy: 'KTV. Phạm Lê Vy',
    submittedAt: '2026-03-12T17:00:00Z',
    approvedBy: 'BS. Lê Minh Tâm',
    items: [
      { id: 'sieuAm_tim', name: 'Siêu âm tim', category: 'sieuAm', bh: 10, nd: 10 },
      { id: 'sieuAm_mach', name: 'Siêu âm mạch', category: 'sieuAm', bh: 4, nd: 1 },
      { id: 'sieuAm_thai4d', name: 'Siêu âm thai 4D và đầu dò AD', category: 'sieuAm', bh: 0, nd: 9 },
      { id: 'sieuAm_tongquat', name: 'Siêu âm tổng quát', category: 'sieuAm', bh: 115, nd: 13 },
      { id: 'sieuAm_danHoi', name: 'Siêu âm đàn hồi mô', category: 'sieuAm', bh: 0, nd: 0 },
      { id: 'sieuAm_canThiep', name: 'Siêu âm can thiệp', category: 'sieuAm', bh: 0, nd: 0 },
      
      { id: 'noiSoi_daDay', name: 'Nội soi dạ dày', category: 'noiSoi', bh: 13, nd: 0 },
      { id: 'noiSoi_daiTrucTrang', name: 'Nội soi đại trực tràng', category: 'noiSoi', bh: 2, nd: 0 },
      { id: 'noiSoi_trucTrang', name: 'Nội soi trực tràng', category: 'noiSoi', bh: 1, nd: 1 },
      { id: 'noiSoi_sigma', name: 'Nội soi đại tràng Sigma', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_thutThao', name: 'Thụt tháo', category: 'noiSoi', bh: 0, nd: 3 },
      { id: 'noiSoi_catPolyp', name: 'Cắt polyp', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_clotest', name: 'Clotest H.pylori', category: 'noiSoi', bh: 0, nd: 12 },
      { id: 'noiSoi_gayMeDaDayDaiTrang', name: 'Dịch vụ gây mê Dạ dày + Đại tràng', category: 'noiSoi', bh: 0, nd: 2 },
      { id: 'noiSoi_gayMeDon', name: 'Dịch vụ gây mê ( Đơn )', category: 'noiSoi', bh: 0, nd: 3 },

      { id: 'xQuang_thuong', name: 'X quang', category: 'xQuang', bh: 123, nd: 20 },
      { id: 'xQuang_dacBiet', name: 'Xquang đặc biệt', category: 'xQuang', bh: 0, nd: 0 },
      { id: 'xQuang_clvt', name: 'CLVT (CT-Scan)', category: 'xQuang', bh: 0, nd: 6 },

      { id: 'dienTim_thuong', name: 'Điện tim', category: 'dienTimLHN', bh: 45, nd: 0 },
      { id: 'dienTim_luuHuyetNao', name: 'Lưu huyết não', category: 'dienTimLHN', bh: 0, nd: 10 },

      { id: 'xetNghiem_sinhHoa', name: 'Sinh hóa', category: 'xetNghiem', bh: 536, nd: 143 },
      { id: 'xetNghiem_huyetHoc', name: 'Huyết học', category: 'xetNghiem', bh: 106, nd: 22 },
      { id: 'xetNghiem_nuocTieu', name: 'Nước tiểu', category: 'xetNghiem', bh: 62, nd: 19 },
      { id: 'xetNghiem_viSinh', name: 'Vi sinh', category: 'xetNghiem', bh: 0, nd: 50 },
      { id: 'xetNghiem_mienDich', name: 'Miễn dịch', category: 'xetNghiem', bh: 0, nd: 7 },
      { id: 'xetNghiem_melatec', name: 'Gửi liên kết Melatec', category: 'xetNghiem', bh: 0, nd: 7 },
      { id: 'xetNghiem_hopeHpv', name: 'Gửi liên kết trung tâm Hope (HPV)', category: 'xetNghiem', bh: 0, nd: 2 },
      { id: 'xetNghiem_hopePap', name: 'Gửi liên kết trung tâm Hope (PaP)', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_teBao', name: 'Tế bào', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_thinPrep', name: 'Thin prep', category: 'xetNghiem', bh: 0, nd: 2 },
    ]
  },
  {
    date: '2026-03-13',
    status: 'approved',
    submittedBy: 'KTV. Nguyễn Văn Hùng',
    submittedAt: '2026-03-13T17:12:00Z',
    approvedBy: 'BS. Lê Minh Tâm',
    items: [
      { id: 'sieuAm_tim', name: 'Siêu âm tim', category: 'sieuAm', bh: 10, nd: 1 },
      { id: 'sieuAm_mach', name: 'Siêu âm mạch', category: 'sieuAm', bh: 2, nd: 0 },
      { id: 'sieuAm_thai4d', name: 'Siêu âm thai 4D và đầu dò AD', category: 'sieuAm', bh: 0, nd: 9 },
      { id: 'sieuAm_tongquat', name: 'Siêu âm tổng quát', category: 'sieuAm', bh: 112, nd: 25 },
      { id: 'sieuAm_danHoi', name: 'Siêu âm đàn hồi mô', category: 'sieuAm', bh: 0, nd: 0 },
      { id: 'sieuAm_canThiep', name: 'Siêu âm can thiệp', category: 'sieuAm', bh: 0, nd: 0 },
      
      { id: 'noiSoi_daDay', name: 'Nội soi dạ dày', category: 'noiSoi', bh: 13, nd: 0 },
      { id: 'noiSoi_daiTrucTrang', name: 'Nội soi đại trực tràng', category: 'noiSoi', bh: 3, nd: 0 },
      { id: 'noiSoi_trucTrang', name: 'Nội soi trực tràng', category: 'noiSoi', bh: 1, nd: 0 },
      { id: 'noiSoi_sigma', name: 'Nội soi đại tràng Sigma', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_thutThao', name: 'Thụt tháo', category: 'noiSoi', bh: 0, nd: 5 },
      { id: 'noiSoi_catPolyp', name: 'Cắt polyp', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_clotest', name: 'Clotest H.pylori', category: 'noiSoi', bh: 0, nd: 12 },
      { id: 'noiSoi_gayMeDaDayDaiTrang', name: 'Dịch vụ gây mê Dạ dày + Đại tràng', category: 'noiSoi', bh: 0, nd: 1 },
      { id: 'noiSoi_gayMeDon', name: 'Dịch vụ gây mê ( Đơn )', category: 'noiSoi', bh: 0, nd: 5 },

      { id: 'xQuang_thuong', name: 'X quang', category: 'xQuang', bh: 127, nd: 25 },
      { id: 'xQuang_dacBiet', name: 'Xquang đặc biệt', category: 'xQuang', bh: 0, nd: 0 },
      { id: 'xQuang_clvt', name: 'CLVT (CT-Scan)', category: 'xQuang', bh: 0, nd: 6 },

      { id: 'dienTim_thuong', name: 'Điện tim', category: 'dienTimLHN', bh: 56, nd: 0 },
      { id: 'dienTim_luuHuyetNao', name: 'Lưu huyết não', category: 'dienTimLHN', bh: 0, nd: 3 },

      { id: 'xetNghiem_sinhHoa', name: 'Sinh hóa', category: 'xetNghiem', bh: 536, nd: 144 },
      { id: 'xetNghiem_huyetHoc', name: 'Huyết học', category: 'xetNghiem', bh: 100, nd: 18 },
      { id: 'xetNghiem_nuocTieu', name: 'Nước tiểu', category: 'xetNghiem', bh: 66, nd: 20 },
      { id: 'xetNghiem_viSinh', name: 'Vi sinh', category: 'xetNghiem', bh: 7, nd: 66 },
      { id: 'xetNghiem_mienDich', name: 'Miễn dịch', category: 'xetNghiem', bh: 0, nd: 8 },
      { id: 'xetNghiem_melatec', name: 'Gửi liên kết Melatec', category: 'xetNghiem', bh: 0, nd: 7 },
      { id: 'xetNghiem_hopeHpv', name: 'Gửi liên kết trung tâm Hope (HPV)', category: 'xetNghiem', bh: 0, nd: 2 },
      { id: 'xetNghiem_hopePap', name: 'Gửi liên kết trung tâm Hope (PaP)', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_teBao', name: 'Tế bào', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_thinPrep', name: 'Thin prep', category: 'xetNghiem', bh: 0, nd: 2 },
    ]
  },
  {
    date: '2026-03-14',
    status: 'approved',
    submittedBy: 'KTV. Nguyễn Văn Hùng',
    submittedAt: '2026-03-14T17:15:00Z',
    approvedBy: 'BS. Lê Minh Tâm',
    items: [
      { id: 'sieuAm_tim', name: 'Siêu âm tim', category: 'sieuAm', bh: 19, nd: 6 },
      { id: 'sieuAm_mach', name: 'Siêu âm mạch', category: 'sieuAm', bh: 1, nd: 2 },
      { id: 'sieuAm_thai4d', name: 'Siêu âm thai 4D và đầu dò AD', category: 'sieuAm', bh: 0, nd: 12 },
      { id: 'sieuAm_tongquat', name: 'Siêu âm tổng quát', category: 'sieuAm', bh: 120, nd: 42 },
      { id: 'sieuAm_danHoi', name: 'Siêu âm đàn hồi mô', category: 'sieuAm', bh: 0, nd: 1 },
      { id: 'sieuAm_canThiep', name: 'Siêu âm can thiệp', category: 'sieuAm', bh: 0, nd: 0 },
      
      { id: 'noiSoi_daDay', name: 'Nội soi dạ dày', category: 'noiSoi', bh: 4, nd: 2 },
      { id: 'noiSoi_daiTrucTrang', name: 'Nội soi đại trực tràng', category: 'noiSoi', bh: 2, nd: 1 },
      { id: 'noiSoi_trucTrang', name: 'Nội soi trực tràng', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_sigma', name: 'Nội soi đại tràng Sigma', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_thutThao', name: 'Thụt tháo', category: 'noiSoi', bh: 0, nd: 1 },
      { id: 'noiSoi_catPolyp', name: 'Cắt polyp', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_clotest', name: 'Clotest H.pylori', category: 'noiSoi', bh: 0, nd: 6 },
      { id: 'noiSoi_gayMeDaDayDaiTrang', name: 'Dịch vụ gây mê Dạ dày + Đại tràng', category: 'noiSoi', bh: 0, nd: 2 },
      { id: 'noiSoi_gayMeDon', name: 'Dịch vụ gây mê ( Đơn )', category: 'noiSoi', bh: 0, nd: 2 },

      { id: 'xQuang_thuong', name: 'X quang', category: 'xQuang', bh: 127, nd: 21 },
      { id: 'xQuang_dacBiet', name: 'Xquang đặc biệt', category: 'xQuang', bh: 0, nd: 0 },
      { id: 'xQuang_clvt', name: 'CLVT (CT-Scan)', category: 'xQuang', bh: 1, nd: 11 },

      { id: 'dienTim_thuong', name: 'Điện tim', category: 'dienTimLHN', bh: 59, nd: 0 },
      { id: 'dienTim_luuHuyetNao', name: 'Lưu huyết não', category: 'dienTimLHN', bh: 0, nd: 2 },

      { id: 'xetNghiem_sinhHoa', name: 'Sinh hóa', category: 'xetNghiem', bh: 565, nd: 150 },
      { id: 'xetNghiem_huyetHoc', name: 'Huyết học', category: 'xetNghiem', bh: 105, nd: 14 },
      { id: 'xetNghiem_nuocTieu', name: 'Nước tiểu', category: 'xetNghiem', bh: 38, nd: 7 },
      { id: 'xetNghiem_viSinh', name: 'Vi sinh', category: 'xetNghiem', bh: 7, nd: 45 },
      { id: 'xetNghiem_mienDich', name: 'Miễn dịch', category: 'xetNghiem', bh: 0, nd: 14 },
      { id: 'xetNghiem_melatec', name: 'Gửi liên kết Melatec', category: 'xetNghiem', bh: 0, nd: 10 },
      { id: 'xetNghiem_hopeHpv', name: 'Gửi liên kết trung tâm Hope (HPV)', category: 'xetNghiem', bh: 0, nd: 3 },
      { id: 'xetNghiem_hopePap', name: 'Gửi liên kết trung tâm Hope (PaP)', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_teBao', name: 'Tế bào', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_thinPrep', name: 'Thin prep', category: 'xetNghiem', bh: 0, nd: 2 },
    ]
  },
  {
    date: '2026-03-15',
    status: 'approved',
    submittedBy: 'KTV. Nguyễn Văn Hùng',
    submittedAt: '2026-03-15T17:20:00Z',
    approvedBy: 'BS. Lê Minh Tâm',
    items: [
      { id: 'sieuAm_tim', name: 'Siêu âm tim', category: 'sieuAm', bh: 2, nd: 3 },
      { id: 'sieuAm_mach', name: 'Siêu âm mạch', category: 'sieuAm', bh: 0, nd: 3 },
      { id: 'sieuAm_thai4d', name: 'Siêu âm thai 4D và đầu dò AD', category: 'sieuAm', bh: 0, nd: 10 },
      { id: 'sieuAm_tongquat', name: 'Siêu âm tổng quát', category: 'sieuAm', bh: 144, nd: 35 },
      { id: 'sieuAm_danHoi', name: 'Siêu âm đàn hồi mô', category: 'sieuAm', bh: 0, nd: 3 },
      { id: 'sieuAm_canThiep', name: 'Siêu âm can thiệp', category: 'sieuAm', bh: 0, nd: 0 },
      
      { id: 'noiSoi_daDay', name: 'Nội soi dạ dày', category: 'noiSoi', bh: 17, nd: 3 },
      { id: 'noiSoi_daiTrucTrang', name: 'Nội soi đại trực tràng', category: 'noiSoi', bh: 12, nd: 0 },
      { id: 'noiSoi_trucTrang', name: 'Nội soi trực tràng', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_sigma', name: 'Nội soi đại tràng Sigma', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_thutThao', name: 'Thụt tháo', category: 'noiSoi', bh: 0, nd: 10 },
      { id: 'noiSoi_catPolyp', name: 'Cắt polyp', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_clotest', name: 'Clotest H.pylori', category: 'noiSoi', bh: 0, nd: 20 },
      { id: 'noiSoi_gayMeDaDayDaiTrang', name: 'Dịch vụ gây mê Dạ dày + Đại tràng', category: 'noiSoi', bh: 0, nd: 6 },
      { id: 'noiSoi_gayMeDon', name: 'Dịch vụ gây mê ( Đơn )', category: 'noiSoi', bh: 0, nd: 5 },

      { id: 'xQuang_thuong', name: 'X quang', category: 'xQuang', bh: 143, nd: 10 },
      { id: 'xQuang_dacBiet', name: 'Xquang đặc biệt', category: 'xQuang', bh: 0, nd: 0 },
      { id: 'xQuang_clvt', name: 'CLVT (CT-Scan)', category: 'xQuang', bh: 0, nd: 10 },

      { id: 'dienTim_thuong', name: 'Điện tim', category: 'dienTimLHN', bh: 30, nd: 0 },
      { id: 'dienTim_luuHuyetNao', name: 'Lưu huyết não', category: 'dienTimLHN', bh: 0, nd: 2 },

      { id: 'xetNghiem_sinhHoa', name: 'Sinh hóa', category: 'xetNghiem', bh: 284, nd: 103 },
      { id: 'xetNghiem_huyetHoc', name: 'Huyết học', category: 'xetNghiem', bh: 76, nd: 9 },
      { id: 'xetNghiem_nuocTieu', name: 'Nước tiểu', category: 'xetNghiem', bh: 38, nd: 7 },
      { id: 'xetNghiem_viSinh', name: 'Vi sinh', category: 'xetNghiem', bh: 23, nd: 80 },
      { id: 'xetNghiem_mienDich', name: 'Miễn dịch', category: 'xetNghiem', bh: 0, nd: 8 },
      { id: 'xetNghiem_melatec', name: 'Gửi liên kết Melatec', category: 'xetNghiem', bh: 0, nd: 14 },
      { id: 'xetNghiem_hopeHpv', name: 'Gửi liên kết trung tâm Hope (HPV)', category: 'xetNghiem', bh: 0, nd: 4 },
      { id: 'xetNghiem_hopePap', name: 'Gửi liên kết trung tâm Hope (PaP)', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_teBao', name: 'Tế bào', category: 'xetNghiem', bh: 0, nd: 1 },
      { id: 'xetNghiem_thinPrep', name: 'Thin prep', category: 'xetNghiem', bh: 0, nd: 5 },
    ]
  },
  {
    date: '2026-03-16',
    status: 'approved',
    submittedBy: 'KTV. Nguyễn Văn Hùng',
    submittedAt: '2026-03-16T17:15:00Z',
    approvedBy: 'BS. Lê Minh Tâm',
    items: [
      { id: 'sieuAm_tim', name: 'Siêu âm tim', category: 'sieuAm', bh: 22, nd: 0 },
      { id: 'sieuAm_mach', name: 'Siêu âm mạch', category: 'sieuAm', bh: 4, nd: 1 },
      { id: 'sieuAm_thai4d', name: 'Siêu âm thai 4D và đầu dò AD', category: 'sieuAm', bh: 0, nd: 10 },
      { id: 'sieuAm_tongquat', name: 'Siêu âm tổng quát', category: 'sieuAm', bh: 159, nd: 21 },
      { id: 'sieuAm_danHoi', name: 'Siêu âm đàn hồi mô', category: 'sieuAm', bh: 0, nd: 1 },
      { id: 'sieuAm_canThiep', name: 'Siêu âm can thiệp', category: 'sieuAm', bh: 0, nd: 0 },
      
      { id: 'noiSoi_daDay', name: 'Nội soi dạ dày', category: 'noiSoi', bh: 16, nd: 0 },
      { id: 'noiSoi_daiTrucTrang', name: 'Nội soi đại trực tràng', category: 'noiSoi', bh: 7, nd: 0 },
      { id: 'noiSoi_trucTrang', name: 'Nội soi trực tràng', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_sigma', name: 'Nội soi đại tràng Sigma', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_thutThao', name: 'Thụt tháo', category: 'noiSoi', bh: 0, nd: 6 },
      { id: 'noiSoi_catPolyp', name: 'Cắt polyp', category: 'noiSoi', bh: 0, nd: 1 },
      { id: 'noiSoi_clotest', name: 'Clotest H.pylori', category: 'noiSoi', bh: 0, nd: 15 },
      { id: 'noiSoi_gayMeDaDayDaiTrang', name: 'Dịch vụ gây mê Dạ dày + Đại tràng', category: 'noiSoi', bh: 0, nd: 4 },
      { id: 'noiSoi_gayMeDon', name: 'Dịch vụ gây mê ( Đơn )', category: 'noiSoi', bh: 0, nd: 6 },

      { id: 'xQuang_thuong', name: 'X quang', category: 'xQuang', bh: 167, nd: 32 },
      { id: 'xQuang_dacBiet', name: 'Xquang đặc biệt', category: 'xQuang', bh: 0, nd: 0 },
      { id: 'xQuang_clvt', name: 'CLVT (CT-Scan)', category: 'xQuang', bh: 1, nd: 9 },

      { id: 'dienTim_thuong', name: 'Điện tim', category: 'dienTimLHN', bh: 50, nd: 0 },
      { id: 'dienTim_luuHuyetNao', name: 'Lưu huyết não', category: 'dienTimLHN', bh: 0, nd: 3 },

      { id: 'xetNghiem_sinhHoa', name: 'Sinh hóa', category: 'xetNghiem', bh: 555, nd: 214 },
      { id: 'xetNghiem_huyetHoc', name: 'Huyết học', category: 'xetNghiem', bh: 102, nd: 26 },
      { id: 'xetNghiem_nuocTieu', name: 'Nước tiểu', category: 'xetNghiem', bh: 74, nd: 22 },
      { id: 'xetNghiem_viSinh', name: 'Vi sinh', category: 'xetNghiem', bh: 11, nd: 96 },
      { id: 'xetNghiem_mienDich', name: 'Miễn dịch', category: 'xetNghiem', bh: 0, nd: 4 },
      { id: 'xetNghiem_melatec', name: 'Gửi liên kết Melatec', category: 'xetNghiem', bh: 0, nd: 5 },
      { id: 'xetNghiem_hopeHpv', name: 'Gửi liên kết trung tâm Hope (HPV)', category: 'xetNghiem', bh: 0, nd: 3 },
      { id: 'xetNghiem_hopePap', name: 'Gửi liên kết trung tâm Hope (PaP)', category: 'xetNghiem', bh: 0, nd: 2 },
      { id: 'xetNghiem_teBao', name: 'Tế bào', category: 'xetNghiem', bh: 0, nd: 0 },
      { id: 'xetNghiem_thinPrep', name: 'Thin prep', category: 'xetNghiem', bh: 0, nd: 3 },
    ]
  },
  {
    date: '2026-03-17',
    status: 'submitted',
    submittedBy: 'KTV. Nguyễn Văn Hùng',
    submittedAt: '2026-03-17T17:05:00Z',
    items: [
      { id: 'sieuAm_tim', name: 'Siêu âm tim', category: 'sieuAm', bh: 15, nd: 2 },
      { id: 'sieuAm_mach', name: 'Siêu âm mạch', category: 'sieuAm', bh: 3, nd: 1 },
      { id: 'sieuAm_thai4d', name: 'Siêu âm thai 4D và đầu dò AD', category: 'sieuAm', bh: 0, nd: 8 },
      { id: 'sieuAm_tongquat', name: 'Siêu âm tổng quát', category: 'sieuAm', bh: 120, nd: 25 },
      { id: 'sieuAm_danHoi', name: 'Siêu âm đàn hồi mô', category: 'sieuAm', bh: 0, nd: 1 },
      { id: 'sieuAm_canThiep', name: 'Siêu âm can thiệp', category: 'sieuAm', bh: 0, nd: 0 },
      
      { id: 'noiSoi_daDay', name: 'Nội soi dạ dày', category: 'noiSoi', bh: 12, nd: 1 },
      { id: 'noiSoi_daiTrucTrang', name: 'Nội soi đại trực tràng', category: 'noiSoi', bh: 5, nd: 1 },
      { id: 'noiSoi_trucTrang', name: 'Nội soi trực tràng', category: 'noiSoi', bh: 1, nd: 0 },
      { id: 'noiSoi_sigma', name: 'Nội soi đại tràng Sigma', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_thutThao', name: 'Thụt tháo', category: 'noiSoi', bh: 0, nd: 4 },
      { id: 'noiSoi_catPolyp', name: 'Cắt polyp', category: 'noiSoi', bh: 0, nd: 0 },
      { id: 'noiSoi_clotest', name: 'Clotest H.pylori', category: 'noiSoi', bh: 0, nd: 10 },
      { id: 'noiSoi_gayMeDaDayDaiTrang', name: 'Dịch vụ gây mê Dạ dày + Đại tràng', category: 'noiSoi', bh: 0, nd: 3 },
      { id: 'noiSoi_gayMeDon', name: 'Dịch vụ gây mê ( Đơn )', category: 'noiSoi', bh: 0, nd: 4 },

      { id: 'xQuang_thuong', name: 'X quang', category: 'xQuang', bh: 130, nd: 20 },
      { id: 'xQuang_dacBiet', name: 'Xquang đặc biệt', category: 'xQuang', bh: 0, nd: 1 },
      { id: 'xQuang_clvt', name: 'CLVT (CT-Scan)', category: 'xQuang', bh: 0, nd: 5 },

      { id: 'dienTim_thuong', name: 'Điện tim', category: 'dienTimLHN', bh: 56, nd: 0 },
      { id: 'dienTim_luuHuyetNao', name: 'Lưu huyết não', category: 'dienTimLHN', bh: 0, nd: 2 },

      { id: 'xetNghiem_sinhHoa', name: 'Sinh hóa', category: 'xetNghiem', bh: 512, nd: 198 },
      { id: 'xetNghiem_huyetHoc', name: 'Huyết học', category: 'xetNghiem', bh: 95, nd: 20 },
      { id: 'xetNghiem_nuocTieu', name: 'Nước tiểu', category: 'xetNghiem', bh: 50, nd: 15 },
      { id: 'xetNghiem_viSinh', name: 'Vi sinh', category: 'xetNghiem', bh: 8, nd: 75 },
      { id: 'xetNghiem_mienDich', name: 'Miễn dịch', category: 'xetNghiem', bh: 0, nd: 5 },
      { id: 'xetNghiem_melatec', name: 'Gửi liên kết Melatec', category: 'xetNghiem', bh: 0, nd: 6 },
      { id: 'xetNghiem_hopeHpv', name: 'Gửi liên kết trung tâm Hope (HPV)', category: 'xetNghiem', bh: 0, nd: 1 },
      { id: 'xetNghiem_hopePap', name: 'Gửi liên kết trung tâm Hope (PaP)', category: 'xetNghiem', bh: 0, nd: 1 },
      { id: 'xetNghiem_teBao', name: 'Tế bào', category: 'xetNghiem', bh: 0, nd: 1 },
      { id: 'xetNghiem_thinPrep', name: 'Thin prep', category: 'xetNghiem', bh: 0, nd: 2 },
    ]
  }
];

export const MEETINGS: Meeting[] = [
  {
    id: 'm1',
    title: 'Giao ban khoa Cận lâm sàng thường kỳ',
    dateTime: '2026-03-15T08:00',
    venue: 'Phòng hội chẩn khoa Cận lâm sàng',
    chairperson: 'BS. Lê Minh Tâm',
    secretary: 'BS. Trần Thị Mai',
    attendees: ['BS. Lê Minh Tâm', 'KTV. Nguyễn Văn Hùng', 'BS. Trần Thị Mai', 'BS. Hoàng Đức Toàn', 'KTV. Phạm Lê Vy', 'BS. Thân Trọng Kha'],
    agenda: '1. Đánh giá số liệu tuần 2 tháng 3\n2. Thảo luận các ca bệnh siêu âm khó & quy trình hội chẩn qua ảnh mạng\n3. Hướng dẫn sử dụng thiết bị nội soi thế hệ mới\n4. Triển khai kế hoạch trực tuần tới',
    notes: '- Số lượng siêu âm tổng quát tăng đột biến ngày 15/03 (144 ca/ngày). Cần bố trí thêm 1 KTV hỗ trợ xoay ca để tránh dồn ứ bệnh nhân.\n- Phòng Xét nghiệm báo cáo máy chạy Sinh hóa hoạt động liên tục, cần bảo dưỡng định kỳ vào cuối tuần này.\n- Nội soi gây mê có xu hướng tăng đột biến, cần kiểm soát kỹ danh mục trang thiết bị, vật tư tiêu hao và quy trình gây mê an toàn.\n- Đôn đốc hoàn thành biên bản giao ban trực tuyến gửi Ban Giám đốc.',
    minutes: `### BIÊN BẢN GIAO BAN KHOA CẬN LÂM SÀNG
**Thời gian**: 08:00 ngày 15/03/2026
**Địa điểm**: Phòng hội chẩn khoa Cận lâm sàng
**Chủ trì**: BS. Lê Minh Tâm (Trưởng khoa)
**Thư ký**: BS. Trần Thị Mai

#### THÀNH PHẦN THAM DỰ
Đầy đủ các Trưởng bộ phận/đại diện các phòng chức năng:
1. BS. Lê Minh Tâm - Trưởng khoa
2. KTV. Nguyễn Văn Hùng - Bộ phận Siêu Âm
3. BS. Trần Thị Mai - Bộ phận Nội Soi
4. BS. Hoàng Đức Toàn - Bộ phận X-quang
5. KTV. Phạm Lê Vy - Bộ phận Điện Tim & LHN
6. BS. Thân Trọng Kha - Bộ phận Xét Nghiệm

#### NỘI DUNG HỌP & THẢO LUẬN
1. **Báo cáo số liệu chuyên môn ngày 15/03**:
   - Khoa ghi nhận tổng cộng **388 ca Bảo hiểm y tế (BH)** và **233 ca Ngoài dịch vụ (ND)**.
   - Siêu âm vẫn giữ tỷ trọng lớn với **144 ca siêu âm tổng quát** và **10 ca siêu âm thai 4D**. Tình trạng quá tải xảy ra cục bộ vào khung giờ 09:00 - 11:00.
   - Nội soi dạ dày và đại trực tràng thực hiện ổn định với tổng cộng **29 ca BH** và **44 ca ND**. Hoạt động Nội soi gây mê tiến triển tốt, không có tai biến chuyên môn.
   - Bộ phận Xét nghiệm ghi nhận số lượng mẫu lớn (**284 ca sinh hóa**, **76 ca huyết học**). Quy trình kiểm chuẩn (QC) đầu ngày được thực hiện nghiêm ngặt.

2. **Các vướng mắc kỹ thuật & Tổ chức**:
   - Máy siêu âm phòng 3 gặp sự cố lag nhẹ khi chuyển đầu dò. Đã báo Bộ phận Vật tư trang thiết bị khắc phục nhanh.
   - Phòng nội soi đề xuất bổ sung thêm vật tư tiêu hao (Clotest) dự phòng do nhu cầu bệnh nhân tăng cao.

#### KẾT LUẬN & CHỈ ĐẠO CỦA TRƯỞNG KHOA
1. **Bộ phận Siêu Âm**: Bố trí thêm một nhân viên trực phụ trợ phân làn bệnh nhân vào khung giờ cao điểm để giảm thời gian chờ đợi dưới 45 phút.
2. **Bộ phận Xét Nghiệm**: Lên lịch bảo dưỡng định kỳ máy sinh hóa vào thứ Bảy tuần này để giữ độ chính xác.
3. **Bộ phận Nội Soi**: Đã thông qua dự trù 200 kit Clotest cho tháng này. Yêu cầu tuân thủ nghiêm ngặt quy trình chống nhiễm khuẩn ống soi mềm.
4. **Hành chính khoa**: Hoàn tất văn bản tự động gửi báo cáo ngày hôm nay lên hệ thống HIS chung của bệnh viện.`,
    status: 'completed'
  },
  {
    id: 'm2',
    title: 'Giao ban đột xuất bàn giao trực kỹ thuật',
    dateTime: '2026-06-16T07:30',
    venue: 'Văn phòng hành chính khoa',
    chairperson: 'BS. Lê Minh Tâm',
    secretary: 'KTV. Nguyễn Văn Hùng',
    attendees: ['BS. Lê Minh Tâm', 'KTV. Nguyễn Văn Hùng', 'BS. Hoàng Đức Toàn'],
    agenda: 'Bàn giao ca trực đêm 15/06 và triển khai kế hoạch tiếp nhận đoàn kiểm tra chất lượng bệnh viện.',
    status: 'scheduled'
  }
];

export const NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    title: 'Biên bản giao ban AI đã hoàn thành',
    content: 'Biên bản cuộc họp "Giao ban khoa Cận lâm sàng thường kỳ" ngày 15/03 đã được tự động tổng hợp bởi AI thành công. Vui lòng phê duyệt.',
    timestamp: '2026-03-15T09:30:00Z',
    type: 'report',
    read: false
  },
  {
    id: 'n2',
    title: 'Lịch họp giao ban mới được thiết lập',
    content: 'BS. Lê Minh Tâm đã tạo lịch họp "Giao ban đột xuất bàn giao trực kỹ thuật" lúc 07:30 ngày 16/06/2026.',
    timestamp: '2026-06-15T09:10:00Z',
    type: 'meeting',
    read: false
  },
  {
    id: 'n3',
    title: 'Báo cáo ngày 16/03 đang chờ duyệt',
    content: 'KTV. Nguyễn Văn Hùng đã gửi báo cáo số liệu chuyên môn ngày 16/03/2026 lên hệ thống.',
    timestamp: '2026-03-16T17:20:00Z',
    type: 'report',
    read: true
  }
];

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  supervisoryOrgan: 'SỞ Y TẾ THÀNH PHỐ HỒ CHÍ MINH',
  institutionName: 'BỆNH VIỆN EXECUTIVE METROPOLITAN',
  councilSubtitle: 'Hội đồng Thống kê Khoa học & Hiệu suất',
  reportSubtitle: 'Hệ thống Quản lý Chỉ tiêu Giao ban & Doanh vụ Kỹ thuật Y khoa',
  modelNumber: '08-BCCT/CLS',
  statusText: 'Số liệu Tổng hợp Kĩ thuật số',
  compilerName: 'Đỗ Thị Hoa Quỳnh',
  compilerTitle: 'Người lập biểu kế toán toán vụ',
  approverName: 'GS. TS. BS. Nguyễn Văn Thành',
  approverTitle: 'Giám đốc quản lý chất lượng & Lâm khoa',
  approverSubtitle: 'Hội đồng chấp hành chất lượng y khoa',
  location: 'TP. Hồ Chí Minh'
};

