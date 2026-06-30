import express from "express";
import path from "path";
import fs from "fs";
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

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOAD_DIR));

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
  { id: 'u1', name: 'BS. Lê Minh Tâm', role: 'admin', email: 'tam.leminh@hospital.gov.vn', departmentName: 'Ban giám khoa & Cận lâm sàng', title: 'Trưởng Khoa', shiftCount: 22, status: 'Đang làm việc', birthDate: '15/06/1978', gender: 'Nam', qualification: 'Bác sĩ', degree: 'Trên ĐH', phone: '0912345678', address: 'Đống Đa, Hà Nội', notes: 'Trực chỉ huy ban giám khoa.' },
  { id: 'u7', name: 'BS. CKII. Nguyễn Trọng Nhân', role: 'truongKhoa', email: 'nhan.nguyentrong@hospital.gov.vn', departmentName: 'Ban giám khoa & Cận lâm sàng', title: 'Phó Trưởng Khoa CLS', shiftCount: 30, status: 'Đang làm việc', birthDate: '20/11/1975', gender: 'Nam', qualification: 'BS. CKII', degree: 'Trên ĐH', phone: '0987654321', address: 'Hai Bà Trưng, Hà Nội', notes: 'Cố vấn chuyên môn xét nghiệm.' },
  { id: 'u2', name: 'KTV. Nguyễn Văn Hùng', role: 'phoKhoa', email: 'hung.nguyenvan@hospital.gov.vn', departmentName: 'Phòng Siêu Âm', title: 'Kỹ Thuật Viên Trưởng', shiftCount: 18, status: 'Đang làm việc', birthDate: '10/04/1985', gender: 'Nam', qualification: 'Kỹ thuật viên', degree: 'ĐH', phone: '0913579246', address: 'Cầu Giấy, Hà Nội', notes: 'Phụ trách đào tạo kỹ thuật viên siêu âm.' },
  { id: 'u3', name: 'BS. Trần Thị Mai', role: 'general', email: 'mai.tranthi@hospital.gov.vn', departmentName: 'Phòng Nội Soi', title: 'Bác Sĩ Điều Trị', shiftCount: 15, status: 'Nghỉ thai sản', birthDate: '05/09/1982', gender: 'Nữ', qualification: 'Bác sĩ', degree: 'Trên ĐH', phone: '0934123789', address: 'Ba Đình, Hà Nội', notes: 'Nghỉ thai sản từ tháng 6/2026.' },
  { id: 'u4', name: 'BS. Hoàng Đức Toàn', role: 'phoKhoa', email: 'toan.hoangduc@hospital.gov.vn', departmentName: 'Phòng X-quang', title: 'Bác Sĩ Phó Khoa', shiftCount: 17, status: 'Đang làm việc', birthDate: '18/12/1980', gender: 'Nam', qualification: 'Bác sĩ', degree: 'Trên ĐH', phone: '0904561237', address: 'Thanh Xuân, Hà Nội', notes: 'Kiểm soát chất lượng hình ảnh CLS.' },
  { id: 'u5', name: 'KTV. Phạm Lê Vy', role: 'general', email: 'vy.phamle@hospital.gov.vn', departmentName: 'Phòng Điện Tim & LHN', title: 'Kỹ Thuật Viên', shiftCount: 12, status: 'Nghỉ không lương', birthDate: '22/02/1993', gender: 'Nữ', qualification: 'Kỹ thuật viên', degree: 'ĐH', phone: '0978123456', address: 'Hoàng Mai, Hà Nội', notes: 'Nghỉ giải quyết việc riêng gia đình.' },
  { id: 'u6', name: 'BS. Thân Trọng Kha', role: 'general', email: 'kha.thantrong@hospital.gov.vn', departmentName: 'Khoa Xét Nghiệm', title: 'Bác Sĩ Xét Nghiệm', shiftCount: 20, status: 'Đang làm việc', birthDate: '30/08/1988', gender: 'Nam', qualification: 'Bác sĩ', degree: 'Trên ĐH', phone: '0965123987', address: 'Tây Hồ, Hà Nội', notes: 'Trưởng nhóm quản lý mẫu gen.' }
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
  themeColor: "#0284c7", // Sky blue làm mặc định y tế
  bannerPreset: "medical",
  bannerUrl: "",
  logoPreset: "default",
  logoUrl: "",
  bgStyle: "modern-blue",
  systemTitle: "Giao Ban Khoa Cận Lâm Sàng",
  systemSubtitle: "Hệ thống báo cáo số liệu & Tự động hóa biên bản giao ban bằng AI",
  autoSyncEnabled: false,
  autoSyncTime: "12:00",
  googleSpreadsheetUrl: "https://docs.google.com/spreadsheets/d/1n7yQQmninnDTVNtIZqCzUEiAI1jRHSj4VTr7pVs3KMM/edit?usp=sharing",
  googleAccessToken: "",
  googleApiKey: "",
  googleRefreshToken: "",
  googleClientId: "1067215171120-g7a7fge4vbe050m3oabm896v1k6g6m2f.apps.googleusercontent.com",
  googleClientSecret: "",
  telegramBotToken: "",
  telegramChatId: "",
  bannerStyle: "cover",
  bannerPosition: "center",
  bannerOverlayOpacity: 0.7,
  bannerRepeat: "no-repeat"
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

// Combined Bootstrap / All Data API to prevent multiple parallel HTTP requests causing 429 rate limit
app.get("/api/all-data", (req, res) => {
  res.json({
    reports: reports,
    meetings: meetings,
    notifications: notifications,
    users: serverUsers,
    departments: serverDepartments,
    settings: systemSettings,
    procedures: serverProcedures
  });
});

// Settings API
app.get("/api/settings", (req, res) => {
  res.json(systemSettings);
});

app.post("/api/settings", (req, res) => {
  const newSettings = req.body;
  if (!newSettings) {
    return res.status(400).json({ error: "Dữ liệu cấu hình không hợp lệ." });
  }

  // If the new settings set a different logoUrl or change logoPreset, and we had an old local uploaded logo, delete it!
  if (
    (newSettings.logoUrl !== undefined && newSettings.logoUrl !== systemSettings.logoUrl) ||
    (newSettings.logoPreset !== undefined && newSettings.logoPreset !== systemSettings.logoPreset)
  ) {
    if (systemSettings.logoUrl && systemSettings.logoUrl.startsWith("/uploads/")) {
      const willDelete = 
        (newSettings.logoPreset !== undefined && newSettings.logoPreset !== 'custom') || 
        (newSettings.logoUrl !== undefined && newSettings.logoUrl !== systemSettings.logoUrl);

      if (willDelete) {
        const oldFilename = systemSettings.logoUrl.replace("/uploads/", "");
        const oldFilePath = path.join(UPLOAD_DIR, oldFilename);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
            console.log(`Deleted old uploaded logo upon settings change: ${oldFilePath}`);
          } catch (unlinkErr) {
            console.error(`Failed to delete old logo file: ${oldFilePath}`, unlinkErr);
          }
        }
      }
    }
  }

  // If the new settings set a different bannerUrl or change bannerPreset, and we had an old local uploaded banner, delete it!
  if (
    (newSettings.bannerUrl !== undefined && newSettings.bannerUrl !== systemSettings.bannerUrl) ||
    (newSettings.bannerPreset !== undefined && newSettings.bannerPreset !== systemSettings.bannerPreset)
  ) {
    if (systemSettings.bannerUrl && systemSettings.bannerUrl.startsWith("/uploads/")) {
      const willDelete = 
        (newSettings.bannerPreset !== undefined && newSettings.bannerPreset !== 'custom') || 
        (newSettings.bannerUrl !== undefined && newSettings.bannerUrl !== systemSettings.bannerUrl);

      if (willDelete) {
        const oldFilename = systemSettings.bannerUrl.replace("/uploads/", "");
        const oldFilePath = path.join(UPLOAD_DIR, oldFilename);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
            console.log(`Deleted old uploaded banner upon settings change: ${oldFilePath}`);
          } catch (unlinkErr) {
            console.error(`Failed to delete old banner file: ${oldFilePath}`, unlinkErr);
          }
        }
      }
    }
  }

  systemSettings = {
    ...systemSettings,
    ...newSettings
  };

  // Ensure essential defaults are kept if they became falsy
  if (!systemSettings.googleSpreadsheetUrl) {
    systemSettings.googleSpreadsheetUrl = "https://docs.google.com/spreadsheets/d/1n7yQQmninnDTVNtIZqCzUEiAI1jRHSj4VTr7pVs3KMM/edit?usp=sharing";
  }
  if (!systemSettings.googleClientId) {
    systemSettings.googleClientId = "1067215171120-g7a7fge4vbe050m3oabm896v1k6g6m2f.apps.googleusercontent.com";
  }

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

