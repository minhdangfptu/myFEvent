/* eslint-disable no-useless-escape */
/* eslint-disable no-unused-vars */
// controllers/exportController.js
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { findDepartmentsByEvent } from '../services/departmentService.js';
import { countDepartmentMembersIncludingHoOC, getMemberInformationForExport } from '../services/eventMemberService.js';
import { getAgendaByEvent } from '../services/agendaService.js';
import { getAllOccurredRisksByEvent, getAllRisksByEventWithoutPagination } from '../services/riskService.js';
import { listMilestonesByEvent } from '../services/milestoneService.js';
import event from '../models/event.js';
import { getEpicTasksForExport } from '../services/taskService.js';
import { getBudgetItemsForExport } from '../services/budgetService.js';
import { getFeedbackFormsForExport } from '../services/feedbackService.js';

export const exportSingleItem = async (req, res) => {
  try {
    const { eventId, itemId } = req.params;
    const { subItems = [] } = req.body;

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

      case 'tasks':
        await createTaskSheets(workbook, eventId, subItems);
        filename = `Cong_viec_Su_kien_${eventId}_${Date.now()}.xlsx`;
        break;

      case 'budget':
        await createBudgetSheets(workbook, eventId, subItems);
        filename = `Kinh_phi_Su_kien_${eventId}_${Date.now()}.xlsx`;
        break;

      case 'risks':
        await createRiskSheets(workbook, eventId, subItems);
        filename = `Rui_ro_Su_kien_${eventId}_${Date.now()}.xlsx`;
        break;

      case 'timeline':
        await createTimelineSheets(workbook, eventId, subItems);
        filename = `Timeline_Su_kien_${eventId}_${Date.now()}.xlsx`;
        break;

      case 'feedback':
        await createFeedbackSheets(workbook, eventId, subItems);
        filename = `Phan_hoi_Su_kien_${eventId}_${Date.now()}.xlsx`;
        break;

      case 'incidents':
        await createIncidentSheets(workbook, eventId, subItems);
        filename = `Su_co_Su_kien_${eventId}_${Date.now()}.xlsx`;
        break;

      default:
        return res.status(400).json({ error: 'Loại dữ liệu không hợp lệ' });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('❌ Export error:', error);
    res.status(500).json({ error: 'Xuất dữ liệu thất bại', details: error.message });
  }
};

const getItemExportConfig = (itemId, eventId) => {
  const configMap = {
    'team': { filename: `Danh_sach_Ban_${eventId}.xlsx`, createFn: createDepartmentSheets },
    'members': { filename: `Danh_sach_Thanh_vien_${eventId}.xlsx`, createFn: createMemberSheets },
    'timeline': { filename: `Timeline_Su_kien_${eventId}.xlsx`, createFn: createTimelineSheets },
    'agenda': { filename: `Agenda_Su_Kien_${eventId}.xlsx`, createFn: createAgendaSheets },
    'tasks': { filename: `Danh_sach_Cong_viec_${eventId}.xlsx`, createFn: createTaskSheets },
    'budget': { filename: `Kinh_phi_Su_kien_${eventId}.xlsx`, createFn: createBudgetSheets },
    'feedback': { filename: `Phan_hoi_Su_kien_${eventId}.xlsx`, createFn: createFeedbackSheets },
    'risks': { filename: `Rui_ro_Su_kien_${eventId}.xlsx`, createFn: createRiskSheets },
    'incidents': { filename: `Su_co_Su_kien_${eventId}.xlsx`, createFn: createIncidentSheets }
  };
  return configMap[itemId];
};

