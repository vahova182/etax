import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Check,
    AlertCircle,
    UserCheck,
    Calendar,
    Heart,
    CreditCard
} from 'lucide-react'

const RELATIONSHIPS = [
    'Con',
    'Vợ/Chồng',
    'Cha/Mẹ',
    'Ông/Bà',
    'Anh/Chị/Em',
    'Cháu',
    'Khác'
]

export default function Dependents() {
    const [employees, setEmployees] = useState([])
    const [dependents, setDependents] = useState([])
    const [selectedEmployee, setSelectedEmployee] = useState('')
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingDependent, setEditingDependent] = useState(null)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [search, setSearch] = useState('')

    const [form, setForm] = useState({
        employee_id: '',
        ho_ten: '',
        moi_quan_he: '',
        ngay_sinh: '',
        ma_so_thue: '',
        so_cccd: '',
        giam_tru_tu: '',
        giam_tru_den: '',
        khong_su_dung: false,
    })

    useEffect(() => {
        fetchEmployees()
    }, [])

    useEffect(() => {
        if (selectedEmployee) {
            fetchDependents(selectedEmployee)
        } else {
            fetchAllDependents()
        }
    }, [selectedEmployee])

    const fetchEmployees = async () => {
        const { data } = await supabase
            .from('employees')
            .select('id, ma_nv, ho_ten')
            .eq('da_nghi_viec', false)
            .order('ho_ten')
        setEmployees(data || [])
    }

    const fetchDependents = async (employeeId) => {
        setLoading(true)
        const { data } = await supabase
            .from('dependents')
            .select(`
        *,
        employees (id, ma_nv, ho_ten)
      `)
            .eq('employee_id', employeeId)
            .order('created_at', { ascending: false })
        setDependents(data || [])
        setLoading(false)
    }

    const fetchAllDependents = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('dependents')
            .select(`
        *,
        employees (id, ma_nv, ho_ten)
      `)
            .order('created_at', { ascending: false })
        setDependents(data || [])
        setLoading(false)
    }

    const filteredDependents = dependents.filter(dep =>
        dep.ho_ten.toLowerCase().includes(search.toLowerCase()) ||
        dep.employees?.ho_ten.toLowerCase().includes(search.toLowerCase())
    )

    const openModal = (dependent = null) => {
        if (dependent) {
            setEditingDependent(dependent)
            setForm({
                employee_id: dependent.employee_id,
                ho_ten: dependent.ho_ten,
                moi_quan_he: dependent.moi_quan_he,
                ngay_sinh: dependent.ngay_sinh || '',
                ma_so_thue: dependent.ma_so_thue || '',
                so_cccd: dependent.so_cccd || '',
                giam_tru_tu: dependent.giam_tru_tu || '',
                giam_tru_den: dependent.giam_tru_den || '',
                khong_su_dung: dependent.khong_su_dung,
            })
        } else {
            setEditingDependent(null)
            setForm({
                employee_id: selectedEmployee || '',
                ho_ten: '',
                moi_quan_he: '',
                ngay_sinh: '',
                ma_so_thue: '',
                so_cccd: '',
                giam_tru_tu: '',
                giam_tru_den: '',
                khong_su_dung: false,
            })
        }
        setError('')
        setModalOpen(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!form.employee_id) {
            setError('Vui lòng chọn nhân viên')
            return
        }

        try {
            const submitData = {
                ...form,
                ngay_sinh: form.ngay_sinh || null,
                giam_tru_tu: form.giam_tru_tu || null,
                giam_tru_den: form.giam_tru_den || null,
            }

            if (editingDependent) {
                const { error } = await supabase
                    .from('dependents')
                    .update(submitData)
                    .eq('id', editingDependent.id)
                if (error) throw error
                setSuccess('Cập nhật người phụ thuộc thành công!')
            } else {
                const { error } = await supabase
                    .from('dependents')
                    .insert([submitData])
                if (error) throw error
                setSuccess('Thêm người phụ thuộc thành công!')
            }
            setModalOpen(false)
            if (selectedEmployee) {
                fetchDependents(selectedEmployee)
            } else {
                fetchAllDependents()
            }
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            setError(err.message)
        }
    }

    const handleDelete = async (dependent) => {
        if (!confirm(`Bạn có chắc muốn xóa "${dependent.ho_ten}"?`)) return

        try {
            const { error } = await supabase
                .from('dependents')
                .delete()
                .eq('id', dependent.id)
            if (error) throw error
            setSuccess('Xóa người phụ thuộc thành công!')
            if (selectedEmployee) {
                fetchDependents(selectedEmployee)
            } else {
                fetchAllDependents()
            }
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            setError(err.message)
            setTimeout(() => setError(''), 5000)
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleDateString('vi-VN')
    }

    const isExpired = (dependent) => {
        if (!dependent.giam_tru_den) return false
        const endDate = new Date(dependent.giam_tru_den)
        return endDate < new Date()
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Người phụ thuộc</h1>
                    <p className="text-slate-500 mt-1">Quản lý người phụ thuộc của nhân viên</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/20"
                >
                    <Plus className="w-4 h-4" />
                    <span>Thêm mới</span>
                </button>
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
                <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="">Tất cả nhân viên</option>
                    {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                            {emp.ma_nv} - {emp.ho_ten}
                        </option>
                    ))}
                </select>
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                ) : filteredDependents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                        <UserCheck className="w-16 h-16 mb-4 text-slate-300" />
                        <p className="text-lg font-medium">Chưa có người phụ thuộc nào</p>
                        <p className="text-sm">Thêm người phụ thuộc cho nhân viên</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Họ tên</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 hidden sm:table-cell">Nhân viên</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 hidden md:table-cell">Quan hệ</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 hidden lg:table-cell">Thời gian giảm trừ</th>
                                    <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">Trạng thái</th>
                                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDependents.map((dependent) => (
                                    <tr key={dependent.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-slate-800">{dependent.ho_ten}</p>
                                                <p className="text-sm text-slate-500">{formatDate(dependent.ngay_sinh)}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden sm:table-cell">
                                            <div>
                                                <p className="font-medium text-slate-800">{dependent.employees?.ho_ten}</p>
                                                <p className="text-sm text-slate-500">{dependent.employees?.ma_nv}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                                                <Heart className="w-3 h-3" />
                                                {dependent.moi_quan_he}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 hidden lg:table-cell">
                                            <div className="text-sm">
                                                <p className="text-slate-600">
                                                    Từ: {dependent.giam_tru_tu ? formatDate(dependent.giam_tru_tu) : 'Không xác định'}
                                                </p>
                                                <p className="text-slate-600">
                                                    Đến: {dependent.giam_tru_den ? formatDate(dependent.giam_tru_den) : 'Không thời hạn'}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${dependent.khong_su_dung
                                                    ? 'bg-red-100 text-red-700'
                                                    : isExpired(dependent)
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-green-100 text-green-700'
                                                }`}>
                                                {dependent.khong_su_dung
                                                    ? 'Không sử dụng'
                                                    : isExpired(dependent)
                                                        ? 'Hết hạn'
                                                        : 'Đang giảm trừ'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openModal(dependent)}
                                                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(dependent)}
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
                                {editingDependent ? 'Sửa người phụ thuộc' : 'Thêm người phụ thuộc'}
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
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Nhân viên <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={form.employee_id}
                                    onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                >
                                    <option value="">Chọn nhân viên</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.ma_nv} - {emp.ho_ten}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Họ tên <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.ho_ten}
                                        onChange={(e) => setForm({ ...form, ho_ten: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="Nguyễn Văn B"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Mối quan hệ <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.moi_quan_he}
                                        onChange={(e) => setForm({ ...form, moi_quan_he: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        required
                                    >
                                        <option value="">Chọn mối quan hệ</option>
                                        {RELATIONSHIPS.map((rel) => (
                                            <option key={rel} value={rel}>{rel}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Ngày sinh</label>
                                    <input
                                        type="date"
                                        value={form.ngay_sinh}
                                        onChange={(e) => setForm({ ...form, ngay_sinh: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Mã số thuế</label>
                                    <input
                                        type="text"
                                        value={form.ma_so_thue}
                                        onChange={(e) => setForm({ ...form, ma_so_thue: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="Nếu có"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Số CCCD</label>
                                <input
                                    type="text"
                                    value={form.so_cccd}
                                    onChange={(e) => setForm({ ...form, so_cccd: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="001234567890"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        <Calendar className="w-4 h-4 inline mr-1" />
                                        Giảm trừ từ tháng
                                    </label>
                                    <input
                                        type="date"
                                        value={form.giam_tru_tu}
                                        onChange={(e) => setForm({ ...form, giam_tru_tu: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        <Calendar className="w-4 h-4 inline mr-1" />
                                        Giảm trừ đến tháng
                                    </label>
                                    <input
                                        type="date"
                                        value={form.giam_tru_den}
                                        onChange={(e) => setForm({ ...form, giam_tru_den: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.khong_su_dung}
                                    onChange={(e) => setForm({ ...form, khong_su_dung: e.target.checked })}
                                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                                />
                                <div>
                                    <span className="font-medium text-slate-700">Không sử dụng</span>
                                    <p className="text-sm text-slate-500">Không tính vào phần giảm trừ</p>
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
                                    {editingDependent ? 'Cập nhật' : 'Thêm mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
