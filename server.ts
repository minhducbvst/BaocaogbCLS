import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import {
  syncCollection,
  syncSettings,
  saveDocument,
  deleteDocument
} from "./src/utils/firebaseServer";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (geminiApiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini API Client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini Client:", err);
  }
} else {
  console.warn("GEMINI_API_KEY is not defined. AI automation will run in mock/simulation mode.");
}

// In-Memory Database initialized with March 2026 spreadsheet data
let reports = [
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

let meetings = [
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

let notifications = [
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

// 2. Personnel, Departments, and Audit Logs state in-memory database
let serverUsers = [
  { id: 'u1', name: 'BS. Lê Minh Tâm', role: 'admin', email: 'tam.leminh@hospital.gov.vn', departmentName: 'Ban giám khoa & Cận lâm sàng', title: 'Trưởng Khoa', shiftCount: 22, status: 'Đang làm việc', birthYear: 1978, gender: 'Nam', qualification: 'Bác sĩ', degree: 'Trên ĐH', phone: '0912345678', address: 'Đống Đa, Hà Nội', notes: 'Trực chỉ huy ban giám khoa.' },
  { id: 'u7', name: 'BS. CKII. Nguyễn Trọng Nhân', role: 'truongKhoa', email: 'nhan.nguyentrong@hospital.gov.vn', departmentName: 'Ban giám khoa & Cận lâm sàng', title: 'Phó Trưởng Khoa CLS', shiftCount: 30, status: 'Đang làm việc', birthYear: 1975, gender: 'Nam', qualification: 'BS. CKII', degree: 'Trên ĐH', phone: '0987654321', address: 'Hai Bà Trưng, Hà Nội', notes: 'Cố vấn chuyên môn xét nghiệm.' },
  { id: 'u2', name: 'KTV. Nguyễn Văn Hùng', role: 'phoKhoa', email: 'hung.nguyenvan@hospital.gov.vn', departmentName: 'Phòng Siêu Âm', title: 'Kỹ Thuật Viên Trưởng', shiftCount: 18, status: 'Đang làm việc', birthYear: 1985, gender: 'Nam', qualification: 'Kỹ thuật viên', degree: 'ĐH', phone: '0913579246', address: 'Cầu Giấy, Hà Nội', notes: 'Phụ trách đào tạo kỹ thuật viên siêu âm.' },
  { id: 'u3', name: 'BS. Trần Thị Mai', role: 'general', email: 'mai.tranthi@hospital.gov.vn', departmentName: 'Phòng Nội Soi', title: 'Bác Sĩ Điều Trị', shiftCount: 15, status: 'Nghỉ thai sản', birthYear: 1982, gender: 'Nữ', qualification: 'Bác sĩ', degree: 'Trên ĐH', phone: '0934123789', address: 'Ba Đình, Hà Nội', notes: 'Nghỉ thai sản từ tháng 6/2026.' },
  { id: 'u4', name: 'BS. Hoàng Đức Toàn', role: 'phoKhoa', email: 'toan.hoangduc@hospital.gov.vn', departmentName: 'Phòng X-quang', title: 'Bác Sĩ Phó Khoa', shiftCount: 17, status: 'Đang làm việc', birthYear: 1980, gender: 'Nam', qualification: 'Bác sĩ', degree: 'Trên ĐH', phone: '0904561237', address: 'Thanh Xuân, Hà Nội', notes: 'Kiểm soát chất lượng hình ảnh CLS.' },
  { id: 'u5', name: 'KTV. Phạm Lê Vy', role: 'general', email: 'vy.phamle@hospital.gov.vn', departmentName: 'Phòng Điện Tim & LHN', title: 'Kỹ Thuật Viên', shiftCount: 12, status: 'Nghỉ không lương', birthYear: 1993, gender: 'Nữ', qualification: 'Kỹ thuật viên', degree: 'ĐH', phone: '0978123456', address: 'Hoàng Mai, Hà Nội', notes: 'Nghỉ giải quyết việc riêng gia đình.' },
  { id: 'u6', name: 'BS. Thân Trọng Kha', role: 'general', email: 'kha.thantrong@hospital.gov.vn', departmentName: 'Khoa Xét Nghiệm', title: 'Bác Sĩ Xét Nghiệm', shiftCount: 20, status: 'Đang làm việc', birthYear: 1988, gender: 'Nam', qualification: 'Bác sĩ', degree: 'Trên ĐH', phone: '0965123987', address: 'Tây Hồ, Hà Nội', notes: 'Trưởng nhóm quản lý mẫu gen.' }
];

let serverDepartments = [
  { id: 'd1', name: 'Ban giám khoa & Cận lâm sàng', code: 'BGK-CLS', headId: 'u1', headName: 'BS. Lê Minh Tâm', location: 'Tầng 2, Nhà B', phone: '024-3851-1234 (Ext: 101)', description: 'Chỉ đạo chuyên môn, điều động kíp trực và hội chẩn chất lượng toàn khoa cận lâm sàng.' },
  { id: 'd2', name: 'Phòng Siêu Âm', code: 'SA', headId: 'u2', headName: 'KTV. Nguyễn Văn Hùng', location: 'Phòng 201, Nhà T', phone: '024-3851-1234 (Ext: 102)', description: 'Thực hiện chẩn đoán hình ảnh siêu âm tổng quát, siêu âm mạch, tim mạch, đàn hồi mô và sản phụ khoa.' },
  { id: 'd3', name: 'Phòng Nội Soi', code: 'NS', headId: 'u3', headName: 'BS. Trần Thị Mai', location: 'Phòng 205, Nhà T', phone: '024-3851-1234 (Ext: 103)', description: 'Thực hiện thủ thuật nội soi tiêu hóa dạ dày, trực tràng, clotest và cắt polyp ống tiêu hóa.' },
  { id: 'd4', name: 'Phòng X-quang', code: 'XQ', headId: 'u4', headName: 'BS. Hoàng Đức Toàn', location: 'Phòng 102, Nhà T', phone: '024-3851-1230', description: 'Chụp hình X-quang kỹ thuật số thông dụng và chụp cắt lớp vi tính (CT scan) đa lát cắt.' },
  { id: 'd5', name: 'Phòng Điện Tim & LHN', code: 'DT-LHN', headId: 'u5', headName: 'KTV. Phạm Lê Vy', location: 'Phòng 203, Nhà T', phone: '024-3851-1231', description: 'Ghi điện tâm đồ thường quy và đo chỉ số lưu huyết não phục vụ khám sức khỏe & lâm sàng.' },
  { id: 'd6', name: 'Khoa Xét Nghiệm', code: 'XN', headId: 'u6', headName: 'BS. Thân Trọng Kha', location: 'Tầng 1, Nhà A', phone: '024-3851-1232', description: 'Sinh hóa, Huyết học, Nước tiểu, Vi sinh, Xét nghiệm Miễn dịch tinh chuẩn cao.' }
];

let serverAuditLogs = [
  { id: 'l1', actor: 'BS. Lê Minh Tâm', action: 'Khởi tạo hệ thống', details: 'Thiết lập ban đầu kíp trực 6 phòng ban cận lâm sàng', timestamp: '2026-03-01T08:00:00Z' },
  { id: 'l2', actor: 'BS. Lê Minh Tâm', action: 'Cập nhật phân bổ trực', details: 'Tăng định mức shiftCount trực tuần cho Siêu âm và Xét nghiệm', timestamp: '2026-03-15T09:15:00Z' },
];

let serverProcedures = [
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

let systemSettings = {
  themeColor: "#4f46e5", // Indigo làm mặc định
  bannerPreset: "default",
  bannerUrl: "",
  logoPreset: "default",
  logoUrl: "",
  bgStyle: "clean-mint",
  systemTitle: "Giao Ban Khoa Cận Lâm Sàng",
  systemSubtitle: "Hệ thống báo cáo số liệu & Tự động hóa biên bản giao ban bằng AI"
};

let workReports = [
  {
    id: "wr1",
    title: "Báo cáo lỗi đầu dò âm tầng máy siêu âm số 3",
    content: "Đầu dò Linear dùng cho siêu âm tuyến giáp, phần mềm nông xuất hiện một số sọc mờ mảng dọc ở giữa màn hình. Nghi ngờ do đứt chấn tử hoặc lỏng dây cáp tín hiệu. Kính báo lãnh đạo khoa cho phép liên hệ phòng Trang thiết bị kiểm tra sửa chữa hoặc hiệu chuẩn để không gián đoạn hoạt động chuyên môn.",
    category: "request",
    departmentName: "Phòng Siêu Âm",
    submittedBy: "KTV. Nguyễn Văn Hùng",
    submittedById: "u2",
    submittedAt: "2026-06-20T08:30:22.123Z",
    status: "processing",
    directive: {
      content: "Đồng ý đề xuất. Giao KTV Hùng chủ động kết nối kỹ sư hãng hoặc tổ sửa chữa phòng Vật tư Trang thiết bị vào sáng thứ Hai. Cần bàn giao máy siêu âm số 2 dự phòng trong thời gian cân chỉnh.",
      directedBy: "BS. Lê Minh Tâm",
      directedAt: "2026-06-20T10:15:00.000Z",
      actionStatus: "approve"
    },
    assignedTask: {
      description: "Tiếp nhận kỹ sư hãng kiểm tra máy siêu âm số 3 và báo cáo kết quả khắc phục nguyên trạng.",
      deadline: "2026-06-23",
      priority: "high",
      assigneeName: "KTV. Nguyễn Văn Hùng",
      assigneeId: "u2",
      progress: "in_progress",
      updatedAt: "2026-06-20T11:00:00.000Z"
    },
    comments: [
      {
        id: "c1",
        user: "BS. Lê Minh Tâm",
        userId: "u1",
        content: "Có cần mượn tạm máy siêu âm xách tay từ khoa Cấp cứu không em?",
        createdAt: "2026-06-20T10:14:10.000Z"
      },
      {
        id: "c2",
        user: "KTV. Nguyễn Văn Hùng",
        userId: "u2",
        content: "Dạ dạ hiện tại máy siêu âm số 2 và số 4 vẫn gánh được tải nhẹ trong buổi sáng, chưa cần mượn xách tay ạ. Em cảm ơn Bác Tâm nhiều ạ!",
        createdAt: "2026-06-20T10:30:00.000Z"
      }
    ]
  },
  {
    id: "wr2",
    title: "Ý kiến đóng góp quy trình phân luồng người bệnh nội soi dạ dày",
    content: "Hiện tại số lượng bệnh nhân chỉ định nội soi dạ dày gây mê tăng mạnh, dẫn đến ùn tắc tại khu vực chờ tỉnh mê. Kiến nghị khoa xem xét phân công thêm 01 nhân sự điều phối hồ sơ hành chính từ phòng đón tiếp dịch vụ để hỗ trợ dẫn bệnh, giảm áp lực cho KTV chuyên trách.",
    category: "suggestion",
    departmentName: "Phòng Nội Soi",
    submittedBy: "BS. Trần Thị Mai",
    submittedById: "u3",
    submittedAt: "2026-06-19T14:45:10.111Z",
    status: "approved",
    directive: {
      content: "Đã rà soát quy trình. Thống nhất bố trí KTV Phạm Lê Vy kiêm nhiệm điều phối thêm hồ sơ vào khung giờ cao điểm từ 08:30 - 10:30 mỗi buổi sáng.",
      directedBy: "BS. CKII. Nguyễn Trọng Nhân",
      directedAt: "2026-06-20T09:00:00.000Z",
      actionStatus: "approve"
    },
    comments: []
  },
  {
    id: "wr3",
    title: "Yêu cầu hướng dẫn quy trình bảo quản mẫu sinh thiết của phòng nội soi sang giải phẫu bệnh",
    content: "Đề nghị được cung cấp tài liệu mẫu hoặc tập huấn nhanh lại cho các nhân viên mới về quy trình dán nhãn thông tin và bảo quản dung dịch phóc-môn đối với các mẫu sinh thiết, tránh nhầm lẫn mẫu xét nghiệm.",
    category: "request",
    departmentName: "Phòng Nội Soi",
    submittedBy: "BS. Trần Thị Mai",
    submittedById: "u3",
    submittedAt: "2026-06-21T02:10:00.000Z",
    status: "pending",
    comments: []
  }
];


// API Endpoints

// Settings API
app.get("/api/settings", (req, res) => {
  res.json(systemSettings);
});

app.post("/api/settings", (req, res) => {
  const newSettings = req.body;
  if (!newSettings) {
    return res.status(400).json({ error: "Dữ liệu cấu hình không hợp lệ." });
  }
  systemSettings = {
    ...systemSettings,
    ...newSettings
  };

  const newLog = {
    id: "log_" + Date.now(),
    actor: "BS. Lê Minh Tâm",
    action: "Cập nhật tùy biến giao diện",
    details: `Cập nhật giao diện: Màu sắc [${systemSettings.themeColor}], Hình nền [${systemSettings.bgStyle}], Tiêu đề [${systemSettings.systemTitle}]`,
    timestamp: new Date().toISOString()
  };
  serverAuditLogs.unshift(newLog);

  // Write changes to Firebase
  saveDocument("settings", "global", systemSettings);
  saveDocument("auditLogs", newLog.id, newLog);

  res.json({ success: true, settings: systemSettings });
});

// Procedures API
app.get("/api/procedures", (req, res) => {
  res.json(serverProcedures);
});

app.post("/api/procedures", (req, res) => {
  const { procedure, actorName } = req.body;
  if (!procedure || !procedure.name || !procedure.category) {
    return res.status(400).json({ error: "Thông tin dịch vụ kỹ thuật không hợp lệ." });
  }

  const existingIndex = serverProcedures.findIndex(p => p.id === procedure.id);
  const newLogId = "log_" + Date.now();
  if (existingIndex !== -1) {
    const prev = serverProcedures[existingIndex];
    const updatedProc = {
      ...prev,
      ...procedure
    };
    serverProcedures[existingIndex] = updatedProc;
    const newLog = {
      id: newLogId,
      actor: actorName || "BS. Lê Minh Tâm",
      action: "Cập nhật dịch vụ kỹ thuật",
      details: `Cập nhật dịch vụ kỹ thuật "${procedure.name}" thuộc phân ban [${procedure.category}]`,
      timestamp: new Date().toISOString()
    };
    serverAuditLogs.unshift(newLog);

    saveDocument("procedures", procedure.id, updatedProc);
    saveDocument("auditLogs", newLog.id, newLog);
  } else {
    const id = procedure.id || `${procedure.category}_custom_${Date.now()}`;
    const newProc = {
      id,
      name: procedure.name,
      category: procedure.category
    };
    serverProcedures.push(newProc);
    const newLog = {
      id: newLogId,
      actor: actorName || "BS. Lê Minh Tâm",
      action: "Thêm dịch vụ kỹ thuật",
      details: `Thêm mới dịch vụ kỹ thuật "${procedure.name}" thuộc phân ban [${procedure.category}]`,
      timestamp: new Date().toISOString()
    };
    serverAuditLogs.unshift(newLog);

    saveDocument("procedures", id, newProc);
    saveDocument("auditLogs", newLog.id, newLog);
  }

  res.json({ success: true, procedures: serverProcedures });
});

app.delete("/api/procedures/:id", (req, res) => {
  const { id } = req.params;
  const actorName = req.query.actorName as string;
  const index = serverProcedures.findIndex(p => p.id === id);
  if (index !== -1) {
    const deleted = serverProcedures[index];
    serverProcedures.splice(index, 1);
    const newLog = {
      id: "log_" + Date.now(),
      actor: actorName || "BS. Lê Minh Tâm",
      action: "Xóa dịch vụ kỹ thuật",
      details: `Xóa dịch vụ kỹ thuật "${deleted.name}" khỏi phân ban [${deleted.category}]`,
      timestamp: new Date().toISOString()
    };
    serverAuditLogs.unshift(newLog);

    deleteDocument("procedures", id);
    saveDocument("auditLogs", newLog.id, newLog);

    res.json({ success: true, procedures: serverProcedures });
  } else {
    res.status(404).json({ error: "Không tìm thấy dịch vụ kỹ thuật đề nghị." });
  }
});

// 1. Reports API
app.get("/api/reports", (req, res) => {
  res.json(reports);
});

// Personnel, Departments and Activity Logs APIs
app.get("/api/users", (req, res) => {
  res.json(serverUsers);
});

app.post("/api/users", (req, res) => {
  const newUser = req.body;
  if (!newUser || !newUser.name) {
    return res.status(400).json({ error: "Thông tin nhân sự không hợp lệ." });
  }

  const index = serverUsers.findIndex((u) => u.id === newUser.id);
  const newLogId = "log_" + Date.now();
  if (index !== -1) {
    const prevUser = serverUsers[index];
    const updatedUser = {
      ...prevUser,
      ...newUser,
    };
    serverUsers[index] = updatedUser;
    
    const newLog = {
      id: newLogId,
      actor: "BS. Lê Minh Tâm",
      action: "Cập nhật nhân viên",
      details: `Cập nhật thông tin nhân viên ${newUser.name} (Chức danh: ${newUser.title || "Chưa rõ"}, Vai trò: ${newUser.role})`,
      timestamp: new Date().toISOString()
    };
    serverAuditLogs.unshift(newLog);

    saveDocument("users", newUser.id, updatedUser);
    saveDocument("auditLogs", newLog.id, newLog);
  } else {
    const id = "u_" + Date.now();
    const createdUser = {
      id,
      shiftCount: 0,
      status: "Đang làm việc",
      ...newUser
    };
    serverUsers.push(createdUser);
    
    const newLog = {
      id: newLogId,
      actor: "BS. Lê Minh Tâm",
      action: "Thêm nhân viên",
      details: `Thêm nhân viên mới: ${newUser.name} vào phòng ban ${newUser.departmentName}`,
      timestamp: new Date().toISOString()
    };
    serverAuditLogs.unshift(newLog);

    saveDocument("users", id, createdUser);
    saveDocument("auditLogs", newLog.id, newLog);
  }

  res.json({ success: true, users: serverUsers });
});

app.post("/api/users/change-password", (req, res) => {
  const { userId, newPassword } = req.body;
  const user = serverUsers.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "Không tìm thấy người dùng." });
  }
  
  if (newPassword) {
    (user as any).password = newPassword;
  } else {
    delete (user as any).password;
  }
  (user as any).passwordResetRequested = false;

  const newLog = {
    id: "log_" + Date.now(),
    actor: user.name,
    action: "Cấu hình mật khẩu",
    details: newPassword ? "Đã cập nhật mật khẩu đăng nhập cá nhân" : "Đã hủy bỏ mật khẩu đăng nhập cá nhân",
    timestamp: new Date().toISOString()
  };
  serverAuditLogs.unshift(newLog);

  saveDocument("users", userId, user);
  saveDocument("auditLogs", newLog.id, newLog);

  res.json({ success: true, users: serverUsers });
});

app.post("/api/users/request-reset", (req, res) => {
  const { userId } = req.body;
  const user = serverUsers.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "Không tìm thấy người dùng." });
  }

  (user as any).passwordResetRequested = true;

  const newLog = {
    id: "log_" + Date.now(),
    actor: user.name,
    action: "Yêu cầu khôi phục",
    details: `Gửi yêu cầu reset mật khẩu tới Ban Giám Đốc (Admin)`,
    timestamp: new Date().toISOString()
  };
  serverAuditLogs.unshift(newLog);

  saveDocument("users", userId, user);
  saveDocument("auditLogs", newLog.id, newLog);

  res.json({ success: true, users: serverUsers });
});