export const exportAllItemsZip = async (req, res) => {
  try {
    const { eventId } = req.params;

    const itemsToExport = [
      { itemId: 'team', ...getItemExportConfig('team', eventId) },
      { itemId: 'members', ...getItemExportConfig('members', eventId) },
      { itemId: 'timeline', ...getItemExportConfig('timeline', eventId) },
      { itemId: 'agenda', ...getItemExportConfig('agenda', eventId) },
      { itemId: 'tasks', ...getItemExportConfig('tasks', eventId) },
      { itemId: 'budget', ...getItemExportConfig('budget', eventId) },
      { itemId: 'feedback', ...getItemExportConfig('feedback', eventId) },
      { itemId: 'risks', ...getItemExportConfig('risks', eventId) },
      { itemId: 'incidents', ...getItemExportConfig('incidents', eventId) }
    ];

    const zipFilename = `Tat_Ca_Du_Lieu_${eventId}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    archive.on('error', (err) => {
      console.error('❌ Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Lỗi khi tạo file ZIP', details: err.message });
      } else {
        res.end();
      }
    });

    archive.on('end', () => {
    });

    res.on('close', () => {
    });

    for (const { itemId, filename, createFn } of itemsToExport) {
      try {
        const workbook = new ExcelJS.Workbook();
        await createFn(workbook, eventId, []);

        const buffer = await workbook.xlsx.writeBuffer();
        archive.append(buffer, { name: filename });
      } catch (itemError) {
        console.error(`❌ Error creating ${itemId}:`, itemError);
      }
    }

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
    const { itemIds = [] } = req.body;

    if (!itemIds || itemIds.length === 0) {
      return res.status(400).json({ error: 'Vui lòng chọn ít nhất một mục để xuất' });
    }

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

    const zipFilename = `Du_Lieu_Da_Chon_${eventId}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    archive.on('error', (err) => {
      console.error('❌ Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Lỗi khi tạo file ZIP', details: err.message });
      } else {
        res.end();
      }
    });

    archive.on('end', () => {
    });

    res.on('close', () => {
    });

    for (const { itemId, filename, createFn } of itemsToExport) {
      try {
        const workbook = new ExcelJS.Workbook();
        await createFn(workbook, eventId, []);

        const buffer = await workbook.xlsx.writeBuffer();
        archive.append(buffer, { name: filename });
      } catch (itemError) {
        console.error(`❌ Error creating ${itemId}:`, itemError);
      }
    }

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

    worksheet.getColumn('A').width = 3.63;
    worksheet.getColumn('B').width = 15;
    worksheet.getColumn('C').width = 40;
    worksheet.getColumn('D').width = 20;
    worksheet.getColumn('E').width = 50;
    worksheet.getColumn('F').width = 15;

    const departments = await getDepartmentData(eventId);

    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Danh sách thông tin ban sự kiện';
    titleCell.font = { name: 'Roboto', size: 14, bold: true };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    const headerRow = worksheet.getRow(2);
    headerRow.height = 20;

    const headers = ['#', 'Tên ban', 'Miêu tả', 'Số lượng thành viên', 'Trưởng ban', 'Ghi chú'];
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

    let totalMembers = 0;
    departments.forEach((dept, index) => {
      const row = worksheet.getRow(index + 3);
      row.height = 20;

      if (index < 6) {
        row.getCell(1).value = index + 1;
      }

      row.getCell(2).value = dept.name || '';
      row.getCell(3).value = dept.description || '';
      row.getCell(4).value = dept.memberCount || 0;

      const leaderText = dept.leaderName
        ? (dept.leaderEmail
          ? `${dept.leaderName} (${dept.leaderEmail})`
          : dept.leaderName)
        : '';
      row.getCell(5).value = leaderText;
      row.getCell(6).value = '';

      for (let col = 1; col <= 6; col++) {
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

      totalMembers += dept.memberCount || 0;
    });

    const summaryRowNum = departments.length + 3;
    const summaryRow = worksheet.getRow(summaryRowNum);
    summaryRow.height = 20;

    worksheet.mergeCells(summaryRowNum, 1, summaryRowNum, 4);
    const totalCell = summaryRow.getCell(1);
    totalCell.value = 'Tổng số lượng thành viên và ban';
    totalCell.font = { name: 'Roboto', size: 11, bold: true };
    totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    worksheet.mergeCells(summaryRowNum, 5, summaryRowNum, 6);
    const summaryCell = summaryRow.getCell(5);
    summaryCell.value = `${departments.length} ban với ${totalMembers} thành viên`;
    summaryCell.font = { name: 'Roboto', size: 11 };
    summaryCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summaryCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

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

    worksheet.getColumn('A').width = 3.63;
    worksheet.getColumn('B').width = 40;
    worksheet.getColumn('C').width = 15;
    worksheet.getColumn('D').width = 20;
    worksheet.getColumn('E').width = 15;
    worksheet.getColumn('F').width = 20;
    worksheet.getColumn('G').width = 15;
    worksheet.getColumn('H').width = 15;

    const members = await getMemberData(eventId);

    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Danh sách thành viên Ban tổ chức';
    titleCell.font = { name: 'Roboto', size: 14, bold: true };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    const headerRow = worksheet.getRow(2);
    headerRow.height = 20;

    const headers = ['#', 'Email', 'Số điện thoại', 'Họ và tên', 'Ban', 'Mã số sinh viên', 'Ngày sinh', 'Ghi chú'];
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

    members.forEach((member, index) => {
      const row = worksheet.getRow(index + 3);
      row.height = 20;

      row.getCell(1).value = index + 1;
      row.getCell(2).value = member.email || '';
      row.getCell(3).value = formatPhoneNumber(member.phone) || '';
      row.getCell(4).value = member.fullName || '';
      row.getCell(5).value = member.departmentName || '';
      row.getCell(6).value = member.studentId || '';
      row.getCell(7).value = member.birthDate || '';
      row.getCell(8).value = '';

      for (let col = 1; col <= 8; col++) {
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

    const summaryRowNum = members.length + 3;
    const summaryRow = worksheet.getRow(summaryRowNum);
    summaryRow.height = 20;

    worksheet.mergeCells(summaryRowNum, 1, summaryRowNum, 3);
    const totalCell = summaryRow.getCell(1);
    totalCell.value = 'Tổng số lượng thành viên';
    totalCell.font = { name: 'Roboto', size: 11, bold: true };
    totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    worksheet.mergeCells(summaryRowNum, 4, summaryRowNum, 8);
    const summaryCell = summaryRow.getCell(4);
    summaryCell.value = `${members.length} thành viên`;
    summaryCell.font = { name: 'Roboto', size: 11 };
    summaryCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summaryCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

  }
};

const createRiskSheets = async (workbook, eventId, subItems) => {
  if (subItems.includes('risks-all') || subItems.length === 0) {
    const worksheet = workbook.addWorksheet('Rủi ro của sự kiện');

    worksheet.getColumn('A').width = 3.63;
    worksheet.getColumn('B').width = 20;
    worksheet.getColumn('C').width = 15;
    worksheet.getColumn('D').width = 30;
    worksheet.getColumn('E').width = 35;
    worksheet.getColumn('F').width = 35;
    worksheet.getColumn('G').width = 15;
    worksheet.getColumn('H').width = 15;
    worksheet.getColumn('I').width = 20;
    worksheet.getColumn('J').width = 15;

    const risks = await getRiskData(eventId);

    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Kế hoạch phòng ngừa rủi ro';
    titleCell.font = { name: 'Roboto', size: 14, bold: true };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    const headerRow = worksheet.getRow(2);
    headerRow.height = 20;

    const headers = [
      '#', 'Danh mục', 'Ban phụ trách', 'Vấn đề',
      'Phương án giảm thiểu rủi ro', 'Phương án giải quyết',
      'Mức độ ảnh hưởng', 'Khả năng xảy ra',
      'Số lượng sự cố đã xảy ra', 'Ghi chú'
    ];

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

    let totalIncidents = 0;
    risks.forEach((risk, index) => {
      const row = worksheet.getRow(index + 3);
      row.height = 20;

      row.getCell(1).value = index + 1;
      row.getCell(2).value = translateRiskCategory(risk.risk_category);
      row.getCell(3).value = risk.departmentName || 'Tất cả';
      row.getCell(4).value = risk.name || '';
      row.getCell(5).value = risk.risk_mitigation_plan || '';
      row.getCell(6).value = risk.risk_response_plan || '';
      row.getCell(7).value = translateImpactLevel(risk.impact);
      row.getCell(8).value = translateLikelihoodLevel(risk.likelihood);
      row.getCell(9).value = risk.occurredCount || 0;
      row.getCell(10).value = risk.note || '';

      for (let col = 1; col <= 10; col++) {
        const cell = row.getCell(col);
        cell.font = { name: 'Roboto', size: 11 };
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };

        if (col === 1 || col === 9) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }

      totalIncidents += risk.occurredCount || 0;
    });

    const summaryRowNum = risks.length + 3;
    const summaryRow = worksheet.getRow(summaryRowNum);
    summaryRow.height = 20;

    worksheet.mergeCells(summaryRowNum, 1, summaryRowNum, 7);
    const totalCell = summaryRow.getCell(1);
    totalCell.value = 'Tổng số rủi ro và sự cố đã xảy ra';
    totalCell.font = { name: 'Roboto', size: 11, bold: true };
    totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    worksheet.mergeCells(summaryRowNum, 8, summaryRowNum, 10);
    const summaryCell = summaryRow.getCell(8);
    summaryCell.value = `${risks.length} rủi ro và ${totalIncidents} sự cố`;
    summaryCell.font = { name: 'Roboto', size: 11 };
    summaryCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summaryCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  }
};

const createAgendaSheets = async (workbook, eventId, subItems) => {

  const agendas = await getAgendaByEvent(eventId);

  if (!agendas || agendas.length === 0) {
    const worksheet = workbook.addWorksheet('Agenda - Trống');
    createEmptyAgendaSheet(worksheet);
    return;
  }
  const selectedMilestoneIds = Array.isArray(subItems)
    ? subItems.map(id => id.toString())
    : [];

  if (selectedMilestoneIds.length > 0) {

    const filteredAgendas = agendas.filter(agendaData => {
      const milestoneIdStr = agendaData.milestoneId?._id?.toString();
      const isMatch = milestoneIdStr && selectedMilestoneIds.includes(milestoneIdStr);

      return isMatch;
    });

    if (filteredAgendas.length === 0) {
      const worksheet = workbook.addWorksheet('Agenda - Không khớp');
      createEmptyAgendaSheet(worksheet);
      return;
    }

    filteredAgendas.forEach((agendaData, idx) => {
      let sheetName;
      if (agendaData.milestoneId && agendaData.milestoneId.name) {
        sheetName = agendaData.milestoneId.name.substring(0, 31).replace(/[\\\/\?\*\[\]]/g, '');
      } else {
        sheetName = `Moc_${idx + 1}`;
      }

      createSingleAgendaSheet(workbook, agendaData, sheetName);
    });

    await createMainAgendaSheet(workbook, filteredAgendas, "Agenda - Cac moc da chon");
    return;
  }
  agendas.forEach((agendaData, idx) => {
    let sheetName;
    if (agendaData.milestoneId && agendaData.milestoneId.name) {
      sheetName = agendaData.milestoneId.name.substring(0, 31).replace(/[\\\/\?\*\[\]]/g, '');
    } else {
      sheetName = `Moc_${idx + 1}`;
    }
    createSingleAgendaSheet(workbook, agendaData, sheetName);
  });

  await createMainAgendaSheet(workbook, agendas, "Agenda Tong hop Su kien");
};

const createSingleAgendaSheet = async (workbook, agendaData, sheetName) => {
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.getColumn('A').width = 3.63;
  worksheet.getColumn('B').width = 15;
  worksheet.getColumn('C').width = 20;
  worksheet.getColumn('D').width = 15;
  worksheet.getColumn('E').width = 40;
  worksheet.getColumn('F').width = 15;

  worksheet.mergeCells('A1:F1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = sheetName;
  titleCell.font = { name: 'Roboto', size: 14, bold: true };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' }
  };

  const headerRow = worksheet.getRow(2);
  headerRow.height = 20;

  const headers = ['#', 'Ngày', 'Thời gian', 'Thời lượng', 'Nội dung', 'Ghi chú'];
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

  const agendaItems = processAgendaData(agendaData.agenda);

  agendaItems.forEach((item, index) => {
    const row = worksheet.getRow(index + 3);
    row.height = 20;

    row.getCell(1).value = index + 1;
    row.getCell(2).value = formatDate(item.date);
    row.getCell(3).value = item.timeRange || '';
    row.getCell(4).value = item.duration || '';
    row.getCell(5).value = item.content || '';
    row.getCell(6).value = '';

    for (let col = 1; col <= 6; col++) {
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

};

const createIncidentSheets = async (workbook, eventId, subItems) => {
  if (subItems.includes('incidents-all') || subItems.length === 0) {
    const worksheet = workbook.addWorksheet('Sự cố');

    worksheet.getColumn('A').width = 3.63;
    worksheet.getColumn('B').width = 20;
    worksheet.getColumn('C').width = 15;
    worksheet.getColumn('D').width = 20;
    worksheet.getColumn('E').width = 20;
    worksheet.getColumn('F').width = 35;
    worksheet.getColumn('G').width = 30;
    worksheet.getColumn('H').width = 35;
    worksheet.getColumn('I').width = 30;
    worksheet.getColumn('J').width = 15;

    const incidents = await getIncidentData(eventId);

    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Sự cố đã xảy ra trong sự kiện';
    titleCell.font = { name: 'Roboto', size: 14, bold: true };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    const headerRow = worksheet.getRow(2);
    headerRow.height = 20;

    const headers = [
      '#', 'Sự cố', 'Thuộc rủi ro', 'Thời gian', 'Địa điểm',
      'Mô tả', 'Người xử lý', 'Hành động xử lý', 'Người ghi nhận', 'Ghi chú'
    ];

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

    incidents.forEach((incident, index) => {
      const row = worksheet.getRow(index + 3);
      row.height = 20;

      row.getCell(1).value = index + 1;
      row.getCell(2).value = incident.occurred_name || '';
      row.getCell(3).value = translateRiskCategory(incident.risk_category) || '';
      row.getCell(4).value = formatIncidentDateTime(incident.occurred_date);
      row.getCell(5).value = incident.occurred_location || '';
      row.getCell(6).value = incident.occurred_description || '';
      row.getCell(7).value = formatPerson(incident.resolve_personName, incident.departmentName);
      row.getCell(8).value = incident.resolve_action || '';
      row.getCell(9).value = formatPerson(incident.update_personName, incident.departmentName);
      row.getCell(10).value = incident.note || '';

      for (let col = 1; col <= 10; col++) {
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

    const summaryRowNum = incidents.length + 3;
    const summaryRow = worksheet.getRow(summaryRowNum);
    summaryRow.height = 20;

    worksheet.mergeCells(summaryRowNum, 1, summaryRowNum, 7);
    const totalCell = summaryRow.getCell(1);
    totalCell.value = 'Tổng số sự cố đã xảy ra trong sự kiện';
    totalCell.font = { name: 'Roboto', size: 11, bold: true };
    totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    worksheet.mergeCells(summaryRowNum, 8, summaryRowNum, 10);
    const summaryCell = summaryRow.getCell(8);
    summaryCell.value = `${incidents.length} sự cố`;
    summaryCell.font = { name: 'Roboto', size: 11 };
    summaryCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summaryCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  }
};

const createTimelineSheets = async (workbook, eventId, subItems) => {
  if (subItems.includes('timeline-all') || subItems.length === 0) {
    const worksheet = workbook.addWorksheet('Timeline');

    worksheet.getColumn('A').width = 3.63;
    worksheet.getColumn('B').width = 15;
    worksheet.getColumn('C').width = 20;
    worksheet.getColumn('D').width = 25;
    worksheet.getColumn('E').width = 35;
    worksheet.getColumn('F').width = 15;

    const milestones = await getMilestoneData(eventId);
    const eventDoc = await event.findOne({ _id: eventId }).lean();
    const eventStartDate = eventDoc?.eventStartDate ? new Date(eventDoc.eventStartDate) : null;
    const eventEndDate = eventDoc?.eventEndDate ? new Date(eventDoc.eventEndDate) : null;

    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Timeline sự kiện';
    titleCell.font = { name: 'Roboto', size: 14, bold: true };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }
    };

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

    milestones.forEach((milestone, index) => {
      const row = worksheet.getRow(index + 3);
      row.height = 20;
      row.getCell(1).value = index + 1;

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
      row.getCell(2).value = phase;
      row.getCell(3).value = formatMilestoneDate(milestone.targetDate);
      row.getCell(4).value = milestone.name || '';
      row.getCell(5).value = milestone.description || '';
      row.getCell(6).value = '';

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
  }
};

const createTaskSheets = async (workbook, eventId, subItems = []) => {
  const filters = getTaskFilterConfigs(subItems);
  const tasks = await getEpicTasksForExport(eventId);

  if (!filters.length) {
    filters.push(TASK_FILTER_MAP['tasks-all']);
  }

  filters.forEach((filterConfig, index) => {
    const worksheet = workbook.addWorksheet(filterConfig.sheetName || `Công việc ${index + 1}`);
    const filteredTasks = Array.isArray(tasks) ? tasks.filter(filterConfig.filterFn) : [];
    createTaskWorksheet(worksheet, filterConfig.title, filteredTasks);
  });
};

const createBudgetSheets = async (workbook, eventId, subItems = []) => {
  const filters = getBudgetFilterConfigs(subItems);
  const items = await getBudgetItemsForExport(eventId);

  if (!filters.length) {
    filters.push(BUDGET_FILTER_MAP['budget-summary']);
  }

  filters.forEach((filterConfig, index) => {
    const worksheet = workbook.addWorksheet(filterConfig.sheetName || `Kinh phí ${index + 1}`);
    const filteredItems = Array.isArray(items) ? items.filter(filterConfig.filterFn) : [];
    createBudgetWorksheet(worksheet, filterConfig.title, filteredItems);
  });
};

const createFeedbackSheets = async (workbook, eventId, subItems = []) => {

  const { eventName, forms } = await getFeedbackFormsForExport(eventId);
  if (!forms || forms.length === 0) {
    const worksheet = workbook.addWorksheet('Phản hồi - Trống');
    createEmptyFeedbackSheet(worksheet, eventName);
    return;
  }
  const selectedFormIds = Array.isArray(subItems)
    ? subItems.map(id => id.toString())
    : [];

  if (selectedFormIds.length > 0) {

    const filteredForms = forms.filter(form => {
      const formIdStr = form.id?.toString();
      const isMatch = formIdStr && selectedFormIds.includes(formIdStr);
      return isMatch;
    });

    if (filteredForms.length === 0) {
      const worksheet = workbook.addWorksheet('Phản hồi - Không khớp');
      createEmptyFeedbackSheet(worksheet, eventName);
      return;
    }

    filteredForms.forEach((form, idx) => {
      const sheetName = sanitizeFeedbackSheetName(form.name, idx);
      const worksheet = workbook.addWorksheet(sheetName);
      createFeedbackWorksheet(worksheet, eventName, form, idx);
    });
    return;
  }
  forms.forEach((form, idx) => {
    const sheetName = sanitizeFeedbackSheetName(form.name, idx);
    const worksheet = workbook.addWorksheet(sheetName);
    createFeedbackWorksheet(worksheet, eventName, form, idx);
  });
};

const createFeedbackWorksheet = (worksheet, eventName, form, formIndex) => {
  const questionCount = form.questions?.length || 0;
  const columnCount = Math.max(questionCount + 1, 3);

  worksheet.getColumn(1).width = 2.88;

  for (let i = 2; i <= columnCount; i++) {
    worksheet.getColumn(i).width = 25;
  }

  worksheet.mergeCells(1, 1, 1, columnCount);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = 'Danh sách phản hồi';
  titleCell.font = { name: 'Roboto', size: 13, bold: true };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }
  };

  worksheet.mergeCells(2, 1, 2, columnCount);
  const eventCell = worksheet.getCell(2, 1);
  eventCell.value = `Tên sự kiện: ${eventName || 'Chưa cập nhật'}`;
  eventCell.font = { name: 'Roboto', size: 11 };
  eventCell.alignment = { horizontal: 'left', vertical: 'middle' };
  eventCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; // Changed to white

  worksheet.mergeCells(3, 1, 3, columnCount);
  const formCell = worksheet.getCell(3, 1);
  formCell.value = `Form phản hồi: ${form.name || `Form ${formIndex + 1}`}`;
  formCell.font = { name: 'Roboto', size: 11 };
  formCell.alignment = { horizontal: 'left', vertical: 'middle' };
  formCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; // Changed to white

  worksheet.mergeCells(4, 1, 4, columnCount);
  const descCell = worksheet.getCell(4, 1);
  descCell.value = `Mô tả: ${form.description || 'Chưa có mô tả'}`;
  descCell.font = { name: 'Roboto', size: 11 };
  descCell.alignment = { horizontal: 'left', vertical: 'middle' };
  descCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; // Changed to white

  const headers = [
    '#',
    ...(form.questions || []).map((q, idx) => q.text || `Câu hỏi ${idx + 1}`)
  ];

  const headerRow = worksheet.getRow(5);
  headerRow.height = 20;

  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { name: 'Roboto', size: 11 };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; // Changed to white
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  if (!form.responses || form.responses.length === 0) {
    worksheet.mergeCells(6, 1, 6, columnCount);
    const emptyCell = worksheet.getCell(6, 1);
    emptyCell.value = 'Chưa có phản hồi nào cho biểu mẫu này.';
    emptyCell.font = { name: 'Roboto', size: 11, italic: true };
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    emptyCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }
    };
    return;
  }

  form.responses.forEach((response, index) => {
    const rowIndex = index + 6;
    const row = worksheet.getRow(rowIndex);
    row.height = 20;

    row.getCell(1).value = index + 1;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(1).font = { name: 'Roboto', size: 11 };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; // Changed to white
    row.getCell(1).border = {
      top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }
    };

    (form.questions || []).forEach((question, qIdx) => {
      const cell = row.getCell(qIdx + 2);
      const answer = response.answers?.[question.questionId];
      cell.value = formatFeedbackAnswer(question.type, answer);
      cell.font = { name: 'Roboto', size: 11 };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; // Changed to white
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    });
  });

};

const createEmptyFeedbackSheet = (worksheet, eventName) => {
  worksheet.getColumn(1).width = 5;
  worksheet.getColumn(2).width = 40;

  worksheet.mergeCells('A1:B1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'Danh sách phản hồi';
  titleCell.font = { name: 'Roboto', size: 13, bold: true };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }
  };

  worksheet.mergeCells('A2:B2');
  worksheet.getCell('A2').value = `Tên sự kiện: ${eventName || 'Chưa cập nhật'}`;
  worksheet.getCell('A2').font = { name: 'Roboto', size: 11 };

  worksheet.mergeCells('A4:B4');
  const emptyCell = worksheet.getCell('A4');
  emptyCell.value = 'Chưa có form phản hồi nào cho sự kiện này.';
  emptyCell.font = { name: 'Roboto', size: 11, italic: true };
  emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
  emptyCell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }
  };
};

