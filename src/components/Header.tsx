import { Download, Upload, CheckCircle, RotateCw, Send, Trash2, Eye } from 'lucide-react'
import { InventoryItem } from '../types'

interface HeaderProps {
  onRefresh: () => void
  onSendToManagement: () => void
  items: InventoryItem[]
  loading: boolean
}

const Header = ({ onRefresh, onSendToManagement, items, loading }: HeaderProps) => {
  const total = items.length
  const counted = items.filter(i => i.actualCount !== null).length
  const matched = items.filter(i => i.status === 'مطابق').length
  const deficit = items.filter(i => i.status === 'عجز').length
  const surplus = items.filter(i => i.status === 'زيادة').length

  return (
    <div className="bg-stone-900 border-b border-stone-800 p-4">
      {/* Top Section - Stats */}
      <div className="grid grid-cols-6 gap-3 mb-4">
        <StatCard label="الإجمالي" value={total} color="bg-blue-900" />
        <StatCard label="مطابق" value={matched} color="bg-green-900" />
        <StatCard label="عجز" value={deficit} color="bg-red-900" />
        <StatCard label="زيادة" value={surplus} color="bg-blue-900" />
        <StatCard label="معدود" value={counted} color="bg-yellow-900" />
        <div className="bg-stone-800 rounded-lg p-3 text-center">
          <p className="text-xs text-stone-400">نسبة الإنجاز</p>
          <p className="text-2xl font-bold text-amber-400">{total > 0 ? Math.round((counted / total) * 100) : 0}%</p>
        </div>
      </div>

      {/* Bottom Section - Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button icon={<RotateCw size={16} />} label="تحديث أودو" onClick={onRefresh} disabled={loading} />
        <Button icon={<Upload size={16} />} label="استيراد أودو" />
        <Button icon={<CheckCircle size={16} />} label="فحص" />
        <Button icon={<Send size={16} />} label="إرسال للموظف" />
        <Button icon={<Eye size={16} />} label="خلط" />
        <Button icon={<Trash2 size={16} />} label="تصفير" />
        <Button icon={<Download size={16} />} label="إكسيل" />
        <Button icon={<RotateCw size={16} />} label="تحديث" onClick={onRefresh} disabled={loading} />
        <Button icon={<Send size={16} />} label="إرسال للإدارة" onClick={onSendToManagement} variant="success" />
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`${color} rounded-lg p-3 text-center`}>
      <p className="text-xs text-stone-300">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

function Button({
  icon,
  label,
  onClick,
  disabled,
  variant = 'default'
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'success'
}) {
  const baseStyle = 'px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50'
  const variantStyle = variant === 'success' 
    ? 'bg-green-600 hover:bg-green-700 text-white'
    : 'bg-stone-700 hover:bg-stone-600 text-stone-100'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variantStyle}`}
    >
      {icon}
      {label}
    </button>
  )
}

export default Header