app.post("/api/users/admin-reset", (req, res) => {
  const { userId } = req.body;
  const user = serverUsers.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "Không tìm thấy người dùng." });
  }

  delete (user as any).password;
  (user as any).passwordResetRequested = false;

  const newLog = {
    id: "log_" + Date.now(),
    actor: "Admin",
    action: "Reset mật khẩu",
    details: `Đã reset và xóa cấu hình mật khẩu của nhân viên ${user.name}`,
    timestamp: new Date().toISOString()
  };
  serverAuditLogs.unshift(newLog);

  saveDocument("users", userId, user);
  saveDocument("auditLogs", newLog.id, newLog);

  res.json({ success: true, users: serverUsers });
});

app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const userIndex = serverUsers.findIndex((u) => u.id === id);
  if (userIndex !== -1) {
    const deletedUser = serverUsers[userIndex];
    serverUsers.splice(userIndex, 1);
    
    const newLog = {
      id: "log_" + Date.now(),
      actor: "BS. Lê Minh Tâm",
      action: "Xóa nhân viên",
      details: `Khóa tài khoản và xóa nhân viên: ${deletedUser.name} khỏi hệ thống`,
      timestamp: new Date().toISOString()
    };
    serverAuditLogs.unshift(newLog);

    deleteDocument("users", id);
    saveDocument("auditLogs", newLog.id, newLog);
    
    res.json({ success: true, users: serverUsers });
  } else {
    res.status(404).json({ error: "Không tìm thấy nhân tài này." });
  }
});

app.get("/api/departments", (req, res) => {
  res.json(serverDepartments);
});

app.post("/api/departments", (req, res) => {
  const newDept = req.body;
  if (!newDept || !newDept.name) {
    return res.status(400).json({ error: "Thông tin phòng ban không hợp lệ." });
  }

  const index = serverDepartments.findIndex((d) => d.id === newDept.id);
  const newLogId = "log_" + Date.now();
  if (index !== -1) {
    const prevDept = serverDepartments[index];
    const updatedDept = {
      ...prevDept,
      ...newDept,
    };
    serverDepartments[index] = updatedDept;
    
    // Also update users' departmentName if the department name is changed!
    if (prevDept.name !== newDept.name) {
      serverUsers = serverUsers.map(u => {
        if (u.departmentName === prevDept.name) {
          const updatedUser = { ...u, departmentName: newDept.name };
          saveDocument("users", u.id, updatedUser);
          return updatedUser;
        }
        return u;
      });
    }
    
    const newLog = {
      id: newLogId,
      actor: "BS. Lê Minh Tâm",
      action: "Cập nhật phòng ban",
      details: `Cập nhật phòng ban ${newDept.name} (Địa điểm: ${newDept.location}, Trưởng khoa: ${newDept.headName})`,
      timestamp: new Date().toISOString()
    };
    serverAuditLogs.unshift(newLog);

    saveDocument("departments", newDept.id, updatedDept);
    saveDocument("auditLogs", newLog.id, newLog);
  } else {
    const id = "d_" + Date.now();
    const createdDept = {
      id,
      ...newDept
    };
    serverDepartments.push(createdDept);
    
    const newLog = {
      id: newLogId,
      actor: "BS. Lê Minh Tâm",
      action: "Thêm phòng ban",
      details: `Mở rộng phòng chức năng mới: ${newDept.name} (${newDept.code})`,
      timestamp: new Date().toISOString()
    };
    serverAuditLogs.unshift(newLog);

    saveDocument("departments", id, createdDept);
    saveDocument("auditLogs", newLog.id, newLog);
  }

  res.json({ success: true, departments: serverDepartments });
});

