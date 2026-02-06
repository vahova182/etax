import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { parseExcelFile, parseEmployeeData, downloadEmployeeTemplate } from '../utils/excelParser'
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Upload,
    Download,
    X,
    Check,
    AlertCircle,
    Users,
    Building,
    CreditCard,
    FileText
} from 'lucide-react'

export default function Employees() {
    const [employees, setEmployees] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showInactive, setShowInactive] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState(null)
    const [importModalOpen, setImportModalOpen] = useState(false)
    const [importData, setImportData] = useState([])
    const [importing, setImporting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const fileInputRef = useRef(null)

    const [form, setForm] = useState({
        ma_nv: '',
        ho_ten: '',
        don_vi: '',
        ma_so_thue: '',
        so_cccd: '',
        da_nghi_viec: false,
    })

    useEffect(() => {
        fetchEmployees()
    }, [showInactive])

    const fetchEmployees = async () => {
        setLoading(true)
        let query = supabase.from('employees').select('*').order('created_at', { ascending: false })

        if (!showInactive) {
            query = query.eq('da_nghi_viec', false)
        }

        const { data, error } = await query
        if (error) {
            console.error('Error fetching employees:', error)
        } else {
            setEmployees(data || [])
        }
        setLoading(false)
    }

    const filteredEmployees = employees.filter(emp =>
        emp.ma_nv.toLowerCase().includes(search.toLowerCase()) ||
        emp.ho_ten.toLowerCase().includes(search.toLowerCase()) ||
        (emp.don_vi && emp.don_vi.toLowerCase().includes(search.toLowerCase()))
    )

    const openModal = (employee = null) => {
        if (employee) {
            setEditingEmployee(employee)
            setForm({
                ma_nv: employee.ma_nv,
                ho_ten: employee.ho_ten,
                don_vi: employee.don_vi || '',
                ma_so_thue: employee.ma_so_thue || '',
                so_cccd: employee.so_cccd || '',
                da_nghi_viec: employee.da_nghi_viec,
            })
        } else {
            setEditingEmployee(null)
            setForm({
                ma_nv: '',
                ho_ten: '',
                don_vi: '',
                ma_so_thue: '',
                so_cccd: '',
                da_nghi_viec: false,
            })
        }
        setError('')
        setModalOpen(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        try {
            if (editingEmployee) {
                const { error } = await supabase
                    .from('employees')
                    .update({
                        ...form,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', editingEmployee.id)
                if (error) throw error
                setSuccess('Cập nhật nhân viên thành công!')
            } else {
                const { error } = await supabase
                    .from('employees')
                    .insert([form])
                if (error) throw error
                setSuccess('Thêm nhân viên thành công!')
            }
            setModalOpen(false)
            fetchEmployees()
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            setError(err.message)
        }
    }

    const handleDelete = async (employee) => {
        if (!confirm(`Bạn có chắc muốn xóa nhân viên "${employee.ho_ten}"?`)) return

        try {
            const { error } = await supabase
                .from('employees')
                .delete()
                .eq('id', employee.id)
            if (error) throw error
            setSuccess('Xóa nhân viên thành công!')
            fetchEmployees()
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            setError(err.message)
            setTimeout(() => setError(''), 5000)
        }
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        try {
            const rawData = await parseExcelFile(file)
            const parsedData = parseEmployeeData(rawData)

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

    const handleImport = async () => {
        setImporting(true)
        setError('')

        try {
            const { error } = await supabase
                .from('employees')
                .upsert(importData.map(({ rowIndex, ...data }) => data), {
                    onConflict: 'ma_nv',
                })

            if (error) throw error

            setSuccess(`Import thành công ${importData.length} nhân viên!`)
            setImportModalOpen(false)
            setImportData([])
            fetchEmployees()
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            setError(err.message)
        } finally {
            setImporting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Quản lý Nhân viên</h1>
                    <p className="text-slate-500 mt-1">Danh sách nhân viên trong hệ thống</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => downloadEmployeeTemplate()}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Tải mẫu</span>
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">Import Excel</span>
                    </button>
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Thêm mới</span>
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

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo mã, tên, đơn vị..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                </div>
                <label className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-slate-600 text-sm">Hiện đã nghỉ việc</span>
                </label>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                        <Users className="w-16 h-16 mb-4 text-slate-300" />
                        <p className="text-lg font-medium">Chưa có nhân viên nào</p>
                        <p className="text-sm">Thêm nhân viên mới hoặc import từ Excel</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Mã NV</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Họ tên</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 hidden md:table-cell">Đơn vị</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 hidden lg:table-cell">Mã số thuế</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 hidden lg:table-cell">Số CCCD</th>
                                    <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">Trạng thái</th>
                                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredEmployees.map((employee) => (
                                    <tr key={employee.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-sm font-medium text-purple-600">{employee.ma_nv}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-slate-800">{employee.ho_ten}</p>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <span className="text-slate-600">{employee.don_vi || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 hidden lg:table-cell">
                                            <span className="text-slate-600 font-mono text-sm">{employee.ma_so_thue || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 hidden lg:table-cell">
                                            <span className="text-slate-600 font-mono text-sm">{employee.so_cccd || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${employee.da_nghi_viec
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-green-100 text-green-700'
                                                }`}>
                                                {employee.da_nghi_viec ? 'Đã nghỉ' : 'Đang làm'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openModal(employee)}
                                                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(employee)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingEmployee ? 'Sửa nhân viên' : 'Thêm nhân viên mới'}
                            </h2>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        {error && (
                            <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Mã nhân viên <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={form.ma_nv}
                                            onChange={(e) => setForm({ ...form, ma_nv: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="VD: NV001"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Họ tên <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={form.ho_ten}
                                            onChange={(e) => setForm({ ...form, ho_ten: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="Nguyễn Văn A"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Đơn vị</label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={form.don_vi}
                                        onChange={(e) => setForm({ ...form, don_vi: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="Phòng Kế toán"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Mã số thuế</label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={form.ma_so_thue}
                                            onChange={(e) => setForm({ ...form, ma_so_thue: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="1234567890"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Số CCCD</label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={form.so_cccd}
                                            onChange={(e) => setForm({ ...form, so_cccd: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="001234567890"
                                        />
                                    </div>
                                </div>
                            </div>

                            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.da_nghi_viec}
                                    onChange={(e) => setForm({ ...form, da_nghi_viec: e.target.checked })}
                                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                                />
                                <div>
                                    <span className="font-medium text-slate-700">Đã nghỉ việc</span>
                                    <p className="text-sm text-slate-500">Đánh dấu nhân viên đã nghỉ việc</p>
                                </div>
                            </label>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all"
                                >
                                    {editingEmployee ? 'Cập nhật' : 'Thêm mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {importModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800">
                                Import nhân viên ({importData.length} dòng)
                            </h2>
                            <button
                                onClick={() => { setImportModalOpen(false); setImportData([]) }}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="text-left px-4 py-2">Dòng</th>
                                        <th className="text-left px-4 py-2">Mã NV</th>
                                        <th className="text-left px-4 py-2">Họ tên</th>
                                        <th className="text-left px-4 py-2">Đơn vị</th>
                                        <th className="text-left px-4 py-2">MST</th>
                                        <th className="text-left px-4 py-2">CCCD</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {importData.map((row, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-2 text-slate-500">{row.rowIndex}</td>
                                            <td className="px-4 py-2 font-medium">{row.ma_nv}</td>
                                            <td className="px-4 py-2">{row.ho_ten}</td>
                                            <td className="px-4 py-2">{row.don_vi}</td>
                                            <td className="px-4 py-2 font-mono">{row.ma_so_thue}</td>
                                            <td className="px-4 py-2 font-mono">{row.so_cccd}</td>
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
                                onClick={handleImport}
                                disabled={importing}
                                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 disabled:opacity-50 transition-all"
                            >
                                {importing ? 'Đang import...' : 'Xác nhận Import'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
