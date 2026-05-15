import { Bill } from '@/types'
import { formatDate } from '@/lib/constants'

interface InvoiceProps { bill: Bill }

const DropletsLogo = ({ size = 48, opacity = 1 }: { size?: number; opacity?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
    fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={{ opacity, display: 'block', flexShrink: 0 }}>
    <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
    <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />
  </svg>
)

export default function Invoice({ bill }: InvoiceProps) {
  return (
    <div id="print-invoice" style={{
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      width: '148mm',
      maxHeight: '210mm',
      margin: '0 auto',
      padding: '6mm 10mm 5mm',
      fontSize: '11px',
      color: '#111',
      background: '#fff',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* WATERMARK */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 0, pointerEvents: 'none', userSelect: 'none',
      }}>
        <DropletsLogo size={210} opacity={0.10} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

        {/* ── HEADER: Logo left | INVOICE right ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3mm' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DropletsLogo size={38} />
            <div style={{ lineHeight: '1.15' }}>
              <div style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '1px' }}>EMTA</div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '1px' }}>TRADERS</div>
            </div>
          </div>
          <div style={{ fontSize: '30px', fontWeight: '900', letterSpacing: '2px', lineHeight: '1' }}>INVOICE</div>
        </div>

        {/* ── RULE ── */}
        <div style={{ borderTop: '2px solid #111', marginBottom: '3mm' }} />

        {/* ── BILL TO + META (side by side) ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3mm', gap: '6mm' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '8px', letterSpacing: '2px', textTransform: 'uppercase', color: '#888', marginBottom: '2px' }}>Invoice To :</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', lineHeight: '1.2', marginBottom: '2px' }}>{bill.customer_name}</div>
            {bill.customer_area   && <div style={{ fontSize: '10px', color: '#555', lineHeight: '1.5' }}>{bill.customer_area}</div>}
            {bill.vehicle_number  && <div style={{ fontSize: '10px', color: '#555', lineHeight: '1.5' }}>Vehicle : {bill.vehicle_number}</div>}
          </div>
          <div style={{ textAlign: 'right', fontSize: '10px', color: '#555', lineHeight: '1.8', flexShrink: 0 }}>
            <div>Invoice No : <b style={{ color: '#111' }}>{bill.bill_number}</b></div>
            <div>Date : <b style={{ color: '#111' }}>{formatDate(bill.date)}</b></div>
          </div>
        </div>

        {/* ── ITEMS TABLE ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '3mm' }}>
          <thead>
            <tr style={{ borderTop: '1.5px solid #111', borderBottom: '1.5px solid #111' }}>
              <th style={{ textAlign: 'left',   padding: '5px 0',   fontWeight: 'bold', fontSize: '10px', letterSpacing: '0.5px', width: '44%' }}>NAME</th>
              <th style={{ textAlign: 'center', padding: '5px 4px', fontWeight: 'bold', fontSize: '10px', letterSpacing: '0.5px', width: '13%' }}>QTY</th>
              <th style={{ textAlign: 'right',  padding: '5px 4px', fontWeight: 'bold', fontSize: '10px', letterSpacing: '0.5px', width: '21%' }}>PRICE</th>
              <th style={{ textAlign: 'right',  padding: '5px 0',   fontWeight: 'bold', fontSize: '10px', letterSpacing: '0.5px', width: '22%' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {bill.items?.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e8e8e8' }}>
                <td style={{ padding: '6px 0',   color: '#333' }}>{item.oil_name}</td>
                <td style={{ padding: '6px 4px', color: '#333', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '6px 4px', color: '#333', textAlign: 'right'  }}>₹{item.rate}</td>
                <td style={{ padding: '6px 0',   color: '#111', textAlign: 'right', fontWeight: '600' }}>₹{item.total}</td>
              </tr>
            ))}
            {/* Minimal filler — only 3 rows, smaller padding */}
            {(bill.items?.length ?? 0) < 3 && Array.from({ length: 3 - (bill.items?.length ?? 0) }).map((_, i) => (
              <tr key={`e${i}`} style={{ borderBottom: '1px solid #e8e8e8' }}>
                <td style={{ padding: '6px 0' }}>&nbsp;</td>
                <td /><td /><td />
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── TOTALS (right-aligned) ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3mm' }}>
          <div style={{ width: '46%', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #e0e0e0', color: '#666' }}>
              <span>Paid :</span><span style={{ minWidth: '40px' }}>&nbsp;</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #e0e0e0', color: '#666' }}>
              <span>Due :</span><span style={{ minWidth: '40px' }}>&nbsp;</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0 3px', borderBottom: '2px solid #111', fontWeight: 'bold', fontSize: '12px' }}>
              <span>Total :</span><span>₹{bill.total_amount}</span>
            </div>
          </div>
        </div>

        {/* ── NOTES (only if present) ── */}
        {bill.notes && (
          <div style={{ marginBottom: '3mm', fontSize: '10px', color: '#555', lineHeight: '1.6', borderLeft: '2px solid #ccc', paddingLeft: '6px' }}>
            <b style={{ color: '#333' }}>Notes: </b>{bill.notes}
          </div>
        )}

        {/* ── FOOTER — pushed to bottom ── */}
        <div style={{ marginTop: 'auto', borderTop: '1.5px solid #111', paddingTop: '3mm', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '9px', color: '#666', lineHeight: '1.6' }}>
            <div style={{ fontWeight: 'bold', color: '#111', fontSize: '10px' }}>EMTA TRADERS</div>
            <div>65/J, Ram Krishna Road, Rishra, Hooghly — 712248</div>
            <div>Mob: 7003868243</div>
            <div style={{ color: '#444', fontWeight: '600' }}>GST: 19AGMPR8914Q1Z7</div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '1px' }}>THANK YOU!</div>
        </div>

      </div>
    </div>
  )
}
