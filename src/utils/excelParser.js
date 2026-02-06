import * as XLSX from 'xlsx'

/**
 * Đọc file Excel và trả về dữ liệu dạng array of objects
 */
export function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result)
                const workbook = XLSX.read(data, { type: 'array' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
                resolve(jsonData)
            } catch (error) {
                reject(new Error('Không thể đọc file Excel: ' + error.message))
            }
        }

        reader.onerror = () => reject(new Error('Lỗi khi đọc file'))
        reader.readAsArrayBuffer(file)
    })
}

/**
 * Parse dữ liệu nhân viên từ Excel
 * Columns: MaNV, HoTen, DonVi, MaSoThue, SoCCCD
 */
export function parseEmployeeData(data) {
    return data.map((row, index) => ({
        rowIndex: index + 2,
        ma_nv: String(row.MaNV || row.ma_nv || '').trim(),
        ho_ten: String(row.HoTen || row.ho_ten || '').trim(),
        don_vi: String(row.DonVi || row.don_vi || '').trim(),
        ma_so_thue: String(row.MaSoThue || row.ma_so_thue || '').trim(),
        so_cccd: String(row.SoCCCD || row.so_cccd || '').trim(),
    })).filter(emp => emp.ma_nv && emp.ho_ten)
}

/**
 * Parse dữ liệu thu nhập từ Excel
 * Columns: MaNV, HoTen, MaSoThue, TongThuNhap, KhgChiuThue, BaoHiem
 */
export function parseIncomeData(data) {
    return data.map((row, index) => ({
        rowIndex: index + 2,
        ma_nv: String(row.MaNV || row.ma_nv || '').trim(),
        ho_ten: String(row.HoTen || row.ho_ten || '').trim(),
        ma_so_thue: String(row.MaSoThue || row.ma_so_thue || '').trim(),
        tong_thu_nhap: parseFloat(row.TongThuNhap || row.tong_thu_nhap || 0) || 0,
        khong_chiu_thue: parseFloat(row.KhgChiuThue || row.khong_chiu_thue || 0) || 0,
        bao_hiem: parseFloat(row.BaoHiem || row.bao_hiem || 0) || 0,
    })).filter(item => item.ma_nv)
}

/**
 * Tạo file Excel mẫu cho import nhân viên
 */
export function downloadEmployeeTemplate() {
    const template = [
        { MaNV: 'NV001', HoTen: 'Nguyễn Văn A', DonVi: 'Phòng Kế toán', MaSoThue: '1234567890', SoCCCD: '001234567890' },
        { MaNV: 'NV002', HoTen: 'Trần Thị B', DonVi: 'Phòng Nhân sự', MaSoThue: '0987654321', SoCCCD: '001234567891' },
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'NhanVien')
    XLSX.writeFile(wb, 'mau_import_nhanvien.xlsx')
}

/**
 * Tạo file Excel mẫu cho import thu nhập
 */
export function downloadIncomeTemplate() {
    const template = [
        { MaNV: 'NV001', HoTen: 'Nguyễn Văn A', MaSoThue: '1234567890', TongThuNhap: 25000000, KhgChiuThue: 0, BaoHiem: 2500000 },
        { MaNV: 'NV002', HoTen: 'Trần Thị B', MaSoThue: '0987654321', TongThuNhap: 18000000, KhgChiuThue: 500000, BaoHiem: 1800000 },
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'ThuNhap')
    XLSX.writeFile(wb, 'mau_import_thunhap.xlsx')
}

/**
 * Export dữ liệu ra file Excel
 */
export function exportToExcel(data, fileName, sheetName = 'Data') {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, fileName)
}
