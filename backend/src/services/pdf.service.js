/**
 * Generate a payslip PDF using PDFKit and stream it to the HTTP response.
 */
const PDFDocument = require('pdfkit');

function streamPayslipPdf(res, { company, employee, payslip }) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const filename = `payslip-${employee.employeeId}-${payslip.month}-${payslip.year}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  const money = (n) => `${company.settings?.currency || 'INR'} ${Number(n || 0).toLocaleString()}`;

  // Header
  doc.fontSize(18).text(company.name, { align: 'center' });
  doc.fontSize(11).fillColor('#555').text('Payslip', { align: 'center' });
  doc.moveDown();
  doc.fillColor('#000').fontSize(12).text(
    `Pay Period: ${String(payslip.month).padStart(2, '0')}/${payslip.year}`
  );
  doc.text(`Employee: ${employee.firstName} ${employee.lastName || ''} (${employee.employeeId})`);
  doc.text(`Paid Days: ${payslip.paidDays} / ${payslip.workingDays}   LOP: ${payslip.lopDays}`);
  doc.moveDown();

  // Earnings
  doc.fontSize(13).text('Earnings', { underline: true });
  doc.fontSize(11);
  doc.text(`Basic: ${money(payslip.earnings.basic)}`);
  doc.text(`HRA: ${money(payslip.earnings.hra)}`);
  doc.text(`Allowances: ${money(payslip.earnings.allowances)}`);
  doc.text(`Bonus: ${money(payslip.earnings.bonus)}`);
  doc.text(`Gross Earnings: ${money(payslip.grossEarnings)}`, { continued: false });
  doc.moveDown();

  // Deductions
  doc.fontSize(13).text('Deductions', { underline: true });
  doc.fontSize(11);
  doc.text(`PF: ${money(payslip.deductions.pf)}`);
  doc.text(`ESI: ${money(payslip.deductions.esi)}`);
  doc.text(`TDS: ${money(payslip.deductions.tds)}`);
  doc.text(`Loss of Pay: ${money(payslip.deductions.lop)}`);
  doc.text(`Other: ${money(payslip.deductions.other)}`);
  doc.text(`Total Deductions: ${money(payslip.totalDeductions)}`);
  doc.moveDown();

  // Net
  doc.fontSize(14).fillColor('#16a34a').text(`Net Pay: ${money(payslip.netPay)}`);
  doc.fillColor('#000');
  doc.moveDown(2);
  doc.fontSize(9).fillColor('#888').text('This is a system-generated payslip.', { align: 'center' });

  doc.end();
}

module.exports = { streamPayslipPdf };
