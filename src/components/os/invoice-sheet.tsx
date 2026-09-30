import { forwardRef } from 'react';

export interface LineItem {
  description: string;
  specifications?: string;
  hsnSac?: string;
  quantity: number;
  uom?: string;
  unitPrice: number;
  discountPercent?: number;
}

export interface CompanyProfile {
  fromName: string; fromAddress: string; fromEmail: string; fromPhone: string; fromGst: string; fromPan: string; fromCin: string;
  fromState: string; fromStateCode: string; jurisdiction: string; logoUrl: string;
  bankName: string; bankAccountName: string; bankAccountNumber: string; bankIfsc: string; bankAccountType: string; bankUpi: string;
}

export interface InvoiceData {
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string | null;
  status?: string;
  state?: string; stateCode?: string; placeOfSupply?: string; buyerRefNo?: string; paymentTerms?: string;
  billToName?: string; billToAddress?: string; billToEmail?: string; billToPhone?: string; billToGst?: string; billToPan?: string; billToState?: string; billToStateCode?: string;
  shipToName?: string; shipToAddress?: string; shipToGst?: string; shipToState?: string; shipToStateCode?: string;
  remarks?: string; documentNote?: string;
  lineItems: LineItem[];
  taxRate: number;
  overallDiscount?: number;
  isInterState?: boolean;
}

const round = (n: number) => Math.round(n);
const money = (n: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const date = (d?: string | null) => (d ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d)) : '—');

/** Mirrors the backend `invoiceTotals` so the preview always matches what is saved. */
export function invoiceTotals(input: Pick<InvoiceData, 'lineItems' | 'taxRate' | 'overallDiscount' | 'isInterState'>) {
  let subtotal = 0;
  let lineDiscount = 0;
  for (const item of input.lineItems) {
    const gross = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    const pct = Math.max(0, Math.min(100, Number(item.discountPercent) || 0));
    subtotal += gross;
    lineDiscount += (gross * pct) / 100;
  }
  const discount = round(lineDiscount + Math.max(0, Number(input.overallDiscount) || 0));
  const taxable = Math.max(0, round(subtotal - discount));
  const rate = Math.max(0, Number(input.taxRate) || 0);
  const igstAmount = input.isInterState ? round(taxable * rate) : 0;
  const cgstAmount = input.isInterState ? 0 : round(taxable * (rate / 2));
  const sgstAmount = cgstAmount;
  const taxAmount = igstAmount + cgstAmount + sgstAmount;
  const exact = taxable + taxable * rate;
  const total = round(taxable + taxAmount);
  return { subtotal: round(subtotal), discount, taxable, taxAmount, cgstAmount, sgstAmount, igstAmount, total, rounding: total - exact };
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function twoDigits(n: number) { return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`; }
function threeDigits(n: number) { return `${n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ' ' : ''}` : ''}${n % 100 ? twoDigits(n % 100) : ''}`; }
export function amountInWords(amount: number) {
  let n = Math.round(Math.abs(amount || 0));
  if (!n) return 'Indian Rupee Zero Only';
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thousand = Math.floor(n / 1e3); n %= 1e3;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));
  return `Indian Rupee ${parts.join(' ')} Only`;
}

