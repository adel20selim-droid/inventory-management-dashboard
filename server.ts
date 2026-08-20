import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json({ limit: '10mb' }))

// Odoo XML-RPC Configuration
const ODOO_CONFIG = {
  url: 'https://ataad.odoo.com',
  email: 'asabry@ataad.sa',
  apiKey: '783d7e44404094fb2f6efc9908a9e4824f6d0faa',
  db: 'naqlahtech-ataad-main-9212628',
  warehouses: {
    'rabie': ['Al-Rabie', 'Rabie', 'Rabei'],
    'zad': ['Zid', 'Zad'],
    'kharj': ['Al-Kharj', 'Kharj', 'KHA']
  }
}

// XML-RPC Helper - Serialize value to XML
function serializeXmlRpc(v: any): string {
  if (typeof v === 'number' && Number.isInteger(v)) {
    return `<value><int>${v}</int></value>`
  }
  if (typeof v === 'number') {
    return `<value><double>${v}</double></value>`
  }
  if (typeof v === 'boolean') {
    return `<value><boolean>${v ? '1' : '0'}</boolean></value>`
  }
  if (Array.isArray(v)) {
    return `<value><array><data>${v.map(serializeXmlRpc).join('')}</data></array></value>`
  }
  if (typeof v === 'object' && v !== null) {
    const members = Object.keys(v).map(
      k => `<member><name>${k}</name>${serializeXmlRpc(v[k])}</member>`
    ).join('')
    return `<value><struct>${members}</struct></value>`
  }
  const str = String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<value><string>${str}</string></value>`
}

// XML-RPC Helper - Parse value from XML
function parseXmlRpcValue(str: string): any {
  str = str.trim()
  if (!str) return null

  if (str.startsWith('<value>') && str.endsWith('</value>')) {
    str = str.substring(7, str.length - 8).trim()
  }

  // Integer
  const intMatch = str.match(/^<(?:int|i4)>(-?\d+)<\/(?:int|i4)>$/i)
  if (intMatch) return parseInt(intMatch[1], 10)

  // Double
  const doubleMatch = str.match(/^<double>(-?\d+(?:\.\d+)?)<\/double>$/i)
  if (doubleMatch) return parseFloat(doubleMatch[1])

  // Boolean
  const boolMatch = str.match(/^<boolean>([01])<\/boolean>$/i)
  if (boolMatch) return boolMatch[1] === '1'

  // String
  const stringMatch = str.match(/^<string>([\s\S]*?)<\/string>$/i)
  if (stringMatch) {
    return stringMatch[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
  }

  // Nil
  if (str.match(/^<nil\s*(\/|>.*<\/nil>)$/i)) return null

  // Array
  if (str.startsWith('<array>')) {
    const dataMatch = str.match(/<data>([\s\S]*?)<\/data>/i)
    if (!dataMatch) return []
    const inner = dataMatch[1].trim()
    if (!inner) return []
    const items: any[] = []
    let current = ''
    let depth = 0
    for (let i = 0; i < inner.length; i++) {
      current += inner[i]
      if (current.endsWith('<value>')) depth++
      else if (current.endsWith('</value>')) {
        depth--
        if (depth === 0) {
          items.push(parseXmlRpcValue(current.trim()))
          current = ''
        }
      }
    }
    return items
  }

  // Struct
  if (str.startsWith('<struct>')) {
    const structMatch = str.match(/<struct>([\s\S]*?)<\/struct>/i)
    if (!structMatch) return {}
    const inner = structMatch[1].trim()
    const obj: Record<string, any> = {}
    const memberRegex = /<member>\s*<name>([\s\S]*?)<\/name>\s*<value>([\s\S]*?)<\/value>\s*<\/member>/gi
    let match
    while ((match = memberRegex.exec(inner)) !== null) {
      const key = match[1].trim()
      const valXml = match[2].trim()
      obj[key] = parseXmlRpcValue(`<value>${valXml}</value>`)
    }
    return obj
  }

  return str
}

// Execute XML-RPC call
async function callOdooXmlRpc(method: string, params: any[]): Promise<any> {
  const body = `<?xml version=\"1.0\"?><methodCall><methodName>${method}</methodName><params>${params
    .map(p => `<param>${serializeXmlRpc(p)}</param>`)
    .join('')}</params></methodCall>`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(`${ODOO_CONFIG.url}/xmlrpc/2/common`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body,
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    const xmlText = await res.text()

    // Check for fault
    if (xmlText.includes('<fault>')) {
      const faultMatch = xmlText.match(/<fault>\s*<value>([\s\S]*?)<\/value>\s*<\/fault>/i)
      if (faultMatch) {
        const fault = parseXmlRpcValue(`<value>${faultMatch[1]}</value>`)
        throw new Error(fault.faultString || JSON.stringify(fault))
      }
    }

    // Parse response
    const paramMatch = xmlText.match(/<param>\s*<value>([\s\S]*?)<\/value>\s*<\/param>/i)
    if (paramMatch) {
      return parseXmlRpcValue(`<value>${paramMatch[1]}</value>`)
    }

    return null
  } catch (err: any) {
    clearTimeout(timeoutId)
    throw new Error(`خطأ Odoo XML-RPC: ${err.message}`)
  }
}

// Get Odoo authentication
async function getOdooAuth() {
  const uid = await callOdooXmlRpc('authenticate', [
    ODOO_CONFIG.db,
    ODOO_CONFIG.email,
    ODOO_CONFIG.apiKey,
    {}
  ])

  if (!uid || typeof uid !== 'number' || uid <= 0) {
    throw new Error('فشلت المصادقة مع Odoo')
  }

  return uid
}

// Call Odoo object method
async function callOdooObject(uid: number, model: string, method: string, args: any[], kwargs: any = {}): Promise<any> {
  const body = `<?xml version=\"1.0\"?><methodCall><methodName>execute_kw</methodName><params>
    <param>${serializeXmlRpc(ODOO_CONFIG.db)}</param>
    <param>${serializeXmlRpc(uid)}</param>
    <param>${serializeXmlRpc(ODOO_CONFIG.apiKey)}</param>
    <param>${serializeXmlRpc(model)}</param>
    <param>${serializeXmlRpc(method)}</param>
    <param>${serializeXmlRpc(args)}</param>
    <param>${serializeXmlRpc(kwargs)}</param>
  </params></methodCall>`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(`${ODOO_CONFIG.url}/xmlrpc/2/object`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body,
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    const xmlText = await res.text()

    if (xmlText.includes('<fault>')) {
      const faultMatch = xmlText.match(/<fault>\s*<value>([\s\S]*?)<\/value>\s*<\/fault>/i)
      if (faultMatch) {
        const fault = parseXmlRpcValue(`<value>${faultMatch[1]}</value>`)
        throw new Error(fault.faultString || JSON.stringify(fault))
      }
    }

    const paramMatch = xmlText.match(/<param>\s*<value>([\s\S]*?)<\/value>\s*<\/param>/i)
    if (paramMatch) {
      return parseXmlRpcValue(`<value>${paramMatch[1]}</value>`)
    }

    return null
  } catch (err: any) {
    clearTimeout(timeoutId)
    throw new Error(`خطأ Odoo: ${err.message}`)
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'جرد شركة عتاد القهوة التجارية V2.1',
    timestamp: new Date().toISOString()
  })
})

// Fetch quantities from Odoo for a specific branch
app.post('/api/odoo/quantities', async (req, res) => {
  const { branchId } = req.body

  try {
    const uid = await getOdooAuth()

    // Search products with stock
    const domain = [['type', '=', 'product'], ['qty_available', '>', 0]]
    const products = await callOdooObject(uid, 'product.product', 'search_read', [domain], {
      fields: ['id', 'name', 'default_code', 'barcode', 'qty_available'],
      limit: 1000
    })

    if (!Array.isArray(products)) {
      return res.json({ success: false, error: 'No products found', products: [] })
    }

    // If branch specified, filter by warehouse location
    let filteredProducts = products
    if (branchId && ODOO_CONFIG.warehouses[branchId as keyof typeof ODOO_CONFIG.warehouses]) {
      const warehouseNames = ODOO_CONFIG.warehouses[branchId as keyof typeof ODOO_CONFIG.warehouses]
      const productIds = products.map((p: any) => p.id)

      if (productIds.length > 0) {
        // Get stock quantities per warehouse
        const quantDomain = [
          ['product_id', 'in', productIds],
          ['location_id.usage', '=', 'internal']
        ]

        const quants = await callOdooObject(uid, 'stock.quant', 'search_read', [quantDomain], {
          fields: ['product_id', 'location_id', 'quantity'],
          limit: 5000
        })

        const quantMap: Record<number, Record<string, number>> = {}
        if (Array.isArray(quants)) {
          quants.forEach((q: any) => {
            if (q.product_id && q.location_id) {
              const prodId = Array.isArray(q.product_id) ? q.product_id[0] : q.product_id
              const locId = Array.isArray(q.location_id) ? q.location_id[1] : q.location_id
              if (!quantMap[prodId]) quantMap[prodId] = {}
              quantMap[prodId][locId] = (quantMap[prodId][locId] || 0) + (Number(q.quantity) || 0)
            }
          })
        }

        // Get warehouse locations
        const locDomain = [['usage', '=', 'internal']]
        const locations = await callOdooObject(uid, 'stock.location', 'search_read', [locDomain], {
          fields: ['id', 'name', 'complete_name']
        })

        const warehouseLocIds = new Set<number>()
        if (Array.isArray(locations)) {
          locations.forEach((loc: any) => {
            const locName = loc.complete_name || loc.name || ''
            if (warehouseNames.some(wh => locName.includes(wh))) {
              warehouseLocIds.add(loc.id)
            }
          })
        }

        filteredProducts = products.filter((p: any) => {
          const pqty = quantMap[p.id] || {}
          return Object.keys(pqty).some(locId => warehouseLocIds.has(Number(locId)) && pqty[locId] > 0)
        })
      }
    }

    res.json({
      success: true,
      products: filteredProducts,
      count: filteredProducts.length
    })
  } catch (err: any) {
    res.json({
      success: false,
      error: err.message,
      products: []
    })
  }
})

// Send inventory to management
app.post('/api/send-management-email', async (req, res) => {
  const { branchName, date, userName, userEmail, items } = req.body

  try {
    const uid = await getOdooAuth()

    const counted = Array.isArray(items) ? items.filter((i: any) => i.actualCount !== null) : []
    const matched = counted.filter((i: any) => i.status === 'مطابق').length
    const deficit = counted.filter((i: any) => i.status === 'عجز').length
    const surplus = counted.filter((i: any) => i.status === 'زيادة').length

    const rowsHtml = counted.map((it: any, idx: number) => `
      <tr style="border-bottom: 1px solid #eee; text-align: right;">
        <td style="padding: 10px; font-weight: bold; text-align: center;">${idx + 1}</td>
        <td style="padding: 10px;"><code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${it.sku || ''}</code></td>
        <td style="padding: 10px;"><strong>${it.name || ''}</strong></td>
        <td style="padding: 10px; text-align: center;">${it.odooQty || ''}</td>
        <td style="padding: 10px; text-align: center; font-weight: bold;">${it.actualCount || ''}</td>
        <td style="padding: 10px; text-align: center; font-weight: bold; color: ${it.difference < 0 ? '#b91c1c' : it.difference > 0 ? '#1d4ed8' : '#047857'};">
          ${it.status || ''} (${it.difference || 0})
        </td>
        <td style="padding: 10px;">${it.notes || ''}</td>
      </tr>
    `).join('')

    const subject = `تقرير جرد عتاد القهوة - ${branchName} - ${date}`
    const bodyHtml = `
      <div dir="rtl" style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px;">
        <div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h2 style="color: #4a1d44; margin: 0 0 16px 0;">تقرير جرد المخزون</h2>
          <p style="color: #666; margin: 0 0 8px 0;"><strong>الفرع:</strong> ${branchName}</p>
          <p style="color: #666; margin: 0 0 8px 0;"><strong>التاريخ:</strong> ${date}</p>
          <p style="color: #666; margin: 0 0 16px 0;"><strong>المسؤول:</strong> ${userName}</p>
          
          <div style="margin: 16px 0; display: flex; gap: 10px;">
            <div style="flex: 1; padding: 12px; background: #f0fdf4; border-radius: 4px; text-align: center;">
              <p style="color: #166534; font-size: 12px; margin: 0;">مطابق</p>
              <p style="color: #15803d; font-size: 24px; font-weight: bold; margin: 0;">${matched}</p>
            </div>
            <div style="flex: 1; padding: 12px; background: #fef2f2; border-radius: 4px; text-align: center;">
              <p style="color: #991b1b; font-size: 12px; margin: 0;">عجز</p>
              <p style="color: #b91c1c; font-size: 24px; font-weight: bold; margin: 0;">${deficit}</p>
            </div>
            <div style="flex: 1; padding: 12px; background: #eff6ff; border-radius: 4px; text-align: center;">
              <p style="color: #1e40af; font-size: 12px; margin: 0;">زيادة</p>
              <p style="color: #1d4ed8; font-size: 24px; font-weight: bold; margin: 0;">${surplus}</p>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <thead>
              <tr style="background: #4a1d44; color: white;">
                <th style="padding: 10px; text-align: center; font-size: 12px;">#</th>
                <th style="padding: 10px; text-align: right; font-size: 12px;">SKU</th>
                <th style="padding: 10px; text-align: right; font-size: 12px;">المنتج</th>
                <th style="padding: 10px; text-align: center; font-size: 12px;">أودو</th>
                <th style="padding: 10px; text-align: center; font-size: 12px;">الفعلي</th>
                <th style="padding: 10px; text-align: center; font-size: 12px;">الحالة</th>
                <th style="padding: 10px; text-align: right; font-size: 12px;">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <p style="color: #666; font-size: 12px; margin: 16px 0 0 0; text-align: center; border-top: 1px solid #eee; padding-top: 16px;">
            منظومة جرد شركة عتاد القهوة التجارية V2.1
          </p>
        </div>
      </div>
    `

    // Send via Odoo mail
    const mailId = await callOdooObject(uid, 'mail.mail', 'create', [{
      subject,
      body_html: bodyHtml,
      email_to: 'asabry@ataad.sa, adel20selim@gmail.com',
      email_from: 'asabry@ataad.sa',
      auto_delete: false
    }])

    if (mailId) {
      try {
        await callOdooObject(uid, 'mail.mail', 'send', [[mailId]])
      } catch (e) {
        // Mail queued
      }
    }

    res.json({
      success: true,
      message: 'تم إرسال التقرير بنجاح'
    })
  } catch (err: any) {
    res.json({
      success: false,
      error: err.message
    })
  }
})

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 منظومة الجرد - عتاد القهوة V2.1`)
  console.log(`📡 تشغيل على http://0.0.0.0:${PORT}`)
  console.log(`🔗 Odoo: ${ODOO_CONFIG.url}`)
})

export default app
