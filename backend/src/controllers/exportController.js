/* eslint-disable no-unused-vars */
// controllers/exportController.js
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { findDepartmentsByEvent } from '../services/departmentService.js';
import { countDepartmentMembersIncludingHoOC, getMemberInformationForExport } from '../services/eventMemberService.js'
import { getAgendaByEvent } from '../services/agendaService.js';
import { getAllOccurredRisksByEvent, getAllRisksByEventWithoutPagination } from '../services/riskService.js';
import { listMilestonesByEvent } from '../services/milestoneService.js';
import event from '../models/event.js';
export const exportSingleItem = async (req, res) => {
  try {
    const { eventId, itemId } = req.params;
    const { subItems = [] } = req.body;

    console.log(`🚀 Starting export: ${itemId} for event: ${eventId}`);

    const workbook = new ExcelJS.Workbook();
    let filename;

    switch (itemId) {
      case 'team':
        await createDepartmentSheets(workbook, eventId, subItems);
        filename = `Danh_sach_Ban_${eventId}_${Date.now()}.xlsx`;
        break;

      case 'members':
        await createMemberSheets(workbook, eventId, subItems);
        filename = `Danh_sach_Thanh_vien_${eventId}_${Date.now()}.xlsx`;
        break;
        
      case 'agenda':
        await createAgendaSheets(workbook, eventId, subItems);
        filename = `Agenda_Su_Kien_${eventId}_${Date.now()}.xlsx`;
        break;
        
      case 'risks':
        await createRiskSheets(workbook, eventId, subItems);
        filename = `Rui_ro_Su_kien_${eventId}_${Date.now()}.xlsx`;
        break;
        
      case 'timeline':
        await createTimelineSheets(workbook, eventId, subItems);
        filename = `Timeline_Su_kien_${eventId}_${Date.now()}.xlsx`;
        break;
        
      case 'incidents': // Changed from 'issues' to 'incidents'
        await createIncidentSheets(workbook, eventId, subItems);
        filename = `Su_co_Su_kien_${eventId}_${Date.now()}.xlsx`;
        break;
        
      default:
        return res.status(400).json({ error: 'Loại dữ liệu không hợp lệ' });
    }

    // Đặt header trả file về client (download luôn)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    await workbook.xlsx.write(res);
    res.end();
    console.log(` Export completed: ${filename}`);

  } catch (error) {
    console.error('❌ Export error:', error);
    res.status(500).json({ error: 'Xuất dữ liệu thất bại', details: error.message });
  }
};

// Map itemId to export config
const getItemExportConfig = (itemId, eventId) => {
  const configMap = {
    'team': { filename: `Danh_sach_Ban_${eventId}.xlsx`, createFn: createDepartmentSheets },
    'members': { filename: `Danh_sach_Thanh_vien_${eventId}.xlsx`, createFn: createMemberSheets },
    'timeline': { filename: `Timeline_Su_kien_${eventId}.xlsx`, createFn: createTimelineSheets },
    'agenda': { filename: `Agenda_Su_Kien_${eventId}.xlsx`, createFn: createAgendaSheets },
    'risks': { filename: `Rui_ro_Su_kien_${eventId}.xlsx`, createFn: createRiskSheets },
    'incidents': { filename: `Su_co_Su_kien_${eventId}.xlsx`, createFn: createIncidentSheets }
  };
  return configMap[itemId];
};

