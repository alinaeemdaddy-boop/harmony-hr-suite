
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle, ImageRun, Header, Footer, AlignmentType } from 'docx';

// Define a generic interface for Employee data to be used in exports
export interface ExportableEmployee {
    id: string;
    employee_code: string;
    full_name: string;
    email: string;
    phone: string | null;
    designation: string | null;
    department_name: string;
    status: string | null;
    joining_date: string;
    avatar_url?: string | null;
    // Extended fields for detailed profile
    date_of_birth?: string | null;
    gender?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postal_code?: string | null;
    employment_type?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    salary?: number | null;
}

export interface ExportablePayslip {
    id: string;
    employee_name: string;
    employee_code: string;
    designation: string;
    department: string;
    period_name: string;
    basic_salary: number;
    allowances: number;
    gross_earnings: number;
    tax_amount: number;
    provident_fund: number;
    eobi_amount: number;
    loan_deduction: number;
    advance_deduction: number;
    other_deductions: number;
    total_deductions: number;
    net_salary: number;
    payment_date: string;
    working_days: number;
    days_worked: number;
    leaves_taken: number;
    overtime_amount: number;
}

const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

const getBase64FromUrl = async (url: string): Promise<string> => {
    try {
        const data = await fetch(url);
        const blob = await data.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                const base64data = reader.result as string;
                resolve(base64data);
            };
            reader.onerror = reject;
        });
    } catch (error) {
        console.error('Error converting image to base64:', error);
        return '';
    }
};

export const exportToPDF = async (data: ExportableEmployee[], filename: string = 'employee_data') => {
    const doc = new jsPDF();
    const isSingleProfile = data.length === 1 && filename.includes('profile');

    // Header
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185);
    doc.text('Harmony HR Suite', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${formatDate(new Date())}`, 105, 28, { align: 'center' });

    if (isSingleProfile) {
        const emp = data[0];

        // Profile Picture
        if (emp.avatar_url) {
            try {
                const base64Img = await getBase64FromUrl(emp.avatar_url);
                if (base64Img) {
                    doc.addImage(base64Img, 'JPEG', 15, 35, 40, 40); // x, y, w, h
                }
            } catch (e) {
                console.warn('Could not load image for PDF', e);
            }
        }

        // Title Section
        doc.setFontSize(18);
        doc.setTextColor(0);
        doc.text(emp.full_name, 60, 45);
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`${emp.designation || 'No Designation'} • ${emp.department_name}`, 60, 52);

        doc.setDrawColor(200);
        doc.line(15, 80, 195, 80);

        // Details Sections
        let yPos = 90;
        const lineHeight = 10;
        const leftColX = 15;
        const rightColX = 110;

        const addSection = (title: string, details: { label: string, value: string | null | undefined }[]) => {
            doc.setFontSize(14);
            doc.setTextColor(41, 128, 185);
            doc.text(title, 15, yPos);
            yPos += 10;
            doc.setFontSize(10);
            doc.setTextColor(0);

            // Group into pairs for rows
            for (let i = 0; i < details.length; i += 2) {
                const item1 = details[i];
                const item2 = details[i + 1];

                let maxLines = 1;

                // Left Column
                const leftLabelX = 15;
                const leftValueX = 55;
                const leftValueWidth = 50; // 110 (right col start) - 55 (start) - 5 (gap)

                doc.setFont('helvetica', 'bold');
                doc.text(`${item1.label}:`, leftLabelX, yPos);
                doc.setFont('helvetica', 'normal');
                const splitValue1 = doc.splitTextToSize(item1.value || 'N/A', leftValueWidth);
                maxLines = Math.max(maxLines, splitValue1.length);

                // Right Column
                let splitValue2: string[] = [];
                if (item2) {
                    const rightLabelX = 110;
                    const rightValueX = 150;
                    const rightValueWidth = 45; // 210 (page width) - 150 (start) - 15 (margin)

                    doc.setFont('helvetica', 'bold');
                    doc.text(`${item2.label}:`, rightLabelX, yPos);
                    doc.setFont('helvetica', 'normal');
                    splitValue2 = doc.splitTextToSize(item2.value || 'N/A', rightValueWidth);
                    maxLines = Math.max(maxLines, splitValue2.length);

                    doc.text(splitValue2, rightValueX, yPos);
                }

                // Render left value after calculating potential overlapping issues (though splitTextToSize handles width)
                doc.text(splitValue1, leftValueX, yPos);

                // Move yPos
                yPos += (maxLines * 5) + 5; // 5 per line + gap

                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
            }
            yPos += 10; // Space after section
        };

        addSection('Personal Information', [
            { label: 'Employee ID', value: emp.employee_code },
            { label: 'Status', value: emp.status },
            { label: 'Date of Birth', value: formatDate(emp.date_of_birth) },
            { label: 'Gender', value: emp.gender },
            { label: 'Joining Date', value: formatDate(emp.joining_date) },
            { label: 'Employment Type', value: emp.employment_type?.replace('_', ' ') },
            { label: 'Salary', value: emp.salary ? `$${emp.salary.toLocaleString()}` : 'N/A' },
        ]);

        addSection('Contact Information', [
            { label: 'Email', value: emp.email },
            { label: 'Phone', value: emp.phone },
            { label: 'Address', value: emp.address },
            { label: 'City/State', value: `${emp.city || ''}, ${emp.state || ''}` },
            { label: 'Country', value: emp.country },
            { label: 'Postal Code', value: emp.postal_code },
            { label: 'Emergency Contact', value: emp.emergency_contact_name },
            { label: 'Emergency Phone', value: emp.emergency_contact_phone },
        ]);

    } else {
        // Standard List Table
        const tableColumn = ["ID", "Name", "Email", "Phone", "Designation", "Department", "Status", "Joined"];
        const tableRows: any[] = [];

        data.forEach(employee => {
            const employeeData = [
                employee.employee_code,
                employee.full_name,
                employee.email,
                employee.phone || 'N/A',
                employee.designation || 'N/A',
                employee.department_name,
                employee.status || 'N/A',
                new Date(employee.joining_date).toLocaleDateString()
            ];
            tableRows.push(employeeData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] },
        });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount} - Harmony HR Suite`, 105, 290, { align: 'center' });
    }

    doc.save(`${filename}.pdf`);
};