// Helper functions
const formatFeedbackAnswer = (questionType, answer) => {
  if (answer === null || typeof answer === 'undefined') return '';
  if (Array.isArray(answer)) return answer.join(', ');

  switch (questionType) {
    case 'rating':
      return `${answer} sao`;
    case 'multiple-choice':
      return String(answer);
    case 'yes-no':
      return answer ? 'Có' : 'Không';
    case 'text':
      return String(answer);
    default:
      return String(answer);
  }
};

const sanitizeFeedbackSheetName = (name, index) => {
  const MAX_SHEET_NAME_LENGTH = 31;
  const fallback = `Form ${index + 1}`;

  if (!name || typeof name !== 'string') return fallback;

  let sanitized = name.replace(/[\[\]\*\/\\\?\:]/g, '').trim();
  if (!sanitized) sanitized = fallback;

  if (sanitized.length > MAX_SHEET_NAME_LENGTH) {
    sanitized = sanitized.substring(0, MAX_SHEET_NAME_LENGTH);
  }

  return sanitized;
};

const processAgendaData = (agendaArray) => {
  const items = [];

  if (!agendaArray || agendaArray.length === 0) return items;

  agendaArray.forEach(dayAgenda => {
    if (dayAgenda.items && dayAgenda.items.length > 0) {
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

const createMainAgendaSheet = async (workbook, agendas, customTitle = null) => {
  const worksheet = workbook.addWorksheet('Agenda Tổng hợp');

  worksheet.getColumn('A').width = 3.63;
  worksheet.getColumn('B').width = 20;
  worksheet.getColumn('C').width = 15;
  worksheet.getColumn('D').width = 20;
  worksheet.getColumn('E').width = 15;
  worksheet.getColumn('F').width = 40;
  worksheet.getColumn('G').width = 15;

  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = customTitle || 'Agenda Tổng hợp Sự kiện';
  titleCell.font = { name: 'Roboto', size: 14, bold: true };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' }
  };

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

  allItems.sort((a, b) => {
    const dateCompare = new Date(a.date) - new Date(b.date);
    if (dateCompare !== 0) return dateCompare;
    return new Date(a.startTime) - new Date(b.startTime);
  });

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

const getIncidentData = async (eventId) => {
  try {

    const result = await getAllOccurredRisksByEvent(eventId);

    if (!result.success || !result.data) {
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
      note: incident.note || ''
    }));

    return formattedIncidents;

  } catch (error) {
    console.error('❌ Error fetching incident data:', error);
    return [];
  }
};

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
      studentId: '',
      birthDate: '',
      createdAt: member.createdAt,
      status: member.status
    };
  });
};