app.delete("/api/departments/:id", (req, res) => {
  const { id } = req.params;
  const index = serverDepartments.findIndex((d) => d.id === id);
  if (index !== -1) {
    const deletedDept = serverDepartments[index];
    serverDepartments.splice(index, 1);
    
    // Also remove users who belong to this department from serverUsers and Firestore!
    serverUsers.forEach(u => {
      if (u.departmentName === deletedDept.name) {
        deleteDocument("users", u.id);
      }
    });
    serverUsers = serverUsers.filter((u) => u.departmentName !== deletedDept.name);
    
    const newLog = {
      id: "log_" + Date.now(),
      actor: "BS. Lê Minh Tâm",
      action: "Xóa phòng ban",
      details: `Giải thể hoặc sáp nhập phòng ban: ${deletedDept.name}`,
      timestamp: new Date().toISOString()
    };
    serverAuditLogs.unshift(newLog);

    deleteDocument("departments", id);
    saveDocument("auditLogs", newLog.id, newLog);
    
    res.json({ success: true, departments: serverDepartments });
  } else {
    res.status(404).json({ error: "Không tìm thấy phòng ban này." });
  }
});

app.get("/api/audit-logs", (req, res) => {
  res.json(serverAuditLogs);
});

app.post("/api/reports", (req, res) => {
  const newReport = req.body;
  if (!newReport || !newReport.date) {
    return res.status(400).json({ error: "Dữ liệu báo cáo không hợp lệ." });
  }

  const index = reports.findIndex((r) => r.date === newReport.date);
  if (index !== -1) {
    const oldStatus = reports[index].status;
    const isTransitioningToSubmitted = oldStatus === 'draft' && newReport.status !== 'draft';

    // Keep existing metadata if updating
    reports[index] = {
      ...reports[index],
      ...newReport,
      submittedAt: new Date().toISOString(),
    };

    if (isTransitioningToSubmitted) {
      notifications.unshift({
        id: "n_" + Date.now(),
        title: "Báo cáo mới được gửi",
        content: `${newReport.submittedBy} đã gửi báo cáo số liệu chuyên môn ngày ${newReport.date}.`,
        timestamp: new Date().toISOString(),
        type: "report",
        read: false,
      });
    }
  } else {
    reports.push({
      ...newReport,
      status: newReport.status || "submitted",
      submittedAt: new Date().toISOString(),
    });

    // Add a notification for new report if not a draft
    if (newReport.status !== 'draft') {
      notifications.unshift({
        id: "n_" + Date.now(),
        title: "Báo cáo mới được gửi",
        content: `${newReport.submittedBy} đã gửi báo cáo số liệu chuyên môn ngày ${newReport.date}.`,
        timestamp: new Date().toISOString(),
        type: "report",
        read: false,
      });
    }
  }

  const savedRep = reports.find((r) => r.date === newReport.date);
  if (savedRep) {
    saveDocument("reports", savedRep.date, savedRep);
  }
  if (notifications[0] && notifications[0].id.startsWith("n_")) {
    saveDocument("notifications", notifications[0].id, notifications[0]);
  }

  res.json({ success: true, report: savedRep });
});

app.post("/api/reports/bulk", (req, res) => {
  const { reports: importedReports, approvedBy } = req.body;
  if (!Array.isArray(importedReports)) {
    return res.status(400).json({ error: "Dữ liệu hàng loạt không hợp lệ." });
  }

  let countUpdated = 0;
  let countCreated = 0;

  importedReports.forEach((imported) => {
    if (!imported.date) return;
    const existingIndex = reports.findIndex((r) => r.date === imported.date);

    if (existingIndex !== -1) {
      // Merge items
      const existingReport = reports[existingIndex];
      const mergedItems = [...existingReport.items];

      imported.items.forEach((newItem: any) => {
        const itemIndex = mergedItems.findIndex((it) => it.id === newItem.id);
        if (itemIndex !== -1) {
          mergedItems[itemIndex] = {
            ...mergedItems[itemIndex],
            bh: typeof newItem.bh === 'number' ? newItem.bh : mergedItems[itemIndex].bh,
            nd: typeof newItem.nd === 'number' ? newItem.nd : mergedItems[itemIndex].nd,
          };
        } else {
          mergedItems.push(newItem);
        }
      });

      const updatedReport = {
        ...existingReport,
        items: mergedItems,
        status: "approved",
        approvedBy: approvedBy || existingReport.approvedBy || "Hệ thống (Excel Admin)",
        submittedAt: new Date().toISOString()
      };
      reports[existingIndex] = updatedReport;
      countUpdated++;

      saveDocument("reports", imported.date, updatedReport);
    } else {
      const newRep = {
        date: imported.date,
        status: "approved",
        submittedBy: "Hệ thống (Excel Admin)",
        submittedAt: new Date().toISOString(),
        approvedBy: approvedBy || "Hệ thống (Excel Admin)",
        items: imported.items
      };
      reports.push(newRep);
      countCreated++;

      saveDocument("reports", imported.date, newRep);
    }
  });

  // Gửi thông báo hệ thống
  const newNotif = {
    id: "n_" + Date.now(),
    title: "Nhập dữ liệu Excel thành công",
    content: `Admin đã hoàn tất tải lên dữ liệu hàng tháng qua Excel (Cập nhật: ${countUpdated} ngày, Khởi tạo: ${countCreated} ngày).`,
    timestamp: new Date().toISOString(),
    type: "update",
    read: false,
  };
  notifications.unshift(newNotif);

  saveDocument("notifications", newNotif.id, newNotif);

  res.json({ success: true, countUpdated, countCreated });
});

app.post("/api/reports/approve", (req, res) => {
  const { date, approvedBy } = req.body;
  const report = reports.find((r) => r.date === date);
  if (report) {
    report.status = "approved";
    report.approvedBy = approvedBy;

    // Add verification/approval notification
    const newNotif = {
      id: "n_" + Date.now(),
      title: "Báo cáo đã được phê duyệt",
      content: `Báo cáo số liệu ngày ${date} đã được phê duyệt bởi Trưởng khoa ${approvedBy}.`,
      timestamp: new Date().toISOString(),
      type: "system",
      read: false,
    };
    notifications.unshift(newNotif);

    saveDocument("reports", date, report);
    saveDocument("notifications", newNotif.id, newNotif);

    res.json({ success: true, report });
  } else {
    res.status(404).json({ error: "Không tìm thấy báo cáo." });
  }
});

// 2. Meetings API
app.get("/api/meetings", (req, res) => {
  res.json(meetings);
});

app.post("/api/meetings", (req, res) => {
  const { meeting: newMeeting, user } = req.body;
  if (!newMeeting) {
    return res.status(400).json({ error: "Dữ liệu cuộc họp không hợp lệ." });
  }

  const actorName = user?.name || "Một bác sĩ";
  const actorId = user?.id || "unknown";

  if (newMeeting.id) {
    const index = meetings.findIndex((m) => m.id === newMeeting.id);
    if (index !== -1) {
      meetings[index] = { 
        ...meetings[index], 
        ...newMeeting 
      };
      
      // Push notification for updated meeting
      const newNotif = {
        id: "n_" + Date.now(),
        title: "Cập nhật lịch họp / biên bản",
        content: `${actorName} đã cập nhật thông tin / ghi chú cuộc họp "${meetings[index].title}".`,
        timestamp: new Date().toISOString(),
        type: "meeting",
        read: false,
      };
      notifications.unshift(newNotif);

      saveDocument("meetings", newMeeting.id, meetings[index]);
      saveDocument("notifications", newNotif.id, newNotif);

      res.json({ success: true, meeting: meetings[index] });
    } else {
      res.status(404).json({ error: "Không tìm thấy cuộc họp." });
    }
  } else {
    const createdMeeting = {
      ...newMeeting,
      id: "m_" + Date.now(),
      status: "scheduled",
      createdBy: actorId, // Store creator's user id for RBAC check
    };
    meetings.unshift(createdMeeting);

    // Push notification for new meeting
    const newNotif = {
      id: "n_" + Date.now(),
      title: "Lịch họp mới được tạo",
      content: `${actorName} đã lên lịch cuộc họp "${createdMeeting.title}" vào lúc ${createdMeeting.dateTime}.`,
      timestamp: new Date().toISOString(),
      type: "meeting",
      read: false,
    };
    notifications.unshift(newNotif);

    saveDocument("meetings", createdMeeting.id, createdMeeting);
    saveDocument("notifications", newNotif.id, newNotif);

    res.json({ success: true, meeting: createdMeeting });
  }
});

app.delete("/api/meetings/:id", (req, res) => {
  const { id } = req.params;
  const { userId, userName } = req.query;
  
  const index = meetings.findIndex((m) => m.id === id);
  if (index !== -1) {
    const deletedMeeting = meetings[index];
    meetings.splice(index, 1);

    const actorName = userName || "Quản trị viên";

    // Push notification for deleted meeting
    const newNotif = {
      id: "n_" + Date.now(),
      title: "Lịch họp đã bị hủy bỏ",
      content: `${actorName} đã xóa lịch họp "${deletedMeeting.title}" khỏi hệ thống giao ban.`,
      timestamp: new Date().toISOString(),
      type: "meeting",
      read: false,
    };
    notifications.unshift(newNotif);

    deleteDocument("meetings", id);
    saveDocument("notifications", newNotif.id, newNotif);

    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Không tìm thấy cuộc họp để xóa." });
  }
});

// 2.5. Work Reports & Directives API
app.get("/api/work-reports", (req, res) => {
  res.json(workReports);
});

app.delete("/api/work-reports/:id", (req, res) => {
  const { id } = req.params;
  const { role, userName } = req.query;
  
  if (role !== "admin" && role !== "truongKhoa") {
    return res.status(403).json({ error: "Bạn không có quyền xóa báo cáo/ý kiến này." });
  }

  const index = workReports.findIndex((r) => r.id === id);
  if (index !== -1) {
    const deletedReport = workReports[index];
    workReports.splice(index, 1);

    const actorName = userName || (role === "admin" ? "Quản trị viên" : "Trưởng khoa");

    // Push notification for deleted work-report
    const newNotif = {
      id: "n_" + Date.now(),
      title: "Báo cáo / ý kiến đã bị xóa",
      content: `${actorName} đã xóa ${deletedReport.category === 'report' ? 'báo cáo' : deletedReport.category === 'suggestion' ? 'ý kiến đóng góp' : 'yêu cầu chỉ đạo'} "${deletedReport.title}" khỏi hệ thống.`,
      timestamp: new Date().toISOString(),
      type: "task" as 'meeting' | 'task' | 'update' | 'report' | 'system' | 'alert',
      read: false,
    };
    notifications.unshift(newNotif);

    deleteDocument("workReports", id);
    saveDocument("notifications", newNotif.id, newNotif);

    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Không tìm thấy báo cáo hoặc ý kiến để xóa." });
  }
});

app.post("/api/work-reports", (req, res) => {
  const { report, user } = req.body;
  if (!report || !user) {
    return res.status(400).json({ error: "Thiếu dữ liệu báo cáo hoặc người dùng" });
  }
  
  const newReport = {
    id: "wr_" + Date.now(),
    title: report.title,
    content: report.content,
    category: report.category || "report",
    departmentName: user.departmentName || "Phòng ban",
    submittedBy: user.name,
    submittedById: user.id,
    submittedAt: new Date().toISOString(),
    status: "pending",
    comments: [] as any[]
  };
  
  workReports.unshift(newReport);
  
  // Push notification for new report
  const newNotif = {
    id: "n_" + Date.now(),
    title: "Báo cáo / Ý kiến mới",
    content: `${user.name} (${user.departmentName}) đã gửi báo cáo/ý kiến mới: "${report.title}".`,
    timestamp: new Date().toISOString(),
    type: "task" as 'meeting' | 'task' | 'update' | 'report' | 'system' | 'alert',
    read: false
  };
  notifications.unshift(newNotif);

  saveDocument("workReports", newReport.id, newReport);
  saveDocument("notifications", newNotif.id, newNotif);
  
  res.json({ success: true, report: newReport });
});

