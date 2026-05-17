import { Bill } from '@/types'
import { formatDate } from '@/lib/constants'

interface InvoiceProps { bill: Bill }

const DropletsLogo = ({ size = 48, opacity = 1, colored = false }: { size?: number; opacity?: number; colored?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
    fill="none"
    stroke={colored ? '#e07b00' : '#000'}
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ opacity, display: 'block', flexShrink: 0 }}>
    <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"
      fill={colored ? '#fff3e0' : 'none'}
      stroke={colored ? '#e07b00' : '#000'} />
    <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"
      fill={colored ? '#ffe0b2' : 'none'}
      stroke={colored ? '#f57c00' : '#000'} />
  </svg>
)

export default function Invoice({ bill }: InvoiceProps) {
  return (
    <div id="print-invoice" style={{
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      width: '148mm',
      maxHeight: '210mm',
      margin: '0 auto',
      padding: '0',
      fontSize: '12px',
      color: '#1a1a1a',
      background: '#fff',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* WATERMARK — colored & darker */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 0, pointerEvents: 'none', userSelect: 'none',
      }}>
        <DropletsLogo size={220} opacity={0.18} colored={true} />
      </div>

      {/* ── TOP ORANGE BANNER (like reference image) ── */}
      <div style={{
        background: 'linear-gradient(135deg, #f97316 0%, #fb923c 60%, #fbbf24 100%)',
        padding: '7mm 10mm 5mm',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        {/* Company name + logo left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DropletsLogo size={42} opacity={1} colored={false} />
          <div style={{ lineHeight: '1.15' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '1.5px', color: '#fff' }}>EMTA</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '1.5px', color: '#fff' }}>TRADERS</div>
          </div>
        </div>
        {/* INVOICE label right */}
        <div style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '3px', color: '#fff', lineHeight: '1' }}>
          INVOICE
        </div>
      </div>

      {/* ── COMPANY DETAILS BAR (light yellow) ── */}
      <div style={{
        background: '#fffbeb',
        borderBottom: '2px solid #f97316',
        padding: '4mm 10mm',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: '11px', color: '#7c3c00', lineHeight: '1.7' }}>
          <span>65/J, Ram Krishna Road, Rishra, Hooghly — 712248</span>
          <span style={{ margin: '0 6px', color: '#f97316' }}>|</span>
          <span>Mob: 7003868243</span>
          <span style={{ margin: '0 6px', color: '#f97316' }}>|</span>
          <span style={{ fontWeight: 'bold' }}>GST: 19AGMPR8914Q1Z7</span>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '4mm 10mm 3mm' }}>

        {/* ── BILL TO + INVOICE META ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4mm' }}>
          {/* Left — Bill To */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '8px', letterSpacing: '2px', textTransform: 'uppercase',
              color: '#f97316', fontWeight: 'bold', marginBottom: '3px'
            }}>
              Invoice To :
            </div>
            <div style={{ fontSize: '17px', fontWeight: 'bold', lineHeight: '1.2', marginBottom: '3px', color: '#1a1a1a' }}>
              {bill.customer_name}
            </div>
            {bill.customer_area && (
              <div style={{ fontSize: '11px', color: '#555', lineHeight: '1.6' }}>{bill.customer_area}</div>
            )}
            {bill.vehicle_number && (
              <div style={{ fontSize: '11px', color: '#555', lineHeight: '1.6' }}>Vehicle : {bill.vehicle_number}</div>
            )}
          </div>

          {/* Right — Invoice meta box */}
          <div style={{
            background: '#fff7ed',
            border: '1.5px solid #fed7aa',
            borderRadius: '6px',
            padding: '6px 12px',
            textAlign: 'right',
            fontSize: '11px',
            color: '#7c3c00',
            lineHeight: '1.9',
            flexShrink: 0,
          }}>
            <div>Invoice No : <b style={{ color: '#c2410c', fontSize: '12px' }}>{bill.bill_number}</b></div>
            <div>Date : <b style={{ color: '#c2410c', fontSize: '12px' }}>{formatDate(bill.date)}</b></div>
          </div>
        </div>

        {/* ── ITEMS TABLE ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '3mm' }}>
          <thead>
            <tr style={{ background: '#f97316' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 'bold', fontSize: '11px', letterSpacing: '0.5px', color: '#fff', width: '44%' }}>OIL / ITEM NAME</th>
              <th style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 'bold', fontSize: '11px', letterSpacing: '0.5px', color: '#fff', width: '13%' }}>QTY</th>
              <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 'bold', fontSize: '11px', letterSpacing: '0.5px', color: '#fff', width: '21%' }}>RATE</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 'bold', fontSize: '11px', letterSpacing: '0.5px', color: '#fff', width: '22%' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {bill.items?.map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
                <td style={{ padding: '7px 8px', color: '#333', fontSize: '12px' }}>{item.oil_name}</td>
                <td style={{ padding: '7px 4px', color: '#333', textAlign: 'center', fontSize: '12px' }}>{item.quantity}</td>
                <td style={{ padding: '7px 4px', color: '#333', textAlign: 'right', fontSize: '12px' }}>₹{item.rate}</td>
                <td style={{ padding: '7px 8px', color: '#c2410c', textAlign: 'right', fontWeight: '700', fontSize: '12px' }}>₹{item.total}</td>
              </tr>
            ))}
            {/* Filler rows */}
            {(bill.items?.length ?? 0) < 3 && Array.from({ length: 3 - (bill.items?.length ?? 0) }).map((_, i) => (
              <tr key={`e${i}`} style={{ background: ((bill.items?.length ?? 0) + i) % 2 === 0 ? '#fff' : '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
                <td style={{ padding: '7px 8px' }}>&nbsp;</td>
                <td /><td /><td />
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── TOTALS (right-aligned) ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3mm' }}>
          <div style={{ width: '48%' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', padding: '5px 8px',
              borderBottom: '1px solid #fed7aa', fontSize: '12px', color: '#7c3c00'
            }}>
              <span>Paid :</span><span style={{ minWidth: '50px' }}>&nbsp;</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', padding: '5px 8px',
              borderBottom: '1px solid #fed7aa', fontSize: '12px', color: '#7c3c00'
            }}>
              <span>Due :</span><span style={{ minWidth: '50px' }}>&nbsp;</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', padding: '7px 8px',
              background: '#f97316', borderRadius: '4px', marginTop: '2px',
              fontWeight: 'bold', fontSize: '14px', color: '#fff'
            }}>
              <span>TOTAL :</span>
              <span>₹{bill.total_amount}</span>
            </div>
          </div>
        </div>

        {/* ── NOTES ── */}
        {bill.notes && (
          <div style={{
            marginBottom: '3mm', fontSize: '11px', color: '#7c3c00', lineHeight: '1.6',
            borderLeft: '3px solid #f97316', paddingLeft: '8px',
            background: '#fff7ed', borderRadius: '0 4px 4px 0', padding: '5px 8px',
          }}>
            <b style={{ color: '#c2410c' }}>Notes: </b>{bill.notes}
          </div>
        )}

      </div>

      {/* ── BOTTOM ORANGE BANNER — THANK YOU centered ── */}
      <div style={{
        background: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 50%, #f97316 100%)',
        padding: '5mm 10mm',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
        marginTop: 'auto',
      }}>
        <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '2px', color: '#fff' }}>
          THANK YOU !
        </div>
      </div>

    </div>
  )
}