app.post("/api/upload-logo", (req, res) => {
  try {
    const { filename, base64Data } = req.body;
    if (!filename || !base64Data) {
      return res.status(400).json({ error: "Thiếu tên tệp hoặc dữ liệu hình ảnh." });
    }

    // Decode base64
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: "Định dạng dữ liệu base64 không hợp lệ." });
    }

    const fileType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    // Determine extension
    let ext = ".png";
    if (fileType.includes("jpeg") || fileType.includes("jpg")) {
      ext = ".jpg";
    } else if (fileType.includes("gif")) {
      ext = ".gif";
    } else if (fileType.includes("svg")) {
      ext = ".svg";
    } else if (fileType.includes("webp")) {
      ext = ".webp";
    }

    // Delete old local uploaded file if it exists
    if (systemSettings.logoUrl && systemSettings.logoUrl.startsWith("/uploads/")) {
      const oldFilename = systemSettings.logoUrl.replace("/uploads/", "");
      const oldFilePath = path.join(UPLOAD_DIR, oldFilename);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
          console.log(`Successfully deleted old logo: ${oldFilePath}`);
        } catch (unlinkErr) {
          console.error(`Failed to delete old logo file ${oldFilePath}:`, unlinkErr);
        }
      }
    }

    // Save new file
    const newFilename = `logo_${Date.now()}${ext}`;
    const newFilePath = path.join(UPLOAD_DIR, newFilename);
    fs.writeFileSync(newFilePath, buffer);

    const logoUrl = `/uploads/${newFilename}`;

    // Update settings
    systemSettings = {
      ...systemSettings,
      logoPreset: 'custom',
      logoUrl: logoUrl
    };

    // Audit Log
    const newLog = {
      id: "log_" + Date.now(),
      actor: "BS. Lê Minh Tâm",
      action: "Tải lên logo tùy chỉnh",
      details: `Đã tải lên logo mới: ${newFilename}`,
      timestamp: new Date().toISOString()
    };
    serverAuditLogs.unshift(newLog);

    // Save to Firebase
    saveDocument("settings", "global", systemSettings);
    saveDocument("auditLogs", newLog.id, newLog);

    res.json({ success: true, logoUrl, settings: systemSettings });
  } catch (error: any) {
    console.error("Error in /api/upload-logo:", error);
    res.status(500).json({ error: error.message || "Lỗi máy chủ khi tải ảnh lên." });
  }
});

app.post("/api/upload-banner", (req, res) => {
  try {
    const { filename, base64Data } = req.body;
    if (!filename || !base64Data) {
      return res.status(400).json({ error: "Thiếu tên tệp hoặc dữ liệu hình ảnh." });
    }

    // Decode base64
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: "Định dạng dữ liệu base64 không hợp lệ." });
    }

    const fileType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    // Determine extension
    let ext = ".png";
    if (fileType.includes("jpeg") || fileType.includes("jpg")) {
      ext = ".jpg";
    } else if (fileType.includes("gif")) {
      ext = ".gif";
    } else if (fileType.includes("svg")) {
      ext = ".svg";
    } else if (fileType.includes("webp")) {
      ext = ".webp";
    }

    // Delete old local uploaded file if it exists
    if (systemSettings.bannerUrl && systemSettings.bannerUrl.startsWith("/uploads/")) {
      const oldFilename = systemSettings.bannerUrl.replace("/uploads/", "");
      const oldFilePath = path.join(UPLOAD_DIR, oldFilename);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
          console.log(`Successfully deleted old banner: ${oldFilePath}`);
        } catch (unlinkErr) {
          console.error(`Failed to delete old banner file ${oldFilePath}:`, unlinkErr);
        }
      }
    }

    // Save new file
    const newFilename = `banner_${Date.now()}${ext}`;
    const newFilePath = path.join(UPLOAD_DIR, newFilename);
    fs.writeFileSync(newFilePath, buffer);

    const bannerUrl = `/uploads/${newFilename}`;

    // Update settings
    systemSettings = {
      ...systemSettings,
      bannerPreset: 'custom',
      bannerUrl: bannerUrl
    };

    // Audit Log
    const newLog = {
      id: "log_" + Date.now(),
      actor: "BS. Lê Minh Tâm",
      action: "Tải lên banner tùy chỉnh",
      details: `Đã tải lên banner mới: ${newFilename}`,
      timestamp: new Date().toISOString()
    };
    serverAuditLogs.unshift(newLog);

    // Save to Firebase
    saveDocument("settings", "global", systemSettings);
    saveDocument("auditLogs", newLog.id, newLog);

    res.json({ success: true, bannerUrl, settings: systemSettings });
  } catch (error: any) {
    console.error("Error in /api/upload-banner:", error);
    res.status(500).json({ error: error.message || "Lỗi máy chủ khi tải ảnh lên." });
  }
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