app.post("/api/work-reports/:id/directive", (req, res) => {
  const { id } = req.params;
  const { directiveContent, actionStatus, user } = req.body;
  
  const report = workReports.find(r => r.id === id);
  if (!report) {
    return res.status(404).json({ error: "Không tìm thấy báo cáo" });
  }
  
  report.directive = {
    content: directiveContent,
    directedBy: user?.name || "Lãnh đạo khoa",
    directedAt: new Date().toISOString(),
    actionStatus: actionStatus // 'approve' | 'revise' | 'acknowledge' | 'decline'
  };
  
  // Update status based on leadership directive action
  if (actionStatus === "approve") {
    report.status = "approved";
  } else if (actionStatus === "revise") {
    report.status = "reviewed";
  } else if (actionStatus === "acknowledge") {
    report.status = "reviewed";
  } else if (actionStatus === "decline") {
    report.status = "rejected";
  }
  
  // Notify department
  const newNotif = {
    id: "n_" + Date.now(),
    title: "Có chỉ đạo mới từ lãnh đạo khoa",
    content: `Lãnh đạo khoa đã đưa ra chỉ đạo cho báo cáo "${report.title}" của bạn.`,
    timestamp: new Date().toISOString(),
    type: "alert" as 'meeting' | 'task' | 'update' | 'report' | 'system' | 'alert',
    read: false
  };
  notifications.unshift(newNotif);

  saveDocument("workReports", id, report);
  saveDocument("notifications", newNotif.id, newNotif);
  
  res.json({ success: true, report });
});

app.post("/api/work-reports/:id/assign", (req, res) => {
  const { id } = req.params;
  const { taskDescription, deadline, priority, assigneeName, assigneeId } = req.body;
  
  const report = workReports.find(r => r.id === id);
  if (!report) {
    return res.status(404).json({ error: "Không tìm thấy báo cáo" });
  }
  
  report.assignedTask = {
    description: taskDescription,
    deadline: deadline,
    priority: priority || "medium",
    assigneeName: assigneeName || report.submittedBy,
    assigneeId: assigneeId || report.submittedById,
    progress: "not_started",
    updatedAt: new Date().toISOString()
  };
  report.status = "processing";
  
  // Notify assignee
  const newNotif = {
    id: "n_" + Date.now(),
    title: "Bạn có nhiệm vụ mới được phân công",
    content: `Lãnh đạo khoa đã phân công nhiệm vụ: "${taskDescription}" cho bạn. Hạn chót: ${deadline || "Không có"}.`,
    timestamp: new Date().toISOString(),
    type: "task" as 'meeting' | 'task' | 'update' | 'report' | 'system' | 'alert',
    read: false
  };
  notifications.unshift(newNotif);

  saveDocument("workReports", id, report);
  saveDocument("notifications", newNotif.id, newNotif);
  
  res.json({ success: true, report });
});

app.post("/api/work-reports/:id/comment", (req, res) => {
  const { id } = req.params;
  const { content, user } = req.body;
  
  const report = workReports.find(r => r.id === id);
  if (!report) {
    return res.status(404).json({ error: "Không tìm thấy báo cáo" });
  }
  
  const newComment = {
    id: "c_" + Date.now(),
    user: user?.name || "Ẩn danh",
    userId: user?.id || "unknown",
    content: content,
    createdAt: new Date().toISOString()
  };
  
  if (!report.comments) report.comments = [];
  report.comments.push(newComment);

  saveDocument("workReports", id, report);
  
  res.json({ success: true, comment: newComment, report });
});

app.delete("/api/work-reports/:id/comment/:commentId", (req, res) => {
  const { id, commentId } = req.params;
  const { role } = req.query;
  
  if (role !== "admin" && role !== "truongKhoa") {
    return res.status(403).json({ error: "Bạn không có quyền xóa ý kiến thảo luận này." });
  }
  
  const report = workReports.find(r => r.id === id);
  if (!report) {
    return res.status(404).json({ error: "Không tìm thấy báo cáo" });
  }
  
  if (!report.comments) {
    return res.status(404).json({ error: "Chưa có ý kiến phản hồi nào trong báo cáo này." });
  }
  
  const index = report.comments.findIndex(c => c.id === commentId);
  if (index !== -1) {
    report.comments.splice(index, 1);

    saveDocument("workReports", id, report);

    res.json({ success: true, report });
  } else {
    res.status(404).json({ error: "Không tìm thấy ý kiến thảo luận để xóa." });
  }
});

app.post("/api/work-reports/:id/progress", (req, res) => {
  const { id } = req.params;
  const { progress } = req.body;
  
  const report = workReports.find(r => r.id === id);
  if (!report) {
    return res.status(404).json({ error: "Không tìm thấy báo cáo" });
  }
  
  if (report.assignedTask) {
    report.assignedTask.progress = progress;
    report.assignedTask.updatedAt = new Date().toISOString();
    
    if (progress === "completed") {
      report.status = "approved";
    }

    saveDocument("workReports", id, report);
    
    res.json({ success: true, report });
  } else {
    res.status(400).json({ error: "Báo cáo này chưa được phân công nhiệm vụ" });
  }
});

// 3. Notifications API
app.get("/api/notifications", (req, res) => {
  res.json(notifications);
});

app.post("/api/notifications/read", (req, res) => {
  const { id } = req.body;
  if (id) {
    const notif = notifications.find((n) => n.id === id);
    if (notif) {
      notif.read = true;
      saveDocument("notifications", notif.id, notif);
    }
  } else {
    // Mark all as read
    notifications.forEach((n) => {
      n.read = true;
      saveDocument("notifications", n.id, n);
    });
  }
  res.json({ success: true });
});

// Simulate Notification Custom Trigger Endpoint
app.post("/api/notifications/simulate", (req, res) => {
  const { type } = req.body;
  
  const simulationPool = {
    meeting: [
      {
        title: "Nhắc nhở lịch họp giao ban",
        content: "Nhắc nhở: Lịch họp 'Giao ban khoa đột xuất bàn giao trực kỹ thuật' sẽ diễn ra lúc 07:30 ngày mai tại Văn phòng hành chính khoa. Đề nghị chuẩn bị báo cáo.",
        type: "meeting"
      },
      {
        title: "Họp khẩn cập nhật quy trình",
        content: "BS. Lê Minh Tâm triệu tập cuộc họp trực tuyến khẩn vào lúc 14h00 hôm nay bàn về việc xử lý sự cố rò rỉ phòng X-quang số 2.",
        type: "meeting"
      }
    ],
    task: [
      {
        title: "Nhiệm vụ mới được phân công",
        content: "Trưởng khoa giao: KTV phòng Siêu âm rà soát và nâng cấp firmware máy siêu âm phòng 3, hoàn thành trước 17h00 hôm nay.",
        type: "task"
      },
      {
        title: "Yêu cầu kiểm chuẩn (IQC)",
        content: "Nhiệm vụ: Bộ phận Xét nghiệm thực hiện quy trình nội kiểm máy sinh hóa đầu tuần và cập nhật kết quả lên phần mềm quản lý chất lượng.",
        type: "task"
      },
      {
        title: "Vật tư tiêu hao phòng Nội soi",
        content: "Nhiệm vụ: Bộ phận Nội soi kiểm kho và lập phiếu dự trù vật tư Clotest H.pylori chuyển hành chính khoa tổng hợp trước 11h30.",
        type: "task"
      }
    ],
    update: [
      {
        title: "Cập nhật quan trọng từ Quản lý",
        content: "Thông báo từ Trưởng khoa Lê Minh Tâm: Điều chỉnh định mức sử dụng vật có bảo hiểm và quy trình tiếp đón bệnh nhân giờ cao điểm.",
        type: "update"
      },
      {
        title: "Thông báo sửa chữa thiết bị",
        content: "Thông báo từ phòng Vật tư: Máy chụp CT-Scan phòng X-quang đã hoàn thành bảo dưỡng định kỳ và đưa vào hoạt động bình thường kể từ 10h00.",
        type: "update"
      }
    ]
  };

  const pool = simulationPool[type as 'meeting' | 'task' | 'update'] || simulationPool.meeting;
  const randomIndex = Math.floor(Math.random() * pool.length);
  const selected = pool[randomIndex];

  const newNotif = {
    id: "sn_" + Date.now(),
    title: selected.title,
    content: selected.content,
    timestamp: new Date().toISOString(),
    type: selected.type as 'meeting' | 'task' | 'update' | 'report' | 'system' | 'alert',
    read: false
  };

  notifications.unshift(newNotif);
  saveDocument("notifications", newNotif.id, newNotif);

  res.json({ success: true, notification: newNotif });
});