export const exportAllItemsZip = async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log(`🚀 Starting export all items as ZIP for event: ${eventId}`);

    // Định nghĩa danh sách các items cần export
    const itemsToExport = [
      { itemId: 'team', ...getItemExportConfig('team', eventId) },
      { itemId: 'members', ...getItemExportConfig('members', eventId) },
      { itemId: 'timeline', ...getItemExportConfig('timeline', eventId) },
      { itemId: 'agenda', ...getItemExportConfig('agenda', eventId) },
      { itemId: 'risks', ...getItemExportConfig('risks', eventId) },
      { itemId: 'incidents', ...getItemExportConfig('incidents', eventId) }
    ];

    // Set headers cho file ZIP
    const zipFilename = `Tat_Ca_Du_Lieu_${eventId}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    // Tạo archive zip
    const archive = archiver('zip', {
      zlib: { level: 9 } // Mức độ nén cao nhất
    });

    // Pipe archive vào response
    archive.pipe(res);

    // Xử lý lỗi archive
    archive.on('error', (err) => {
      console.error('❌ Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Lỗi khi tạo file ZIP', details: err.message });
      } else {
        res.end();
      }
    });

    // Xử lý khi archive hoàn thành
    archive.on('end', () => {
      console.log(`✅ ZIP export completed: ${zipFilename}`);
    });

    // Xử lý khi response kết thúc
    res.on('close', () => {
      console.log(`✅ Response closed for ZIP: ${zipFilename}`);
    });

    // Tạo từng file Excel và thêm vào archive
    for (const { itemId, filename, createFn } of itemsToExport) {
      try {
        console.log(`📄 Creating ${itemId}...`);
        const workbook = new ExcelJS.Workbook();
        await createFn(workbook, eventId, []); // subItems rỗng cho export all
        
        // Chuyển workbook thành buffer
        const buffer = await workbook.xlsx.writeBuffer();
        
        // Thêm file vào archive
        archive.append(buffer, { name: filename });
        console.log(`✅ Added ${filename} to ZIP`);
      } catch (itemError) {
        console.error(`❌ Error creating ${itemId}:`, itemError);
        // Tiếp tục với các items khác nếu một item lỗi
      }
    }

    // Finalize archive (gửi tất cả dữ liệu)
    // finalize() không phải async, nó trigger event 'end' khi hoàn thành
    archive.finalize();

  } catch (error) {
    console.error('❌ Export ZIP error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Xuất dữ liệu ZIP thất bại', details: error.message });
    } else {
      res.end();
    }
  }
};

export const exportSelectedItemsZip = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { itemIds = [] } = req.body; // Nhận danh sách itemIds từ body

    if (!itemIds || itemIds.length === 0) {
      return res.status(400).json({ error: 'Vui lòng chọn ít nhất một mục để xuất' });
    }

    console.log(`🚀 Starting export selected items as ZIP for event: ${eventId}`, itemIds);

    // Lọc và tạo danh sách items cần export dựa trên itemIds được chọn
    const itemsToExport = itemIds
      .map(itemId => {
        const config = getItemExportConfig(itemId, eventId);
        if (!config) {
          console.warn(`⚠️ Unknown itemId: ${itemId}`);
          return null;
        }
        return { itemId, ...config };
      })
      .filter(item => item !== null);

    if (itemsToExport.length === 0) {
      return res.status(400).json({ error: 'Không có mục hợp lệ để xuất' });
    }

    // Set headers cho file ZIP
    const zipFilename = `Du_Lieu_Da_Chon_${eventId}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    // Tạo archive zip
    const archive = archiver('zip', {
      zlib: { level: 9 } // Mức độ nén cao nhất
    });

    // Pipe archive vào response
    archive.pipe(res);

    // Xử lý lỗi archive
    archive.on('error', (err) => {
      console.error('❌ Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Lỗi khi tạo file ZIP', details: err.message });
      } else {
        res.end();
      }
    });

    // Xử lý khi archive hoàn thành
    archive.on('end', () => {
      console.log(`✅ ZIP export completed: ${zipFilename}`);
    });

    // Xử lý khi response kết thúc
    res.on('close', () => {
      console.log(`✅ Response closed for ZIP: ${zipFilename}`);
    });

    // Tạo từng file Excel và thêm vào archive
    for (const { itemId, filename, createFn } of itemsToExport) {
      try {
        console.log(`📄 Creating ${itemId}...`);
        const workbook = new ExcelJS.Workbook();
        await createFn(workbook, eventId, []); // subItems rỗng cho export selected
        
        // Chuyển workbook thành buffer
        const buffer = await workbook.xlsx.writeBuffer();
        
        // Thêm file vào archive
        archive.append(buffer, { name: filename });
        console.log(`✅ Added ${filename} to ZIP`);
      } catch (itemError) {
        console.error(`❌ Error creating ${itemId}:`, itemError);
        // Tiếp tục với các items khác nếu một item lỗi
      }
    }

    // Finalize archive (gửi tất cả dữ liệu)
    archive.finalize();

  } catch (error) {
    console.error('❌ Export selected ZIP error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Xuất dữ liệu ZIP thất bại', details: error.message });
    } else {
      res.end();
    }
  }
};

const createDepartmentSheets = async (workbook, eventId, subItems) => {
  if (subItems.includes('department-list') || subItems.length === 0) {
    const worksheet = workbook.addWorksheet('Department');

    // Set column widths theo template
    worksheet.getColumn('A').width = 3.63;  // #
    worksheet.getColumn('B').width = 15;    // Tên ban
    worksheet.getColumn('C').width = 40; // Miêu tả
    worksheet.getColumn('D').width = 20; // Số lượng thành viên
    worksheet.getColumn('E').width = 50;    // Trưởng ban (tăng width cho email)
    worksheet.getColumn('F').width = 15;    // Ghi chú

    const departments = await getDepartmentData(eventId);

    // ROW 1: Title - merge A1:F1
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Danh sách thông tin ban sự kiện';
    titleCell.font = {
      name: 'Roboto',
      size: 14,  // Header size 14
      bold: true
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6B8AF' } // Màu nâu nhạt từ template
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    // ROW 2: Headers
    const headerRow = worksheet.getRow(2);
    headerRow.height = 20;

    const headers = ['#', 'Tên ban', 'Miêu tả', 'Số lượng thành viên', 'Trưởng ban', 'Ghi chú'];
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = {
        name: 'Roboto',
        size: 11  // Header size 14
      };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // ROW 3+: Data rows
    let totalMembers = 0;
    departments.forEach((dept, index) => {
      const row = worksheet.getRow(index + 3);
      row.height = 20;

      // STT - chỉ hiển thị cho 6 dòng đầu theo template
      if (index < 6) {
        row.getCell(1).value = index + 1;
      }

      row.getCell(2).value = dept.name || '';
      row.getCell(3).value = dept.description || '';
      row.getCell(4).value = dept.memberCount || 0;

      // Trưởng ban với email
      const leaderText = dept.leaderName
        ? (dept.leaderEmail
          ? `${dept.leaderName} (${dept.leaderEmail})`
          : dept.leaderName)
        : '';
      row.getCell(5).value = leaderText;

      row.getCell(6).value = ''; // Ghi chú để trống

      // Style cho data cells
      for (let col = 1; col <= 6; col++) {
        const cell = row.getCell(col);
        cell.font = {
          name: 'Roboto',
          size: 11  // Data size 11
        };
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };

        // Alignment
        if (col === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }

      totalMembers += dept.memberCount || 0;
    });

    // LAST ROW: Summary với merge cells A:D và E:F theo template
    const summaryRowNum = departments.length + 3;
    const summaryRow = worksheet.getRow(summaryRowNum);
    summaryRow.height = 20;

    // Merge A:D cho "Tổng cộng"
    worksheet.mergeCells(summaryRowNum, 1, summaryRowNum, 4);
    const totalCell = summaryRow.getCell(1);
    totalCell.value = 'Tổng số lượng thành viên và ban';
    totalCell.font = {
      name: 'Roboto',
      size: 11,  // Summary header size 14
      bold: true
    };
    totalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6B8AF' }
    };
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    // Merge E:F cho summary text
    worksheet.mergeCells(summaryRowNum, 5, summaryRowNum, 6);
    const summaryCell = summaryRow.getCell(5);
    summaryCell.value = `${departments.length} ban với ${totalMembers} thành viên`;
    summaryCell.font = {
      name: 'Roboto',
      size: 11  // Summary data size 11
    };
    summaryCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summaryCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    console.log(` Created department sheet with ${departments.length} records`);
  }

  if (subItems.includes('department-members')) {
    await createDepartmentMembersSheet(workbook, eventId);
  }

  if (subItems.includes('department-structure')) {
    await createDepartmentStructureSheet(workbook, eventId);
  }
};