app.post("/api/users/bulk", (req, res) => {
  const { users: importedUsers } = req.body;
  if (!Array.isArray(importedUsers)) {
    return res.status(400).json({ error: "Dữ liệu hàng loạt không hợp lệ." });
  }

  let countCreated = 0;
  let countUpdated = 0;
  const newLogId = "log_" + Date.now();

  importedUsers.forEach((newUser, uIdx) => {
    if (!newUser || !newUser.name) return;
    
    // We can search by email, id, or name + departmentName to find duplicates
    let index = -1;
    if (newUser.email) {
      index = serverUsers.findIndex((u) => u.email && u.email.trim().toLowerCase() === newUser.email.trim().toLowerCase());
    }
    if (index === -1 && newUser.id) {
      index = serverUsers.findIndex((u) => u.id === newUser.id);
    }
    if (index === -1) {
      index = serverUsers.findIndex((u) => u.name && u.name.trim().toLowerCase() === newUser.name.trim().toLowerCase() && u.departmentName === newUser.departmentName);
    }

    if (index !== -1) {
      const prevUser = serverUsers[index];
      const updatedUser = {
        ...prevUser,
        ...newUser,
      };
      serverUsers[index] = updatedUser;
      saveDocument("users", updatedUser.id, updatedUser);
      countUpdated++;
    } else {
      const id = newUser.id || "u_" + (Date.now() + uIdx);
      const createdUser = {
        id,
        shiftCount: 0,
        status: "Đang làm việc",
        ...newUser
      };
      serverUsers.push(createdUser);
      saveDocument("users", id, createdUser);
      countCreated++;
    }
  });

  const newLog = {
    id: newLogId,
    actor: "BS. Lê Minh Tâm",
    action: "Nhập excel nhân viên",
    details: `Nhập hàng loạt nhân viên từ file Excel. Thêm mới: ${countCreated} cán bộ, Cập nhật: ${countUpdated} cán bộ.`,
    timestamp: new Date().toISOString()
  };
  serverAuditLogs.unshift(newLog);
  saveDocument("auditLogs", newLog.id, newLog);

  res.json({ success: true, users: serverUsers, countCreated, countUpdated });
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

app.delete("/api/reports/:date", (req, res) => {
  const { date } = req.params;
  const index = reports.findIndex((r) => r.date === date);
  if (index !== -1) {
    const deletedReport = reports[index];
    reports.splice(index, 1);
    deleteDocument("reports", date);
    
    // Add audit log
    const newLogId = "log_" + Date.now();
    const newLog = {
      id: newLogId,
      actor: "BS. Lê Minh Tâm", // Admin
      action: "Xóa báo cáo",
      details: `Xóa toàn bộ báo cáo số liệu chuyên môn ngày ${date}`,
      timestamp: new Date().toISOString()
    };
    serverAuditLogs.unshift(newLog);
    saveDocument("auditLogs", newLog.id, newLog);

    res.json({ success: true, message: `Báo cáo ngày ${date} đã được xóa thành công.` });
  } else {
    res.status(404).json({ error: "Không tìm thấy dữ liệu báo cáo cho ngày này." });
  }
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
  const { month, year, accessToken, spreadsheetUrl, syncAllMonth, date, syncType, overwrite } = req.body;

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
      console.log("[Sheets API Sync Info] Metadata details fetched or failed:", JSON.stringify(metaErrData));
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
    console.log("[Sheets Sync Network Info] Exception thrown during sync metadata fetch:", err?.message || err);
    return res.status(500).json({ error: "Không thể kết nối máy chủ Google API để xác thực quyền truy cập: " + (err.message || "") });
  }

  // Determine which reports to sync based on syncType
  let datesToSync: string[] = [];
  const typeOfSync = syncType || (syncAllMonth ? 'month' : 'day');
  const isOverwrite = overwrite === true || overwrite === "true";

  if (typeOfSync === 'day') {
    if (!date) {
      return res.status(400).json({ error: "Thiếu ngày cần đồng bộ." });
    }
    datesToSync = [date];
  } else if (typeOfSync === 'week') {
    if (!date) {
      return res.status(400).json({ error: "Thiếu ngày để xác định tuần cần đồng bộ." });
    }
    const d = new Date(date);
    const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday ...
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + distanceToMonday);

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      const y = dayDate.getFullYear();
      const m = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dayNum = String(dayDate.getDate()).padStart(2, '0');
      datesToSync.push(`${y}-${m}-${dayNum}`);
    }
  } else if (typeOfSync === 'month') {
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const monthStr = String(monthNum).padStart(2, '0');
      datesToSync.push(`${yearNum}-${monthStr}-${dayStr}`);
    }
  } else if (typeOfSync === 'year') {
    const yearNum = parseInt(year, 10);
    for (let m = 1; m <= 12; m++) {
      const daysInM = new Date(yearNum, m, 0).getDate();
      for (let d = 1; d <= daysInM; d++) {
        const dayStr = String(d).padStart(2, '0');
        const monthStr = String(m).padStart(2, '0');
        datesToSync.push(`${yearNum}-${monthStr}-${dayStr}`);
      }
    }
  } else if (typeOfSync === 'all') {
    const allDates = Array.from(new Set(reports.map(r => r.date)));
    datesToSync = allDates.sort();
  }

  let reportsToSync: any[] = [];
  for (const dStr of datesToSync) {
    const report = reports.find(r => r.date === dStr && (r.status === "approved" || r.status === "submitted"));
    if (report) {
      reportsToSync.push(report);
    } else {
      if (isOverwrite) {
        reportsToSync.push({
          date: dStr,
          items: [],
          status: "approved",
          isMockEmpty: true
        });
      }
    }
  }

  if (reportsToSync.length === 0) {
    return res.status(404).json({ error: "Không có dữ liệu báo cáo (đã duyệt hoặc gửi) nào phù hợp để đồng bộ." });
  }

  // Find unique months across reports to sync
  const uniqueMonths = Array.from(new Set(reportsToSync.map(r => {
    const parts = r.date.split("-");
    const y = parts[0];
    const m = parseInt(parts[1], 10);
    return `${y}-${m}`;
  })));

  const resolvedSheetNamesMap: { [key: string]: string } = {};

  for (const ymKey of uniqueMonths) {
    const [y, mVal] = ymKey.split("-");
    const mNum = parseInt(mVal, 10);
    const sheetNameNormal = `Tháng ${mNum}`;
    const sheetNamePad = `Tháng ${String(mNum).padStart(2, "0")}`;

    let resolvedSheetName = "";
    let targetSheetInfo = sheetsList.find((s: any) => s.title === sheetNameNormal || s.title === sheetNamePad);

    if (targetSheetInfo) {
      resolvedSheetName = targetSheetInfo.title;
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
          console.log("[Sheets API Sync Info] Dynamic sheet tab creation response:", JSON.stringify(createErr));
          resolvedSheetName = sheetNameNormal; // Fallback
        }
      } catch (e: any) {
        console.log("[Sheets API Sync Info] Exception in dynamic sheet tab add:", e?.message || e);
        resolvedSheetName = sheetNameNormal; // Fallback
      }
    }

    // Ensure target sheet has at least 70 columns
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
          console.log("[Sheets API Sync Info] Dynamic column expansion response:", updateErr);
        }
      } catch (e: any) {
        console.log("[Sheets API Sync Info] Exception in sheet column expansion:", e?.message || e);
      }
    }

    resolvedSheetNamesMap[ymKey] = resolvedSheetName || sheetNameNormal;
  }

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
  const rowMetadata = [
    { row: 7, id: 'sieuAm_tim', group: 'sieuAm' },
    { row: 8, id: 'sieuAm_mach', group: 'sieuAm' },
    { row: 9, id: 'sieuAm_thai4d', group: 'sieuAm' },
    { row: 10, id: 'sieuAm_tongquat', group: 'sieuAm' },
    { row: 11, id: 'sieuAm_danHoi', group: 'sieuAm' },
    { row: 12, id: 'sieuAm_canThiep', group: 'sieuAm' },
    { row: 13, id: null, type: 'sum', group: 'sieuAm' },
    { row: 14, id: 'noiSoi_daDay', group: 'noiSoi' },
    { row: 15, id: 'noiSoi_daiTrucTrang', group: 'noiSoi' },
    { row: 16, id: 'noiSoi_trucTrang', group: 'noiSoi' },
    { row: 17, id: 'noiSoi_sigma', group: 'noiSoi' },
    { row: 18, id: 'noiSoi_thutThao', group: 'noiSoi' },
    { row: 19, id: 'noiSoi_catPolyp', group: 'noiSoi' },
    { row: 20, id: 'noiSoi_clotest', group: 'noiSoi' },
    { row: 21, id: 'noiSoi_gayMeDaDayDaiTrang', group: 'noiSoi' },
    { row: 22, id: 'noiSoi_gayMeDon', group: 'noiSoi' },
    { row: 23, id: null, type: 'sum', group: 'noiSoi' },
    { row: 24, id: 'xQuang_thuong', group: 'xQuang' },
    { row: 25, id: 'xQuang_dacBiet', group: 'xQuang' },
    { row: 26, id: 'xQuang_clvt', group: 'xQuang' },
    { row: 27, id: null, type: 'sum', group: 'xQuang' },
    { row: 28, id: 'dienTim_thuong', group: 'dienTim' },
    { row: 29, id: 'dienTim_luuHuyetNao', group: 'dienTim' },
    { row: 30, id: 'xetNghiem_sinhHoa', group: 'xetNghiem' },
    { row: 31, id: 'xetNghiem_huyetHoc', group: 'xetNghiem' },
    { row: 32, id: 'xetNghiem_nuocTieu', group: 'xetNghiem' },
    { row: 33, id: 'xetNghiem_viSinh', group: 'xetNghiem' },
    { row: 34, id: 'xetNghiem_mienDich', group: 'xetNghiem' },
    { row: 35, id: 'xetNghiem_melatec', group: 'xetNghiem' },
    { row: 36, id: 'xetNghiem_hopeHpv', group: 'xetNghiem' },
    { row: 37, id: 'xetNghiem_hopePap', group: 'xetNghiem' },
    { row: 38, id: 'xetNghiem_teBao', group: 'xetNghiem' },
    { row: 39, id: 'xetNghiem_thinPrep', group: 'xetNghiem' },
    { row: 40, id: null, type: 'sum', group: 'xetNghiem' },
    { row: 41, id: null, type: 'grand_total' }
  ];

  // Construct target range strings for each report in reportsToSync
  const rangesToGet = reportsToSync.map(rep => {
    const parts = rep.date.split("-");
    const repYear = parts[0];
    const repMonth = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const ymKey = `${repYear}-${repMonth}`;
    const sheetName = resolvedSheetNamesMap[ymKey] || `Tháng ${repMonth}`;
    const colBhLetter = getColLetter(day * 2);
    const colNdLetter = getColLetter(day * 2 + 1);
    return `'${sheetName}'!${colBhLetter}7:${colNdLetter}41`;
  });

  const currentSheetDataMap: { [range: string]: any[][] } = {};

  // Always fetch current values to compare or preserve, but skip for extremely large ranges (Year/All) in overwrite mode to maximize performance
  const shouldFetchCurrentValues = !isOverwrite || (rangesToGet.length <= 31);

  if (shouldFetchCurrentValues) {
    try {
      console.log("Fetching current Google Sheets cells to compare/preserve existing non-zero services...");
      const chunkSize = 40;
      for (let i = 0; i < rangesToGet.length; i += chunkSize) {
        const chunk = rangesToGet.slice(i, i + chunkSize);
        const queryParams = chunk.map(r => `ranges=${encodeURIComponent(r)}`).join("&");
        const batchGetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${queryParams}`;
        const getResponse = await fetch(batchGetUrl, {
          headers: {
            "Authorization": `Bearer ${cleanToken}`
          }
        });
        if (getResponse.ok) {
          const resData = await getResponse.json() as any;
          if (resData.valueRanges) {
            resData.valueRanges.forEach((vr: any, index: number) => {
              const targetRange = chunk[index];
              if (targetRange) {
                currentSheetDataMap[targetRange] = vr.values || [];
              }
            });
          }
        } else {
          console.log("[Sheets API Sync Info] Google Sheets batchGet response:", getResponse.status, await getResponse.text());
        }
      }
    } catch (err) {
      console.log("[Sheets API Sync Info] Exception during Google Sheets batchGet:", err);
    }
  }

  // To collect details for single-day sync
  let singleDayLogs: any[] = [];

  // Synchronize each report's columns
  for (let repIndex = 0; repIndex < reportsToSync.length; repIndex++) {
    const rep = reportsToSync[repIndex];
    const range = rangesToGet[repIndex];

    const parts = rep.date.split("-");
    if (parts.length < 3) continue;
    const repYear = parts[0];
    const repMonth = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (isNaN(day) || day < 1 || day > 31) continue;

    const ymKey = `${repYear}-${repMonth}`;
    const sheetName = resolvedSheetNamesMap[ymKey] || `Tháng ${repMonth}`;

    const colBhLetter = getColLetter(day * 2);
    const colNdLetter = getColLetter(day * 2 + 1);

    const currentValues = currentSheetDataMap[range] || [];

    const mergedValues: { [id: string]: { bh: number; nd: number; status: string; appBh: number; appNd: number; sheetBh: number; sheetNd: number } } = {};

    rowMetadata.forEach((meta, idx) => {
      if (!meta.id) return; // Skip sum/grand_total rows for metadata loop

      const appItem = rep.items.find((it: any) => it.id === meta.id);
      const appBh = appItem ? Number(appItem.bh || 0) : 0;
      const appNd = appItem ? Number(appItem.nd || 0) : 0;
      const appItemName = appItem?.name || meta.id;

      // Extract existing sheet data
      const sheetBhVal = currentValues[idx]?.[0];
      const sheetNdVal = currentValues[idx]?.[1];
      const sheetBh = (sheetBhVal !== undefined && sheetBhVal !== null && sheetBhVal !== "") ? Number(sheetBhVal) : 0;
      const sheetNd = (sheetNdVal !== undefined && sheetNdVal !== null && sheetNdVal !== "") ? Number(sheetNdVal) : 0;

      const hasSheetData = (sheetBh !== 0 || sheetNd !== 0);

      let resolvedBh = 0;
      let resolvedNd = 0;
      let statusText = 'trong'; // default

      if (isOverwrite) {
        resolvedBh = appBh;
        resolvedNd = appNd;
        if (hasSheetData) {
          statusText = 'ghi_de'; // Overwrote existing sheet data
        } else if (appBh !== 0 || appNd !== 0) {
          statusText = 'dong_bo_moi'; // Sync new data
        } else {
          statusText = 'trong';
        }
      } else {
        if (hasSheetData) {
          // Keep Sheet's existing data!
          resolvedBh = sheetBh;
          resolvedNd = sheetNd;
          statusText = 'giu_nguyen'; // Preserved existing sheet data
        } else {
          // Copy from app
          resolvedBh = appBh;
          resolvedNd = appNd;
          if (appBh !== 0 || appNd !== 0) {
            statusText = 'dong_bo_moi';
          } else {
            statusText = 'trong';
          }
        }
      }

      mergedValues[meta.id] = {
        bh: resolvedBh,
        nd: resolvedNd,
        status: statusText,
        appBh,
        appNd,
        sheetBh,
        sheetNd
      };

      if (typeOfSync === 'day') {
        singleDayLogs.push({
          id: meta.id,
          name: appItemName,
          status: statusText,
          appBh,
          appNd,
          sheetBh,
          sheetNd,
          resolvedBh,
          resolvedNd
        });
      }
    });

    // Compute SUM and Total values based on merged values
    const sieuAmVals: { bh: number; nd: number }[] = [];
    const noiSoiVals: { bh: number; nd: number }[] = [];
    const xQuangVals: { bh: number; nd: number }[] = [];
    const dienTimVals: { bh: number; nd: number }[] = [];
    const xetNghiemVals: { bh: number; nd: number }[] = [];

    rowMetadata.forEach(meta => {
      if (!meta.id) return;
      const val = mergedValues[meta.id];
      if (!val) return;
      if (meta.group === "sieuAm") sieuAmVals.push(val);
      else if (meta.group === "noiSoi") noiSoiVals.push(val);
      else if (meta.group === "xQuang") xQuangVals.push(val);
      else if (meta.group === "dienTim") dienTimVals.push(val);
      else if (meta.group === "xetNghiem") xetNghiemVals.push(val);
    });

    const sumSA_bh = sieuAmVals.reduce((acc, v) => acc + v.bh, 0);
    const sumSA_nd = sieuAmVals.reduce((acc, v) => acc + v.nd, 0);

    const sumNS_bh = noiSoiVals.reduce((acc, v) => acc + v.bh, 0);
    const sumNS_nd = noiSoiVals.reduce((acc, v) => acc + v.nd, 0);

    const sumXQ_bh = xQuangVals.reduce((acc, v) => acc + v.bh, 0);
    const sumXQ_nd = xQuangVals.reduce((acc, v) => acc + v.nd, 0);

    const sumDT_bh = dienTimVals.reduce((acc, v) => acc + v.bh, 0);
    const sumDT_nd = dienTimVals.reduce((acc, v) => acc + v.nd, 0);

    const sumXN_bh = xetNghiemVals.reduce((acc, v) => acc + v.bh, 0);
    const sumXN_nd = xetNghiemVals.reduce((acc, v) => acc + v.nd, 0);

    const total_bh = sumSA_bh + sumNS_bh + sumXQ_bh + sumDT_bh + sumXN_bh;
    const total_nd = sumSA_nd + sumNS_nd + sumXQ_nd + sumDT_nd + sumXN_nd;

    // Build the 35 rows of values
    const sheetRows: any[][] = [];

    // Row 7 to 12
    sheetRows.push([formatCellVal(mergedValues['sieuAm_tim']?.bh), formatCellVal(mergedValues['sieuAm_tim']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['sieuAm_mach']?.bh), formatCellVal(mergedValues['sieuAm_mach']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['sieuAm_thai4d']?.bh), formatCellVal(mergedValues['sieuAm_thai4d']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['sieuAm_tongquat']?.bh), formatCellVal(mergedValues['sieuAm_tongquat']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['sieuAm_danHoi']?.bh), formatCellVal(mergedValues['sieuAm_danHoi']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['sieuAm_canThiep']?.bh), formatCellVal(mergedValues['sieuAm_canThiep']?.nd)]);

    // Row 13 - Siêu âm SUM
    sheetRows.push([formatCellVal(sumSA_bh), formatCellVal(sumSA_nd)]);

    // Row 14 to 22
    sheetRows.push([formatCellVal(mergedValues['noiSoi_daDay']?.bh), formatCellVal(mergedValues['noiSoi_daDay']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['noiSoi_daiTrucTrang']?.bh), formatCellVal(mergedValues['noiSoi_daiTrucTrang']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['noiSoi_trucTrang']?.bh), formatCellVal(mergedValues['noiSoi_trucTrang']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['noiSoi_sigma']?.bh), formatCellVal(mergedValues['noiSoi_sigma']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['noiSoi_thutThao']?.bh), formatCellVal(mergedValues['noiSoi_thutThao']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['noiSoi_catPolyp']?.bh), formatCellVal(mergedValues['noiSoi_catPolyp']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['noiSoi_clotest']?.bh), formatCellVal(mergedValues['noiSoi_clotest']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['noiSoi_gayMeDaDayDaiTrang']?.bh), formatCellVal(mergedValues['noiSoi_gayMeDaDayDaiTrang']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['noiSoi_gayMeDon']?.bh), formatCellVal(mergedValues['noiSoi_gayMeDon']?.nd)]);

    // Row 23 - Nội soi SUM
    sheetRows.push([formatCellVal(sumNS_bh), formatCellVal(sumNS_nd)]);

    // Row 24 to 26
    sheetRows.push([formatCellVal(mergedValues['xQuang_thuong']?.bh), formatCellVal(mergedValues['xQuang_thuong']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['xQuang_dacBiet']?.bh), formatCellVal(mergedValues['xQuang_dacBiet']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['xQuang_clvt']?.bh), formatCellVal(mergedValues['xQuang_clvt']?.nd)]);

    // Row 27 - X-quang SUM
    sheetRows.push([formatCellVal(sumXQ_bh), formatCellVal(sumXQ_nd)]);

    // Row 28 to 29
    sheetRows.push([formatCellVal(mergedValues['dienTim_thuong']?.bh), formatCellVal(mergedValues['dienTim_thuong']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['dienTim_luuHuyetNao']?.bh), formatCellVal(mergedValues['dienTim_luuHuyetNao']?.nd)]);

    // Row 30 to 39
    sheetRows.push([formatCellVal(mergedValues['xetNghiem_sinhHoa']?.bh), formatCellVal(mergedValues['xetNghiem_sinhHoa']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['xetNghiem_huyetHoc']?.bh), formatCellVal(mergedValues['xetNghiem_huyetHoc']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['xetNghiem_nuocTieu']?.bh), formatCellVal(mergedValues['xetNghiem_nuocTieu']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['xetNghiem_viSinh']?.bh), formatCellVal(mergedValues['xetNghiem_viSinh']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['xetNghiem_mienDich']?.bh), formatCellVal(mergedValues['xetNghiem_mienDich']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['xetNghiem_melatec']?.bh), formatCellVal(mergedValues['xetNghiem_melatec']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['xetNghiem_hopeHpv']?.bh), formatCellVal(mergedValues['xetNghiem_hopeHpv']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['xetNghiem_hopePap']?.bh), formatCellVal(mergedValues['xetNghiem_hopePap']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['xetNghiem_teBao']?.bh), formatCellVal(mergedValues['xetNghiem_teBao']?.nd)]);
    sheetRows.push([formatCellVal(mergedValues['xetNghiem_thinPrep']?.bh), formatCellVal(mergedValues['xetNghiem_thinPrep']?.nd)]);

    // Row 40 - Xét nghiệm SUM
    sheetRows.push([formatCellVal(sumXN_bh), formatCellVal(sumXN_nd)]);

    // Row 41 - GRAND TOTAL
    sheetRows.push([formatCellVal(total_bh), formatCellVal(total_nd)]);

    dataPayload.push({
      range,
      values: sheetRows
    });
  }

  // Build detailed statistics for multi-day
  let syncedDays: string[] = [];
  let unsyncedDays: { date: string; reason: string }[] = [];
  let largeSyncSummary: any = null;

  if (typeOfSync === 'week') {
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + distanceToMonday);

    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      const y = dayDate.getFullYear();
      const m = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dayNum = String(dayDate.getDate()).padStart(2, '0');
      weekDates.push(`${y}-${m}-${dayNum}`);
    }

    weekDates.forEach(dStr => {
      const rep = reportsToSync.find(r => r.date === dStr);
      if (rep) {
        syncedDays.push(dStr);
      } else {
        const anyRep = reports.find(r => r.date === dStr);
        const reason = anyRep ? "Báo cáo chưa được duyệt" : "Không có dữ liệu báo cáo";
        unsyncedDays.push({ date: dStr, reason });
      }
    });
  } else if (typeOfSync === 'month') {
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const monthDates: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const monthStr = String(monthNum).padStart(2, '0');
      monthDates.push(`${yearNum}-${monthStr}-${dayStr}`);
    }

    monthDates.forEach(dStr => {
      const rep = reportsToSync.find(r => r.date === dStr);
      if (rep) {
        syncedDays.push(dStr);
      } else {
        const anyRep = reports.find(r => r.date === dStr);
        const reason = anyRep ? "Báo cáo chưa được duyệt" : "Không có dữ liệu báo cáo";
        unsyncedDays.push({ date: dStr, reason });
      }
    });
  } else if (typeOfSync === 'year') {
    const yearNum = parseInt(year, 10);
    const isLeap = (yearNum % 4 === 0 && yearNum % 100 !== 0) || (yearNum % 400 === 0);
    const totalDaysInYear = isLeap ? 366 : 365;

    const yearPrefix = `${year}-`;
    const yearReports = reports.filter(r => r.date.startsWith(yearPrefix));
    const draftCount = yearReports.filter(r => r.status === 'draft').length;
    const missingCount = totalDaysInYear - yearReports.length;

    largeSyncSummary = {
      syncedCount: reportsToSync.length,
      unsyncedCount: totalDaysInYear - reportsToSync.length,
      reasons: [
        { reason: "Bản nháp (chưa được duyệt)", count: draftCount },
        { reason: "Không có dữ liệu báo cáo", count: missingCount }
      ]
    };
  } else if (typeOfSync === 'all') {
    const draftCount = reports.filter(r => r.status === 'draft').length;
    largeSyncSummary = {
      syncedCount: reportsToSync.length,
      unsyncedCount: draftCount,
      reasons: [
        { reason: "Bản nháp (chưa được duyệt)", count: draftCount }
      ]
    };
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
      console.log("[Sheets API Sync Info] Google Sheets API response status not ok:", JSON.stringify(resultData));
      const errMsg = resultData.error?.message || "Lỗi giao dịch với Google API.";
      return res.status(response.status).json({ 
        error: `Không thể cập nhật Google Sheets: ${errMsg}`,
        details: resultData 
      });
    }

    // Ghi nhận Audit Log
    let detailsLogText = "";
    let successMsgText = "";

    if (typeOfSync === 'day') {
      detailsLogText = `Đồng bộ số liệu báo cáo ngày ${date} lên Google Sheets`;
      successMsgText = `Đã đồng bộ thành công dữ liệu ngày ${date} lên Google Sheets.`;
    } else if (typeOfSync === 'week') {
      detailsLogText = `Đồng bộ số liệu báo cáo tuần chứa ngày ${date} lên Google Sheets (${reportsToSync.length} ngày)`;
      successMsgText = `Đã đồng bộ thành công dữ liệu tuần chứa ngày ${date} lên Google Sheets.`;
    } else if (typeOfSync === 'month') {
      detailsLogText = `Đồng bộ báo cáo Tháng ${month}/${year} lên Google Sheets (${reportsToSync.length} ngày)`;
      successMsgText = `Đã đồng bộ thành công dữ liệu của báo cáo Tháng ${month}/${year}.`;
    } else if (typeOfSync === 'year') {
      detailsLogText = `Đồng bộ báo cáo cả năm ${year} lên Google Sheets (${reportsToSync.length} ngày)`;
      successMsgText = `Đã đồng bộ thành công dữ liệu năm ${year} lên Google Sheets.`;
    } else if (typeOfSync === 'all') {
      detailsLogText = `Đồng bộ toàn bộ báo cáo trong hệ thống lên Google Sheets (${reportsToSync.length} ngày)`;
      successMsgText = `Đã đồng bộ toàn bộ dữ liệu báo cáo trong hệ thống lên Google Sheets (${reportsToSync.length} ngày).`;
    }

    serverAuditLogs.unshift({
      id: "log_" + Date.now(),
      actor: req.body.activeUser || "Hệ thống",
      action: "Đồng bộ Google Sheets",
      details: detailsLogText,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: successMsgText,
      updatedRangesCount: dataPayload.length,
      syncType: typeOfSync,
      overwrite: isOverwrite,
      details: {
        dayDetails: singleDayLogs,
        syncedDays,
        unsyncedDays,
        largeSync: largeSyncSummary
      }
    });

  } catch (err: any) {
    console.log("[Sheets Sync Network Info] Exception in Sheets request:", err?.message || err);
    res.status(500).json({ 
      error: "Không thể kết nối đến máy chủ Google Sheets.", 
      details: err?.message || "" 
    });
  }
});

// 7. Google Sheets API Pull Endpoint
app.post("/api/sheets/pull", async (req, res) => {
  const { month, year, accessToken, spreadsheetUrl, pullAllMonth, date, activeUser, syncType, overwrite } = req.body;

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
      console.log("[Sheets API Pull Info] Metadata details fetched or failed:", JSON.stringify(metaErrData));
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
    console.log("[Sheets Pull Network Info] Exception thrown during pull metadata fetch:", err?.message || err);
    return res.status(500).json({ error: "Không thể kết nối máy chủ Google API để xác thực quyền truy cập: " + (err.message || "") });
  }

  // Determine which dates we want to pull
  const typeOfPull = syncType || (pullAllMonth ? 'month' : 'day');
  const datesToPull: string[] = [];

  if (typeOfPull === 'day') {
    if (!date) {
      return res.status(400).json({ error: "Thiếu ngày cần tải xuống." });
    }
    datesToPull.push(date);
  } else if (typeOfPull === 'week') {
    if (!date) {
      return res.status(400).json({ error: "Thiếu ngày để xác định tuần cần tải xuống." });
    }
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + distanceToMonday);
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      const y = dayDate.getFullYear();
      const m = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dayNum = String(dayDate.getDate()).padStart(2, '0');
      datesToPull.push(`${y}-${m}-${dayNum}`);
    }
  } else if (typeOfPull === 'month') {
    const prefix = `${year}-${String(month).padStart(2, "0")}-`;
    for (let d = 1; d <= 31; d++) {
      datesToPull.push(`${prefix}${String(d).padStart(2, '0')}`);
    }
  } else if (typeOfPull === 'year' || typeOfPull === 'all') {
    const monthTabs = existingSheetTitles.filter(t => t.match(/^Tháng\s+\d+$/i));
    for (const tab of monthTabs) {
      const mMatch = tab.match(/\d+/);
      if (mMatch) {
        const mNum = parseInt(mMatch[0], 10);
        const prefix = `${year}-${String(mNum).padStart(2, "0")}-`;
        for (let d = 1; d <= 31; d++) {
          datesToPull.push(`${prefix}${String(d).padStart(2, '0')}`);
        }
      }
    }
  }

  // Group dates to pull by Year-Month
  const ymGroups: { [key: string]: { year: string; month: number; days: number[] } } = {};
  for (const dt of datesToPull) {
    const parts = dt.split("-");
    if (parts.length < 3) continue;
    const y = parts[0];
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    
    const key = `${y}-${m}`;
    if (!ymGroups[key]) {
      ymGroups[key] = { year: y, month: m, days: [] };
    }
    ymGroups[key].days.push(d);
  }

  // Build range requests for standard C7:BL40 blocks
  const rangesParams: string[] = [];
  const groupKeys = Object.keys(ymGroups);
  const resolvedGroupsMap: { [key: string]: string } = {};

  for (const ymKey of groupKeys) {
    const group = ymGroups[ymKey];
    const sheetNameNormal = `Tháng ${group.month}`;
    const sheetNamePad = `Tháng ${String(group.month).padStart(2, "0")}`;
    
    let resolvedName = "";
    if (existingSheetTitles.includes(sheetNameNormal)) {
      resolvedName = sheetNameNormal;
    } else if (existingSheetTitles.includes(sheetNamePad)) {
      resolvedName = sheetNamePad;
    }
    
    if (resolvedName) {
      rangesParams.push(`ranges=${encodeURIComponent(`'${resolvedName}'!C7:BL40`)}`);
      resolvedGroupsMap[ymKey] = resolvedName;
    }
  }

  if (rangesParams.length === 0) {
    return res.status(404).json({
      error: `Không tìm thấy bất kỳ trang tính dạng 'Tháng X' nào phù hợp trong Google Sheets để tải dữ liệu về.`
    });
  }

  // Fetch all value ranges in one batchGet call
  const batchGetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesParams.join("&")}`;
  let valueRanges: any[] = [];
  try {
    const valResponse = await fetch(batchGetUrl, {
      headers: {
        "Authorization": `Bearer ${cleanToken}`
      }
    });

    if (!valResponse.ok) {
      const valErrData = await valResponse.json() as any;
      console.log("[Sheets API Pull Info] Values read response not ok:", JSON.stringify(valErrData));
      return res.status(valResponse.status).json({
        error: `Không thể đọc dữ liệu từ Google Sheets: ${valErrData.error?.message || "Lỗi đọc dữ liệu"}`
      });
    }

    const valData = await valResponse.json() as any;
    valueRanges = valData.valueRanges || [];
  } catch (err: any) {
    console.log("[Sheets Pull Network Info] Exception in Sheets value read:", err?.message || err);
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
    'xetNghiem_sinhHoa',           // index 23, row 30
    'xetNghiem_huyetHoc',          // index 24, row 31
    'xetNghiem_nuocTieu',          // index 25, row 32
    'xetNghiem_viSinh',            // index 26, row 33
    'xetNghiem_mienDich',          // index 27, row 34
    'xetNghiem_melatec',           // index 28, row 35
    'xetNghiem_hopeHpv',           // index 29, row 36
    'xetNghiem_hopePap',           // index 30, row 37
    'xetNghiem_teBao',             // index 31, row 38
    'xetNghiem_thinPrep',          // index 32, row 39
    null,                          // index 33, row 40 (xetNghiem SUM)
  ];

  let countUpdated = 0;
  let countCreated = 0;
  let countSkipped = 0;

  // Process fetched ranges
  for (const ymKey of groupKeys) {
    const group = ymGroups[ymKey];
    const resolvedName = resolvedGroupsMap[ymKey];
    if (!resolvedName) continue;

    // Find custom valueRange that matches
    const valRange = valueRanges.find(r => r.range && r.range.includes(resolvedName));
    if (!valRange) continue;

    const rawRows = valRange.values || [];

    for (const d of group.days) {
      const targetDateStr = `${group.year}-${String(group.month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      // Column C in sheets matches (d-1)*2 index relative to base C
      const colBhIdx = (d - 1) * 2;
      const colNdIdx = (d - 1) * 2 + 1;

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

      // Check if report already exists in database
      const existingIdx = reports.findIndex(r => r.date === targetDateStr);
      const isOverwrite = overwrite === true || overwrite === "true";

      if (!hasData) {
        // If the sheet has no data for this day, but overwrite is true and the report already exists,
        // we should proceed to overwrite the existing report with 0/empty values.
        // Otherwise, skip it (no need to create a new empty report)
        if (isOverwrite && existingIdx !== -1) {
          // Proceed to update the existing report to all 0s
        } else {
          continue; 
        }
      }

      if (existingIdx !== -1) {
        // Respect overwrite choice:
        if (!isOverwrite) {
          // Merge logic: synchronize all technical services from source to destination,
          // bypassing those technical services where destination already has non-zero data (different from 0).
          const existingReport = reports[existingIdx];
          let mergedAny = false;
          
          // Deep copy existing items to prevent reference mutations
          const mergedItems = (existingReport.items || []).map((item: any) => ({ ...item }));

          for (const sourceItem of parsedItems) {
            const destItemIdx = mergedItems.findIndex(di => di.id === sourceItem.id);
            if (destItemIdx !== -1) {
              const destItem = mergedItems[destItemIdx];
              const currentBh = destItem.bh || 0;
              const currentNd = destItem.nd || 0;
              
              // If destination has NO data (meaning both bh and nd are 0)
              if (currentBh === 0 && currentNd === 0) {
                const sourceBh = sourceItem.bh || 0;
                const sourceNd = sourceItem.nd || 0;
                
                // If source has actual non-zero data to copy
                if (sourceBh !== 0 || sourceNd !== 0) {
                  mergedItems[destItemIdx] = {
                    ...destItem,
                    bh: sourceBh,
                    nd: sourceNd
                  };
                  mergedAny = true;
                }
              }
              // If destination has data (different from 0), we bypass/skip it!
            } else {
              // Service from source does not exist in destination, so we add it
              mergedItems.push(sourceItem);
              mergedAny = true;
            }
          }

          if (mergedAny) {
            reports[existingIdx] = {
              ...existingReport,
              items: mergedItems,
              status: "approved",
              approvedBy: activeUser || "Hệ thống (Google Sheets Pull - Trộn an toàn)",
              submittedAt: new Date().toISOString()
            };
            saveDocument("reports", targetDateStr, reports[existingIdx]);
            countUpdated++;
          } else {
            countSkipped++;
          }
          continue; 
        }

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
  }

  // Submit Audit Log and Notification
  let detailsLog = "";
  let successMessage = "";

  if (typeOfPull === 'day') {
    detailsLog = `Tải dữ liệu báo cáo ngày ${date} từ Google Sheets (Cập nhật: ${countUpdated}, Tạo mới: ${countCreated}, Bỏ qua: ${countSkipped})`;
    successMessage = `Đã tải thành công dữ liệu ngày ${date} từ Google Sheets. (Cập nhật: ${countUpdated}, Tạo mới: ${countCreated}, Bỏ qua: ${countSkipped})`;
  } else if (typeOfPull === 'week') {
    detailsLog = `Tải dữ liệu tuần chứa ngày ${date} từ Google Sheets (Cập nhật: ${countUpdated}, Tạo mới: ${countCreated}, Bỏ qua: ${countSkipped})`;
    successMessage = `Đã tải thành công dữ liệu tuần từ Google Sheets. (Cập nhật: ${countUpdated}, Tạo mới: ${countCreated}, Bỏ qua: ${countSkipped})`;
  } else if (typeOfPull === 'month') {
    detailsLog = `Tải toàn bộ số liệu của Tháng ${month}/${year} từ Google Sheets (Cập nhật: ${countUpdated}, Tạo mới: ${countCreated}, Bỏ qua: ${countSkipped})`;
    successMessage = `Đã tải thành công toàn bộ số liệu của Tháng ${month}/${year} từ Google Sheets. (Cập nhật: ${countUpdated}, Tạo mới: ${countCreated}, Bỏ qua: ${countSkipped})`;
  } else if (typeOfPull === 'year') {
    detailsLog = `Tải toàn bộ số liệu của Năm ${year} từ Google Sheets (Cập nhật: ${countUpdated}, Tạo mới: ${countCreated}, Bỏ qua: ${countSkipped})`;
    successMessage = `Đã tải thành công toàn bộ số liệu của Năm ${year} từ Google Sheets. (Cập nhật: ${countUpdated}, Tạo mới: ${countCreated}, Bỏ qua: ${countSkipped})`;
  } else if (typeOfPull === 'all') {
    detailsLog = `Tải toàn bộ số liệu các tháng hiện có từ Google Sheets (Cập nhật: ${countUpdated}, Tạo mới: ${countCreated}, Bỏ qua: ${countSkipped})`;
    successMessage = `Đã tải thành công toàn bộ số liệu các tháng hiện có từ Google Sheets. (Cập nhật: ${countUpdated}, Tạo mới: ${countCreated}, Bỏ qua: ${countSkipped})`;
  }

  const newLog = {
    id: "log_" + Date.now(),
    actor: activeUser || "Hệ thống",
    action: "Tải từ Google Sheets",
    details: detailsLog,
    timestamp: new Date().toISOString()
  };
  serverAuditLogs.unshift(newLog);
  saveDocument("auditLogs", newLog.id, newLog);

  // Submit to System notifications
  const newNotif = {
    id: "n_" + Date.now(),
    title: "Tải dữ liệu Google Sheets thành công",
    content: `${activeUser || "Hệ thống"} đã tải dữ liệu Google Sheets: ${detailsLog}`,
    timestamp: new Date().toISOString(),
    type: "update" as 'meeting' | 'task' | 'update' | 'report' | 'system' | 'alert',
    read: false,
  };
  notifications.unshift(newNotif);
  saveDocument("notifications", newNotif.id, newNotif);

  res.json({
    success: true,
    message: successMessage,
    countUpdated,
    countCreated,
    countSkipped
  });
});

// 8. Google Sheets Auto-Sync & Telegram Reporting
function getYesterdayDateInVietnam() {
  const vnTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  vnTime.setDate(vnTime.getDate() - 1);
  const y = vnTime.getFullYear();
  const m = String(vnTime.getMonth() + 1).padStart(2, '0');
  const d = String(vnTime.getDate()).padStart(2, '0');
  return {
    dateStr: `${y}-${m}-${d}`,
    year: y,
    month: vnTime.getMonth() + 1,
    day: vnTime.getDate()
  };
}

async function getFreshAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${await response.text()}`);
  }
  const data = await response.json() as any;
  return data.access_token;
}

async function sendTelegramMessage(botToken: string, chatId: string, message: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML"
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Telegram API Error: ${text}`);
  }
  return await response.json();
}

function formatTelegramReportMessage(report: any, dateStr: string): string {
  const dateParts = dateStr.split("-");
  const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : dateStr;

  let message = `📊 <b>BÁO CÁO GIAO BAN SỐ LIỆU SỬ DỤNG AI</b>\n`;
  message += `📅 <b>Ngày báo cáo:</b> ${formattedDate}\n`;
  message += `👤 <b>Đồng bộ từ:</b> ${report.submittedBy || "Hệ thống tự động"}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  const categories: { [key: string]: { label: string; items: any[] } } = {
    sieuAm: { label: "🔊 SIÊU ÂM", items: [] },
    noiSoi: { label: "👁️ NỘI SOI", items: [] },
    xQuang: { label: "🩻 X-QUANG & CLVT", items: [] },
    dienTim: { label: "📈 ĐIỆN TIM & LHN", items: [] },
    xetNghiem: { label: "🧪 XÉT NGHIỆM", items: [] }
  };

  const items = report.items || [];
  let totalBhAll = 0;
  let totalNdAll = 0;

  items.forEach((item: any) => {
    totalBhAll += item.bh || 0;
    totalNdAll += item.nd || 0;

    if (item.id.startsWith("sieuAm_")) {
      categories.sieuAm.items.push(item);
    } else if (item.id.startsWith("noiSoi_")) {
      categories.noiSoi.items.push(item);
    } else if (item.id.startsWith("xQuang_")) {
      categories.xQuang.items.push(item);
    } else if (item.id.startsWith("dienTim_")) {
      categories.dienTim.items.push(item);
    } else if (item.id.startsWith("xetNghiem_")) {
      categories.xetNghiem.items.push(item);
    }
  });

  Object.keys(categories).forEach((catKey) => {
    const cat = categories[catKey];
    let catBh = 0;
    let catNd = 0;
    let catLines = "";

    cat.items.forEach((item) => {
      const bh = item.bh || 0;
      const nd = item.nd || 0;
      catBh += bh;
      catNd += nd;

      if (bh > 0 || nd > 0) {
        catLines += `  • ${item.name}: <b>${bh + nd}</b> ca `;
        if (bh > 0 && nd > 0) {
          catLines += `<i>(BH: ${bh}, ND: ${nd})</i>`;
        } else if (bh > 0) {
          catLines += `<i>(BH: ${bh})</i>`;
        } else if (nd > 0) {
          catLines += `<i>(ND: ${nd})</i>`;
        }
        catLines += `\n`;
      }
    });

    if (catBh > 0 || catNd > 0) {
      message += `<b>${cat.label}</b> (Tổng: <b>${catBh + catNd}</b> ca)\n`;
      message += catLines;
      message += `\n`;
    }
  });

  message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📈 <b>TỔNG CỘNG TOÀN KHOA:</b> <b>${totalBhAll + totalNdAll}</b> ca thực hiện\n`;
  message += `  - Bảo hiểm Y tế (BH): <b>${totalBhAll}</b> ca\n`;
  message += `  - Ngoài định mức / Dịch vụ (ND): <b>${totalNdAll}</b> ca\n\n`;
  message += `🔔 <i>Hệ thống báo cáo tự động lúc 12:00 hàng ngày. Không cần mở ứng dụng.</i>`;

  return message;
}

async function runAutomatedSyncAndReport(customDateStr?: string, customReferer?: string, forceOverwrite: boolean = false) {
  try {
    const settings = systemSettings as any;
    const spreadsheetUrl = settings.googleSpreadsheetUrl || "";
    if (!spreadsheetUrl) {
      throw new Error("Đường dẫn Google Sheets chưa được cấu hình.");
    }

    let targetDateStr = customDateStr;
    let targetYear = 0;
    let targetMonth = 0;
    let targetDay = 0;

    if (!targetDateStr) {
      const yesterday = getYesterdayDateInVietnam();
      targetDateStr = yesterday.dateStr;
      targetYear = yesterday.year;
      targetMonth = yesterday.month;
      targetDay = yesterday.day;
    } else {
      const parts = targetDateStr.split("-");
      if (parts.length === 3) {
        targetYear = parseInt(parts[0], 10);
        targetMonth = parseInt(parts[1], 10);
        targetDay = parseInt(parts[2], 10);
      } else {
        throw new Error("Định dạng ngày không đúng. Vui lòng dùng YYYY-MM-DD.");
      }
    }

    console.log(`[Auto-Sync] Bắt đầu đồng bộ tự động ngày ${targetDateStr}...`);

    const cleanUrl = String(spreadsheetUrl).trim();
    let spreadsheetId = "";
    const match = cleanUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      spreadsheetId = match[1];
    } else {
      spreadsheetId = cleanUrl;
    }

    if (!spreadsheetId) {
      throw new Error("Không thể xác định Spreadsheet ID.");
    }

    let token = "";
    const apiKey = settings.googleApiKey || "";
    
    if (settings.googleRefreshToken && settings.googleClientId && settings.googleClientSecret) {
      try {
        console.log("[Auto-Sync] Đang lấy Google Access Token mới từ Refresh Token...");
        token = await getFreshAccessToken(
          settings.googleClientId,
          settings.googleClientSecret,
          settings.googleRefreshToken
        );
      } catch (err: any) {
        console.error("[Auto-Sync] Lỗi làm mới token:", err?.message || err);
      }
    }

    if (!token && settings.googleAccessToken) {
      token = settings.googleAccessToken;
    }

    if (!token && !apiKey) {
      throw new Error("Chưa cấu hình thông tin xác thực Google. Vui lòng thiết lập 'Google API Key' (cho bảng tính Công khai) hoặc điền đầy đủ 'Google Client ID / Client Secret / Refresh Token' (cho bảng tính Riêng tư) trong mục Quản trị hệ thống -> Đồng bộ Google Sheets.");
    }

    let metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
    if (apiKey && !token) {
      metaUrl += `&key=${apiKey}`;
    }

    const headers: any = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Set Referer and Origin to bypass restricted API key restrictions
    let referer = customReferer;
    if (!referer) {
      if (process.env.RENDER_EXTERNAL_URL) {
        referer = process.env.RENDER_EXTERNAL_URL;
      } else {
        referer = "https://baocaogbcls.onrender.com/";
      }
    }
    
    if (referer && !referer.endsWith("/")) {
      referer += "/";
    }

    headers["Referer"] = referer;
    try {
      const parsedUrl = new URL(referer);
      headers["Origin"] = parsedUrl.origin;
    } catch {
      headers["Origin"] = "https://baocaogbcls.onrender.com";
    }

    const metaResponse = await fetch(metaUrl, { headers });
    if (!metaResponse.ok) {
      throw new Error(`Google Sheets Metadata API Error (HTTP ${metaResponse.status}): ${await metaResponse.text()}`);
    }

    const metaData = await metaResponse.json() as any;
    const existingSheetTitles = (metaData.sheets || []).map((s: any) => s.properties?.title || "");

    const sheetNameNormal = `Tháng ${targetMonth}`;
    const sheetNamePad = `Tháng ${String(targetMonth).padStart(2, "0")}`;
    
    let resolvedName = "";
    if (existingSheetTitles.includes(sheetNameNormal)) {
      resolvedName = sheetNameNormal;
    } else if (existingSheetTitles.includes(sheetNamePad)) {
      resolvedName = sheetNamePad;
    }

    if (!resolvedName) {
      throw new Error(`Không tìm thấy trang tính 'Tháng ${targetMonth}' trong Google Sheets.`);
    }

    const range = `'${resolvedName}'!C7:BL40`;
    let batchGetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${encodeURIComponent(range)}`;
    if (apiKey && !token) {
      batchGetUrl += `&key=${apiKey}`;
    }

    const valResponse = await fetch(batchGetUrl, { headers });
    if (!valResponse.ok) {
      throw new Error(`Google Sheets Values API Error (HTTP ${valResponse.status}): ${await valResponse.text()}`);
    }

    const valData = await valResponse.json() as any;
    const valueRanges = valData.valueRanges || [];
    const valRange = valueRanges[0];
    if (!valRange || !valRange.values) {
      throw new Error(`Trang tính rỗng hoặc không có dữ liệu cho dải ô tháng ${targetMonth}.`);
    }

    const rawRows = valRange.values;
    const colBhIdx = (targetDay - 1) * 2;
    const colNdIdx = (targetDay - 1) * 2 + 1;

    const rowItemIds: (string | null)[] = [
      'sieuAm_tim',
      'sieuAm_mach',
      'sieuAm_thai4d',
      'sieuAm_tongquat',
      'sieuAm_danHoi',
      'sieuAm_canThiep',
      null,
      'noiSoi_daDay',
      'noiSoi_daiTrucTrang',
      'noiSoi_trucTrang',
      'noiSoi_sigma',
      'noiSoi_thutThao',
      'noiSoi_catPolyp',
      'noiSoi_clotest',
      'noiSoi_gayMeDaDayDaiTrang',
      'noiSoi_gayMeDon',
      null,
      'xQuang_thuong',
      'xQuang_dacBiet',
      'xQuang_clvt',
      null,
      'dienTim_thuong',
      'dienTim_luuHuyetNao',
      'xetNghiem_sinhHoa',
      'xetNghiem_huyetHoc',
      'xetNghiem_nuocTieu',
      'xetNghiem_viSinh',
      'xetNghiem_mienDich',
      'xetNghiem_melatec',
      'xetNghiem_hopeHpv',
      'xetNghiem_hopePap',
      'xetNghiem_teBao',
      'xetNghiem_thinPrep',
      null,
    ];

    const parsedItems: any[] = [];
    rowItemIds.forEach((itemId, rIdx) => {
      if (!itemId) return;

      const rowData = rawRows[rIdx] || [];
      const bhRaw = rowData[colBhIdx];
      const ndRaw = rowData[colNdIdx];

      const bhVal = (bhRaw !== undefined && bhRaw !== "") ? parseInt(bhRaw) : 0;
      const ndVal = (ndRaw !== undefined && ndRaw !== "") ? parseInt(ndRaw) : 0;

      const bhNum = isNaN(bhVal) ? 0 : bhVal;
      const ndNum = isNaN(ndVal) ? 0 : ndVal;

      const standardProc = serverProcedures.find(p => p.id === itemId);
      parsedItems.push({
        id: itemId,
        name: standardProc?.name || itemId,
        category: standardProc?.category || "other",
        bh: bhNum,
        nd: ndNum
      });
    });

    const existingIdx = reports.findIndex(r => r.date === targetDateStr);
    let finalReport: any;

    if (existingIdx !== -1) {
      if (!forceOverwrite) {
        // Merge logic: synchronize all technical services from source to destination,
        // bypassing those technical services where destination already has non-zero data (different from 0).
        const existingReport = reports[existingIdx];
        let mergedAny = false;
        
        // Deep copy existing items to prevent reference mutations
        const mergedItems = (existingReport.items || []).map((item: any) => ({ ...item }));

        for (const sourceItem of parsedItems) {
          const destItemIdx = mergedItems.findIndex(di => di.id === sourceItem.id);
          if (destItemIdx !== -1) {
            const destItem = mergedItems[destItemIdx];
            const currentBh = destItem.bh || 0;
            const currentNd = destItem.nd || 0;
            
            // If destination has NO data (meaning both bh and nd are 0)
            if (currentBh === 0 && currentNd === 0) {
              const sourceBh = sourceItem.bh || 0;
              const sourceNd = sourceItem.nd || 0;
              
              // If source has actual non-zero data to copy
              if (sourceBh !== 0 || sourceNd !== 0) {
                mergedItems[destItemIdx] = {
                  ...destItem,
                  bh: sourceBh,
                  nd: sourceNd
                };
                mergedAny = true;
              }
            }
            // If destination has data (different from 0), we bypass/skip it!
          } else {
            // Service from source does not exist in destination, so we add it
            mergedItems.push(sourceItem);
            mergedAny = true;
          }
        }

        if (mergedAny) {
          reports[existingIdx] = {
            ...existingReport,
            items: mergedItems,
            status: "approved",
            approvedBy: "Hệ thống (Đồng bộ Tự động 12h - Trộn an toàn)",
            submittedAt: new Date().toISOString()
          };
          saveDocument("reports", targetDateStr, reports[existingIdx]);

          // Add Audit Log for success merge
          const logId = "log_auto_merge_" + Date.now();
          const newLog = {
            id: logId,
            actor: "Hệ thống tự động",
            action: "Đồng bộ tự động",
            details: `Đồng bộ tự động ngày ${targetDateStr} đã bổ sung dữ liệu mới từ Google Sheets vào các ô trống mà không ghi đè dữ liệu cũ.`,
            timestamp: new Date().toISOString()
          };
          serverAuditLogs.unshift(newLog);
          saveDocument("auditLogs", logId, newLog);

          // Add Notification for success merge
          const notifId = "notif_auto_merge_" + Date.now();
          const newNotification = {
            id: notifId,
            title: "Đồng bộ tự động bổ sung dữ liệu 🕒",
            content: `Đã tự động bổ sung số liệu mới ngày ${targetDateStr} từ Google Sheets vào các phần chưa nhập của Clinis thành công.`,
            timestamp: new Date().toISOString(),
            type: "success",
            read: false
          };
          notifications.push(newNotification);
          saveDocument("notifications", notifId, newNotification);

          return { success: true, date: targetDateStr, merged: true, details: "Đã tự động bổ sung số liệu vào các ô trống." };
        } else {
          console.log(`[Auto-Sync] Báo cáo ngày ${targetDateStr} đã tồn tại và không có dữ liệu mới để bổ sung. Bỏ qua.`);
          
          // Add Audit Log
          const logId = "log_auto_skip_" + Date.now();
          const newLog = {
            id: logId,
            actor: "Hệ thống tự động",
            action: "Đồng bộ tự động",
            details: `Đồng bộ tự động ngày ${targetDateStr} được bỏ qua vì báo cáo đã tồn tại trong hệ thống và không phát hiện số liệu mới.`,
            timestamp: new Date().toISOString()
          };
          serverAuditLogs.unshift(newLog);
          saveDocument("auditLogs", logId, newLog);

          // Add Notification
          const notifId = "notif_auto_skip_" + Date.now();
          const newNotification = {
            id: notifId,
            title: "Đồng bộ tự động bỏ qua 🕒",
            content: `Dữ liệu ngày ${targetDateStr} đã đầy đủ. Hệ thống tự động bỏ qua để bảo toàn dữ liệu cũ.`,
            timestamp: new Date().toISOString(),
            type: "warning",
            read: false
          };
          notifications.push(newNotification);
          saveDocument("notifications", notifId, newNotification);

          return { success: true, date: targetDateStr, skipped: true, reason: "Báo cáo đã đầy đủ, bỏ qua theo cấu hình an toàn." };
        }
      }

      reports[existingIdx] = {
        ...reports[existingIdx],
        items: parsedItems,
        status: "approved",
        approvedBy: "Hệ thống (Đồng bộ Tự động 12h)",
        submittedAt: new Date().toISOString()
      };
      finalReport = reports[existingIdx];
      saveDocument("reports", targetDateStr, finalReport);
    } else {
      finalReport = {
        date: targetDateStr,
        status: "approved",
        submittedBy: "Hệ thống (Đồng bộ Tự động 12h)",
        submittedAt: new Date().toISOString(),
        approvedBy: "Hệ thống (Đồng bộ Tự động 12h)",
        items: parsedItems
      };
      reports.push(finalReport);
      saveDocument("reports", targetDateStr, finalReport);
    }

    // Add Audit Log
    const logId = "log_auto_" + Date.now();
    const newLog = {
      id: logId,
      actor: "Hệ thống tự động",
      action: "Đồng bộ tự động",
      details: `Đồng bộ dữ liệu báo cáo ngày ${targetDateStr} từ Google Sheets thành công.`,
      timestamp: new Date().toISOString()
    };
    serverAuditLogs.unshift(newLog);
    saveDocument("auditLogs", logId, newLog);

    // Add Notification
    const notifId = "notif_auto_" + Date.now();
    const newNotification = {
      id: notifId,
      title: "Đồng bộ tự động hoàn tất 🕒",
      content: `Dữ liệu ngày ${targetDateStr} đã được đồng bộ từ Google Sheets và gửi báo cáo Telegram thành công.`,
      timestamp: new Date().toISOString(),
      type: "success",
      read: false
    };
    notifications.push(newNotification);
    saveDocument("notifications", notifId, newNotification);

    // Send Telegram
    const botToken = settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = settings.telegramChatId || process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      console.log(`[Auto-Sync] Đang gửi báo cáo Telegram ngày ${targetDateStr}...`);
      const tgMsg = formatTelegramReportMessage(finalReport, targetDateStr);
      await sendTelegramMessage(botToken, chatId, tgMsg);
      console.log("[Auto-Sync] Báo cáo Telegram đã gửi thành công.");
    } else {
      console.log("[Auto-Sync] Chưa cấu hình Telegram Bot Token hoặc Chat ID. Bỏ qua gửi báo cáo.");
    }

    return { success: true, date: targetDateStr, report: finalReport };
  } catch (err: any) {
    console.error("[Auto-Sync] Đồng bộ tự động thất bại:", err?.message || err);

    let friendlyError = err?.message || String(err);
    if (friendlyError.includes("API_KEY_HTTP_REFERRER_BLOCKED") || friendlyError.includes("Requests from referer") || friendlyError.includes("blocked")) {
      friendlyError = "Lỗi API Key Google (HTTP 403 - Referrer Blocked): Google Cloud Console của bạn đang chặn yêu cầu từ tên miền này. Vui lòng vào Google Cloud Console -> APIs & Services -> Credentials, tìm API Key và thêm tên miền của ứng dụng (hoặc bỏ giới hạn HTTP referrers), hoặc sử dụng tính năng liên kết tài khoản Google (OAuth) trong mục Quản Lý Nhân Sự / Cấu Hình để đồng bộ không cần API Key.";
    }

    try {
      const notifId = "notif_err_" + Date.now();
      const newNotification = {
        id: notifId,
        title: "Đồng bộ tự động thất bại ⚠️",
        content: `Lỗi: ${friendlyError}`,
        timestamp: new Date().toISOString(),
        type: "error",
        read: false
      };
      notifications.unshift(newNotification);
      saveDocument("notifications", notifId, newNotification);
    } catch (e) {}

    return { success: false, error: friendlyError };
  }
}

