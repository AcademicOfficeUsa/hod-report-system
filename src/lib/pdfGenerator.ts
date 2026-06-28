import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Department, HodReport, HodIssue, HodCurriculum, HodExamResult, HodHwTeacher, HodStaffChecklist } from '../lib/types';
import { MONTHS, FORMS, GRADES } from '../lib/types';

interface ReportPDFData {
  report: HodReport;
  department: Department;
  issues: HodIssue[];
  curriculum: HodCurriculum[];
  examResults: HodExamResult[];
  hwTeachers: HodHwTeacher[];
  staffChecklist: HodStaffChecklist[];
  comments: { a: string; b: string; c: string };
  achievements: string[];
  challenges: string[];
}

export function generateReportPDF(data: ReportPDFData) {
  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Colors
  const navy = [31, 56, 100];
  const gold = [201, 168, 76];

  // Header
  doc.setFillColor(...navy);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('School of St. Jude', 14, 15);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('HOD Monthly Report', 14, 23);
  doc.text(`${data.report.month} ${data.report.year}`, 14, 30);

  // Department badge
  doc.setFillColor(...gold);
  const badgeWidth = 50;
  const badgeX = pageWidth - badgeWidth - 14;
  doc.roundedRect(badgeX, 8, badgeWidth, 20, 3, 3, 'F');
  doc.setTextColor(...navy);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(data.department.name, badgeX + badgeWidth / 2, 18, { align: 'center' });
  doc.setFontSize(8);
  doc.text('HOD: ' + data.report.hod_name, badgeX + badgeWidth / 2, 24, { align: 'center' });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  let yPos = 45;

  // Section 1: Report Header
  doc.setFillColor(245, 247, 250);
  doc.rect(14, yPos, pageWidth - 28, 28, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Department: ${data.department.name}`, 18, yPos + 8);
  doc.text(`Month/Year: ${data.report.month} ${data.report.year}`, 18, yPos + 14);
  doc.text(`HOD: ${data.report.hod_name}`, 18, yPos + 20);
  doc.text(`Email: ${data.report.hod_email}`, pageWidth / 2 + 10, yPos + 8);
  doc.text(`Status: ${data.report.status.toUpperCase()}`, pageWidth / 2 + 10, yPos + 14);
  doc.text(`Date: ${data.report.date_submitted || 'N/A'}`, pageWidth / 2 + 10, yPos + 20);

  yPos += 35;

  // Section 2: Issues
  addSectionHeader(doc, yPos, '2. Department Issues', navy);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Area of Focus', 'Frequency', 'Remarks']],
    body: data.issues.map(i => [i.area_of_focus, i.frequency.toString(), i.remarks || '-']),
    theme: 'striped',
    headStyles: { fillColor: navy, textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 'auto' }
    },
    margin: { left: 14, right: 14 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Section 3: Curriculum
  checkNewPage(doc, yPos, 60);
  yPos = addSectionHeader(doc, yPos, '3. Curriculum Coverage', navy);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Subject', 'Form', 'Topics', 'Covered', 'Pending', 'Coverage %', 'Required %', 'Status']],
    body: data.curriculum.map(c => [
      c.subject,
      c.form,
      c.topics_total.toString(),
      c.topics_covered.toString(),
      c.topics_pending.toString(),
      c.coverage_pct + '%',
      c.required_pct + '%',
      c.remarks || '-'
    ]),
    theme: 'striped',
    headStyles: { fillColor: navy, textColor: [255, 255, 255], fontSize: 7 },
    bodyStyles: { fontSize: 6 },
    margin: { left: 14, right: 14 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Section 4: Exam Results (simplified)
  checkNewPage(doc, yPos, 80);
  yPos = addSectionHeader(doc, yPos, '4. Exam Results Summary', navy);
  yPos += 8;

  // Get unique subjects
  const uniqueSubjects = [...new Set(data.examResults.map(e => e.subject))];

  uniqueSubjects.forEach(subject => {
    const subjectExams = data.examResults.filter(e => e.subject === subject);

    autoTable(doc, {
      startY: yPos,
      head: [['Form', 'A', 'B', 'C', 'D', 'E', 'S', 'F', 'Total', 'KPI%', 'Below']],
      body: subjectExams.map(e => [
        e.form,
        e.grade_a.toString(),
        e.grade_b.toString(),
        e.grade_c.toString(),
        e.grade_d.toString(),
        e.grade_e.toString(),
        e.grade_s.toString(),
        e.grade_f.toString(),
        e.total.toString(),
        e.kpi_pct + '%',
        e.below_kpi.toString()
      ]),
      theme: 'grid',
      headStyles: { fillColor: navy, textColor: [255, 255, 255], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
      didDrawPage: () => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(subject, 14, yPos - 2);
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  });

  // Section 5: Comments
  checkNewPage(doc, yPos, 60);
  yPos = addSectionHeader(doc, yPos, '5. General Comments', navy);
  yPos += 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('a. General Comment:', 14, yPos);
  yPos += 4;
  doc.setFont('helvetica', 'normal');
  const linesA = doc.splitTextToSize(data.comments.a || 'N/A', pageWidth - 28);
  doc.text(linesA, 14, yPos);
  yPos += linesA.length * 4 + 6;

  doc.setFont('helvetica', 'bold');
  doc.text('b. Key Observations:', 14, yPos);
  yPos += 4;
  doc.setFont('helvetica', 'normal');
  const linesB = doc.splitTextToSize(data.comments.b || 'N/A', pageWidth - 28);
  doc.text(linesB, 14, yPos);
  yPos += linesB.length * 4 + 6;

  doc.setFont('helvetica', 'bold');
  doc.text('c. Way Forward:', 14, yPos);
  yPos += 4;
  doc.setFont('helvetica', 'normal');
  const linesC = doc.splitTextToSize(data.comments.c || 'N/A', pageWidth - 28);
  doc.text(linesC, 14, yPos);
  yPos += linesC.length * 4 + 10;

  // Section 7: HW Summary
  checkNewPage(doc, yPos, 80);
  yPos = addSectionHeader(doc, yPos, '7. Homework Summary by Form', navy);
  yPos += 8;

  // Calculate summaries
  const hwSummary = FORMS.map(form => {
    const formHw = data.hwTeachers.filter(h => h.form === form);
    const expected = formHw.reduce((sum, h) => sum + (h.expected_hw || 0), 0);
    const marked = formHw.reduce((sum, h) => sum + (h.marked_hw || 0), 0);
    const pct = expected > 0 ? Math.round((marked / expected) * 100) : 0;
    const tests = formHw.reduce((sum, h) => sum + (h.tests_admin || 0), 0);
    return [form, expected.toString(), marked.toString(), pct + '%', tests.toString()];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Form', 'Expected', 'Marked', 'HW %', 'Tests']],
    body: hwSummary,
    theme: 'striped',
    headStyles: { fillColor: navy, textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8, halign: 'center' },
    margin: { left: 14, right: 14 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Section 10: Staff Checklist Summary
  checkNewPage(doc, yPos, 60);
  yPos = addSectionHeader(doc, yPos, '10. Staff Checklist Summary', navy);
  yPos += 8;

  const staffYesCount = {
    lp: data.staffChecklist.filter(s => s.lp_updated === 'YES').length,
    logbook: data.staffChecklist.filter(s => s.logbook_updated === 'YES').length,
    scheme: data.staffChecklist.filter(s => s.scheme_updated === 'YES').length,
    one_one: data.staffChecklist.filter(s => s.one_one_done === 'YES').length,
    t_aid: data.staffChecklist.filter(s => s.teaching_aid_used === 'YES').length,
    missed: data.staffChecklist.filter(s => s.missed_lessons === 'YES').length
  };

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'YES Count']],
    body: [
      ['LP Updated', staffYesCount.lp.toString()],
      ['Logbook Updated', staffYesCount.logbook.toString()],
      ['Scheme Updated', staffYesCount.scheme.toString()],
      ['1:1 Done', staffYesCount.one_one.toString()],
      ['Teaching Aid Used', staffYesCount.t_aid.toString()],
      ['Missed Lessons', staffYesCount.missed.toString()]
    ],
    theme: 'grid',
    headStyles: { fillColor: navy, textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Section 13: Achievements & Challenges
  checkNewPage(doc, yPos, 60);
  yPos = addSectionHeader(doc, yPos, '13. Achievements & Challenges', navy);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 197, 94);
  doc.text('ACHIEVEMENTS', 14, yPos);
  yPos += 5;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  data.achievements.forEach((a, i) => {
    if (a) {
      doc.text(`${i + 1}. ${a}`, 14, yPos);
      yPos += 5;
    }
  });

  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(239, 68, 68);
  doc.setFontSize(9);
  doc.text('CHALLENGES', 14, yPos);
  yPos += 5;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  data.challenges.forEach((c, i) => {
    if (c) {
      doc.text(`${i + 1}. ${c}`, 14, yPos);
      yPos += 5;
    }
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `School of St. Jude - HOD Monthly Report - ${data.department.name} - ${data.report.month} ${data.report.year}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
  }

  // Save
  const fileName = `${data.department.name.replace(/\s/g, '_')}_${data.report.month}_${data.report.year}_report.pdf`;
  doc.save(fileName);
}

function addSectionHeader(doc: any, yPos: number, title: string, color: number[]) {
  doc.setFillColor(...color);
  doc.rect(14, yPos, doc.internal.pageSize.getWidth() - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 16, yPos + 5.5);
  doc.setTextColor(0, 0, 0);
  return yPos + 12;
}

function checkNewPage(doc: any, yPos: number, neededSpace: number) {
  if (yPos + neededSpace > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage();
    return 25;
  }
  return yPos;
}