const createMemberSheets = async (workbook, eventId, subItems) => {
  if (subItems.includes('members-all') || subItems.length === 0) {
    const worksheet = workbook.addWorksheet('Member');

    // Set column widths theo template
    worksheet.getColumn('A').width = 3.63;  // #
    worksheet.getColumn('B').width = 40;    // Email
    worksheet.getColumn('C').width = 15;    // Số điện thoại
    worksheet.getColumn('D').width = 20;    // Họ và tên
    worksheet.getColumn('E').width = 15;    // Ban
    worksheet.getColumn('F').width = 20;    // Mã số sinh viên
    worksheet.getColumn('G').width = 15;    // Ngày sinh
    worksheet.getColumn('H').width = 15;    // Ghi chú

    const members = await getMemberData(eventId);

    // ROW 1: Title - merge A1:H1
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Danh sách thành viên Ban tổ chức';
    titleCell.font = {
      name: 'Roboto',
      size: 14,
      bold: true
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6B8AF' }
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    // ROW 2: Headers
    const headerRow = worksheet.getRow(2);
    headerRow.height = 20;

    const headers = ['#', 'Email', 'Số điện thoại', 'Họ và tên', 'Ban', 'Mã số sinh viên', 'Ngày sinh', 'Ghi chú'];
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = {
        name: 'Roboto',
        size: 11
      };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // ROW 3+: Data rows
    members.forEach((member, index) => {
      const row = worksheet.getRow(index + 3);
      row.height = 20;

      row.getCell(1).value = index + 1; // STT
      row.getCell(2).value = member.email || '';
      row.getCell(3).value = formatPhoneNumber(member.phone) || '';
      row.getCell(4).value = member.fullName || '';
      row.getCell(5).value = member.departmentName || '';
      row.getCell(6).value = member.studentId || '';
      row.getCell(7).value = member.birthDate || '';
      row.getCell(8).value = '';

      // Style cho data cells
      for (let col = 1; col <= 8; col++) {
        const cell = row.getCell(col);
        cell.font = {
          name: 'Roboto',
          size: 11
        };
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };

        // Alignment
        if (col === 1) { // STT center
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }
    });

    // LAST ROW: Summary với merge cells A:C và D:H theo template
    const summaryRowNum = members.length + 3;
    const summaryRow = worksheet.getRow(summaryRowNum);
    summaryRow.height = 20;

    // Merge A:C cho "Tổng cộng"
    worksheet.mergeCells(summaryRowNum, 1, summaryRowNum, 3);
    const totalCell = summaryRow.getCell(1);
    totalCell.value = 'Tổng số lượng thành viên';
    totalCell.font = {
      name: 'Roboto',
      size: 11,
      bold: true
    };
    totalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6B8AF' }
    };
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    // Merge D:H cho summary text
    worksheet.mergeCells(summaryRowNum, 4, summaryRowNum, 8);
    const summaryCell = summaryRow.getCell(4);
    summaryCell.value = `${members.length} thành viên`;
    summaryCell.font = {
      name: 'Roboto',
      size: 11
    };
    summaryCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summaryCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    console.log(` Created members sheet with ${members.length} records`);
  }

};