const getRiskData = async (eventId) => {
  try {
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

const formatPhoneNumber = (phone) => {
  if (!phone) return '';
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

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File không tồn tại' });
    }

    const stats = fs.statSync(filePath);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    const fileStream = fs.createReadStream(filePath);

    fileStream.on('error', (error) => {
      console.error('❌ File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Lỗi khi đọc file' });
      }
    });

    fileStream.on('end', () => {
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Không thể download file' });
    }
  }
};

const TASK_STATUS_LABELS = {
  chua_bat_dau: 'Chưa bắt đầu',
  da_bat_dau: 'Đang thực hiện',
  hoan_thanh: 'Đã hoàn thành',
  huy: 'Đã hủy'
};

const TASK_FILTER_MAP = {
  'tasks-all': {
    id: 'tasks-all',
    title: 'Danh sách công việc lớn',
    sheetName: 'Công việc',
    filterFn: () => true
  },
  'tasks-pending': {
    id: 'tasks-pending',
    title: 'Công việc đang chờ',
    sheetName: 'Công việc - Đang chờ',
    filterFn: (task) => isPendingTask(task)
  },
  'tasks-completed': {
    id: 'tasks-completed',
    title: 'Công việc đã hoàn thành',
    sheetName: 'Công việc - Đã hoàn thành',
    filterFn: (task) => isCompletedTask(task)
  },
  'tasks-overdue': {
    id: 'tasks-overdue',
    title: 'Công việc quá hạn',
    sheetName: 'Công việc - Quá hạn',
    filterFn: (task) => isOverdueTask(task)
  }
};