// REST Endpoint to trigger/test Auto-Sync manually
app.post("/api/sheets/auto-sync-test", async (req, res) => {
  const { date, overwrite } = req.body;
  const forceOverwrite = overwrite === true || overwrite === "true";
  let referer = (req.headers.referer || req.headers.origin) as string | undefined;
  if (!referer) {
    const host = req.get("host");
    if (host) {
      const protocol = (host.includes("localhost") || host.includes("127.0.0.1") || host.includes("3000")) ? "http" : "https";
      referer = `${protocol}://${host}/`;
    }
  }
  const result = await runAutomatedSyncAndReport(date, referer, forceOverwrite);
  // Always return 200 OK so client-side display can handle it gracefully as a valid response
  res.status(200).json(result);
});

// GET Endpoint to trigger Auto-Sync via external cron services (like cron-job.org)
app.get("/api/sheets/auto-sync-cron", async (req, res) => {
  const { date, overwrite } = req.query;
  const forceOverwrite = String(overwrite) === "true";
  let referer = (req.headers.referer || req.headers.origin) as string | undefined;
  if (!referer) {
    const host = req.get("host");
    if (host) {
      const protocol = (host.includes("localhost") || host.includes("127.0.0.1") || host.includes("3000")) ? "http" : "https";
      referer = `${protocol}://${host}/`;
    }
  }
  const result = await runAutomatedSyncAndReport(date as string | undefined, referer, forceOverwrite);
  // Always return 200 OK so that external cron-job.org scheduler doesn't disable the cron job due to temporary API failures or configuration issues
  res.status(200).json(result);
});