const Meta = ({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) => (
  <div className="grid grid-cols-[110px_1fr] px-2.5 py-1">
    <span className="font-medium text-[#4b5563]">{label}</span>
    <span className={bold ? 'font-bold' : 'font-semibold'}>: {value}</span>
  </div>
);

export const InvoiceSheet = forwardRef<HTMLDivElement, { data: InvoiceData; company: CompanyProfile; title?: string }>(({ data, company, title }, ref) => {
  const totals = invoiceTotals(data);
  const rate = Math.max(0, Number(data.taxRate) || 0);
  const inter = Boolean(data.isInterState);
  const half = Math.round((rate / 2) * 1000) / 10;
  const full = Math.round(rate * 1000) / 10;
  const docTitle = title || (rate > 0 ? 'TAX INVOICE' : 'INVOICE');
  const state = data.state || company.fromState || 'Karnataka';
  const stateCode = data.stateCode || company.fromStateCode || '29';
  const items = data.lineItems.filter((i) => i.description?.trim());
  const qtyTotal = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  return (
    <div ref={ref} className="invoice-sheet relative overflow-hidden bg-white text-[#111827] shadow-[0_20px_60px_rgba(0,0,0,0.18)] print:shadow-none" style={{ width: 794, minHeight: 1123, boxSizing: 'border-box' }}>
      {company.logoUrl && (
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
          <img src={company.logoUrl} alt="" crossOrigin="anonymous" className="h-[380px] w-[380px] object-contain opacity-[0.038] grayscale" />
        </div>
      )}
      <div className="relative z-10 flex min-h-[1123px] flex-col p-8 font-sans text-[11px] leading-tight">
        <div className="flex items-start justify-between border-b border-[#111827] pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#0d0d12] p-1.5">
              {company.logoUrl ? <img src={company.logoUrl} alt="" crossOrigin="anonymous" className="h-full w-full object-contain p-1 invert" /> : <span className="text-lg font-black text-white">{company.fromName.charAt(0)}</span>}
            </div>
            <div>
              <h1 className="text-[17px] font-black uppercase tracking-tight text-[#0d0d12]">{company.fromName}</h1>
              {company.fromAddress && <p className="max-w-[340px] text-[10px] leading-snug text-[#4b5563]">{company.fromAddress}</p>}
            </div>
          </div>
          <div className="max-w-[280px] space-y-0.5 text-right text-[10px] text-[#374151]">
            {company.fromEmail && <p><span className="font-semibold text-[#111827]">Email:</span> {company.fromEmail}</p>}
            {company.fromPhone && <p><span className="font-semibold text-[#111827]">Phone:</span> {company.fromPhone}</p>}
            {(company.fromPan || company.fromGst) && (
              <p className="tracking-wide"><span className="font-semibold text-[#111827]">PAN:</span> {company.fromPan || '—'} | <span className="font-semibold text-[#111827]">GSTIN:</span> {company.fromGst || '—'}</p>
            )}
            {company.fromCin && <p><span className="font-semibold text-[#111827]">CIN:</span> {company.fromCin}</p>}
          </div>
        </div>

        <div className="relative my-2.5 flex justify-center border-y border-[#111827] bg-[#f9fafb] py-1.5">
          <span className="text-[13px] font-black uppercase tracking-[0.2em]">{docTitle}</span>
          {data.status && <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[#9ca3af] bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#374151]">{data.status.replace(/_/g, ' ')}</span>}
        </div>

        <div className="grid grid-cols-2 border border-[#111827] text-[10px]">
          <div className="divide-y divide-[#e5e7eb] border-r border-[#111827]">
            <Meta label="Invoice No." value={data.invoiceNumber || 'DRAFT'} bold />
            <Meta label="Issue Date" value={date(data.issueDate)} />
            <Meta label="State" value={`${state} (Code: ${stateCode})`} />
            <Meta label="Place of Supply" value={data.placeOfSupply || state} />
          </div>
          <div className="divide-y divide-[#e5e7eb]">
            <Meta label="Due Date" value={date(data.dueDate)} />
            <Meta label="Document Date" value={date(data.issueDate)} />
            <Meta label="Buyer Ref / PO" value={data.buyerRefNo || '—'} />
            <Meta label="Payment Terms" value={data.paymentTerms || '100% Advance'} />
          </div>
        </div>

        <div className="mt-[-1px] grid grid-cols-2 border border-[#111827] text-[10px]">
          <div className="space-y-1 border-r border-[#111827] p-2.5">
            <p className="border-b border-[#d1d5db] pb-1 font-bold uppercase tracking-wider">Customer / Bill To</p>
            <p className="text-[11px] font-bold">{data.billToName || '—'}</p>
            <p className="whitespace-pre-line text-[#4b5563]">{data.billToAddress || 'Address not provided'}</p>
            <p><b>State:</b> {data.billToState || state} &nbsp;<b>Code:</b> {data.billToStateCode || stateCode}</p>
            <p><b>GSTIN:</b> {data.billToGst || '—'}{data.billToPan && <> | <b>PAN:</b> {data.billToPan}</>}</p>
            {(data.billToEmail || data.billToPhone) && <p className="text-[#6b7280]">{[data.billToEmail, data.billToPhone].filter(Boolean).join(' · ')}</p>}
          </div>
          <div className="space-y-1 p-2.5">
            <p className="border-b border-[#d1d5db] pb-1 font-bold uppercase tracking-wider">Ship To Details</p>
            <p className="text-[11px] font-bold">{data.shipToName || data.billToName || '—'}</p>
            <p className="whitespace-pre-line text-[#4b5563]">{data.shipToAddress || data.billToAddress || 'Same as Bill To Address'}</p>
            <p><b>State:</b> {data.shipToState || data.billToState || state} &nbsp;<b>Code:</b> {data.shipToStateCode || data.billToStateCode || stateCode}</p>
            <p><b>GSTIN:</b> {data.shipToGst || data.billToGst || '—'}</p>
          </div>
        </div>

        <div className="mt-[-1px] flex-1">
          <table className="w-full border-collapse border border-[#111827] text-[10px]">
            <thead>
              <tr className="bg-[#111827] text-white">
                {['Sr.', 'Description', 'HSN/SAC', 'Qty', 'UOM', 'Rate (₹)', 'Disc %', 'Taxable', ...(inter ? ['IGST%', 'IGST Amt'] : ['CGST%', 'CGST Amt', 'SGST%', 'SGST Amt']), 'Total (₹)'].map((h, i) => (
                  <th key={h} className={`border-r border-white/20 px-1 py-1.5 font-bold ${i === 1 ? 'text-left' : [5, 7].includes(i) || h.includes('Amt') || h.startsWith('Total') ? 'text-right' : 'text-center'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={inter ? 11 : 13} className="py-10 text-center italic text-[#9ca3af]">Line items added on the left will appear here.</td></tr>
              ) : items.map((item, idx) => {
                const qty = Number(item.quantity) || 1;
                const gross = qty * (Number(item.unitPrice) || 0);
                const disc = Math.max(0, Math.min(100, Number(item.discountPercent) || 0));
                const taxable = gross - (gross * disc) / 100;
                const cgst = taxable * (rate / 2);
                const igst = taxable * rate;
                const lineTotal = taxable + (inter ? igst : cgst * 2);
                const cell = 'border-r border-[#111827] px-1 py-2 align-top';
                return (
                  <tr key={idx} className="border-b border-[#e5e7eb]">
                    <td className={`${cell} text-center`}>{idx + 1}</td>
                    <td className={cell}><p className="font-bold">{item.description}</p>{item.specifications && <p className="text-[9px] text-[#6b7280]">{item.specifications}</p>}</td>
                    <td className={`${cell} text-center`}>{item.hsnSac || '998314'}</td>
                    <td className={`${cell} text-center`}>{qty}</td>
                    <td className={`${cell} text-center`}>{item.uom || 'Nos'}</td>
                    <td className={`${cell} text-right`}>{money(Number(item.unitPrice) || 0)}</td>
                    <td className={`${cell} text-center`}>{disc ? `${disc}%` : '0'}</td>
                    <td className={`${cell} text-right`}>{money(taxable)}</td>
                    {inter ? (
                      <><td className={`${cell} text-center`}>{full}%</td><td className={`${cell} text-right`}>{money(igst)}</td></>
                    ) : (
                      <><td className={`${cell} text-center`}>{half}%</td><td className={`${cell} text-right`}>{money(cgst)}</td><td className={`${cell} text-center`}>{half}%</td><td className={`${cell} text-right`}>{money(cgst)}</td></>
                    )}
                    <td className="px-1 py-2 text-right align-top font-semibold">{money(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#111827] bg-[#f9fafb] font-bold">
                <td colSpan={3} className="border-r border-[#111827] px-1 py-1.5 text-right">Total</td>
                <td className="border-r border-[#111827] text-center">{qtyTotal}</td>
                <td className="border-r border-[#111827] text-center">—</td><td className="border-r border-[#111827] text-center">—</td><td className="border-r border-[#111827] text-center">—</td>
                <td className="border-r border-[#111827] px-1 text-right">{money(totals.taxable)}</td>
                {inter ? (
                  <><td className="border-r border-[#111827] text-center">—</td><td className="border-r border-[#111827] px-1 text-right">{money(totals.igstAmount)}</td></>
                ) : (
                  <><td className="border-r border-[#111827] text-center">—</td><td className="border-r border-[#111827] px-1 text-right">{money(totals.cgstAmount)}</td><td className="border-r border-[#111827] text-center">—</td><td className="border-r border-[#111827] px-1 text-right">{money(totals.sgstAmount)}</td></>
                )}
                <td className="px-1 text-right">{money(totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-[-1px] grid grid-cols-[1fr_270px] border border-[#111827] text-[10px]">
          <div className="divide-y divide-[#111827] border-r border-[#111827]">
            <div className="p-2.5"><p className="font-bold">REMARKS / SCOPE:</p><p className="whitespace-pre-line text-[#4b5563]">{data.remarks || 'Services delivered as per agreed project milestone and deliverables.'}</p></div>
            <div className="bg-[#f9fafb]/60 p-2.5"><p className="font-bold">AMOUNT IN WORDS:</p><p className="text-[10.5px] font-bold">{amountInWords(totals.total)}</p></div>
            <div className="grid grid-cols-2 divide-x divide-[#e5e7eb]">
              <div className="space-y-0.5 p-2.5">
                <p className="font-bold">BANK DETAILS FOR PAYMENT</p>
                {company.bankName && <p>Bank: {company.bankName}</p>}
                {company.bankAccountName && <p>A/C Name: {company.bankAccountName}</p>}
                {company.bankAccountNumber && <p>A/C No: {company.bankAccountNumber}</p>}
                {company.bankIfsc && <p>IFSC: {company.bankIfsc} ({company.bankAccountType})</p>}
                {company.bankUpi && <p>UPI: {company.bankUpi}</p>}
                {!company.bankName && !company.bankAccountNumber && !company.bankUpi && <p className="text-[#9ca3af]">Configure INVOICE_BANK_* settings.</p>}
              </div>
              <div className="p-2.5">
                <p className="font-bold">TERMS &amp; CONDITIONS</p>
                <ul className="list-disc pl-3 text-[#6b7280]">
                  <li>Payment due within agreed credit period.</li>
                  <li>18% per annum interest charged on delayed payments.</li>
                  <li>All disputes subject to {company.jurisdiction || 'local'} jurisdiction.</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex flex-col divide-y divide-[#e5e7eb]">
            <div className="flex justify-between px-3 py-1.5"><span>Total Amount Before Tax</span><span>{money(totals.taxable)}</span></div>
            {totals.discount > 0 && <div className="flex justify-between px-3 py-1.5 text-emerald-700"><span>Total Discount (applied)</span><span>−{money(totals.discount)}</span></div>}
            {inter ? (
              <div className="flex justify-between px-3 py-1.5"><span>Add: IGST ({full}%)</span><span>{money(totals.igstAmount)}</span></div>
            ) : (
              <>
                <div className="flex justify-between px-3 py-1.5"><span>Add: CGST ({half}%)</span><span>{money(totals.cgstAmount)}</span></div>
                <div className="flex justify-between px-3 py-1.5"><span>Add: SGST ({half}%)</span><span>{money(totals.sgstAmount)}</span></div>
              </>
            )}
            <div className="flex justify-between bg-[#f9fafb] px-3 py-1.5 font-bold"><span>Total GST</span><span>{money(totals.taxAmount)}</span></div>
            <div className="flex justify-between px-3 py-1.5 text-[#6b7280]"><span>Rounding</span><span>{totals.rounding >= 0 ? '+' : '−'}{money(Math.abs(totals.rounding))}</span></div>
            <div className="flex items-center justify-between border-t-2 border-[#111827] bg-[#111827] px-3 py-2 text-white">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Amount</span>
              <span className="text-[13px] font-black">₹{money(totals.total)}</span>
            </div>
            <div className="min-h-[90px] flex-1 p-3 text-center">
              <p className="text-[9.5px] font-bold uppercase">For {company.fromName}</p>
              <p className="mt-8 border-t border-dashed border-[#9ca3af] pt-1 text-[9px] font-semibold uppercase tracking-wider text-[#6b7280]">Authorized Signatory</p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-between text-[9px] text-[#9ca3af]">
          <span>This is a computer-generated tax document.</span>
          <span>{company.fromName}</span>
        </div>
      </div>
    </div>
  );
});
InvoiceSheet.displayName = 'InvoiceSheet';

export async function downloadInvoicePdf(element: HTMLElement, fileName: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
  const w = canvas.width * ratio;
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageWidth - w) / 2, 0, w, canvas.height * ratio);
  pdf.save(fileName);
}