const createRiskSheets = async (workbook, eventId, subItems) => {
  if (subItems.includes('risks-all') || subItems.length === 0) {
    const worksheet = workbook.addWorksheet('Rủi ro của sự kiện');

    // Set column widths theo template
    worksheet.getColumn('A').width = 3.63;  // #
    worksheet.getColumn('B').width = 20;    // Danh mục
    worksheet.getColumn('C').width = 15;    // Ban phụ trách
    worksheet.getColumn('D').width = 30;    // Vấn đề
    worksheet.getColumn('E').width = 35;    // Phương án giảm thiểu rủi ro
    worksheet.getColumn('F').width = 35;    // Phương án giải quyết
    worksheet.getColumn('G').width = 15;    // Mức độ ảnh hưởng
    worksheet.getColumn('H').width = 15;    // Khả năng xảy ra
    worksheet.getColumn('I').width = 20;    // Số lượng sự cố đã xảy ra
    worksheet.getColumn('J').width = 15;    // Ghi chú (nếu có)

    const risks = await getRiskData(eventId);

    // ROW 1: Title - merge A1:J1
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Kế hoạch phòng ngừa rủi ro';
    titleCell.font = {
      name: 'Roboto',
      size: 14,
      bold: true
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6B8AF' }
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    // ROW 2: Headers
    const headerRow = worksheet.getRow(2);
    headerRow.height = 20;

    const headers = [
      '#',
      'Danh mục',
      'Ban phụ trách',
      'Vấn đề',
      'Phương án giảm thiểu rủi ro',
      'Phương án giải quyết',
      'Mức độ ảnh hưởng',
      'Khả năng xảy ra',
      'Số lượng sự cố đã xảy ra',
      'Ghi chú'
    ];

    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = {
        name: 'Roboto',
        size: 11
      };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // ROW 3+: Data rows
    let totalIncidents = 0;
    risks.forEach((risk, index) => {
      const row = worksheet.getRow(index + 3);
      row.height = 20;

      row.getCell(1).value = index + 1; // STT
      row.getCell(2).value = translateRiskCategory(risk.risk_category);
      row.getCell(3).value = risk.departmentName || 'Tất cả';
      row.getCell(4).value = risk.name || '';
      row.getCell(5).value = risk.risk_mitigation_plan || '';
      row.getCell(6).value = risk.risk_response_plan || '';
      row.getCell(7).value = translateImpactLevel(risk.impact);
      row.getCell(8).value = translateLikelihoodLevel(risk.likelihood);
      row.getCell(9).value = risk.occurredCount || 0;
      row.getCell(10).value = risk.note || '';
      // Style cho data cells
      for (let col = 1; col <= 10; col++) {
        const cell = row.getCell(col);
        cell.font = {
          name: 'Roboto',
          size: 11
        };
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };

        // Alignment
        if (col === 1 || col === 10) { // STT và số lượng sự cố center
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }

      totalIncidents += risk.occurredCount || 0;
    });

    // LAST ROW: Summary với merge cells A:G và H:J theo template
    const summaryRowNum = risks.length + 3;
    const summaryRow = worksheet.getRow(summaryRowNum);
    summaryRow.height = 20;

    // Merge A:G cho "Tổng cộng"
    worksheet.mergeCells(summaryRowNum, 1, summaryRowNum, 7);
    const totalCell = summaryRow.getCell(1);
    totalCell.value = 'Tổng số rủi ro và sự cố đã xảy ra';
    totalCell.font = {
      name: 'Roboto',
      size: 11,
      bold: true
    };
    totalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6B8AF' }
    };
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    // Merge H:J cho summary text
    worksheet.mergeCells(summaryRowNum, 8, summaryRowNum, 10);
    const summaryCell = summaryRow.getCell(8);
    summaryCell.value = `${risks.length} rủi ro và ${totalIncidents} sự cố`;
    summaryCell.font = {
      name: 'Roboto',
      size: 11
    };
    summaryCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summaryCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    console.log(`✅ Created risks sheet with ${risks.length} risks and ${totalIncidents} total incidents`);
  }
};

const createAgendaSheets = async (workbook, eventId, subItems) => {
  const agendas = await getAgendaByEvent(eventId);
  if (!agendas || agendas.length === 0) {
    // Tạo sheet placeholder nếu không có agenda
    const worksheet = workbook.addWorksheet('Agenda - Trống');
    createEmptyAgendaSheet(worksheet);
    return;
  }

  agendas.forEach((agendaData, idx) => {
    let sheetName;
    if (agendaData.milestoneId && agendaData.milestoneId.name) {
      sheetName = agendaData.milestoneId.name;
    } else {
      sheetName = `Mốc ${idx + 1}`;
    }
    createSingleAgendaSheet(workbook, agendaData, sheetName);
  });

  // Nếu cần sheet tổng hợp, giữ nguyên logic cũ
  if (subItems.includes('timeline-full') || subItems.length === 0) {
    await createMainAgendaSheet(workbook, agendas);
  }
};

const createSingleAgendaSheet = async (workbook, agendaData, sheetName) => {
  const worksheet = workbook.addWorksheet(sheetName);

  // Set column widths
  worksheet.getColumn('A').width = 3.63;  // #
  worksheet.getColumn('B').width = 15;    // Ngày
  worksheet.getColumn('C').width = 20;    // Thời gian
  worksheet.getColumn('D').width = 15;    // Thời lượng
  worksheet.getColumn('E').width = 40;    // Nội dung
  worksheet.getColumn('F').width = 15;    // Ghi chú

  // ROW 1: Title - merge A1:F1
  worksheet.mergeCells('A1:F1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = sheetName;
  titleCell.font = {
    name: 'Roboto',
    size: 14,
    bold: true
  };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6B8AF' }
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' }
  };

  // ROW 2: Headers
  const headerRow = worksheet.getRow(2);
  headerRow.height = 20;

  const headers = ['#', 'Ngày', 'Thời gian', 'Thời lượng', 'Nội dung', 'Ghi chú'];
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = {
      name: 'Roboto',
      size: 11
    };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // ROW 3+: Data rows
  const agendaItems = processAgendaData(agendaData.agenda);

  agendaItems.forEach((item, index) => {
    const row = worksheet.getRow(index + 3);
    row.height = 20;

    row.getCell(1).value = index + 1; // STT
    row.getCell(2).value = formatDate(item.date);
    row.getCell(3).value = item.timeRange || '';
    row.getCell(4).value = item.duration || '';
    row.getCell(5).value = item.content || '';
    row.getCell(6).value = ''; // Ghi chú để trống

    // Style cho data cells
    for (let col = 1; col <= 6; col++) {
      const cell = row.getCell(col);
      cell.font = {
        name: 'Roboto',
        size: 11
      };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };

      // Alignment
      if (col === 1) { // STT center
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    }
  });

  console.log(`✅ Created agenda sheet: ${sheetName} with ${agendaItems.length} items`);
};