export const exportToExcel = async (data: ExportableEmployee[], filename: string = 'employee_data') => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employee Data');

    const isSingleProfile = data.length === 1 && filename.includes('profile');

    if (isSingleProfile) {
        const emp = data[0];

        // Add Image functionality for single profile is skipped in this basic implementation for Excel
        // But we can format it nicely
        worksheet.mergeCells('A1:D1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'Employee Profile';
        titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2980B9' } };
        titleCell.alignment = { horizontal: 'center' };

        let currentRow = 3;

        // Image embedding if possible
        if (emp.avatar_url) {
            try {
                const base64 = await getBase64FromUrl(emp.avatar_url);
                if (base64) {
                    const imageId = workbook.addImage({
                        base64: base64,
                        extension: 'jpeg',
                    });
                    worksheet.addImage(imageId, {
                        tl: { col: 0, row: 2 },
                        ext: { width: 100, height: 100 }
                    });
                    worksheet.getRow(2).height = 80;
                    currentRow = 8; // Move down below image
                }
            } catch (e) {
                console.warn('Failed to add image to excel', e);
            }
        }

        const addField = (label: string, value: string | null | undefined) => {
            worksheet.getCell(`A${currentRow}`).value = label;
            worksheet.getCell(`A${currentRow}`).font = { bold: true };
            worksheet.getCell(`B${currentRow}`).value = value || 'N/A';
            currentRow++;
        };

        addField('Full Name', emp.full_name);
        addField('Employee ID', emp.employee_code);
        addField('Email', emp.email);
        addField('Phone', emp.phone);
        addField('Designation', emp.designation);
        addField('Department', emp.department_name);
        addField('Status', emp.status);
        addField('Joining Date', formatDate(emp.joining_date));

        currentRow++;
        addField('Address', emp.address);
        addField('City', emp.city);
        addField('State', emp.state);
        addField('Country', emp.country);
        addField('Postal Code', emp.postal_code);
        addField('Employment Type', emp.employment_type);
        addField('Salary', emp.salary ? `$${emp.salary}` : 'N/A');
        addField('Emergency Contact', emp.emergency_contact_name);
        addField('Emergency Phone', emp.emergency_contact_phone);

        worksheet.getColumn(1).width = 25;
        worksheet.getColumn(2).width = 40;

    } else {
        // List Mode
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Designation', key: 'designation', width: 20 },
            { header: 'Department', key: 'department', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Joined', key: 'joined', width: 15 },
        ];

        // Style Header
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2980B9' } };

        data.forEach(emp => {
            worksheet.addRow({
                id: emp.employee_code,
                name: emp.full_name,
                email: emp.email,
                phone: emp.phone,
                designation: emp.designation,
                department: emp.department_name,
                status: emp.status,
                joined: new Date(emp.joining_date).toLocaleDateString()
            });
        });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}.xlsx`);
};

export const exportToWord = async (data: ExportableEmployee[], filename: string = 'employee_data') => {
    const isSingleProfile = data.length === 1 && filename.includes('profile');
    const children = [];

    // Header Title
    children.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({ text: "Harmony HR Suite", bold: true, size: 36, color: "2980B9" }),
            ],
            spacing: { after: 200 }
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({ text: `Generated on: ${formatDate(new Date())}`, size: 20, color: "808080" }),
            ],
            spacing: { after: 400 }
        })
    );

    if (isSingleProfile) {
        const emp = data[0];

        // Profile Image
        if (emp.avatar_url) {
            try {
                const base64 = await getBase64FromUrl(emp.avatar_url);
                // Remove data:image/jpeg;base64, prefix if present for docx
                const cleanBase64 = base64.split(',')[1];
                if (cleanBase64) {
                    children.push(
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new ImageRun({
                                    data: Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0)),
                                    transformation: { width: 150, height: 150 },
                                    type: 'jpg' // Specify type for docx
                                }),
                            ],
                            spacing: { after: 200 }
                        })
                    );
                }
            } catch (e) { console.warn('Word image err', e); }
        }

        children.push(
            new Paragraph({
                children: [new TextRun({ text: emp.full_name, size: 32 })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 100 }
            }),
            new Paragraph({
                children: [new TextRun({ text: `${emp.designation || 'No Designation'} • ${emp.department_name}`, size: 24, color: "505050" })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
            })
        );

        const createSection = (title: string, items: { label: string, val: string | null | undefined }[]) => {
            const rows = [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: title, color: "FFFFFF" })] })], shading: { fill: "2980B9" }, columnSpan: 2, margins: { top: 100, bottom: 100, left: 100, right: 100 } })
                    ]
                }),
                ...items.map(item => new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.label, bold: true })] })], width: { size: 30, type: WidthType.PERCENTAGE }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
                        new TableCell({ children: [new Paragraph({ text: item.val || 'N/A' })], margins: { top: 100, bottom: 100, left: 100, right: 100 } })
                    ]
                }))
            ];
            return new Table({
                rows: rows,
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: { top: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" }, bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" }, left: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" }, right: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" }, insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" } }
            });
        };

        children.push(
            createSection("Personal Details", [
                { label: "Employee ID", val: emp.employee_code },
                { label: "Status", val: emp.status },
                { label: 'Date of Birth', val: formatDate(emp.date_of_birth) },
                { label: 'Gender', val: emp.gender },
                { label: 'Joining Date', val: formatDate(emp.joining_date) },
                { label: 'Employment Type', val: emp.employment_type },
                { label: 'Salary', val: emp.salary ? `$${emp.salary}` : 'N/A' },
            ]),
            new Paragraph({ spacing: { after: 200 } }),
            createSection("Contact Details", [
                { label: "Email", val: emp.email },
                { label: "Phone", val: emp.phone },
                { label: "Address", val: emp.address },
                { label: "Location", val: `${emp.city || ''}, ${emp.country || ''}` }
            ])
        );

    } else {
        // List Table (simplified from before)
        const table = new Table({
            rows: [
                new TableRow({
                    children: ["ID", "Name", "Email", "Department"].map(t => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: "FFFFFF" })] })], shading: { fill: "2980B9" } }))
                }),
                ...data.map(emp => new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph(emp.employee_code)] }),
                        new TableCell({ children: [new Paragraph(emp.full_name)] }),
                        new TableCell({ children: [new Paragraph(emp.email)] }),
                        new TableCell({ children: [new Paragraph(emp.department_name)] }),
                    ]
                }))
            ],
            width: { size: 100, type: WidthType.PERCENTAGE }
        });
        children.push(table);
    }

    const doc = new Document({
        sections: [{
            properties: {},
            children: children,
        }],
    });

};

export const exportPayslipsToPDF = async (data: ExportablePayslip[], filename: string = 'payslips') => {
    const doc = new jsPDF();

    for (let index = 0; index < data.length; index++) {
        const payslip = data[index];
        if (index > 0) doc.addPage();

        // Header - Branding
        try {
            const logoBase64 = await getBase64FromUrl('/sl-logo.png');
            if (logoBase64) {
                doc.addImage(logoBase64, 'PNG', 15, 10, 30, 30);
            }
        } catch (e) {
            console.warn('Could not load logo for PDF export');
        }

        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text('SL AESTHETICS CLINIC', 50, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text('OFFICIAL SALARY STATEMENT • CONFIDENTIAL', 50, 32);

        doc.setDrawColor(226, 232, 240);
        doc.line(15, 45, 195, 45);

        // Employee Details Header
        doc.setFillColor(248, 250, 252);
        doc.rect(15, 50, 180, 25, 'F');

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont('helvetica', 'bold');
        doc.text('EMPLOYEE NAME', 20, 58);
        doc.text('EMPLOYEE ID', 110, 58);
        doc.text('POSITION', 20, 68);
        doc.text('PAY PERIOD', 110, 68);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        doc.text(payslip.employee_name.toUpperCase(), 55, 58);
        doc.text(payslip.employee_code.toUpperCase(), 145, 58);
        doc.text((payslip.designation || 'N/A').toUpperCase(), 55, 68);
        doc.text((payslip.period_name || '').toUpperCase(), 145, 68);

        // Earnings and Deductions Table
        autoTable(doc, {
            startY: 85,
            head: [['EARNINGS', 'AMOUNT', 'DEDUCTIONS', 'AMOUNT']],
            body: [
                ['BASIC SALARY', payslip.basic_salary.toLocaleString(), 'INCOME TAX', payslip.tax_amount.toLocaleString()],
                ['ALLOWANCES', payslip.allowances.toLocaleString(), 'SOCIAL SECURITY (EOBI)', payslip.eobi_amount.toLocaleString()],
                ['OVERTIME / BONUSES', payslip.overtime_amount.toLocaleString(), 'LOAN / ADVANCES', (payslip.loan_deduction + payslip.advance_deduction).toLocaleString()],
                ['', '', 'OTHER DEDUCTIONS', payslip.other_deductions.toLocaleString()],
                ['GROSS EARNINGS', payslip.gross_earnings.toLocaleString(), 'TOTAL DEDUCTIONS', payslip.total_deductions.toLocaleString()],
            ],
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
                1: { halign: 'right' },
                3: { halign: 'right' }
            },
            styles: { fontSize: 9 }
        });

        // Net Pay Section
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(15, finalY, 180, 25, 'F');
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('FINAL NET SALARY', 25, finalY + 15);

        doc.setFontSize(18);
        doc.text(`PKR ${payslip.net_salary.toLocaleString()}`, 185, finalY + 15, { align: 'right' });

        // Footer & Signature
        const signatureY = finalY + 50;

        // Date of issue
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('DATE OF ISSUE', 15, signatureY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text(formatDate(new Date()), 15, signatureY + 5);

        // Contact Info
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text('SL Aesthetics Clinic • Main Plaza, Medical District', 15, signatureY + 15);
        doc.text('Tel: +1 (555) 123-4567 • info@slaesthetics.com', 15, signatureY + 19);

        // Signature Line
        doc.setDrawColor(0);
        doc.line(130, signatureY + 5, 190, signatureY + 5);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('AUTHORITY SIGNATURE', 130, signatureY + 10);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150);
        doc.text('Clinic Director', 130, signatureY - 2);
    }

    doc.save(`${filename}.pdf`);
};

export const exportPayslipsToExcel = async (data: ExportablePayslip[], filename: string = 'payslips') => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payslips');

    // Branding Header
    worksheet.mergeCells('A1:K1');
    const headerCell = worksheet.getCell('A1');
    headerCell.value = 'SL AESTHETICS CLINIC - SALARY STATEMENTS';
    headerCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    headerCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:K2');
    worksheet.getCell('A2').value = `Generated on: ${new Date().toLocaleDateString()}`;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    worksheet.getCell('A2').font = { italic: true, size: 10 };

    worksheet.getRow(4).values = [
        'Employee', 'Code', 'Department', 'Period', 'Basic Salary',
        'Allowances', 'Overtime', 'Gross Earnings', 'Income Tax', 'PF', 'Net Salary'
    ];

    // Style Table Header row (Row 4)
    const headerRow = worksheet.getRow(4);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    });

    worksheet.columns = [
        { key: 'employee_name', width: 25 },
        { key: 'employee_code', width: 15 },
        { key: 'department', width: 20 },
        { key: 'period_name', width: 15 },
        { key: 'basic_salary', width: 15 },
        { key: 'allowances', width: 15 },
        { key: 'overtime_amount', width: 15 },
        { key: 'gross_earnings', width: 15 },
        { key: 'tax_amount', width: 15 },
        { key: 'provident_fund', width: 15 },
        { key: 'net_salary', width: 15 },
    ];

    data.forEach(p => {
        worksheet.addRow(p);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}.xlsx`);
};