// 4. Gemini AI Automation - Generating Official Handover Minutes
app.post("/api/gemini/generate-minutes", async (req, res) => {
  const { meetingId, notes, dateMetrics } = req.body;
  
  const meeting = meetings.find((m) => m.id === meetingId);
  if (!meeting) {
    return res.status(404).json({ error: "Không tìm thấy cuộc họp." });
  }

  // Construct context of clinical metrics for the day if provided
  let metricsContext = "";
  if (dateMetrics) {
    try {
      metricsContext = `
DƯỚI ĐÂY LÀ SỐ LIỆU CHUYÊN MÔN CỦA KHOA CẬN LÂM SÀNG TRONG NGÀY ${dateMetrics.date}:
- Siêu Âm: ${dateMetrics.sieuAmText || "Ổn định"}
- Nội Soi: ${dateMetrics.noiSoiText || "Ổn định"}
- X-quang: ${dateMetrics.xQuangText || "Ổn định"}
- Điện tim & LHN: ${dateMetrics.dienTimText || "Ổn định"}
- Xét nghiệm: ${dateMetrics.xetNghiemText || "Ổn định"}
Tổng cộng lượt thực hiện: Bảo hiểm y tế: ${dateMetrics.totalBh}, Dịch vụ: ${dateMetrics.totalNd}.
`;
    } catch (e) {
      console.warn("Could not compile metrics context", e);
    }
  }

  const prompt = `
Bạn là Trợ lý AI y khoa hành chính thông minh hoạt động tại Khoa Cận lâm sàng của một bệnh viện đa khoa lớn tại Việt Nam. Trưởng khoa Lê Minh Tâm giao cho bạn tổng hợp một "BIÊN BẢN HỌP GIAO BAN KHOA CHÍNH QUY VÀ CHUYÊN NGHIỆP" dựa trên các thông tin thô sau:

THÔNG TIN CUỘC HỌP:
- Tên cuộc họp: ${meeting.title}
- Thời gian: ${meeting.dateTime}
- Địa điểm: ${meeting.venue}
- Người chủ trì: ${meeting.chairperson}
- Thư ký: ${meeting.secretary}
- Thành phần tham dự: ${meeting.attendees?.join(", ") || "Toàn bộ nhân viên khoa"}
- Chương trình họp (Agenda):
${meeting.agenda}

GHI CHÚ HỌP THÔ (NOTES):
${notes || "Không có ghi chú thô. Vui lòng dựa vào chương trình họp và số liệu để tự soạn thảo đầy đủ."}
${metricsContext}

YÊU CẦU ĐỊNH DẠNG VÀ NỘI DUNG:
1. Soạn thảo bằng tiếng Việt chuẩn y khoa hành chính chính quy, nghiêm túc, trang trọng (đầy đủ Quốc hiệu Tiêu ngữ nếu cần, hoặc tiêu đề biên bản giao ban khoa).
2. Chia rõ ràng thành các mục:
   - THÔNG TIN CHUNG (Thời gian, địa điểm, chủ trì, thư ký, thành viên)
   - BÁO CÁO TÌNH HÌNH CHUYÊN MÔN & SỐ LIỆU (Xem xét các số liệu lâm sàng nếu có trong văn bản, tính toán phân tích thông minh tỷ lệ hoặc nhận xét sự tăng giảm).
   - NỘI DUNG THẢO LUẬN & Ý KIẾN ĐÓNG GÓP (Mô tả chi tiết, chỉnh chu các thảo luận rắc rối của bác sĩ/kỹ thuật viên về quy trình phòng dịch, bôi trơn thiết bị, quá tải giờ cao điểm, hoặc kiểm chuẩn xét nghiệm).
   - KẾT LUẬN & CHỈ ĐẠO CỦA TRƯỞNG KHOA (Rõ ràng các mốc thời gian hoàn thành, phân công nhiệm vụ cụ thể cho từng KTV/Bác sĩ phụ trách).
3. Sử dụng định dạng Markdown phong phú (Bôi đậm, danh bạ đầu dòng, bảng số liệu nếu cần) để hiển thị thật đẹp mắt trên giao diện web. Tránh sử dụng các ký tự lạ hoặc ngôn từ sáo rỗng.

Hãy viết biên bản này một cách toàn diện và chính xác nhất.
`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const generatedMinutes = response.text;
      
      // Update in memory database
      meeting.notes = notes;
      meeting.minutes = generatedMinutes;
      meeting.status = "completed";

      res.json({ success: true, minutes: generatedMinutes });
    } catch (err: any) {
      console.error("Gemini Generation Error:", err);
      res.status(500).json({ 
        error: "Sự cố kết nối AI khi tự động hóa biên bản. Vui lòng thử lại sau.", 
        details: err?.message || "" 
      });
    }
  } else {
    // Simulation / Mock mode if no API key is provided
    setTimeout(() => {
      const mockResult = `### BIÊN BẢN GIAO BAN KHOA CẬN LÂM SÀNG (BẢN TỰ ĐỘNG - AI MOCK)
**Thời gian thực hiện**: ${meeting.dateTime.replace("T", " ")}
**Địa điểm diễn ra**: ${meeting.venue}
**Chủ trì phiên họp**: ${meeting.chairperson}
**Thư ký lập biên bản**: ${meeting.secretary}

#### I. THÀNH PHẦN THAM DỰ
- Gồm: ${meeting.attendees?.join(", ") || "Toàn thể y bác sĩ chi khoa"}.
- Ghi nhận tham gia đầy đủ, không có ai vắng mặt không lý do.

#### II. BÁO CÁO CHÊN MÔN & PHÂN TÍCH SỐ LIỆU
${metricsContext ? `Dựa trên số liệu chuyên môn ngày ${dateMetrics.date} được nạp vào hệ thống:
* Bộ phận **Siêu âm** và **Nội soi** thực hiện an toàn, đạt hiệu suất tốt.
* Khoa ghi nhận tổng số lượt khám bệnh của ngày là **${dateMetrics.totalBh} (BHYT)** và **${dateMetrics.totalNd} (Dịch vụ)**, phản ánh sự phục hồi đáng kể số lượng bệnh nhân ngoại trú.
* Quy trình tiếp đón khép kín hoạt động nhuần nhuyễn.` : `* Đánh giá chung: Các bộ phận duy trì tốt công suất tiếp nhận bệnh nhân. Tín hiệu vận hành ghi nhận mức độ ổn định cao.
* Bộ phận siêu âm quá tải nhẹ vào khung giờ sáng, nội soi gây mê phối hợp an toàn tốt.`}

#### III. GHI CHÚ NỘI DUNG THẢO LUẬN CHI TIẾT
Dựa trên các ghi chú thô của cuộc họp liên quan:
${notes ? notes.split("\n").map(line => `* ${line}`).join("\n") : "* Các bác sĩ thảo luận sâu về cải tiến thời gian trả kết quả chẩn đoán hình ảnh và bộ quy trình chống nhiễm khuẩn dây soi mềm."}

#### IV. KẾT LUẬN & KIẾN NGHỊ CHỈ ĐẠO CỦA TRƯỞNG KHOA
1. **Phòng Siêu Âm**: Tiếp tục theo dõi luồng bệnh nhân, đề xuất bổ sung thêm ghế đợi nếu cần.
2. **Phòng Nội Soi**: Quản lý tốt vật tư, hạn chế tối đa hao hụt và rà soát vật tư Clotest.
3. **Phòng Xét Nghiệm**: Đảm bảo thực hiện quy trình nội kiểm (IQC) và ngoại kiểm (EQC) đúng thời hạn.
4. **Hành chính**: Lưu trữ biên bản này lên hệ thống mạng nội bộ và gửi Ban Giám Đốc trước 16h00 cùng ngày.`;

      meeting.notes = notes;
      meeting.minutes = mockResult;
      meeting.status = "completed";

      res.json({ success: true, minutes: mockResult, simulated: true });
    }, 1500);
  }
});

// 5. Clinical Demand AI Forecasting Engine
app.post("/api/gemini/forecast", async (req, res) => {
  const activeReports = reports
    .filter((r) => r.status === "approved" || r.status === "submitted")
    .sort((a, b) => a.date.localeCompare(b.date));

  if (activeReports.length === 0) {
    return res.status(400).json({ error: "Không tìm thấy báo cáo nào trong cơ sở dữ liệu." });
  }

  // Format historical series for the prompt
  const historySeries = activeReports.map((r) => {
    const counts = r.items.reduce(
      (acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.bh + item.nd;
        acc.total += item.bh + item.nd;
        return acc;
      },
      { sieuAm: 0, noiSoi: 0, xQuang: 0, dienTimLHN: 0, xetNghiem: 0, total: 0 }
    );
    return `Ngày ${r.date}: Tổng ${counts.total} ca (Siêu âm: ${counts.sieuAm}, Nội soi: ${counts.noiSoi}, X-quang: ${counts.xQuang}, Điện tim/LHN: ${counts.dienTimLHN}, Xét nghiệm: ${counts.xetNghiem})`;
  });

  const historyContext = historySeries.join("\n");
  const lastDate = activeReports[activeReports.length - 1].date;

  const prompt = `
Bạn là Chuyên gia phân tích dữ liệu y tế và dự báo nhu cầu lâm sàng (Clinical Demand Forecaster) hoạt động tại Khoa Cận lâm sàng. Hãy phân tích dữ liệu lịch sử sử dụng dịch vụ cận lâm sàng của khoa dưới đây:

DỮ LIỆU LỊCH SỬ THỰC TẾ:
${historyContext}

YÊU CẦU DỰ BÁO:
1. Hãy dự báo chính xác nhu cầu lượt ca thực hiện cho 3 ngày làm việc tiếp theo kể từ ngày cuối cùng ghi nhận trong lịch sử (${lastDate}). Nhớ tiếp tục tăng ngày tiếp theo theo lịch thực tế (ví dụ: ngày tiếp theo tuần tự là ${lastDate} + 1 ngày, + 2 ngày, + 3 ngày). Nếu ngày cuối là 2026-03-17, 3 ngày dự báo tiếp theo lần lượt là 2026-03-18, 2026-03-19, 2026-03-20.
2. Phân tích ước lượng số lượng ca của từng chuyên khoa (sieuAm - Siêu âm, noiSoi - Nội soi, xQuang - X-quang, dienTimLHN - Điện tim & LHN, xetNghiem - Xét nghiệm) dựa trên biến động trong lịch sử. Nhận diện chu kỳ tuần (ví dụ: ngày giữa tuần đông bệnh hơn hay cuối tuần giảm đi).
3. Đề xuất các khuyến nghị mang tính hành động thực tiễn y khoa (Insights) về: bố trí nhân lực trực, chuẩn bị vật tư y tế tiêu hao (Ví dụ: Clotest cho nội soi, hóa chất sinh hóa cho xét nghiệm), cảnh báo nguy cơ quá tải hay hỏng hóc máy móc thiết bị phòng ban.

Đầu ra phải hoàn toàn tuân thủ đúng định dạng JSON đã được cấu hình trong responseSchema. Hãy viết các bình luận và khuyến nghị bằng Tiếng Việt chuẩn y khoa hành chính sạch sẽ, chuyên nghiệp, trang trọng, giàu chuyên môn và có giá trị tham khảo ứng dụng thực nghiệm cao.
`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              predictions: {
                type: Type.ARRAY,
                description: "Danh sách dự báo nhu cầu cho 3 ngày tiếp theo",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING, description: "Định dạng YYYY-MM-DD" },
                    dayOfWeek: { type: Type.STRING, description: "Tên thứ trong tuần ở Việt Nam (ví dụ: Thứ Tư)" },
                    sieuAm: { type: Type.INTEGER },
                    noiSoi: { type: Type.INTEGER },
                    xQuang: { type: Type.INTEGER },
                    dienTimLHN: { type: Type.INTEGER },
                    xetNghiem: { type: Type.INTEGER },
                    total: { type: Type.INTEGER, description: "Tổng cộng các category" },
                    reasoning: { type: Type.STRING, description: "Lời giải thích y khoa tóm lược cho ngày dự báo này" }
                  },
                  required: ["date", "dayOfWeek", "sieuAm", "noiSoi", "xQuang", "dienTimLHN", "xetNghiem", "total", "reasoning"]
                }
              },
              insights: {
                type: Type.ARRAY,
                description: "Các ý kiến cảnh báo, đề xuất hoặc khuyến nghị (tối thiểu 3-4 mục)",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    topic: { type: Type.STRING, description: "Tiêu đề ngắn gọn chi tiết" },
                    category: { type: Type.STRING, description: "Phạm vi: 'Nhân lực' | 'Vật tư' | 'Vận hành' | 'Thiết bị'" },
                    impact: { type: Type.STRING, description: "'HIGH' | 'MEDIUM' | 'LOW'" },
                    recommendation: { type: Type.STRING, description: "Mô tả khuyến nghị chi tiết hướng giải quyết" }
                  },
                  required: ["topic", "category", "impact", "recommendation"]
                }
              },
              generalTrend: {
                type: Type.STRING,
                description: "Đánh giá xu hướng chung cho cả kỳ kế tiếp"
              }
            },
            required: ["predictions", "insights", "generalTrend"]
          }
        }
      });

      const parsed = JSON.parse(response.text);
      res.json({ success: true, ...parsed });

    } catch (err: any) {
      console.error("Gemini Forecast Error, running helper fallback:", err);
      const fallbackData = generateFallbackForecast(activeReports);
      res.json({ success: true, ...fallbackData, errorWarning: "Mô hình AI bận, chuyển đổi sang phân tích toán học dự phòng tuyến tính." });
    }
  } else {
    // Simulator Mode when API Key is absent
    const fallbackData = generateFallbackForecast(activeReports);
    res.json({ success: true, ...fallbackData, simulated: true });
  }
});