// Periodic check for 12:00 Vietnam time daily
setInterval(async () => {
  try {
    const settings = systemSettings as any;
    if (!settings.autoSyncEnabled) {
      return;
    }

    const vnTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
    const hour = vnTime.getHours();
    const minute = vnTime.getMinutes();
    
    // Parse target hour and target minute (default to 12:00)
    const targetTime = settings.autoSyncTime || "12:00";
    const [targetHourStr, targetMinStr] = targetTime.split(":");
    const targetHour = parseInt(targetHourStr, 10) || 12;
    const targetMin = parseInt(targetMinStr, 10) || 0;

    if (hour === targetHour && minute === targetMin) {
      const dateKey = vnTime.toDateString();
      if ((global as any).lastAutoSyncDate === dateKey) {
        return; // Already run today
      }
      (global as any).lastAutoSyncDate = dateKey;
      
      console.log(`[Auto-Sync Scheduler] Triggering automatic daily sync and Telegram reporting at ${targetTime} VN time...`);
      await runAutomatedSyncAndReport();
    }
  } catch (err) {
    console.error("[Auto-Sync Scheduler] Error in background scheduler:", err);
  }
}, 60000); // Check once every minute

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
      
      // Tự động nâng cấp cấu hình cũ sang giao diện y tế xanh sáng chuyên nghiệp
      if (systemSettings.themeColor === "#4f46e5") {
        systemSettings.themeColor = "#0284c7";
      }
      if (systemSettings.bgStyle === "clean-mint" || systemSettings.bgStyle === "default") {
        systemSettings.bgStyle = "modern-blue";
      }
      if (systemSettings.bannerPreset === "default") {
        systemSettings.bannerPreset = "medical";
      }

      // Ensure essential defaults are kept if they became falsy in the DB/local backup
      if (!systemSettings.googleSpreadsheetUrl) {
        systemSettings.googleSpreadsheetUrl = "https://docs.google.com/spreadsheets/d/1n7yQQmninnDTVNtIZqCzUEiAI1jRHSj4VTr7pVs3KMM/edit?usp=sharing";
      }
      if (!systemSettings.googleClientId) {
        systemSettings.googleClientId = "1067215171120-g7a7fge4vbe050m3oabm896v1k6g6m2f.apps.googleusercontent.com";
      }
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
