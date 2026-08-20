import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import InventoryTable from './components/InventoryTable'
import { InventoryItem, Branch } from './types'

const App = () => {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [selectedBranch, setSelectedBranch] = useState<Branch>('rabie')
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced')
  const [loading, setLoading] = useState(false)

  // جلب البيانات من Odoo عند تحميل الصفحة
  useEffect(() => {
    fetchInventory()
  }, [selectedBranch])

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/odoo/quantities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId: selectedBranch })
      })
      const data = await response.json()
      
      if (data.success && data.products) {
        const formattedItems: InventoryItem[] = data.products.map((p: any, idx: number) => ({
          id: p.id,
          number: idx + 1,
          sku: p.default_code || p.barcode || `ODOO-${p.id}`,
          name: p.name,
          odooQty: p.qty_available || 0,
          actualCount: null,
          difference: 0,
          status: 'اختر الحالة',
          quantity: p.qty_available || 0,
          notes: '',
          locked: false
        }))
        setItems(formattedItems)
        setSyncStatus('synced')
      }
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error)
      setSyncStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const handleActualCountChange = (id: number, value: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const diff = value - (item.odooQty || 0)
        let status = item.status
        
        if (value === item.odooQty) {
          status = 'مطابق'
        } else if (diff < 0) {
          status = 'عجز'
        } else if (diff > 0) {
          status = 'زيادة'
        }
        
        return {
          ...item,
          actualCount: value,
          difference: diff,
          status,
          quantity: value
        }
      }
      return item
    }))
  }

  const handleStatusChange = (id: number, status: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, status } : item
    ))
  }

  const handleNotesChange = (id: number, notes: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, notes } : item
    ))
  }

  const handleToggleLock = (id: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, locked: !item.locked } : item
    ))
  }

  const handleSendToManagement = async () => {
    const countedItems = items.filter(i => i.actualCount !== null)
    
    try {
      const response = await fetch('/api/send-management-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchName: selectedBranch === 'rabie' ? 'فرع ربيع' : selectedBranch === 'zad' ? 'فرع زد' : 'فرع خرج',
          cycleNum: 1,
          date: new Date().toISOString().split('T')[0],
          userName: 'أدمن النظام',
          userEmail: 'admin@ataad.sa',
          items: countedItems
        })
      })
      
      const result = await response.json()
      if (result.success) {
        alert('✅ تم إرسال الجرد للإدارة بنجاح!')
      }
    } catch (error) {
      console.error('خطأ في الإرسال:', error)
      alert('❌ فشل الإرسال')
    }
  }

  return (
    <div className="flex h-screen bg-stone-950 text-stone-50">
      <Sidebar selectedBranch={selectedBranch} onBranchChange={setSelectedBranch} syncStatus={syncStatus} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onRefresh={fetchInventory} 
          onSendToManagement={handleSendToManagement}
          items={items}
          loading={loading}
        />
        
        <div className="flex-1 overflow-auto">
          <InventoryTable
            items={items}
            onActualCountChange={handleActualCountChange}
            onStatusChange={handleStatusChange}
            onNotesChange={handleNotesChange}
            onToggleLock={handleToggleLock}
          />
        </div>
      </div>
    </div>
  )
}

export default App