const getTaskFilterConfigs = (subItems = []) => {
  const requested = (subItems || [])
    .map((itemId) => TASK_FILTER_MAP[itemId])
    .filter(Boolean);

  if (!requested.length) {
    return [TASK_FILTER_MAP['tasks-all']];
  }

  const unique = [];
  const seen = new Set();

  requested.forEach((config) => {
    if (!seen.has(config.id)) {
      seen.add(config.id);
      unique.push(config);
    }
  });

  return unique;
};

const createTaskWorksheet = (worksheet, title, tasks = []) => {
  worksheet.getColumn('A').width = 5;
  worksheet.getColumn('B').width = 30;
  worksheet.getColumn('C').width = 40;
  worksheet.getColumn('D').width = 20;
  worksheet.getColumn('E').width = 15;
  worksheet.getColumn('F').width = 20;
  worksheet.getColumn('G').width = 20;
  worksheet.getColumn('H').width = 18;
  worksheet.getColumn('I').width = 20;
  worksheet.getColumn('J').width = 20;
  worksheet.getColumn('K').width = 25;

  worksheet.mergeCells('A1:K1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = title || 'Danh sách công việc';
  titleCell.font = { name: 'Roboto', size: 14, bold: true };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' }
  };

  const headers = [
    '#', 'Tên công việc', 'Miêu tả', 'Ban phụ trách', 'Loại công việc',
    'Trạng thái', 'Thuộc mốc', 'Số công việc con',
    'Thời gian bắt đầu', 'Thời gian kết thúc', 'Ghi chú'
  ];

  const headerRow = worksheet.getRow(2);
  headerRow.height = 20;
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { name: 'Roboto', size: 11 };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    if (index === 0 || index === 7) {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  if (!tasks || tasks.length === 0) {
    worksheet.mergeCells('A3:K3');
    const emptyCell = worksheet.getCell('A3');
    emptyCell.value = 'Chưa có công việc nào phù hợp điều kiện lọc';
    emptyCell.font = { name: 'Roboto', size: 11, italic: true };
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    emptyCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
    return;
  }

  tasks.forEach((task, index) => {
    const rowNumber = index + 3;
    const row = worksheet.getRow(rowNumber);
    row.height = 20;

    row.getCell(1).value = index + 1;
    row.getCell(2).value = task.title || '';
    row.getCell(3).value = task.description || '';
    row.getCell(4).value = task.departmentName || '';
    row.getCell(5).value = formatTaskTypeText(task.taskType);
    row.getCell(6).value = formatTaskStatusText(task.status);
    row.getCell(7).value = task.milestoneName || '';
    row.getCell(8).value = task.subTaskCount || 0;
    row.getCell(9).value = formatTaskDateText(task.startDate);
    row.getCell(10).value = formatTaskDateText(task.endDate);
    row.getCell(11).value = task.note || '';

    for (let col = 1; col <= 11; col++) {
      const cell = row.getCell(col);
      cell.font = { name: 'Roboto', size: 11 };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
      if (col === 1 || col === 8) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    }
  });

  const totalSubTasks = tasks.reduce((sum, task) => sum + (task.subTaskCount || 0), 0);
  const summaryRowNum = tasks.length + 3;
  worksheet.mergeCells(summaryRowNum, 1, summaryRowNum, 11);
  const summaryCell = worksheet.getCell(summaryRowNum, 1);
  summaryCell.value = `Tổng cộng ${tasks.length} công việc lớn và ${totalSubTasks} công việc con`;
  summaryCell.font = { name: 'Roboto', size: 11, bold: true };
  summaryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
  summaryCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summaryCell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' }
  };
};