const createIncidentSheets = async (workbook, eventId, subItems) => {
  if (subItems.includes('incidents-all') || subItems.length === 0) {
    const worksheet = workbook.addWorksheet('Sự cố');

    // Set column widths theo template
    worksheet.getColumn('A').width = 3.63;  // #
    worksheet.getColumn('B').width = 20;    // Sự cố
    worksheet.getColumn('C').width = 15;    // Thuộc rủi ro
    worksheet.getColumn('D').width = 20;    // Thời gian
    worksheet.getColumn('E').width = 20;    // Địa điểm
    worksheet.getColumn('F').width = 35;    // Mô tả
    worksheet.getColumn('G').width = 30;    // Người xử lý
    worksheet.getColumn('H').width = 35;    // Hành động xử lý
    worksheet.getColumn('I').width = 30;    // Người ghi nhận
    worksheet.getColumn('J').width = 15;    // Extra column

    const incidents = await getIncidentData(eventId);
    // ROW 1: Title - merge A1:J1
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Sự cố đã xảy ra trong sự kiện';
    titleCell.font = {
      name: 'Roboto',
      size: 14,
      bold: true
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6B8AF' }
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    // ROW 2: Headers
    const headerRow = worksheet.getRow(2);
    headerRow.height = 20;

    const headers = [
      '#',
      'Sự cố',
      'Thuộc rủi ro',
      'Thời gian',
      'Địa điểm',
      'Mô tả',
      'Người xử lý',
      'Hành động xử lý',
      'Người ghi nhận',
      'Ghi chú'

    ];

    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = {
        name: 'Roboto',
        size: 11
      };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // ROW 3+: Data rows
    incidents.forEach((incident, index) => {
      const row = worksheet.getRow(index + 3);
      row.height = 20;

      row.getCell(1).value = index + 1; // STT
      row.getCell(2).value = incident.occurred_name || '';
      row.getCell(3).value = translateRiskCategory(incident.risk_category) || '';
      row.getCell(4).value = formatIncidentDateTime(incident.occurred_date);
      row.getCell(5).value = incident.occurred_location || '';
      row.getCell(6).value = incident.occurred_description || '';
      row.getCell(7).value = formatPerson(incident.resolve_personName, incident.departmentName);
      row.getCell(8).value = incident.resolve_action || '';
      row.getCell(9).value = formatPerson(incident.update_personName, incident.departmentName);
      row.getCell(10).value = incident.note || '';

      // Style cho data cells
      for (let col = 1; col <= 10; col++) {
        const cell = row.getCell(col);
        cell.font = {
          name: 'Roboto',
          size: 11
        };
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };

        // Alignment
        if (col === 1) { // STT center
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }
    });

    // LAST ROW: Summary với merge cells A:G và H:J theo template
    const summaryRowNum = incidents.length + 3;
    const summaryRow = worksheet.getRow(summaryRowNum);
    summaryRow.height = 20;

    // Merge A:G cho "Tổng cộng"
    worksheet.mergeCells(summaryRowNum, 1, summaryRowNum, 7);
    const totalCell = summaryRow.getCell(1);
    totalCell.value = 'Tổng số sự cố đã xảy ra trong sự kiện';
    totalCell.font = {
      name: 'Roboto',
      size: 11,
      bold: true
    };
    totalCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6B8AF' }
    };
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    // Merge H:J cho summary text
    worksheet.mergeCells(summaryRowNum, 8, summaryRowNum, 10);
    const summaryCell = summaryRow.getCell(8);
    summaryCell.value = `${incidents.length} sự cố`;
    summaryCell.font = {
      name: 'Roboto',
      size: 11
    };
    summaryCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summaryCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    console.log(`✅ Created incidents sheet with ${incidents.length} incidents`);
  }
};

const getIncidentData = async (eventId) => {
  try {
    console.log(`🔍 Fetching incident data for event: ${eventId}`);

    // Sử dụng function getAllOccurredRisksByEvent
    const result = await getAllOccurredRisksByEvent(eventId);

    if (!result.success || !result.data) {
      console.log('⚠️ No incident data found');
      return [];
    }

    const formattedIncidents = result.data.map(incident => ({
      _id: incident._id,
      occurred_name: incident.occurred_name,
      occurred_location: incident.occurred_location,
      occurred_date: incident.occurred_date,
      occurred_description: incident.occurred_description,
      occurred_status: incident.occurred_status,
      resolve_action: incident.resolve_action || 'Chưa có hành động',
      departmentName: incident.departmentName,
      riskName: incident.riskName,
      risk_id: incident.risk_id,
      risk_category: getRiskCategoryFromName(incident.riskName),
      resolve_personName: incident.resolve_personName,
      update_personName: incident.update_personName,
      note: incident.note || '' // Lấy giá trị note
    }));

    console.log(`✅ Processed ${formattedIncidents.length} incidents for export`);
    return formattedIncidents;

  } catch (error) {
    console.error('❌ Error fetching incident data:', error);
    return [];
  }
};