function generateFallbackForecast(activeReports: any[]) {
  const lastReport = activeReports[activeReports.length - 1];
  const lastDateStr = lastReport ? lastReport.date : "2026-03-17";
  
  const predictions: any[] = [];
  const daysOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  
  const sums = { sieuAm: 0, noiSoi: 0, xQuang: 0, dienTimLHN: 0, xetNghiem: 0 };
  activeReports.forEach(r => {
    r.items.forEach((item: any) => {
      const cat = item.category;
      if (sums[cat as keyof typeof sums] !== undefined) {
        sums[cat as keyof typeof sums] += item.bh + item.nd;
      }
    });
  });
  
  const count = activeReports.length || 1;
  const avg = {
    sieuAm: Math.round(sums.sieuAm / count) || 120,
    noiSoi: Math.round(sums.noiSoi / count) || 20,
    xQuang: Math.round(sums.xQuang / count) || 120,
    dienTimLHN: Math.round(sums.dienTimLHN / count) || 35,
    xetNghiem: Math.round(sums.xetNghiem / count) || 600
  };

  for (let i = 1; i <= 3; i++) {
    const nextDateObj = new Date(lastDateStr);
    nextDateObj.setDate(nextDateObj.getDate() + i);
    const dateString = nextDateObj.toISOString().split('T')[0];
    const dowStr = daysOfWeek[nextDateObj.getDay()];
    
    let multiplier = 1.0;
    const dowNum = nextDateObj.getDay();
    if (dowNum === 1) multiplier = 1.15; // Thứ Hai (+15%)
    else if (dowNum === 0 || dowNum === 6) multiplier = 0.70; // Cuối tuần (-30%)
    else multiplier = 0.95 + (Math.random() * 0.1);
    
    const pSieuAm = Math.round(avg.sieuAm * multiplier);
    const pNoiSoi = Math.round(avg.noiSoi * multiplier);
    const pXQuang = Math.round(avg.xQuang * multiplier);
    const pDienTim = Math.round(avg.dienTimLHN * multiplier);
    const pXetNghiem = Math.round(avg.xetNghiem * multiplier);
    const pTotal = pSieuAm + pNoiSoi + pXQuang + pDienTim + pXetNghiem;
    
    let reasoning = "";
    if (dowNum === 1) {
      reasoning = `Đầu tuần mới ghi nhận áp lượng hội chẩn tăng cao, dự đoán lượng bệnh nhân đăng ký Siêu âm tổng quát và Xét nghiệm máu tăng tương tự các chu kỳ tuần trước.`;
    } else if (dowNum === 0 || dowNum === 6) {
      reasoning = `Cuối tuần công suất hoạt động giảm nhẹ, tập trung phần nhiều vào luồng cấp cứu nội khoa và lịch hẹn tự nguyện có trả phí trước.`;
    } else {
      reasoning = `Giữa tuần tải lượng chẩn đoán cận lâm sàng đi ngang ổn định. Các phòng ban hoạt động đều đặn theo công suất thiết kế.`;
    }
    
    predictions.push({
      date: dateString,
      dayOfWeek: dowStr,
      sieuAm: pSieuAm,
      noiSoi: pNoiSoi,
      xQuang: pXQuang,
      dienTimLHN: pDienTim,
      xetNghiem: pXetNghiem,
      total: pTotal,
      reasoning: reasoning
    });
  }

  const insights = [
    {
      topic: "Bố trí luồng cấp cứu phòng Siêu âm",
      category: "Nhân lực",
      impact: "HIGH",
      recommendation: "Dự báo lượng bệnh nhân đăng ký Siêu âm tổng quát tăng cao trong những ngày tới. Đề xuất tăng cường thêm 01 Bác sĩ tăng cường hỗ trợ phân làn vào khung giờ 08:30 - 10:30."
    },
    {
      topic: "Bảo dưỡng máy ly tâm xét nghiệm",
      category: "Thiết bị",
      impact: "MEDIUM",
      recommendation: "Với công suất Xét nghiệm Sinh hóa dự báo duy trì khoảng 550 ca/ngày, đề xuất điều chuyển bảo lãnh bảo dưỡng máy ly tâm số 2 vào ngày nghỉ để tránh dồn ứ mẫu thử."
    },
    {
      topic: "Dự trù bổ sung Bộ kĩ thuật Clotest",
      category: "Vật tư",
      impact: "HIGH",
      recommendation: "Mô hình dự báo nhận thấy nhu cầu nội soi dạ dày clotest duy trì ổn định cao. Đề xuất kiểm kho và lập phiếu dự trù thêm 50 bộ kit thử Clotest nhằm đảm bảo cung cấp dịch vụ liên tục."
    },
    {
      topic: "Điều tiết bệnh nhân X-quang kỹ thuật số",
      category: "Vận hành",
      impact: "LOW",
      recommendation: "Nhắc nhở y tá tại quầy tiếp đón phân tán khung giờ hẹn chụp X-quang đối với bệnh nhân khám sức khỏe định kỳ sang khung giờ chiều để nhường phòng chụp cho các lượt cấp cứu buổi sáng."
    }
  ];

  return {
    predictions,
    insights,
    generalTrend: `Dự báo trong chu kỳ y tế 3 ngày tới tiếp tục ghi nhận nhu cầu khám chữa bệnh cận lâm sàng ở mức ổn định cao. Tổng ca thực hiện trung bình ước đạt khoảng ${Math.round(predictions.reduce((acc, p) => acc + p.total, 0) / 3)} ca/ngày, trọng tâm dồn vào Xét nghiệm Sinh hóa và Siêu âm tổng hợp. Đề xuất Trưởng khoa cân đối phân bổ ca trực lâm sàng hợp lý.`
  };
}

