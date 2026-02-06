/**
 * Tính thuế TNCN theo biểu thuế lũy tiến từng phần của Việt Nam
 * @param {number} thuNhapChiuThue - Thu nhập chịu thuế (sau khi đã trừ các khoản giảm trừ)
 * @returns {number} - Số tiền thuế TNCN phải nộp
 */
export function tinhThueTNCN(thuNhapChiuThue) {
    if (thuNhapChiuThue <= 0) return 0

    // Biểu thuế lũy tiến từng phần (đơn vị: triệu đồng)
    const bangThue = [
        { den: 5000000, thueSuat: 0.05 },
        { den: 10000000, thueSuat: 0.10 },
        { den: 18000000, thueSuat: 0.15 },
        { den: 32000000, thueSuat: 0.20 },
        { den: 52000000, thueSuat: 0.25 },
        { den: 80000000, thueSuat: 0.30 },
        { den: Infinity, thueSuat: 0.35 },
    ]

    let thue = 0
    let thuNhapConLai = thuNhapChiuThue
    let mucTruoc = 0

    for (const bac of bangThue) {
        const mucChiuThue = Math.min(thuNhapConLai, bac.den - mucTruoc)
        if (mucChiuThue <= 0) break

        thue += mucChiuThue * bac.thueSuat
        thuNhapConLai -= mucChiuThue
        mucTruoc = bac.den

        if (thuNhapConLai <= 0) break
    }

    return Math.round(thue)
}

/**
 * Các hằng số giảm trừ theo quy định
 */
export const GIAM_TRU = {
    BAN_THAN: 11000000, // 11 triệu/tháng
    PHU_THUOC: 4400000,  // 4.4 triệu/người/tháng
}

/**
 * Tính toán đầy đủ thuế TNCN cho một nhân viên trong một tháng
 */
export function tinhToanThue({
    tongThuNhap,
    khongChiuThue = 0,
    baoHiem = 0,
    soPhuThuoc = 0,
}) {
    const giamTruBanThan = GIAM_TRU.BAN_THAN
    const giamTruPhuThuoc = soPhuThuoc * GIAM_TRU.PHU_THUOC

    const thuNhapChiuThue = Math.max(0,
        tongThuNhap - khongChiuThue - baoHiem - giamTruBanThan - giamTruPhuThuoc
    )

    const thueTNCN = tinhThueTNCN(thuNhapChiuThue)

    return {
        tongThuNhap,
        khongChiuThue,
        baoHiem,
        giamTruBanThan,
        giamTruPhuThuoc,
        thuNhapChiuThue,
        thueTNCN,
    }
}

/**
 * Kiểm tra người phụ thuộc có còn trong thời gian giảm trừ không
 */
export function kiemTraThoiGianGiamTru(dependent, thang, nam) {
    if (dependent.khong_su_dung) return false

    const ngayKiemTra = new Date(nam, thang - 1, 1)

    if (dependent.giam_tru_tu) {
        const tuNgay = new Date(dependent.giam_tru_tu)
        if (ngayKiemTra < tuNgay) return false
    }

    if (dependent.giam_tru_den) {
        const denNgay = new Date(dependent.giam_tru_den)
        denNgay.setMonth(denNgay.getMonth() + 1) // Đến hết tháng
        if (ngayKiemTra >= denNgay) return false
    }

    return true
}