// Helper functions
const formatIncidentDateTime = (date) => {
  if (!date) return '';

  const d = new Date(date);
  return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${d.toLocaleDateString('vi-VN')}`;
};

const formatPerson = (personName, departmentName) => {
  if (!personName || personName === 'Chưa xác định') {
    return departmentName ? `Chưa xác định (${departmentName})` : 'Chưa xác định';
  }

  return departmentName ? `${personName} (${departmentName})` : personName;
};

const getRiskCategoryFromName = (riskName) => {
  if (!riskName) return 'others';

  const lowerName = riskName.toLowerCase();

  // Mapping theo các từ khóa trong tên risk
  if (lowerName.includes('thiết bị') || lowerName.includes('âm thanh') ||
    lowerName.includes('loa') || lowerName.includes('micro') ||
    lowerName.includes('cơ sở vật chất')) {
    return 'infrastructure';
  }

  if (lowerName.includes('thời tiết') || lowerName.includes('mưa') ||
    lowerName.includes('nắng') || lowerName.includes('gió')) {
    return 'weather';
  }

  if (lowerName.includes('mc') || lowerName.includes('nhân sự') ||
    lowerName.includes('nhân viên') || lowerName.includes('khách mời')) {
    return 'mc-guests';
  }

  if (lowerName.includes('an ninh') || lowerName.includes('tranh cãi') ||
    lowerName.includes('bảo vệ')) {
    return 'security';
  }

  if (lowerName.includes('truyền thông') || lowerName.includes('internet') ||
    lowerName.includes('livestream') || lowerName.includes('mạng')) {
    return 'communication';
  }

  return 'others';
};


const processAgendaData = (agendaArray) => {
  const items = [];

  if (!agendaArray || agendaArray.length === 0) return items;

  agendaArray.forEach(dayAgenda => {
    if (dayAgenda.items && dayAgenda.items.length > 0) {
      // Sort items by start time
      const sortedItems = dayAgenda.items.sort((a, b) =>
        new Date(a.startTime) - new Date(b.startTime)
      );

      sortedItems.forEach(item => {
        items.push({
          date: dayAgenda.date,
          timeRange: formatTimeRange(item.startTime, item.endTime),
          duration: formatDuration(item.duration),
          content: item.content || '',
          startTime: item.startTime,
          endTime: item.endTime
        });
      });
    }
  });

  // Sort all items by date and time
  items.sort((a, b) => {
    const dateCompare = new Date(a.date) - new Date(b.date);
    if (dateCompare !== 0) return dateCompare;
    return new Date(a.startTime) - new Date(b.startTime);
  });

  return items;
};

const formatTimeRange = (startTime, endTime) => {
  if (!startTime || !endTime) return '';

  const start = new Date(startTime);
  const end = new Date(endTime);

  const formatTime = (date) => {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return `${formatTime(start)} - ${formatTime(end)}`;
};

const formatDuration = (durationMs) => {
  if (!durationMs || durationMs <= 0) return '';

  const minutes = Math.floor(durationMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    if (remainingMinutes > 0) {
      return `${hours} giờ ${remainingMinutes} phút`;
    }
    return `${hours} giờ`;
  }
  return `${minutes} phút`;
};

const createMainAgendaSheet = async (workbook, agendas) => {
  const worksheet = workbook.addWorksheet('Agenda Tổng hợp');

  // Set column widths
  worksheet.getColumn('A').width = 3.63;
  worksheet.getColumn('B').width = 20;   // Milestone
  worksheet.getColumn('C').width = 15;   // Ngày
  worksheet.getColumn('D').width = 20;   // Thời gian
  worksheet.getColumn('E').width = 15;   // Thời lượng
  worksheet.getColumn('F').width = 40;   // Nội dung
  worksheet.getColumn('G').width = 15;   // Ghi chú

  // ROW 1: Title
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'Agenda Tổng hợp Sự kiện';
  titleCell.font = { name: 'Roboto', size: 14, bold: true };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' }
  };

  // ROW 2: Headers
  const headerRow = worksheet.getRow(2);
  headerRow.height = 20;

  const headers = ['#', 'Milestone', 'Ngày', 'Thời gian', 'Thời lượng', 'Nội dung', 'Ghi chú'];
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { name: 'Roboto', size: 11 };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // Tổng hợp tất cả items
  const allItems = [];
  agendas.forEach(agendaData => {
    if (agendaData.agenda && agendaData.agenda.length > 0) {
      const items = processAgendaData(agendaData.agenda);
      items.forEach(item => {
        allItems.push({
          ...item,
          milestoneName: agendaData.milestoneId?.name || 'Không có tên'
        });
      });
    }
  });

  // Sort by date and time
  allItems.sort((a, b) => {
    const dateCompare = new Date(a.date) - new Date(b.date);
    if (dateCompare !== 0) return dateCompare;
    return new Date(a.startTime) - new Date(b.startTime);
  });

  // Add data rows
  allItems.forEach((item, index) => {
    const row = worksheet.getRow(index + 3);
    row.height = 20;

    row.getCell(1).value = index + 1;
    row.getCell(2).value = item.milestoneName;
    row.getCell(3).value = formatDate(item.date);
    row.getCell(4).value = item.timeRange;
    row.getCell(5).value = item.duration;
    row.getCell(6).value = item.content;
    row.getCell(7).value = '';

    // Style data cells
    for (let col = 1; col <= 7; col++) {
      const cell = row.getCell(col);
      cell.font = { name: 'Roboto', size: 11 };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };

      if (col === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    }
  });

  console.log(`✅ Created main agenda sheet with ${allItems.length} total items`);
};

const createEmptyAgendaSheet = (worksheet) => {
  worksheet.mergeCells('A1:F1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'Chưa có agenda nào được tạo';
  titleCell.font = { name: 'Roboto', size: 14, bold: true };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const noteCell = worksheet.getCell('A3');
  noteCell.value = 'Vui lòng tạo agenda trong hệ thống trước khi export.';
  noteCell.font = { name: 'Roboto', size: 11 };
};

const getDepartmentData = async (eventId) => {
  const { items: departments } = await findDepartmentsByEvent(eventId, {
    search: '',
    skip: 0,
    limit: 1000
  });

  return await Promise.all(departments.map(async (dept) => {
    const memberCount = await countDepartmentMembersIncludingHoOC(dept._id);

    return {
      _id: dept._id,
      name: dept.name,
      description: dept.description,
      leaderId: dept.leaderId,
      leaderName: dept.leaderId?.fullName || '',
      leaderEmail: dept.leaderId?.email || '',
      memberCount,
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt
    };
  }));
};

const getMemberData = async (eventId) => {
  const members = await getMemberInformationForExport(eventId);

  return members.map(member => {
    // Xử lý role HoOC thành Core Team
    let departmentName = '';
    if (member.role === 'HoOC') {
      departmentName = 'Core Team';
    } else if (member.departmentId?.name) {
      departmentName = member.departmentId.name;
    }

    return {
      _id: member._id,
      email: member.userId?.email || '',
      phone: member.userId?.phone || '',
      fullName: member.userId?.fullName || '',
      departmentName: departmentName,
      role: member.role,
      studentId: '', // Không có trong data hiện tại
      birthDate: '', // Không có trong data hiện tại
      createdAt: member.createdAt,
      status: member.status
    };
  });
};

const getRiskData = async (eventId) => {
  try {
    // Giả sử có function để gọi API hoặc service
    const result = await getAllRisksByEventWithoutPagination(eventId);
    if (!result.success || !result.data) {
      return [];
    }

    return result.data.map(risk => ({
      _id: risk._id,
      name: risk.name,
      risk_category: risk.risk_category,
      departmentName: risk.departmentId?.name || null,
      impact: risk.impact,
      likelihood: risk.likelihood,
      risk_mitigation_plan: risk.risk_mitigation_plan,
      risk_response_plan: risk.risk_response_plan,
      risk_status: risk.risk_status,
      occurredCount: risk.occurred_risk?.length || 0,
      createdAt: risk.createdAt
    }));
  } catch (error) {
    console.error('Error fetching risk data:', error);
    return [];
  }
};

const translateRiskCategory = (category) => {
  const categoryMap = {
    'infrastructure': 'Cơ sở vật chất',
    'weather': 'Thời tiết',
    'communication': 'Truyền thông',
    'mc-guests': 'MC và khách mời',
    'security': 'An ninh',
    'finance': 'Tài chính',
    'staff': 'Nhân sự',
    'technology': 'Công nghệ',
    'others': 'Khác'
  };
  return categoryMap[category] || category || 'Khác';
};

const translateImpactLevel = (impact) => {
  const impactMap = {
    'low': 'Thấp',
    'medium': 'Trung bình',
    'high': 'Cao'
  };
  return impactMap[impact] || impact || 'Không xác định';
};

const translateLikelihoodLevel = (likelihood) => {
  const likelihoodMap = {
    'low': 'Thấp',
    'medium': 'Trung bình',
    'high': 'Cao'
  };
  return likelihoodMap[likelihood] || likelihood || 'Không xác định';
};

// Function format số điện thoại (loại bỏ Google ID)
const formatPhoneNumber = (phone) => {
  if (!phone) return '';

  // Nếu là Google ID (bắt đầu với 'google_'), return empty
  if (phone.startsWith('google_')) return '';

  return phone;
};

const createDepartmentMembersSheet = async (workbook, eventId) => {
  const worksheet = workbook.addWorksheet('Thành viên theo Ban');

  worksheet.columns = [
    { header: '#', key: 'stt', width: 5 },
    { header: 'Tên ban', key: 'departmentName', width: 25 },
    { header: 'Trưởng ban', key: 'leader', width: 25 },
    { header: 'Số thành viên', key: 'memberCount', width: 15 },
    { header: 'Trạng thái', key: 'status', width: 15 }
  ];

  const departments = await getDepartmentData(eventId);

  departments.forEach((dept, index) => {
    const leaderText = dept.leaderName
      ? (dept.leaderEmail
        ? `${dept.leaderName} (${dept.leaderEmail})`
        : dept.leaderName)
      : '';

    worksheet.addRow({
      stt: index + 1,
      departmentName: dept.name,
      leader: leaderText,
      memberCount: dept.memberCount,
      status: 'Hoạt động'
    });
  });
};

const createDepartmentStructureSheet = async (workbook, eventId) => {
  const worksheet = workbook.addWorksheet('Cơ cấu Tổ chức');

  worksheet.columns = [
    { header: '#', key: 'stt', width: 5 },
    { header: 'Tên ban', key: 'name', width: 25 },
    { header: 'Trưởng ban', key: 'leader', width: 25 },
    { header: 'Email trưởng ban', key: 'leaderEmail', width: 30 },
    { header: 'Số thành viên', key: 'memberCount', width: 15 },
    { header: 'Ngày tạo', key: 'createdAt', width: 20 }
  ];

  const departments = await getDepartmentData(eventId);

  departments.forEach((dept, index) => {
    const leaderText = dept.leaderName
      ? (dept.leaderEmail
        ? `${dept.leaderName} (${dept.leaderEmail})`
        : dept.leaderName)
      : '';

    worksheet.addRow({
      stt: index + 1,
      name: dept.name,
      leader: leaderText,
      leaderEmail: dept.leaderEmail || '',
      memberCount: dept.memberCount,
      createdAt: formatDate(dept.createdAt)
    });
  });
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('vi-VN');
};

const saveWorkbook = async (workbook, filename) => {
  const exportsDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  const filePath = path.join(exportsDir, filename);
  await workbook.xlsx.writeFile(filePath);

  console.log(`💾 File saved: ${filePath} (${fs.statSync(filePath).size} bytes)`);
  return filePath;
};

export const listExportedFiles = async (req, res) => {
  try {
    const exportsDir = path.join(process.cwd(), 'exports');

    if (!fs.existsSync(exportsDir)) {
      return res.json({ files: [] });
    }

    const files = fs.readdirSync(exportsDir)
      .filter(file => file.endsWith('.xlsx'))
      .map(file => {
        const filePath = path.join(exportsDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created);

    res.json({ files });

  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Không thể list files' });
  }
};

export const downloadExportedFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'exports', filename);

    console.log(`📥 Download request for: ${filename}`);

    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filename}`);
      return res.status(404).json({ error: 'File không tồn tại' });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    
    // Set headers for Excel file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    
    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('❌ File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Lỗi khi đọc file' });
      }
    });

    fileStream.on('end', () => {
      console.log(`✅ Download completed: ${filename}`);
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Không thể download file' });
    }
  }
};

