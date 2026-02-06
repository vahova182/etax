import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
    Users,
    UserCheck,
    FileSpreadsheet,
    TrendingUp,
    Calendar,
    DollarSign
} from 'lucide-react'

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalEmployees: 0,
        activeEmployees: 0,
        totalDependents: 0,
        currentMonthTax: 0,
    })
    const [recentTax, setRecentTax] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            // Fetch employee stats
            const { data: employees } = await supabase
                .from('employees')
                .select('id, da_nghi_viec')

            const { data: dependents } = await supabase
                .from('dependents')
                .select('id')

            // Fetch current month tax
            const now = new Date()
            const { data: currentTax } = await supabase
                .from('monthly_income')
                .select('thue_tncn')
                .eq('thang', now.getMonth() + 1)
                .eq('nam', now.getFullYear())

            // Fetch recent tax records
            const { data: recent } = await supabase
                .from('monthly_income')
                .select(`
          id, thang, nam, thue_tncn,
          employees (ho_ten)
        `)
                .order('created_at', { ascending: false })
                .limit(5)

            setStats({
                totalEmployees: employees?.length || 0,
                activeEmployees: employees?.filter(e => !e.da_nghi_viec).length || 0,
                totalDependents: dependents?.length || 0,
                currentMonthTax: currentTax?.reduce((sum, r) => sum + (parseFloat(r.thue_tncn) || 0), 0) || 0,
            })
            setRecentTax(recent || [])
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(value)
    }

    const statCards = [
        {
            title: 'Tổng nhân viên',
            value: stats.totalEmployees,
            subtitle: `${stats.activeEmployees} đang làm việc`,
            icon: Users,
            color: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-50',
        },
        {
            title: 'Người phụ thuộc',
            value: stats.totalDependents,
            subtitle: 'Đang được giảm trừ',
            icon: UserCheck,
            color: 'from-green-500 to-emerald-500',
            bgColor: 'bg-green-50',
        },
        {
            title: 'Thuế tháng này',
            value: formatCurrency(stats.currentMonthTax),
            subtitle: `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
            icon: DollarSign,
            color: 'from-purple-500 to-pink-500',
            bgColor: 'bg-purple-50',
            isLarge: true,
        },
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Tổng quan</h1>
                <p className="text-slate-500 mt-1">Chào mừng đến với hệ thống tính thuế TNCN</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {statCards.map((card, index) => (
                    <div
                        key={index}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                                <p className={`${card.isLarge ? 'text-xl lg:text-2xl' : 'text-2xl lg:text-3xl'} font-bold text-slate-800 mt-1`}>
                                    {card.value}
                                </p>
                                <p className="text-sm text-slate-400 mt-1">{card.subtitle}</p>
                            </div>
                            <div className={`${card.bgColor} p-3 rounded-xl`}>
                                <card.icon className={`w-6 h-6 bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}
                                    style={{ stroke: 'url(#gradient)' }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-purple-500" />
                        Thuế gần đây
                    </h2>
                </div>
                <div className="divide-y divide-slate-100">
                    {recentTax.length > 0 ? (
                        recentTax.map((record) => (
                            <div key={record.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-800">
                                            {record.employees?.ho_ten || 'N/A'}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            Tháng {record.thang}/{record.nam}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-slate-800">
                                        {formatCurrency(record.thue_tncn)}
                                    </p>
                                    <p className="text-xs text-slate-400">Thuế TNCN</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-6 py-12 text-center text-slate-500">
                            <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                            <p>Chưa có dữ liệu thuế</p>
                            <p className="text-sm">Import dữ liệu thu nhập để bắt đầu tính thuế</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