export const exportPayslipsToWord = async (data: ExportablePayslip[], filename: string = 'payslips') => {
    const children: any[] = [];

    // Add Clinic Header once at the top if multiple, or inside loop for each page?
    // User probably wants a clean payslip per employee.

    const logoBase64 = await getBase64FromUrl('/sl-logo.png');
    const b64Data = logoBase64.split(',')[1];

    data.forEach((payslip, index) => {
        if (index > 0) {
            children.push(new Paragraph({ children: [new TextRun({ text: "", break: 1 })], pageBreakBefore: true }));
        }

        // Branding
        if (b64Data) {
            children.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new ImageRun({
                            data: Uint8Array.from(atob(b64Data), c => c.charCodeAt(0)),
                            transformation: { width: 80, height: 80 },
                            type: 'png'
                        }),
                    ],
                })
            );
        }

        children.push(
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({ text: "SL AESTHETICS CLINIC", bold: true, size: 36, color: "0F172A" }),
                ],
                spacing: { after: 100 }
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "OFFICIAL SALARY STATEMENT", size: 20, color: "64748B" })],
                spacing: { after: 400 }
            })
        );

        // Info Table
        children.push(
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Employee Name", bold: true })] })] }),
                            new TableCell({ children: [new Paragraph(payslip.employee_name)] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Employee ID", bold: true })] })] }),
                            new TableCell({ children: [new Paragraph(payslip.employee_code)] }),
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Position", bold: true })] })] }),
                            new TableCell({ children: [new Paragraph(payslip.designation || 'N/A')] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Period", bold: true })] })] }),
                            new TableCell({ children: [new Paragraph(payslip.period_name || 'N/A')] }),
                        ]
                    })
                ]
            }),
            new Paragraph({ text: "", spacing: { after: 300 } })
        );

        // Salary Breakdown
        children.push(
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Earnings", bold: true, color: "FFFFFF" })] })], shading: { fill: "059669" } }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Amount", bold: true, color: "FFFFFF" })] })], shading: { fill: "059669" } }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Deductions", bold: true, color: "FFFFFF" })] })], shading: { fill: "D97706" } }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Amount", bold: true, color: "FFFFFF" })] })], shading: { fill: "D97706" } }),
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("Basic Salary")] }),
                            new TableCell({ children: [new Paragraph(payslip.basic_salary.toLocaleString())] }),
                            new TableCell({ children: [new Paragraph("Income Tax")] }),
                            new TableCell({ children: [new Paragraph(payslip.tax_amount.toLocaleString())] }),
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("Allowances")] }),
                            new TableCell({ children: [new Paragraph(payslip.allowances.toLocaleString())] }),
                            new TableCell({ children: [new Paragraph("EOBI")] }),
                            new TableCell({ children: [new Paragraph(payslip.eobi_amount.toLocaleString())] }),
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("Overtime / Bonus")] }),
                            new TableCell({ children: [new Paragraph((payslip.overtime_amount + (payslip as any).bonus_amount || 0).toLocaleString())] }),
                            new TableCell({ children: [new Paragraph("Loan / Advance")] }),
                            new TableCell({ children: [new Paragraph((payslip.loan_deduction + payslip.advance_deduction).toLocaleString())] }),
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "GROSS EARNINGS", bold: true })] })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: payslip.gross_earnings.toLocaleString(), bold: true })] })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL DEDUCTIONS", bold: true })] })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: payslip.total_deductions.toLocaleString(), bold: true })] })] }),
                        ]
                    }),
                ]
            })
        );

        // Net Salary
        children.push(
            new Paragraph({ text: "", spacing: { after: 300 } }),
            new Paragraph({
                children: [
                    new TextRun({ text: "NET SALARY:   ", bold: true, size: 28 }),
                    new TextRun({ text: `PKR ${payslip.net_salary.toLocaleString()}`, bold: true, size: 32, color: "0F172A" })
                ],
                alignment: AlignmentType.RIGHT,
                border: { top: { style: BorderStyle.SINGLE, size: 2, space: 10 }, bottom: { style: BorderStyle.SINGLE, size: 2, space: 10 } }
            }),
            new Paragraph({ text: "", spacing: { after: 600 } })
        );

        // Signature
        children.push(
            new Paragraph({
                children: [
                    new TextRun({ text: "Authority Signature", bold: true, size: 20 }),
                    new TextRun({ text: "\n__________________________", size: 20 })
                ],
                alignment: AlignmentType.RIGHT
            })
        );
    });

    const doc = new Document({
        sections: [{
            properties: {},
            children: children,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${filename}.docx`);
};

export const exportContractToPDF = async (employeeName: string, contract: any) => {
    const doc = new jsPDF();

    // Branding & Header
    try {
        const logoBase64 = await getBase64FromUrl('/sl-logo.png');
        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', 15, 10, 25, 25);
        }
    } catch (e) {
        console.warn('Could not load logo for contract PDF');
    }

    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('SL AESTHETICS CLINIC', 45, 22);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('OFFICIAL EMPLOYMENT DOCUMENT', 45, 28);

    doc.setDrawColor(200);
    doc.line(15, 40, 195, 40);

    // Document Title
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    const title = contract.contract_type === 'employment_contract'
        ? 'LETTER OF APPOINTMENT'
        : 'MEMORANDUM OF UNDERSTANDING';
    doc.text(title, 105, 55, { align: 'center' });

    // Body
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50);

    let yPos = 70;
    const margin = 15;
    const pageWidth = 210 - (margin * 2);

    const addText = (text: string, isBold: boolean = false) => {
        if (isBold) doc.setFont('helvetica', 'bold');
        else doc.setFont('helvetica', 'normal');

        const lines = doc.splitTextToSize(text, pageWidth);
        doc.text(lines, margin, yPos);
        yPos += (lines.length * 6) + 4;
    };

    addText(`Date: ${formatDate(new Date())}`);
    addText(`To: ${employeeName}`, true);
    addText(`Subject: Formalization of Agreement`, true);

    yPos += 5;

    const introText = contract.contract_type === 'employment_contract'
        ? `We are pleased to offer you employment at SL Aesthetics Clinic. This document outlines the terms and conditions of your engagement.`
        : `This Memorandum of Understanding (MOU) establishes the collaborative relationship between SL Aesthetics Clinic and ${employeeName}.`;

    addText(introText);

    // Terms Table
    autoTable(doc, {
        startY: yPos + 5,
        body: [
            ['Contract Type', contract.contract_type.replace('_', ' ').toUpperCase()],
            ['Start Date', formatDate(contract.start_date)],
            ['End Date', contract.end_date ? formatDate(contract.end_date) : 'Indefinite / TBD'],
            ['Salary Basis', contract.salary_basis ? `Rs. ${contract.salary_basis.toLocaleString()}` : 'Negotiated'],
            ['Status', contract.status.toUpperCase()]
        ],
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 50 }
        }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    addText('General Terms:', true);
    addText('1. This document serves as a binding record of the agreement between the parties.');
    addText('2. All activities must strictly adhere to the clinic\'s internal policies and SOPs.');
    addText('3. Confidentiality of client data and clinic procedures must be maintained at all times.');

    if (yPos > 240) {
        doc.addPage();
        yPos = 20;
    }

    // Signatures
    yPos = Math.max(yPos, 230);
    doc.line(15, yPos, 80, yPos);
    doc.line(130, yPos, 195, yPos);

    doc.setFontSize(9);
    doc.text('Authorized Signature', 15, yPos + 5);
    doc.text('Employee Signature', 130, yPos + 5);

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Harmony HR Suite • Generated Document', 105, 285, { align: 'center' });

    doc.save(`${employeeName.replace(/\s+/g, '_')}_${contract.contract_type}.pdf`);
};

export const exportExperienceLetterToPDF = async (employeeName: string, employeeData: any) => {
    const doc = new jsPDF();

    // Branding & Header
    try {
        const logoBase64 = await getBase64FromUrl('/sl-logo.png');
        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', 15, 10, 25, 25);
        }
    } catch (e) {
        console.warn('Could not load logo for experience letter');
    }

    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('SL AESTHETICS CLINIC', 45, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('OFFICIAL WORK EXPERIENCE CERTIFICATE', 45, 32);

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 45, 195, 45);

    // Document Title
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('EXPERIENCE CERTIFICATE', 105, 65, { align: 'center' });

    // Body
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30);

    let yPos = 85;
    const margin = 20;
    const pageWidth = 210 - (margin * 2);

    const addText = (text: string, isBold: boolean = false, align: 'left' | 'center' | 'justify' = 'left') => {
        if (isBold) doc.setFont('helvetica', 'bold');
        else doc.setFont('helvetica', 'normal');

        const lines = doc.splitTextToSize(text, pageWidth);
        if (align === 'center') {
            doc.text(lines, 105, yPos, { align: 'center' });
        } else {
            doc.text(lines, margin, yPos);
        }
        yPos += (lines.length * 7) + 2;
    };

    addText(`Date: ${formatDate(new Date())}`);
    yPos += 10;

    addText(`TO WHOM IT MAY CONCERN`, true, 'center');
    yPos += 10;

    const joiningDate = formatDate(employeeData.joining_date);
    const endDate = employeeData.end_date ? formatDate(employeeData.end_date) : formatDate(new Date());

    const bodyContent = `This is to certify that ${employeeName} s/o d/o ${employeeData.father_name || "________________"} has been employed with SL Aesthetics Clinic from ${joiningDate} to ${endDate}.`;
    addText(bodyContent);

    const roleContent = `During this tenure, ${employeeName} served in the capacity of ${employeeData.designation || "Employee"}. Throughout the period of employment, ${employeeName} demonstrated high levels of professionalism, integrity, and dedication to the assigned responsibilities.`;
    addText(roleContent);

    const closingContent = `We found ${employeeName} to be a diligent and result-oriented individual with a positive attitude towards work and colleagues. ${employeeName} is leaving the clinic on their own accord for better prospects.`;
    addText(closingContent);

    addText(`We wish ${employeeName} every success in all future endeavors.`);

    // Signatures
    yPos = 230;
    doc.setDrawColor(30, 41, 59);
    doc.line(120, yPos, 190, yPos);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Clinic Director', 120, yPos + 7);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('SL Aesthetics Clinic', 120, yPos + 12);
    doc.text('Authorized Signatory', 120, yPos + 17);

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Verification Code: ' + Math.random().toString(36).substring(2, 10).toUpperCase(), 15, 285);
    doc.text('Harmony HR Suite • Document Management System', 105, 285, { align: 'center' });

    doc.save(`${employeeName.replace(/\s+/g, '_')}_Experience_Certificate.pdf`);
};