const createTimelineSheets = async (workbook, eventId, subItems) => {
  if (subItems.includes('timeline-all') || subItems.length === 0) {
    const worksheet = workbook.addWorksheet('Timeline');
    // Set column widths
    worksheet.getColumn('A').width = 3.63;
    worksheet.getColumn('B').width = 15;   // Giai đoạn
    worksheet.getColumn('C').width = 20;   // Thời gian
    worksheet.getColumn('D').width = 25;   // Hoạt động
    worksheet.getColumn('E').width = 35;   // Mô tả
    worksheet.getColumn('F').width = 15;   // Ghi chú

    const milestones = await getMilestoneData(eventId);
    const eventDoc = await event.findOne({ _id: eventId }).lean();
    const eventStartDate = eventDoc?.eventStartDate ? new Date(eventDoc.eventStartDate) : null;
    const eventEndDate = eventDoc?.eventEndDate ? new Date(eventDoc.eventEndDate) : null;

    // ROW 1: Title - merge A1:F1
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Timeline sự kiện';
    titleCell.font = { name: 'Roboto', size: 14, bold: true };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }
    };

    // ROW 2: Headers
    const headerRow = worksheet.getRow(2);
    headerRow.height = 20;

    const headers = ['#', 'Giai đoạn', 'Thời gian', 'Hoạt động', 'Mô tả', 'Ghi chú'];
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { name: 'Roboto', size: 11 };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // ROW 3+: Data rows
    milestones.forEach((milestone, index) => {
      const row = worksheet.getRow(index + 3);
      row.height = 20;
      row.getCell(1).value = index + 1; // STT

      // === XÁC ĐỊNH GIAI ĐOẠN ===
      let phase = '';
      if (eventStartDate && eventEndDate && milestone.targetDate) {
        const milestoneDate = new Date(milestone.targetDate);
        if (milestoneDate < eventStartDate) {
          phase = 'Trước sự kiện';
        } else if (milestoneDate > eventEndDate) {
          phase = 'Sau sự kiện';
        } else {
          phase = 'Trong sự kiện';
        }
      }
      row.getCell(2).value = phase; // Giai đoạn
      row.getCell(3).value = formatMilestoneDate(milestone.targetDate);
      row.getCell(4).value = milestone.name || '';
      row.getCell(5).value = milestone.description || '';
      row.getCell(6).value = '';
      // Style
      for (let col = 1; col <= 6; col++) {
        const cell = row.getCell(col);
        cell.font = { name: 'Roboto', size: 11 };
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }
        };
        if (col === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }
    });
    console.log(`✅ Created timeline sheet with ${milestones.length} milestones`);
  }
};