// 6. Google Sheets API Sync Endpoint
app.post("/api/sheets/sync", async (req, res) => {
  const { month, year, accessToken, spreadsheetUrl, syncAllMonth, date } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: "Thiếu Access Token từ Google. Vui lòng kết nối tài khoản." });
  }

  // Clean and sanitize inputs dynamically to support copy-paste errors
  const cleanToken = String(accessToken).trim().replace(/^Bearer\s+/i, "");
  const cleanUrl = String(spreadsheetUrl || "").trim();

  // Extract Spreadsheet ID from URL
  let spreadsheetId = "";
  try {
    const match = cleanUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      spreadsheetId = match[1];
    } else {
      spreadsheetId = cleanUrl; // assume raw ID if no URL format
    }
  } catch (e) {
    return res.status(400).json({ error: "Đường dẫn Google Sheets không đúng định dạng." });
  }

  if (!spreadsheetId) {
    return res.status(400).json({ error: "Không tìm thấy Spreadsheet ID từ đường dẫn đã cung cấp." });
  }

  // 1. Fetch spreadsheet metadata to check access token AND verify sheet existence
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
  let existingSheetTitles: string[] = [];
  let sheetsList: any[] = [];
  try {
    const metaResponse = await fetch(metaUrl, {
      headers: {
        "Authorization": `Bearer ${cleanToken}`
      }
    });

    if (!metaResponse.ok) {
      let metaErrData: any = {};
      try {
        metaErrData = await metaResponse.json();
      } catch (e) {
        metaErrData = { error: { message: `HTTP status text: ${metaResponse.statusText}` } };
      }
      console.error("Google Sheets Metadata API Error:", metaErrData);
      const status = metaResponse.status;
      if (status === 401) {
        return res.status(401).json({
          error: "Mã kết nối Google Access Token đã hết hạn hoặc không hợp lệ (Lỗi 401).\n\nGiải pháp xử lý nhanh:\n1. Cuộn xuống và mở rộng mục 'Cài đặt liên kết (Google Sheets API)' màu đỏ phía dưới.\n2. Thực hiện lấy lại mã 'Access Token' mới qua OAuth Playground (Cách 1) hoặc click nút 'Kết nối Google Account' (Cách 2) để tiếp tục đồng bộ!"
        });
      } else if (status === 403) {
        return res.status(403).json({
          error: "Tài khoản Google liên kết không có quyền chỉnh sửa tài liệu Google Sheets này (Lỗi 403). Bạn cần:\n1. Kiểm tra xem đã đăng nhập đúng Google Account có quyền 'Chỉnh sửa' (Editor) hay chưa.\n2. Nếu đang dùng tài liệu mẫu của người khác, hãy chọn Tệp -> Tạo bản sao (File -> Make a copy) trên trang Google Sheets đó để tạo ra tài liệu cá nhân của riêng bạn, sau đó dán link tài liệu mới của bạn vào đây."
        });
      } else if (status === 404) {
        return res.status(404).json({
          error: "Không tìm thấy tài liệu Google Sheets này (Lỗi 404). Vui lòng kiểm tra lại chính xác đường dẫn Google Sheets của bạn."
        });
      } else {
        const errMsg = metaErrData.error?.message || "Lỗi xác thực hoặc kết nối với Google API.";
        return res.status(status).json({
          error: `Không thể kết nối đến Google Sheets: ${errMsg}`
        });
      }
    }

    let metaData: any = {};
    try {
      metaData = await metaResponse.json();
    } catch (e) {
      return res.status(500).json({ error: "Phản hồi từ Google API không đúng định dạng JSON." });
    }
    sheetsList = (metaData.sheets || []).map((s: any) => ({
      title: s.properties?.title || "",
      sheetId: s.properties?.sheetId,
      columnCount: s.properties?.gridProperties?.columnCount || 26
    }));
    existingSheetTitles = sheetsList.map((s: any) => s.title);
  } catch (err: any) {
    console.error("Sheets Metadata Network Error:", err);
    return res.status(500).json({ error: "Không thể kết nối máy chủ Google API để xác thực quyền truy cập: " + (err.message || "") });
  }

  // 2. Resolve or dynamically create the target sheet tab (Tháng X)
  const sheetNameNormal = `Tháng ${month}`;
  const sheetNamePad = `Tháng ${String(month).padStart(2, "0")}`;
  
  let resolvedSheetName = "";
  let targetSheetInfo: any = null;

  if (existingSheetTitles.includes(sheetNameNormal)) {
    resolvedSheetName = sheetNameNormal;
    targetSheetInfo = sheetsList.find((s: any) => s.title === sheetNameNormal);
  } else if (existingSheetTitles.includes(sheetNamePad)) {
    resolvedSheetName = sheetNamePad;
    targetSheetInfo = sheetsList.find((s: any) => s.title === sheetNamePad);
  } else {
        // Dynamically create the sheet tab name if it doesn't exist
    try {
      const createSheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
      const createResponse = await fetch(createSheetUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetNameNormal,
                  gridProperties: {
                    rowCount: 100,
                    columnCount: 70
                  }
                }
              }
            }
          ]
        })
      });

      if (createResponse.ok) {
        resolvedSheetName = sheetNameNormal;
        const createResData = await createResponse.json() as any;
        const addedSheetProperties = createResData.replies?.[0]?.addSheet?.properties;
        if (addedSheetProperties) {
          targetSheetInfo = {
            title: addedSheetProperties.title,
            sheetId: addedSheetProperties.sheetId,
            columnCount: addedSheetProperties.gridProperties?.columnCount || 70
          };
        }
      } else {
        const createErr = await createResponse.json() as any;
        console.error("Failed to create sheet tab dynamically:", createErr);
        resolvedSheetName = sheetNameNormal; // Fallback
      }
    } catch (e) {
      console.error("Error dynamically adding sheet tab:", e);
      resolvedSheetName = sheetNameNormal; // Fallback
    }
  }

  // 3. Ensure the target sheet has enough columns to prevent 400 Bad Request (Requested writing past end of sheet)
  if (targetSheetInfo && targetSheetInfo.columnCount < 70) {
    try {
      console.log(`Expanding columns of Sheet API from ${targetSheetInfo.columnCount} to 70...`);
      const updateSheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
      const updateResponse = await fetch(updateSheetUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId: targetSheetInfo.sheetId,
                  gridProperties: {
                    rowCount: Math.max(100, targetSheetInfo.rowCount || 0),
                    columnCount: 70
                  }
                },
                fields: "gridProperties.columnCount"
              }
            }
          ]
        })
      });
      if (!updateResponse.ok) {
        const updateErr = await updateResponse.json() as any;
        console.warn("Failed to expand sheet columns dynamically:", updateErr);
      }
    } catch (e) {
      console.error("Error expanding sheet columns:", e);
    }
  }

  // Determine which reports to sync
  let reportsToSync: any[] = [];
  if (syncAllMonth) {
    const prefix = `${year}-${String(month).padStart(2, "0")}-`;
    reportsToSync = reports.filter(r => r.date.startsWith(prefix) && (r.status === "approved" || r.status === "submitted"));
  } else {
    if (!date) {
      return res.status(400).json({ error: "Thiếu ngày cần đồng bộ." });
    }
    const report = reports.find(r => r.date === date && (r.status === "approved" || r.status === "submitted"));
    if (report) {
      reportsToSync = [report];
    } else {
      return res.status(404).json({ error: `Không tìm thấy báo cáo đã duyệt hoặc gửi cho ngày ${date}.` });
    }
  }

  if (reportsToSync.length === 0) {
    return res.status(404).json({ error: "Không có dữ liệu báo cáo (đã duyệt hoặc gửi) nào phù hợp để đồng bộ." });
  }

  const sheetName = resolvedSheetName;

  // Helper to map colIndex to Letter
  const getColLetter = (idx: number): string => {
    let letter = "";
    let temp = idx;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  // Helper value converter (0 is empty to keep sheets clean, same as template image)
  const formatCellVal = (val: any) => {
    if (val === 0 || val === "0" || val === null || val === undefined) {
      return "";
    }
    return Number(val);
  };

  const dataPayload: any[] = [];

  // Synchronize each report's columns
  for (const rep of reportsToSync) {
    // Extract day of month
    const dMatch = rep.date.match(/-(\d{2})$/);
    if (!dMatch) continue;
    const day = parseInt(dMatch[1]);
    if (isNaN(day) || day < 1 || day > 31) continue;

    // Calculate column indexes: Day 1 maps to column index 2 (C) and 3 (D)
    const colBhIdx = day * 2;
    const colNdIdx = day * 2 + 1;

    const colBhLetter = getColLetter(colBhIdx);
    const colNdLetter = getColLetter(colNdIdx);

    // Build the 36 rows of values
    const sheetRows: any[][] = [];

    // Map each item category to lists for ease of summing
    const sieuAmVals: { bh: number; nd: number }[] = [];
    const noiSoiVals: { bh: number; nd: number }[] = [];
    const xQuangVals: { bh: number; nd: number }[] = [];
    const dienTimVals: { bh: number; nd: number }[] = [];
    const xetNghiemVals: { bh: number; nd: number }[] = [];

    const getItemVal = (id: string, group: string) => {
      const item = rep.items.find((it: any) => it.id === id);
      const bh = item ? Number(item.bh || 0) : 0;
      const nd = item ? Number(item.nd || 0) : 0;
      
      const record = { bh, nd };
      if (group === "sieuAm") sieuAmVals.push(record);
      else if (group === "noiSoi") noiSoiVals.push(record);
      else if (group === "xQuang") xQuangVals.push(record);
      else if (group === "dienTim") dienTimVals.push(record);
      else if (group === "xetNghiem") xetNghiemVals.push(record);

      return [formatCellVal(bh), formatCellVal(nd)];
    };

    // Row 7 to 12
    sheetRows.push(getItemVal('sieuAm_tim', 'sieuAm'));
    sheetRows.push(getItemVal('sieuAm_mach', 'sieuAm'));
    sheetRows.push(getItemVal('sieuAm_thai4d', 'sieuAm'));
    sheetRows.push(getItemVal('sieuAm_tongquat', 'sieuAm'));
    sheetRows.push(getItemVal('sieuAm_danHoi', 'sieuAm'));
    sheetRows.push(getItemVal('sieuAm_canThiep', 'sieuAm'));

    // Row 13 - Siêu âm SUM
    const sumSA_bh = sieuAmVals.reduce((acc, v) => acc + v.bh, 0);
    const sumSA_nd = sieuAmVals.reduce((acc, v) => acc + v.nd, 0);
    sheetRows.push([formatCellVal(sumSA_bh), formatCellVal(sumSA_nd)]);

    // Row 14 to 22
    sheetRows.push(getItemVal('noiSoi_daDay', 'noiSoi'));
    sheetRows.push(getItemVal('noiSoi_daiTrucTrang', 'noiSoi'));
    sheetRows.push(getItemVal('noiSoi_trucTrang', 'noiSoi'));
    sheetRows.push(getItemVal('noiSoi_sigma', 'noiSoi'));
    sheetRows.push(getItemVal('noiSoi_thutThao', 'noiSoi'));
    sheetRows.push(getItemVal('noiSoi_catPolyp', 'noiSoi'));
    sheetRows.push(getItemVal('noiSoi_clotest', 'noiSoi'));
    sheetRows.push(getItemVal('noiSoi_gayMeDaDayDaiTrang', 'noiSoi'));
    sheetRows.push(getItemVal('noiSoi_gayMeDon', 'noiSoi'));

    // Row 23 - Nội soi SUM
    const sumNS_bh = noiSoiVals.reduce((acc, v) => acc + v.bh, 0);
    const sumNS_nd = noiSoiVals.reduce((acc, v) => acc + v.nd, 0);
    sheetRows.push([formatCellVal(sumNS_bh), formatCellVal(sumNS_nd)]);

    // Row 24 to 26
    sheetRows.push(getItemVal('xQuang_thuong', 'xQuang'));
    sheetRows.push(getItemVal('xQuang_dacBiet', 'xQuang'));
    sheetRows.push(getItemVal('xQuang_clvt', 'xQuang'));

    // Row 27 - X-quang SUM
    const sumXQ_bh = xQuangVals.reduce((acc, v) => acc + v.bh, 0);
    const sumXQ_nd = xQuangVals.reduce((acc, v) => acc + v.nd, 0);
    sheetRows.push([formatCellVal(sumXQ_bh), formatCellVal(sumXQ_nd)]);

    // Row 28 to 29
    sheetRows.push(getItemVal('dienTim_thuong', 'dienTim'));
    sheetRows.push(getItemVal('dienTim_luuHuyetNao', 'dienTim'));

    // Row 30 - Điện tim SUM
    const sumDT_bh = dienTimVals.reduce((acc, v) => acc + v.bh, 0);
    const sumDT_nd = dienTimVals.reduce((acc, v) => acc + v.nd, 0);
    sheetRows.push([formatCellVal(sumDT_bh), formatCellVal(sumDT_nd)]);

    // Row 31 to 40
    sheetRows.push(getItemVal('xetNghiem_sinhHoa', 'xetNghiem'));
    sheetRows.push(getItemVal('xetNghiem_huyetHoc', 'xetNghiem'));
    sheetRows.push(getItemVal('xetNghiem_nuocTieu', 'xetNghiem'));
    sheetRows.push(getItemVal('xetNghiem_viSinh', 'xetNghiem'));
    sheetRows.push(getItemVal('xetNghiem_mienDich', 'xetNghiem'));
    sheetRows.push(getItemVal('xetNghiem_melatec', 'xetNghiem'));
    sheetRows.push(getItemVal('xetNghiem_hopeHpv', 'xetNghiem'));
    sheetRows.push(getItemVal('xetNghiem_hopePap', 'xetNghiem'));
    sheetRows.push(getItemVal('xetNghiem_teBao', 'xetNghiem'));
    sheetRows.push(getItemVal('xetNghiem_thinPrep', 'xetNghiem'));

    // Row 41 - Xét nghiệm SUM
    const sumXN_bh = xetNghiemVals.reduce((acc, v) => acc + v.bh, 0);
    const sumXN_nd = xetNghiemVals.reduce((acc, v) => acc + v.nd, 0);
    sheetRows.push([formatCellVal(sumXN_bh), formatCellVal(sumXN_nd)]);

    // Row 42 - GRAND TOTAL
    const total_bh = sumSA_bh + sumNS_bh + sumXQ_bh + sumDT_bh + sumXN_bh;
    const total_nd = sumSA_nd + sumNS_nd + sumXQ_nd + sumDT_nd + sumXN_nd;
    sheetRows.push([formatCellVal(total_bh), formatCellVal(total_nd)]);

    // Construct Range
    const range = `'${sheetName}'!${colBhLetter}7:${colNdLetter}42`;
    dataPayload.push({
      range,
      values: sheetRows
    });
  }

  // Gửi yêu cầu lên Google Sheets API
  try {
    const googleApiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
    
    const response = await fetch(googleApiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cleanToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: dataPayload
      })
    });

    const resultData = await response.json();

    if (!response.ok) {
      console.error("Google Sheets API Error Response:", resultData);
      const errMsg = resultData.error?.message || "Lỗi giao dịch với Google API.";
      return res.status(response.status).json({ 
        error: `Không thể cập nhật Google Sheets: ${errMsg}`,
        details: resultData 
      });
    }

    // Ghi nhận Audit Log
    serverAuditLogs.unshift({
      id: "log_" + Date.now(),
      actor: req.body.activeUser || "Hệ thống",
      action: "Đồng bộ Google Sheets",
      details: syncAllMonth 
        ? `Đồng bộ toàn bộ báo cáo Tháng ${month}/${year} lên Google Sheets (${reportsToSync.length} ngày)`
        : `Đồng bộ số liệu báo cáo ngày ${date} lên Google Sheets`,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: syncAllMonth 
        ? `Đã đồng bộ thành công dữ liệu của ${reportsToSync.length} ngày của Tháng ${month}/${year}.`
        : `Đã đồng bộ thành công dữ liệu ngày ${date} lên Google Sheets.`,
      updatedRangesCount: dataPayload.length,
      details: resultData
    });

  } catch (err: any) {
    console.error("Sheets Network Error:", err);
    res.status(500).json({ 
      error: "Không thể kết nối đến máy chủ Google Sheets.", 
      details: err?.message || "" 
    });
  }
});

