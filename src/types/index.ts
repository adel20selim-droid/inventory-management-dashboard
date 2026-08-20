export type Branch = 'rabie' | 'zad' | 'kharj'

export interface InventoryItem {
  id: number
  number: number
  sku: string
  name: string
  odooQty: number
  actualCount: number | null
  difference: number
  status: string
  quantity: number
  notes: string
  locked: boolean
}