// Function lấy data milestones
const getMilestoneData = async (eventId) => {
  try {
    
    // Sử dụng service để lấy milestones
    const result = await listMilestonesByEvent(eventId, {
      skip: 0,
      limit: 1000,
      sortBy: 'targetDate',
      sortDir: 1 // Sort by target date ascending
    });
  
    if (!result.items || result.items.length === 0) {
      console.log('⚠️ No milestone data found');
      return [];
    }
    
    const formattedMilestones = result.items.map(milestone => ({
      _id: milestone._id,
      name: milestone.name,
      description: milestone.description,
      targetDate: milestone.targetDate,
      status: milestone.status,
      createdAt: milestone.createdAt
    }));
    
    return formattedMilestones;
    
  } catch (error) {
    console.error('❌ Error fetching milestone data:', error);
    return [];
  }
};

// Helper functions
const formatMilestoneDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN');
};

export const cleanupOldFiles = async (req, res) => {
  try {
    const exportsDir = path.join(process.cwd(), 'exports');
    
    if (!fs.existsSync(exportsDir)) {
      return res.json({ message: 'No exports directory found', deleted: 0 });
    }

    const files = fs.readdirSync(exportsDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    let deletedCount = 0;

    files.forEach(file => {
      const filePath = path.join(exportsDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`🗑️ Deleted old file: ${file}`);
      }
    });

    res.json({ 
      message: `Cleaned up ${deletedCount} old files`,
      deleted: deletedCount 
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
};