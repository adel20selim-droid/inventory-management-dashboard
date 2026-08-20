import { Branch } from '../types'
import { Package, BarChart3, FileText, Settings, Zap, LogOut } from 'lucide-react'

interface SidebarProps {
  selectedBranch: Branch
  onBranchChange: (branch: Branch) => void
  syncStatus: 'synced' | 'syncing' | 'error'
}

const Sidebar = ({ selectedBranch, onBranchChange, syncStatus }: SidebarProps) => {
  const branches = [
    { id: 'rabie' as Branch, name: 'فرع الربيع', count: 40 },
    { id: 'zad' as Branch, name: 'فرع زد', count: 20 },
    { id: 'kharj' as Branch, name: 'فرع الخرج', count: 20 }
  ]

  const statusColors: Record<string, string> = {
    'synced': 'bg-green-500',
    'syncing': 'bg-yellow-500',
    'error': 'bg-red-500'
  }

  return (
    <div className="w-64 bg-stone-900 border-l border-stone-800 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-stone-800">
        <h1 className="text-xl font-bold text-amber-600 mb-1">عتاد القهوة</h1>
        <p className="text-xs text-stone-400">V2.1</p>
        <div className="flex items-center gap-2 mt-3">
          <div className={`w-2 h-2 rounded-full ${statusColors[syncStatus]}`}></div>
          <span className="text-xs text-stone-400">أودو متزامنه</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="p-4 space-y-2 border-b border-stone-800">
        <NavItem icon={<Package size={18} />} label="الجرد اليومي النشط" />
        <NavItem icon={<BarChart3 size={18} />} label="لوحة التحكم والمؤشرات" />
        <NavItem icon={<FileText size={18} />} label="أرشيف الجرود السابقة" />
        <NavItem icon={<Settings size={18} />} label="التقارير والاستثمارات" />
      </div>

      {/* Branches */}
      <div className="p-4 space-y-2 border-b border-stone-800">
        <h3 className="text-xs font-bold text-stone-400 uppercase mb-3">الفروع المتاحة</h3>
        {branches.map(branch => (
          <button
            key={branch.id}
            onClick={() => onBranchChange(branch.id)}
            className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedBranch === branch.id
                ? 'bg-stone-700 text-amber-400 border border-amber-500'
                : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <div className="flex justify-between items-center">
              <span>{branch.name}</span>
              <span className="bg-stone-700 text-stone-200 text-xs px-2 py-0.5 rounded">
                {branch.count}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom Section */}
      <div className="flex-1"></div>
      <div className="p-4 border-t border-stone-800 space-y-2">
        <div className="text-xs text-stone-400 space-y-1">
          <p>🟢 اتصال أودو: متصل</p>
          <p>💾 قاعدة البيانات: جاهزة</p>
          <p>👤 المستخدم: أدمن النظام</p>
        </div>
      </div>
      <button className="w-full p-3 text-red-400 hover:text-red-300 flex items-center gap-2 justify-center text-sm">
        <LogOut size={16} />
        تسجيل الخروج
      </button>
    </div>
  )
}

function NavItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="w-full text-right px-3 py-2 rounded-lg text-sm text-stone-300 hover:bg-stone-800 flex items-center gap-3 transition-colors">
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default Sidebar