// 7. Google Sheets API Pull Endpoint
app.post("/api/sheets/pull", async (req, res) => {
  const { month, year, accessToken, spreadsheetUrl, pullAllMonth, date, activeUser } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: "Thiếu Access Token từ Google. Vui lòng kết nối tài khoản." });
  }

  // Clean and sanitize inputs dynamically to support copy-paste errors
  const cleanToken = String(accessToken).trim().replace(/^Bearer\s+/i, "");
  const cleanUrl = String(spreadsheetUrl || "").trim();

  // Extract Spreadsheet ID from URL
  let spreadsheetId = "";
  try {
    const match = cleanUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      spreadsheetId = match[1];
    } else {
      spreadsheetId = cleanUrl; // assume raw ID if no URL format
    }
  } catch (e) {
    return res.status(400).json({ error: "Đường dẫn Google Sheets không đúng định dạng." });
  }

  if (!spreadsheetId) {
    return res.status(400).json({ error: "Không tìm thấy Spreadsheet ID từ đường dẫn đã cung cấp." });
  }

  // Fetch spreadsheet metadata to check access token AND verify sheet existence
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
  let existingSheetTitles: string[] = [];
  try {
    const metaResponse = await fetch(metaUrl, {
      headers: {
        "Authorization": `Bearer ${cleanToken}`
      }
    });

    if (!metaResponse.ok) {
      let metaErrData: any = {};
      try {
        metaErrData = await metaResponse.json();
      } catch (e) {
        metaErrData = { error: { message: `HTTP status text: ${metaResponse.statusText}` } };
      }
      console.error("Google Sheets Metadata API Error:", metaErrData);
      const status = metaResponse.status;
      if (status === 401) {
        return res.status(401).json({
          error: "Mã kết nối Google Access Token đã hết hạn hoặc không hợp lệ (Lỗi 401).\n\nGiải pháp xử lý nhanh:\n1. Cuộn xuống và mở rộng mục 'Cài đặt liên kết (Google Sheets API)' màu đỏ phía dưới.\n2. Thực hiện lấy lại mã 'Access Token' mới qua OAuth Playground (Cách 1) hoặc click nút 'Kết nối Google Account' (Cách 2) để tiếp tục đồng bộ!"
        });
      } else if (status === 403) {
        return res.status(403).json({
          error: "Tài khoản Google liên kết không có quyền truy cập tài liệu Google Sheets này (Lỗi 403)."
        });
      } else if (status === 404) {
        return res.status(404).json({
          error: "Không tìm thấy tài liệu Google Sheets này (Lỗi 404). Vui lòng kiểm tra lại chính xác đường dẫn."
        });
      } else {
        const errMsg = metaErrData.error?.message || "Lỗi xác thực hoặc kết nối với Google API.";
        return res.status(status).json({
          error: `Không thể kết nối đến Google Sheets: ${errMsg}`
        });
      }
    }

    let metaData: any = {};
    try {
      metaData = await metaResponse.json();
    } catch (e) {
      return res.status(500).json({ error: "Phản hồi từ Google API không đúng định dạng JSON." });
    }
    existingSheetTitles = (metaData.sheets || []).map((s: any) => s.properties?.title || "");
  } catch (err: any) {
    console.error("Sheets Metadata Network Error:", err);
    return res.status(500).json({ error: "Không thể kết nối máy chủ Google API để xác thực quyền truy cập: " + (err.message || "") });
  }

  const sheetNameNormal = `Tháng ${month}`;
  const sheetNamePad = `Tháng ${String(month).padStart(2, "0")}`;
  
  let resolvedSheetName = "";
  if (existingSheetTitles.includes(sheetNameNormal)) {
    resolvedSheetName = sheetNameNormal;
  } else if (existingSheetTitles.includes(sheetNamePad)) {
    resolvedSheetName = sheetNamePad;
  } else {
    return res.status(404).json({
      error: `Không tìm thấy tab trang tính '${sheetNameNormal}' hay '${sheetNamePad}' trong bảng tính Google Sheets của bạn để tải dữ liệu.`
    });
  }

  // Define Helper to translate colIndex to Letter
  const getColLetter = (idx: number): string => {
    let letter = "";
    let temp = idx;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  // Determine the cell ranges to fetch
  let selectColRange = "";
  if (pullAllMonth) {
    selectColRange = "C7:BL40";
  } else {
    if (!date) {
      return res.status(400).json({ error: "Thiếu ngày cần tải về." });
    }
    const dMatch = date.match(/-(\d{2})$/);
    if (!dMatch) {
      return res.status(400).json({ error: "Định dạng ngày không hợp lệ." });
    }
    const dayNum = parseInt(dMatch[1]);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      return res.status(400).json({ error: "Ngày không hợp lệ." });
    }
    const colBhLetter = getColLetter(dayNum * 2);
    const colNdLetter = getColLetter(dayNum * 2 + 1);
    selectColRange = `${colBhLetter}7:${colNdLetter}40`;
  }

  // Fetch the sheet range values using Google Sheets API
  const sheetValuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(resolvedSheetName)}'!${selectColRange}`;
  let rawRows: any[][] = [];
  try {
    const valResponse = await fetch(sheetValuesUrl, {
      headers: {
        "Authorization": `Bearer ${cleanToken}`
      }
    });

    if (!valResponse.ok) {
      const valErrData = await valResponse.json() as any;
      console.error("Google Sheets Values API Error:", valErrData);
      return res.status(valResponse.status).json({
        error: `Không thể đọc dữ liệu từ Google Sheets: ${valErrData.error?.message || "Lỗi đọc dữ liệu"}`
      });
    }

    const valData = await valResponse.json() as any;
    rawRows = valData.values || [];
  } catch (err: any) {
    console.error("Sheets Values Get Network Error:", err);
    return res.status(500).json({ error: "Không thể kết nối máy chủ Google API để đọc dữ liệu: " + (err.message || "") });
  }

  // Map of row index to item ID
  const rowItemIds: (string | null)[] = [
    'sieuAm_tim',                  // index 0, row 7
    'sieuAm_mach',                 // index 1, row 8
    'sieuAm_thai4d',               // index 2, row 9
    'sieuAm_tongquat',             // index 3, row 10
    'sieuAm_danHoi',               // index 4, row 11
    'sieuAm_canThiep',             // index 5, row 12
    null,                          // index 6, row 13 (sieuAm SUM)
    'noiSoi_daDay',                // index 7, row 14
    'noiSoi_daiTrucTrang',         // index 8, row 15
    'noiSoi_trucTrang',            // index 9, row 16
    'noiSoi_sigma',                // index 10, row 17
    'noiSoi_thutThao',             // index 11, row 18
    'noiSoi_catPolyp',             // index 12, row 19
    'noiSoi_clotest',              // index 13, row 20
    'noiSoi_gayMeDaDayDaiTrang',   // index 14, row 21
    'noiSoi_gayMeDon',             // index 15, row 22
    null,                          // index 16, row 23 (noiSoi SUM)
    'xQuang_thuong',               // index 17, row 24
    'xQuang_dacBiet',              // index 18, row 25
    'xQuang_clvt',                 // index 19, row 26
    null,                          // index 20, row 27 (xQuang SUM)
    'dienTim_thuong',              // index 21, row 28
    'dienTim_luuHuyetNao',         // index 22, row 29
    null,                          // index 23, row 30 (dienTim SUM)
    'xetNghiem_sinhHoa',           // index 24, row 31
    'xetNghiem_huyetHoc',          // index 25, row 32
    'xetNghiem_nuocTieu',          // index 26, row 33
    'xetNghiem_viSinh',            // index 27, row 34
    'xetNghiem_mienDich',          // index 28, row 35
    'xetNghiem_melatec',           // index 29, row 36
    'xetNghiem_hopeHpv',           // index 30, row 37
    'xetNghiem_hopePap',           // index 31, row 38
    'xetNghiem_teBao',             // index 32, row 39
    'xetNghiem_thinPrep',          // index 33, row 40
  ];

  let daysToProcess: number[] = [];
  if (pullAllMonth) {
    // Process all 31 days mapping Columns C to BL
    for (let d = 1; d <= 31; d++) {
      daysToProcess.push(d);
    }
  } else {
    const dMatch = date.match(/-(\d{2})$/);
    if (dMatch) {
      daysToProcess.push(parseInt(dMatch[1]));
    }
  }

  let countUpdated = 0;
  let countCreated = 0;

  for (const d of daysToProcess) {
    // Compute date string e.g. "2026-03-05"
    const targetDateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    // Compute column indices relative to the selected block
    let colBhIdx = 0;
    let colNdIdx = 0;

    if (pullAllMonth) {
      // Relative offset in range C7:BL40 (Column C is index 0)
      colBhIdx = (d - 1) * 2;
      colNdIdx = (d - 1) * 2 + 1;
    } else {
      // Only 2 columns were fetched, so colBhIdx = 0, colNdIdx = 1
      colBhIdx = 0;
      colNdIdx = 1;
    }

    // Prepare items array
    const parsedItems: any[] = [];
    let hasData = false;

    // Map rows in rawRows to items
    rowItemIds.forEach((itemId, rIdx) => {
      if (!itemId) return; // Skip SUM rows

      const rowData = rawRows[rIdx] || [];
      const bhRaw = rowData[colBhIdx];
      const ndRaw = rowData[colNdIdx];

      const bhVal = (bhRaw !== undefined && bhRaw !== "") ? parseInt(bhRaw) : 0;
      const ndVal = (ndRaw !== undefined && ndRaw !== "") ? parseInt(ndRaw) : 0;

      const bhNum = isNaN(bhVal) ? 0 : bhVal;
      const ndNum = isNaN(ndVal) ? 0 : ndVal;

      if (bhNum > 0 || ndNum > 0) {
        hasData = true;
      }

      // Find standard label & category from serverProcedures
      const standardProc = serverProcedures.find(p => p.id === itemId);
      parsedItems.push({
        id: itemId,
        name: standardProc?.name || itemId,
        category: standardProc?.category || "other",
        bh: bhNum,
        nd: ndNum
      });
    });

    if (!hasData) {
      // If the sheet has no data for this day, skip it unless we are syncing a single day
      if (pullAllMonth) {
        continue; 
      }
    }

    // Now, insert or update this report in our in-memory DB
    const existingIdx = reports.findIndex(r => r.date === targetDateStr);
    if (existingIdx !== -1) {
      reports[existingIdx] = {
        ...reports[existingIdx],
        items: parsedItems,
        status: "approved",
        approvedBy: activeUser || "Hệ thống (Google Sheets Pull)",
        submittedAt: new Date().toISOString()
      };
      saveDocument("reports", targetDateStr, reports[existingIdx]);
      countUpdated++;
    } else {
      const newReport = {
        date: targetDateStr,
        status: "approved",
        submittedBy: "Hệ thống (Google Sheets Pull)",
        submittedAt: new Date().toISOString(),
        approvedBy: activeUser || "Hệ thống (Google Sheets Pull)",
        items: parsedItems
      };
      reports.push(newReport);
      saveDocument("reports", targetDateStr, newReport);
      countCreated++;
    }
  }

  // Submit Audit Log
  const newLog = {
    id: "log_" + Date.now(),
    actor: activeUser || "Hệ thống",
    action: "Tải từ Google Sheets",
    details: pullAllMonth 
      ? `Tải dữ liệu toàn bộ báo cáo Tháng ${month}/${year} từ Google Sheets (Cập nhật: ${countUpdated} ngày, Khởi tạo: ${countCreated} ngày)`
      : `Tải dữ liệu báo cáo ngày ${date} từ Google Sheets (Thành công)`,
    timestamp: new Date().toISOString()
  };
  serverAuditLogs.unshift(newLog);
  saveDocument("auditLogs", newLog.id, newLog);

  // Submit to System notifications
  const newNotif = {
    id: "n_" + Date.now(),
    title: "Tải dữ liệu Google Sheets thành công",
    content: `${activeUser || "Hệ thống"} đã kéo dữ liệu từ Google Sheets về (Cập nhật: ${countUpdated} ngày, Khởi tạo: ${countCreated} ngày).`,
    timestamp: new Date().toISOString(),
    type: "update" as 'meeting' | 'task' | 'update' | 'report' | 'system' | 'alert',
    read: false,
  };
  notifications.unshift(newNotif);
  saveDocument("notifications", newNotif.id, newNotif);

  res.json({
    success: true,
    message: pullAllMonth
      ? `Đã tải và cập nhật thành công dữ liệu từ Google Sheets cho Tháng ${month}/${year}. (Cập nhật: ${countUpdated} ngày, Khởi tạo: ${countCreated} ngày)`
      : `Đã tải thành công dữ liệu ngày ${date} từ Google Sheets.`,
    countUpdated,
    countCreated
  });
});

async function syncAllFromFirebase() {
  console.log("Starting Firebase data synchronization...");
  try {
    await syncCollection("reports", reports);
    await syncCollection("meetings", meetings);
    await syncCollection("notifications", notifications);
    await syncCollection("users", serverUsers);
    await syncCollection("departments", serverDepartments);
    await syncCollection("auditLogs", serverAuditLogs);
    await syncCollection("procedures", serverProcedures);
    await syncCollection("workReports", workReports);

    const syncedSettings = await syncSettings("settings", "global", systemSettings);
    if (syncedSettings) {
      systemSettings = {
        ...systemSettings,
        ...syncedSettings
      };
    }

    console.log("Firebase data synchronization completed successfully!");
  } catch (err) {
    console.error("Firebase startup synchronization failed:", err);
  }
}

// Vite middleware for development
async function startServer() {
  await syncAllFromFirebase();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer();