const BUDGET_FILTER_MAP = {
  'budget-summary': {
    id: 'budget-summary',
    title: 'Kinh phí sự kiện - Tổng quan',
    sheetName: 'Kinh phí sự kiện',
    filterFn: () => true,
  },
  'budget-expenses': {
    id: 'budget-expenses',
    title: 'Kinh phí sự kiện - Các khoản đã chi',
    sheetName: 'Kinh phí - Đã chi',
    filterFn: (item) => item.actualAmount > 0,
  },
  'budget-revenue': {
    id: 'budget-revenue',
    title: 'Kinh phí sự kiện - Khoản chưa chi',
    sheetName: 'Kinh phí - Chưa chi',
    filterFn: (item) => item.actualAmount === 0,
  },
  'budget-comparison': {
    id: 'budget-comparison',
    title: 'Kinh phí sự kiện - So sánh dự trù & thực tế',
    sheetName: 'Kinh phí - So sánh',
    filterFn: (item) => Math.abs(item.profit || 0) > 0 || item.actualAmount > 0,
  },
};

const getBudgetFilterConfigs = (subItems = []) => {
  const requested = (subItems || [])
    .map((itemId) => BUDGET_FILTER_MAP[itemId])
    .filter(Boolean);

  if (!requested.length) {
    return [BUDGET_FILTER_MAP['budget-summary']];
  }

  const unique = [];
  const seen = new Set();

  requested.forEach((config) => {
    if (!seen.has(config.id)) {
      seen.add(config.id);
      unique.push(config);
    }
  });

  return unique;
};

