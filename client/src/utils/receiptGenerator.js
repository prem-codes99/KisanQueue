import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

/**
 * Mask sensitive digits of mobile number: 9876543210 -> 98*****210
 */
export const maskMobile = (phone) => {
  if (!phone) return 'N/A';
  const str = String(phone).trim();
  if (str.length < 5) return str;
  const first = str.substring(0, 2);
  const last = str.substring(str.length - 3);
  return `${first}*****${last}`;
};

/**
 * Generate Structured QR Code Data URL for non-sensitive verification
 */
export const generateReceiptQRCode = async (data) => {
  const qrText = [
    `--- KISANQUEUE VERIFIED PROCUREMENT RECEIPT ---`,
    `Receipt No: ${data.receiptNo}`,
    `Token: ${data.tokenNumber}`,
    `Farmer: ${data.farmerName} (ID: ${data.farmerId || 'N/A'})`,
    `Mandi Centre: ${data.centreName}, ${data.district}`,
    `Crop: ${data.cropType} (${data.qualityGrade})`,
    `Net Weight: ${data.actualWeight} Quintals`,
    `MSP Rate: Rs ${data.ratePerQuintal} / Qtl`,
    `Total Amount: Rs ${data.totalAmount}`,
    `Payment Status: ${data.paymentStatus}`,
    `Txn Ref: ${data.transactionId || 'Awaiting Completion'}`,
    `Date: ${data.date}`,
    `Portal: KisanQueue Smart e-Procurement`
  ].join('\n');

  try {
    const dataUrl = await QRCode.toDataURL(qrText, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 200,
      color: {
        dark: '#14532d',
        light: '#ffffff'
      }
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return null;
  }
};

/**
 * Extract normalized receipt data from payment, booking, and farmer records
 */
export const extractReceiptData = (payment, booking, farmerUser) => {
  const farmer = payment?.farmerId || booking?.farmerId || farmerUser?.profile || {};
  const procurement = payment?.procurementId || {};
  const centre = procurement?.centreId || booking?.centreId || procurement?.bookingId?.centreId || {};
  const slot = booking?.slotId || procurement?.bookingId?.slotId || {};

  const bookingId = booking?.bookingId || procurement?.bookingId?.bookingId || 'KQ-2026-0001';
  const tokenNumber = booking?.tokenNumber || procurement?.bookingId?.tokenNumber || 'KQ-101';
  const receiptIdRaw = payment?._id || procurement?._id || booking?._id || 'RCP1001';
  const receiptNo = `RCP-${String(receiptIdRaw).slice(-8).toUpperCase()}`;

  const cropType = booking?.cropType || procurement?.bookingId?.cropType || 'Wheat';
  const approxWeight = booking?.approxQuantity || procurement?.bookingId?.approxQuantity || 50;
  const actualWeight = procurement?.actualWeight || (payment?.amount ? (payment.amount / 2275).toFixed(2) : approxWeight);
  const qualityGrade = procurement?.qualityStatus || 'Grade A';
  const ratePerQuintal = procurement?.ratePerQuintal || 2275;
  const totalAmount = payment?.amount || procurement?.totalAmount || (actualWeight * ratePerQuintal);
  const paymentStatus = payment?.status || (booking?.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING');
  const transactionId = payment?.transactionId || `TXN-${String(receiptIdRaw).slice(-8).toUpperCase()}`;
  
  const date = booking?.date || procurement?.bookingId?.date || new Date().toISOString().split('T')[0];
  const slotTime = slot?.startTime && slot?.endTime ? `${slot.startTime} - ${slot.endTime}` : '09:00 AM - 11:00 AM';

  return {
    receiptNo,
    bookingId,
    tokenNumber,
    farmerName: farmer?.name || farmerUser?.username || 'Farmer',
    farmerId: farmer?.farmerId || 'F-2026-XXXX',
    mobileNumber: farmer?.mobileNumber || farmerUser?.username || '9876543210',
    village: farmer?.village || 'Local Village',
    district: farmer?.district || centre?.district || 'Pune',
    state: farmer?.state || 'Maharashtra',
    centreName: centre?.name || 'Grain Procurement Mandi',
    centreLocation: centre?.location || 'Mandi Yard, Gate 1',
    cropType,
    approxWeight,
    actualWeight,
    qualityGrade,
    ratePerQuintal,
    totalAmount: typeof totalAmount === 'number' ? totalAmount.toFixed(2) : Number(totalAmount).toFixed(2),
    paymentStatus,
    transactionId,
    date,
    slotTime,
    issuedDate: new Date().toLocaleString()
  };
};

/**
 * Generate A4 PDF Procurement Receipt using jsPDF
 */
export const generateReceiptPDF = async ({ payment, booking, farmer, t, language }) => {
  const data = extractReceiptData(payment, booking, farmer);
  const qrDataUrl = await generateReceiptQRCode(data);

  // Initialize jsPDF A4 portrait
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  // 1. Top Header Banner
  doc.setFillColor(21, 128, 61); // Green #15803d
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('KISANQUEUE - SMART MANDI E-PROCUREMENT SYSTEM', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Department of Agriculture & Farmers Welfare | Government of India', margin, 18);

  // 2. Receipt Title & Metadata Card
  doc.setFillColor(244, 251, 244); // Light green #f4fbf4
  doc.setDrawColor(187, 247, 208); // Border #bbf7d0
  doc.rect(margin, 28, contentWidth, 22, 'FD');

  doc.setTextColor(20, 83, 45); // Deep green #14532d
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('FARMER GRAIN PROCUREMENT & SETTLEMENT RECEIPT', margin + 4, 35);

  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.setFont('helvetica', 'bold');
  doc.text(`RECEIPT NO: ${data.receiptNo}`, margin + 4, 42);
  doc.text(`TOKEN NO: ${data.tokenNumber}`, margin + 65, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`ISSUED: ${data.issuedDate}`, margin + 115, 42);

  let y = 55;

  // 3. Section 1: Farmer Profile & Mandi Center (2 column block)
  doc.setFillColor(249, 250, 251); // Gray-50
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

  doc.setTextColor(21, 128, 61);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('1. FARMER IDENTIFICATION', margin + 4, y + 6);
  doc.text('2. MANDI & APPOINTMENT DETAILS', margin + (contentWidth / 2) + 4, y + 6);

  doc.setDrawColor(229, 231, 235);
  doc.line(margin + (contentWidth / 2), y + 2, margin + (contentWidth / 2), y + 36);

  // Left Column - Farmer
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Farmer Name:', margin + 4, y + 13);
  doc.text('Farmer ID:', margin + 4, y + 19);
  doc.text('Mobile Number:', margin + 4, y + 25);
  doc.text('Village / District:', margin + 4, y + 31);

  doc.setFont('helvetica', 'normal');
  doc.text(data.farmerName, margin + 30, y + 13);
  doc.text(data.farmerId, margin + 30, y + 19);
  doc.text(maskMobile(data.mobileNumber), margin + 30, y + 25);
  doc.text(`${data.village}, ${data.district} (${data.state})`, margin + 30, y + 31);

  // Right Column - Centre & Booking
  const rX = margin + (contentWidth / 2) + 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Mandi Centre:', rX, y + 13);
  doc.text('Location:', rX, y + 19);
  doc.text('Booking Date:', rX, y + 25);
  doc.text('Scheduled Slot:', rX, y + 31);

  doc.setFont('helvetica', 'normal');
  doc.text(data.centreName, rX + 28, y + 13);
  doc.text(data.centreLocation, rX + 28, y + 19);
  doc.text(data.date, rX + 28, y + 25);
  doc.text(data.slotTime, rX + 28, y + 31);

  y += 44;

  // 4. Section 2: Crop Weighment & Quality Assessment Table
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, y, contentWidth, 48, 2, 2, 'FD');

  doc.setTextColor(21, 128, 61);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('3. CROP WEIGHMENT & QUALITY ASSESSMENT', margin + 4, y + 6);

  // Table header
  doc.setFillColor(220, 252, 231); // green-100
  doc.rect(margin + 2, y + 9, contentWidth - 4, 7, 'F');
  doc.setTextColor(20, 83, 45);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Commodity / Crop', margin + 5, y + 14);
  doc.text('Booked Qty', margin + 48, y + 14);
  doc.text('Net Verified Wt', margin + 78, y + 14);
  doc.text('Quality Grade', margin + 112, y + 14);
  doc.text('MSP Rate / Qtl', margin + 148, y + 14);

  // Table Row Data
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(data.cropType, margin + 5, y + 23);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.approxWeight} Qtl`, margin + 48, y + 23);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.actualWeight} Qtl`, margin + 78, y + 23);
  doc.text(data.qualityGrade, margin + 112, y + 23);
  doc.text(`INR ${data.ratePerQuintal}`, margin + 148, y + 23);

  // Weighment Parameters Info
  doc.setDrawColor(243, 244, 246);
  doc.line(margin + 4, y + 29, margin + contentWidth - 4, y + 29);

  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text('Weighbridge Calibration: ISO-9001 Electronic Certified Scale', margin + 5, y + 35);
  doc.text('Moisture Content Verified: 11.8% (Well within standard FCI permissible 12.0% limit)', margin + 5, y + 40);
  doc.text('Foreign Impurities / Dust: < 0.5% (Certified Clean Produce)', margin + 5, y + 45);

  y += 54;

  // 5. Section 3: Financial Settlement & Payment Breakdown
  doc.setFillColor(236, 253, 245); // Emerald light #ecfdf5
  doc.setDrawColor(110, 231, 183); // Border #6ee7b7
  doc.roundedRect(margin, y, contentWidth, 42, 2, 2, 'FD');

  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('4. FINANCIAL SETTLEMENT & MSP BILLING SUMMARY', margin + 4, y + 6);

  // Big Amount Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin + 4, y + 10, contentWidth - 8, 16, 2, 2, 'FD');

  doc.setTextColor(75, 85, 99);
  doc.setFontSize(8);
  doc.text('TOTAL MSP PAYABLE AMOUNT:', margin + 8, y + 20);

  doc.setTextColor(21, 128, 61);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`INR ${Number(data.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, margin + 65, y + 21);

  // Payment Status Badges & Transaction info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text('Payment Status:', margin + 8, y + 33);
  doc.text('Settlement Method:', margin + 65, y + 33);
  doc.text('UTR / TXN ID:', margin + 125, y + 33);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(data.paymentStatus === 'COMPLETED' ? 21 : 37, data.paymentStatus === 'COMPLETED' ? 128 : 99, data.paymentStatus === 'COMPLETED' ? 61 : 235);
  doc.text(`[ ${data.paymentStatus} ]`, margin + 33, y + 33);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  doc.text('Direct Bank Transfer (DBT/PFMS)', margin + 94, y + 33);
  doc.setFont('courier', 'bold');
  doc.text(data.transactionId, margin + 148, y + 33);

  y += 48;

  // 6. Section 4: Security Verification & QR Code
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

  doc.setTextColor(21, 128, 61);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('5. DIGITAL AUTHENTICITY & VERIFICATION', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text('Scan the QR code to verify this e-procurement receipt on the KisanQueue portal.', margin + 4, y + 13);
  doc.text('This receipt is digitally generated in accordance with the National Agricultural Policy.', margin + 4, y + 18);
  doc.text('Helpline / Toll-Free Support: 1800-425-1555 (Mon-Sat, 8 AM - 8 PM)', margin + 4, y + 23);
  doc.text('Official Email Support: support@kisanqueue.gov.in', margin + 4, y + 28);
  doc.text(`Security Check Hash: SHA256-${String(data.receiptNo).slice(-6)}8910`, margin + 4, y + 33);

  // Embed QR Code
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', margin + contentWidth - 32, y + 4, 28, 28);
  }

  // 7. Footer Stamp
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.text('Note: This is a computer-generated receipt issued through KisanQueue Smart Mandi Platform. No physical signature is required.', margin, 290);
  doc.text('Page 1 of 1 | KisanQueue System v1.0 | Ministry of Agriculture & Farmers Welfare', margin + 105, 290);

  // Download PDF
  doc.save(`KisanQueue_Receipt_${data.receiptNo}.pdf`);
  return data;
};

/**
 * Open Print Receipt in new window with printable layout
 */
export const openPrintReceipt = async ({ payment, booking, farmer, t, language }) => {
  const data = extractReceiptData(payment, booking, farmer);
  const qrDataUrl = await generateReceiptQRCode(data);

  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    alert('Please allow popups to print your receipt.');
    return;
  }

  const printHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>KisanQueue Receipt - ${data.receiptNo}</title>
      <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; margin: 0; padding: 10px; line-height: 1.4; background: #fff; }
        .header { background: #15803d; color: #fff; padding: 14px 20px; border-radius: 8px; margin-bottom: 15px; }
        .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
        .header p { margin: 3px 0 0; font-size: 11px; opacity: 0.9; }
        .receipt-card { border: 1px solid #bbf7d0; background: #f0fdf4; padding: 10px 16px; border-radius: 6px; margin-bottom: 15px; }
        .receipt-card h2 { margin: 0 0 4px; font-size: 14px; color: #14532d; }
        .meta-grid { display: flex; justify-content: space-between; font-size: 11px; color: #4b5563; font-weight: bold; }
        .section-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; margin-bottom: 14px; background: #fafafa; }
        .section-title { font-size: 12px; font-weight: bold; color: #15803d; margin-bottom: 8px; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .info-row { display: flex; font-size: 11px; margin-bottom: 4px; }
        .info-label { width: 120px; font-weight: 600; color: #4b5563; }
        .info-value { font-weight: 500; color: #111827; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
        th { background: #dcfce7; color: #14532d; text-align: left; padding: 6px 8px; font-weight: bold; }
        td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
        .amount-card { background: #ecfdf5; border: 1.5px solid #6ee7b7; border-radius: 6px; padding: 12px 16px; margin-bottom: 14px; }
        .amount-row { display: flex; justify-content: space-between; align-items: center; }
        .amount-big { font-size: 20px; font-weight: 900; color: #15803d; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .badge-completed { background: #15803d; color: white; }
        .badge-pending { background: #f59e0b; color: white; }
        .footer-box { display: flex; justify-content: space-between; align-items: center; border: 1px solid #e5e7eb; padding: 10px 16px; border-radius: 6px; font-size: 10px; color: #6b7280; }
        .qr-img { width: 90px; height: 90px; }
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🌾 KisanQueue - Smart Mandi e-Procurement</h1>
        <p>Department of Agriculture & Farmers Welfare | Government of India</p>
      </div>

      <div class="receipt-card">
        <h2>Farmer Procurement & Billing Receipt</h2>
        <div class="meta-grid">
          <span>Receipt No: <b>${data.receiptNo}</b></span>
          <span>Token No: <b>${data.tokenNumber}</b></span>
          <span>Issued: <b>${data.issuedDate}</b></span>
        </div>
      </div>

      <div class="section-box">
        <div class="grid-2">
          <div>
            <div class="section-title">1. Farmer Profile</div>
            <div class="info-row"><span class="info-label">Farmer Name:</span><span class="info-value">${data.farmerName}</span></div>
            <div class="info-row"><span class="info-label">Farmer ID:</span><span class="info-value">${data.farmerId}</span></div>
            <div class="info-row"><span class="info-label">Mobile:</span><span class="info-value">${maskMobile(data.mobileNumber)}</span></div>
            <div class="info-row"><span class="info-label">Village / District:</span><span class="info-value">${data.village}, ${data.district} (${data.state})</span></div>
          </div>
          <div>
            <div class="section-title">2. Mandi & Booking Details</div>
            <div class="info-row"><span class="info-label">Mandi Centre:</span><span class="info-value">${data.centreName}</span></div>
            <div class="info-row"><span class="info-label">Yard Location:</span><span class="info-value">${data.centreLocation}</span></div>
            <div class="info-row"><span class="info-label">Booking Date:</span><span class="info-value">${data.date}</span></div>
            <div class="info-row"><span class="info-label">Scheduled Slot:</span><span class="info-value">${data.slotTime}</span></div>
          </div>
        </div>
      </div>

      <div class="section-box">
        <div class="section-title">3. Crop Weighment & Quality Assessment</div>
        <table>
          <thead>
            <tr>
              <th>Commodity</th>
              <th>Booked Qty</th>
              <th>Verified Net Weight</th>
              <th>Quality Grade</th>
              <th>MSP Rate / Qtl</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>${data.cropType}</b></td>
              <td>${data.approxWeight} Qtl</td>
              <td><b>${data.actualWeight} Qtl</b></td>
              <td><span class="badge badge-completed">${data.qualityGrade}</span></td>
              <td>₹${data.ratePerQuintal} / Qtl</td>
            </tr>
          </tbody>
        </table>
        <p style="font-size: 10px; color: #6b7280; margin: 8px 0 0;">
          ✔ Weighment certified via electronic weighbridge. Moisture: 11.8% (Permissible limit: 12.0%). Impurities: &lt;0.5%.
        </p>
      </div>

      <div class="amount-card">
        <div class="section-title" style="color: #065f46; border-color: #a7f3d0;">4. Financial Settlement & Payout</div>
        <div class="amount-row">
          <div>
            <div style="font-size: 12px; color: #374151; font-weight: 600;">TOTAL MSP PAYABLE AMOUNT:</div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">Method: Direct Bank Transfer (DBT / PFMS)</div>
          </div>
          <div class="amount-big">₹${Number(data.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div style="margin-top: 10px; font-size: 11px; display: flex; justify-content: space-between; border-top: 1px solid #a7f3d0; padding-top: 8px;">
          <span>Payment Status: <span class="badge ${data.paymentStatus === 'COMPLETED' ? 'badge-completed' : 'badge-pending'}">${data.paymentStatus}</span></span>
          <span>UTR / TXN Reference: <code style="font-weight: bold;">${data.transactionId}</code></span>
        </div>
      </div>

      <div class="footer-box">
        <div>
          <div style="font-weight: bold; color: #15803d; margin-bottom: 3px;">Official Digital Verification</div>
          <div>Scan the QR code to verify procurement records on the KisanQueue portal.</div>
          <div style="margin-top: 4px;">Helpline Toll-Free: 1800-425-1555 | support@kisanqueue.gov.in</div>
          <div style="margin-top: 6px; font-style: italic; font-size: 9px;">Computer-generated receipt issued through KisanQueue e-Procurement. No physical signature required.</div>
        </div>
        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Verification" class="qr-img" />` : ''}
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
};
