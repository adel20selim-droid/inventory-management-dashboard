import { Lock, Unlock } from 'lucide-react'
import { InventoryItem } from '../types'

interface InventoryTableProps {
  items: InventoryItem[]
  onActualCountChange: (id: number, value: number) => void
  onStatusChange: (id: number, status: string) => void
  onNotesChange: (id: number, notes: string) => void
  onToggleLock: (id: number) => void
}

const InventoryTable = ({
  items,
  onActualCountChange,
  onStatusChange,
  onNotesChange,
  onToggleLock
}: InventoryTableProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'مطابق':
        return 'bg-green-900 text-green-100'
      case 'عجز':
        return 'bg-red-900 text-red-100'
      case 'زيادة':
        return 'bg-blue-900 text-blue-100'
      default:
        return 'bg-stone-700 text-stone-200'
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-stone-800 border-b border-stone-700 sticky top-0">
            <th className="px-4 py-3 text-right text-xs font-bold text-stone-300 w-12">#</th>
            <th className="px-4 py-3 text-right text-xs font-bold text-stone-300">رمز الصنف (SKU)</th>
            <th className="px-4 py-3 text-right text-xs font-bold text-stone-300">اسم المنتج والبيان</th>
            <th className="px-4 py-3 text-right text-xs font-bold text-stone-300 w-24">رصيد أودو</th>
            <th className="px-4 py-3 text-right text-xs font-bold text-stone-300 w-32">الجرد الفعلي</th>
            <th className="px-4 py-3 text-right text-xs font-bold text-stone-300 w-20">الفرق</th>
            <th className="px-4 py-3 text-right text-xs font-bold text-stone-300 w-32">الحالة</th>
            <th className="px-4 py-3 text-right text-xs font-bold text-stone-300 w-40">الملاحظات</th>
            <th className="px-4 py-3 text-center text-xs font-bold text-stone-300 w-12">القفل</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id} className="border-b border-stone-800 hover:bg-stone-800/50 transition-colors">
              <td className="px-4 py-3 text-center text-stone-400 font-bold">{item.number}</td>
              <td className="px-4 py-3">
                <code className="bg-stone-800 text-amber-400 px-2 py-1 rounded text-xs">
                  {item.sku}
                </code>
              </td>
              <td className="px-4 py-3 text-stone-200 max-w-xs truncate">{item.name}</td>
              <td className="px-4 py-3 text-center text-stone-300 font-bold">{item.odooQty}</td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  value={item.actualCount ?? ''}
                  onChange={(e) => onActualCountChange(item.id, parseInt(e.target.value) || 0)}
                  disabled={item.locked}
                  className={`w-full px-2 py-1 rounded bg-stone-800 text-white text-center ${
                    item.locked ? 'opacity-50 cursor-not-allowed' : 'focus:bg-stone-700 focus:outline-none'
                  }`}
                  placeholder="أدخل العدد"
                />
              </td>
              <td className={`px-4 py-3 text-center font-bold ${
                item.difference > 0 ? 'text-blue-400' : item.difference < 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {item.difference > 0 ? '+' : ''}{item.difference}
              </td>
              <td className="px-4 py-3">
                <select
                  value={item.status}
                  onChange={(e) => onStatusChange(item.id, e.target.value)}
                  disabled={item.locked}
                  className={`w-full px-2 py-1 rounded text-xs font-medium ${
                    getStatusColor(item.status)
                  } ${item.locked ? 'opacity-50 cursor-not-allowed' : 'focus:outline-none'}`}
                >
                  <option>اختر الحالة</option>
                  <option>مطابق</option>
                  <option>عجز</option>
                  <option>زيادة</option>
                  <option>تالف</option>
                  <option>مرحل</option>
                </select>
              </td>
              <td className="px-4 py-3">
                <input
                  type="text"
                  value={item.notes}
                  onChange={(e) => onNotesChange(item.id, e.target.value)}
                  disabled={item.locked}
                  className={`w-full px-2 py-1 rounded bg-stone-800 text-stone-200 text-xs ${
                    item.locked ? 'opacity-50 cursor-not-allowed' : 'focus:bg-stone-700 focus:outline-none'
                  }`}
                  placeholder="إضافة ملاحظة"
                />
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onToggleLock(item.id)}
                  className="mx-auto p-2 hover:bg-stone-700 rounded transition-colors"
                >
                  {item.locked ? (
                    <Lock size={16} className="text-red-400" />
                  ) : (
                    <Unlock size={16} className="text-green-400" />
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default InventoryTable
