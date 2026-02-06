import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { parseExcelFile, parseIncomeData, downloadIncomeTemplate, exportToExcel } from '../utils/excelParser'
import { tinhToanThue, kiemTraThoiGianGiamTru, GIAM_TRU } from '../lib/taxCalculator'
import {
    Upload,
    Download,
    Calendar,
    Calculator,
    FileSpreadsheet,
    Check,
    AlertCircle,
    DollarSign,
    Users,
    TrendingUp
} from 'lucide-react'

export default function TaxCalculation() {
    const [employees, setEmployees] = useState([])
    const [taxRecords, setTaxRecords] = useState([])
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [loading, setLoading] = useState(true)
    const [calculating, setCalculating] = useState(false)
    const [importModalOpen, setImportModalOpen] = useState(false)
    const [importData, setImportData] = useState([])
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const fileInputRef = useRef(null)

    useEffect(() => {
        fetchData()
    }, [selectedMonth, selectedYear])

    const fetchData = async () => {
        setLoading(true)

        // Fetch employees with dependents
        const { data: empData } = await supabase
            .from('employees')
            .select(`
        id, ma_nv, ho_ten,
        dependents (id, giam_tru_tu, giam_tru_den, khong_su_dung)
      `)
            .eq('da_nghi_viec', false)

        setEmployees(empData || [])

        // Fetch tax records for selected month
        const { data: taxData } = await supabase
            .from('monthly_income')
            .select(`
        *,
        employees (ma_nv, ho_ten)
      `)
            .eq('thang', selectedMonth)
            .eq('nam', selectedYear)
            .order('created_at', { ascending: false })

        setTaxRecords(taxData || [])
        setLoading(false)
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        try {
            const rawData = await parseExcelFile(file)
            const parsedData = parseIncomeData(rawData)

            if (parsedData.length === 0) {
                throw new Error('Không tìm thấy dữ liệu hợp lệ trong file')
            }

            setImportData(parsedData)
            setImportModalOpen(true)
        } catch (err) {
            setError(err.message)
            setTimeout(() => setError(''), 5000)
        }

        e.target.value = ''
    }

    const calculateTax = async () => {
        setCalculating(true)
        setError('')

        try {
            const records = []

            for (const item of importData) {
                // Find employee by ma_nv
                const employee = employees.find(e => e.ma_nv === item.ma_nv)
                if (!employee) {
                    console.warn(`Không tìm thấy nhân viên với mã ${item.ma_nv}`)
                    continue
                }

                // Count valid dependents
                const validDependents = (employee.dependents || []).filter(dep =>
                    kiemTraThoiGianGiamTru(dep, selectedMonth, selectedYear)
                )

                // Calculate tax
                const taxResult = tinhToanThue({
                    tongThuNhap: item.tong_thu_nhap,
                    khongChiuThue: item.khong_chiu_thue,
                    baoHiem: item.bao_hiem,
                    soPhuThuoc: validDependents.length,
                })

                records.push({
                    employee_id: employee.id,
                    thang: selectedMonth,
                    nam: selectedYear,
                    tong_thu_nhap: taxResult.tongThuNhap,
                    khong_chiu_thue: taxResult.khongChiuThue,
                    bao_hiem: taxResult.baoHiem,
                    giam_tru_ban_than: taxResult.giamTruBanThan,
                    giam_tru_phu_thuoc: taxResult.giamTruPhuThuoc,
                    thu_nhap_chiu_thue: taxResult.thuNhapChiuThue,
                    thue_tncn: taxResult.thueTNCN,
                })
            }

            if (records.length === 0) {
                throw new Error('Không có dữ liệu hợp lệ để tính thuế')
            }

            // Upsert records
            const { error } = await supabase
                .from('monthly_income')
                .upsert(records, {
                    onConflict: 'employee_id,thang,nam',
                })

            if (error) throw error

            setSuccess(`Tính thuế thành công cho ${records.length} nhân viên!`)
            setImportModalOpen(false)
            setImportData([])
            fetchData()
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            setError(err.message)
        } finally {
            setCalculating(false)
        }
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN').format(value || 0) + ' đ'
    }

    const handleExport = () => {
        const exportData = taxRecords.map(record => ({
            'Mã NV': record.employees?.ma_nv,
            'Họ tên': record.employees?.ho_ten,
            'Tháng': record.thang,
            'Năm': record.nam,
            'Tổng thu nhập': record.tong_thu_nhap,
            'Không chịu thuế': record.khong_chiu_thue,
            'Bảo hiểm': record.bao_hiem,
            'Giảm trừ bản thân': record.giam_tru_ban_than,
            'Giảm trừ phụ thuộc': record.giam_tru_phu_thuoc,
            'Thu nhập chịu thuế': record.thu_nhap_chiu_thue,
            'Thuế TNCN': record.thue_tncn,
        }))

        exportToExcel(exportData, `thue_tncn_${selectedMonth}_${selectedYear}.xlsx`, 'ThueTNCN')
    }

    const totalTax = taxRecords.reduce((sum, r) => sum + (parseFloat(r.thue_tncn) || 0), 0)
    const totalIncome = taxRecords.reduce((sum, r) => sum + (parseFloat(r.tong_thu_nhap) || 0), 0)

    const months = Array.from({ length: 12 }, (_, i) => i + 1)
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Tính thuế TNCN</h1>
                    <p className="text-slate-500 mt-1">Import dữ liệu thu nhập và tính thuế theo tháng</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => downloadIncomeTemplate()}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Tải mẫu</span>
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/20"
                    >
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">Import & Tính thuế</span>
                    </button>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileUpload}
                />
            </div>

            {/* Success/Error Messages */}
            {success && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
                    <Check className="w-5 h-5" />
                    <span>{success}</span>
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Period Selection & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <p className="text-sm font-medium text-slate-500 mb-3">Chọn kỳ tính thuế</p>
                    <div className="flex gap-2">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            {months.map(m => (
                                <option key={m} value={m}>Tháng {m}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Số nhân viên</p>
                            <p className="text-2xl font-bold text-slate-800 mt-1">{taxRecords.length}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <Users className="w-6 h-6 text-blue-500" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Tổng thu nhập</p>
                            <p className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(totalIncome)}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-green-500" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Tổng thuế TNCN</p>
                            <p className="text-xl font-bold text-purple-600 mt-1">{formatCurrency(totalTax)}</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-xl">
                            <DollarSign className="w-6 h-6 text-purple-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tax Formula Info */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Công thức tính thuế TNCN
                </h3>
                <div className="space-y-2 text-sm text-purple-700">
                    <p><strong>Thu nhập chịu thuế</strong> = Tổng thu nhập - Không chịu thuế - Bảo hiểm - Giảm trừ bản thân - Giảm trừ phụ thuộc</p>
                    <div className="flex flex-wrap gap-4 mt-3">
                        <span className="bg-white px-3 py-1 rounded-lg">
                            Giảm trừ bản thân: <strong>{formatCurrency(GIAM_TRU.BAN_THAN)}/tháng</strong>
                        </span>
                        <span className="bg-white px-3 py-1 rounded-lg">
                            Giảm trừ người phụ thuộc: <strong>{formatCurrency(GIAM_TRU.PHU_THUOC)}/người/tháng</strong>
                        </span>
                    </div>
                </div>
            </div>

            {/* Tax Records Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-800">
                        Lịch sử thuế tháng {selectedMonth}/{selectedYear}
                    </h2>
                    {taxRecords.length > 0 && (
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export Excel
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                ) : taxRecords.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                        <FileSpreadsheet className="w-16 h-16 mb-4 text-slate-300" />
                        <p className="text-lg font-medium">Chưa có dữ liệu thuế</p>
                        <p className="text-sm">Import file Excel thu nhập để tính thuế</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Nhân viên</th>
                                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Tổng TN</th>
                                    <th className="text-right px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Bảo hiểm</th>
                                    <th className="text-right px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Giảm trừ PT</th>
                                    <th className="text-right px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">TN chịu thuế</th>
                                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Thuế TNCN</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {taxRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium text-slate-800">{record.employees?.ho_ten}</p>
                                                <p className="text-slate-500">{record.employees?.ma_nv}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            {formatCurrency(record.tong_thu_nhap)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono hidden md:table-cell">
                                            {formatCurrency(record.bao_hiem)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono hidden lg:table-cell">
                                            {formatCurrency(record.giam_tru_phu_thuoc)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono hidden lg:table-cell">
                                            {formatCurrency(record.thu_nhap_chiu_thue)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="font-semibold text-purple-600">
                                                {formatCurrency(record.thue_tncn)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                <tr>
                                    <td className="px-4 py-3 font-semibold text-slate-800">Tổng cộng</td>
                                    <td className="px-4 py-3 text-right font-mono font-semibold">
                                        {formatCurrency(totalIncome)}
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell"></td>
                                    <td className="px-4 py-3 hidden lg:table-cell"></td>
                                    <td className="px-4 py-3 hidden lg:table-cell"></td>
                                    <td className="px-4 py-3 text-right font-semibold text-purple-600">
                                        {formatCurrency(totalTax)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Import Modal */}
            {importModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">
                                    Tính thuế TNCN tháng {selectedMonth}/{selectedYear}
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">{importData.length} dòng dữ liệu</p>
                            </div>
                            <button
                                onClick={() => { setImportModalOpen(false); setImportData([]) }}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                            >
                                ✕
                            </button>
                        </div>

                        {error && (
                            <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <div className="flex-1 overflow-auto p-6">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr>
                                        <th className="text-left px-4 py-2">Mã NV</th>
                                        <th className="text-left px-4 py-2">Họ tên</th>
                                        <th className="text-right px-4 py-2">Tổng thu nhập</th>
                                        <th className="text-right px-4 py-2">Không chịu thuế</th>
                                        <th className="text-right px-4 py-2">Bảo hiểm</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {importData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-4 py-2 font-medium">{row.ma_nv}</td>
                                            <td className="px-4 py-2">{row.ho_ten}</td>
                                            <td className="px-4 py-2 text-right font-mono">{formatCurrency(row.tong_thu_nhap)}</td>
                                            <td className="px-4 py-2 text-right font-mono">{formatCurrency(row.khong_chiu_thue)}</td>
                                            <td className="px-4 py-2 text-right font-mono">{formatCurrency(row.bao_hiem)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
                            <button
                                onClick={() => { setImportModalOpen(false); setImportData([]) }}
                                className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={calculateTax}
                                disabled={calculating}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all"
                            >
                                <Calculator className="w-4 h-4" />
                                {calculating ? 'Đang tính...' : 'Tính thuế & Lưu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