const CURRENCY_FORMAT = '#,##0" đ"';

const createBudgetWorksheet = (worksheet, title, items = []) => {
  const columns = [
    { width: 4 }, { width: 18 }, { width: 18 }, { width: 32 },
    { width: 12 }, { width: 12 }, { width: 18 }, { width: 20 },
    { width: 25 }, { width: 25 }, { width: 18 }, { width: 18 }, { width: 25 }
  ];

  columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = col.width;
  });

  worksheet.mergeCells('A1:M1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = title || 'Kinh phí sự kiện';
  titleCell.font = { name: 'Roboto', size: 14, bold: true };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' },
  };

  const headers = [
    '#', 'Ban', 'Hạng mục', 'Nội dung', 'Đơn vị tính', 'Số lượng',
    'Đơn giá dự kiến', 'Thành tiền dự kiến', 'Link mua',
    'Ghi chú dự trù', 'Thực tế', 'Lãi', 'Ghi chú',
  ];
  const headerRow = worksheet.getRow(2);
  headerRow.height = 20;
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { name: 'Roboto', size: 11, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F0E3' } };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' },
    };
  });
  if (!items.length) {
    worksheet.mergeCells('A3:M3');
    const emptyCell = worksheet.getCell('A3');
    emptyCell.value = 'Chưa có dữ liệu kinh phí để xuất.';
    emptyCell.font = { name: 'Roboto', size: 11, italic: true };
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    emptyCell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' },
    };
    return;
  }
  const setCurrencyCell = (cell, value) => {
    const numericValue = typeof value === 'number' ? value : Number(value) || 0;
    cell.value = numericValue;
    cell.numFmt = CURRENCY_FORMAT;
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
  };
  let totalEstimated = 0;
  let totalActual = 0;
  let totalProfit = 0;
  items.forEach((item, index) => {
    const rowNumber = index + 3;
    const row = worksheet.getRow(rowNumber);
    row.height = 20;
    row.getCell(1).value = index + 1;
    row.getCell(2).value = item.departmentName || '';
    row.getCell(3).value = item.category || '';
    row.getCell(4).value = item.name || '';
    row.getCell(5).value = item.unit || '';
    row.getCell(6).value = item.quantity || 0;
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    setCurrencyCell(row.getCell(7), item.unitCost || 0);
    setCurrencyCell(row.getCell(8), item.estimatedTotal || 0);

    if (item.purchaseLink) {
      row.getCell(9).value = { text: 'Link', hyperlink: item.purchaseLink };
      row.getCell(9).font = { color: { argb: 'FF1D4ED8' }, underline: true };
      row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      row.getCell(9).value = '';
    }

    row.getCell(10).value = item.plannedNote || '';
    setCurrencyCell(row.getCell(11), item.actualAmount || 0);
    setCurrencyCell(row.getCell(12), item.profit || 0);
    row.getCell(13).value = item.actualNote || '';

    for (let col = 1; col <= headers.length; col++) {
      const cell = row.getCell(col);
      cell.font = { name: 'Roboto', size: 11 };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' },
      };
      if (![6, 7, 8, 9, 10, 11, 12].includes(col)) {
        cell.alignment = cell.alignment || { horizontal: 'left', vertical: 'middle' };
      }
    }

    totalEstimated += item.estimatedTotal || 0;
    totalActual += item.actualAmount || 0;
    totalProfit += item.profit || 0;
  });
  const summaryRowNum = items.length + 3;
  worksheet.mergeCells(summaryRowNum, 1, summaryRowNum, 7);
  const summaryLabelCell = worksheet.getCell(summaryRowNum, 1);
  summaryLabelCell.value = 'Tổng cộng';
  summaryLabelCell.font = { name: 'Roboto', size: 11, bold: true };
  summaryLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6B8AF' } };
  summaryLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summaryLabelCell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' },
  };
  const summaryEstimatedCell = worksheet.getCell(summaryRowNum, 8);
  setCurrencyCell(summaryEstimatedCell, totalEstimated);
  summaryEstimatedCell.font = { ...summaryEstimatedCell.font, bold: true };
  summaryEstimatedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
  summaryEstimatedCell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' },
  };
  const summaryActualCell = worksheet.getCell(summaryRowNum, 11);
  setCurrencyCell(summaryActualCell, totalActual);
  summaryActualCell.font = { ...summaryActualCell.font, bold: true };
  summaryActualCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
  summaryActualCell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' },
  };
  const summaryProfitCell = worksheet.getCell(summaryRowNum, 12);
  setCurrencyCell(summaryProfitCell, totalProfit);
  summaryProfitCell.font = { ...summaryProfitCell.font, bold: true };
  summaryProfitCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
  summaryProfitCell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' },
  };
  const summaryNoteCell = worksheet.getCell(summaryRowNum, 13);
  summaryNoteCell.value = '';
  summaryNoteCell.border = {
    top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' },
  };
};
const formatTaskStatusText = (status) => TASK_STATUS_LABELS[status] || 'Không xác định';
const formatTaskTypeText = (taskType) => (taskType === 'epic' ? 'Lớn' : 'Nhỏ');
const formatTaskDateText = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('vi-VN');
  } catch (error) {
    return '';
  }
};
function isPendingTask(task) {
  return ['chua_bat_dau', 'da_bat_dau'].includes(task?.status);
}
function isCompletedTask(task) {
  return task?.status === 'hoan_thanh';
}
function isOverdueTask(task) {
  if (!task || !task.endDate) return false;
  const dueDate = new Date(task.endDate);
  const now = new Date();
  return dueDate < now && !['hoan_thanh', 'huy'].includes(task.status);
}
const getMilestoneData = async (eventId) => {
  try {
    const result = await listMilestonesByEvent(eventId, {
      skip: 0,
      limit: 1000,
      sortBy: 'targetDate',
      sortDir: 1
    });
    if (!result.items || result.items.length === 0) {
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
    const maxAge = 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    files.forEach(file => {
      const filePath = path.join(exportsDir, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        deletedCount++;
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