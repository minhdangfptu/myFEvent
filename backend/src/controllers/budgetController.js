import EventBudgetPlan from '../models/budgetPlanDep.js';
import { ensureEventExists, ensureDepartmentInEvent } from '../services/departmentService.js';
import { getRequesterMembership } from '../services/eventMemberService.js';
import Department from '../models/department.js';
import User from '../models/user.js';
import mongoose from 'mongoose';
import {
  notifyBudgetSubmitted,
  notifyBudgetApproved,
  notifyBudgetRejected,
  notifyBudgetSentToMembers,
  notifyItemAssigned,
} from '../services/notificationService.js';
import {
  normalizeEvidenceArray,
  decimalToNumber,
  toDecimal128,
  toObjectId,
  getItemKey,
  fetchExpensesForBudgets,
  mergeItemWithExpense,
  populateAssignedInfoForItems,
  buildBudgetWithExpenses,
  loadMembership,
  getIdString
} from '../services/expenseService.js';

// GET /api/events/:eventId/departments/:departmentId/budget/:budgetId
export const getDepartmentBudgetById = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId } = req.params;
    const userId = req.user?.userId || req.user?._id || req.user?.id;

    // Ensure event exists
    await ensureEventExists(eventId);
    
    // Ensure department exists and belongs to event
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Find budget by budgetId
    const budget = await EventBudgetPlan.findOne({
      _id: new mongoose.Types.ObjectId(budgetId),
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    })
      .populate({
        path: 'departmentId',
        select: 'name',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'createdBy',
        select: 'fullName email',
        options: { strictPopulate: false }
      })
      .lean();

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    const membership = await loadMembership(eventId, userId, 'getDepartmentBudgetById');
    const membershipDeptId = getIdString(membership?.departmentId);
    const isHoOC = membership?.role === 'HoOC';
    const isSameDepartment = membershipDeptId && membershipDeptId === getIdString(departmentId);

    // HoOC không được xem draft budgets (budgets đã bị thu hồi)
    if (isHoOC && budget.status === 'draft') {
      return res.status(403).json({ message: 'Budget đã bị thu hồi và không thể xem' });
    }

    // Check if user can view this budget
    if (!isHoOC && !isSameDepartment && !budget.isPublic) {
      return res.status(403).json({ message: 'Budget is private' });
    }

    const formattedBudget = await buildBudgetWithExpenses(budget);

    return res.status(200).json({ data: formattedBudget });
  } catch (error) {
    console.error('getDepartmentBudgetById error:', error);
    console.error('Error stack:', error.stack);
    if (error.message === 'Event not found' || error.message === 'Department not found') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ 
      message: 'Failed to get budget',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET /api/events/:eventId/departments/:departmentId/budget
export const getDepartmentBudget = async (req, res) => {
  try {
    const { eventId, departmentId } = req.params;
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { forReview } = req.query; // Check if this is for review page

    // Ensure event exists
    await ensureEventExists(eventId);
    
    // Ensure department exists and belongs to event
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    let budget = null;

    // If forReview=true, prioritize submitted/changes_requested budgets for review
    if (forReview === 'true') {
      budget = await EventBudgetPlan.findOne({
        eventId: new mongoose.Types.ObjectId(eventId),
        departmentId: new mongoose.Types.ObjectId(departmentId),
        status: { $in: ['submitted', 'changes_requested'] }
      })
        .sort({ createdAt: -1 })
        .populate({
          path: 'departmentId',
          select: 'name',
          options: { strictPopulate: false }
        })
        .populate({
          path: 'createdBy',
          select: 'fullName email',
          options: { strictPopulate: false }
        })
        .lean();
    }

    // If not for review or no submitted budget found, prioritize approved/sent_to_members, then latest
    if (!budget) {
      // First try to get approved or sent_to_members budget
      budget = await EventBudgetPlan.findOne({
        eventId: new mongoose.Types.ObjectId(eventId),
        departmentId: new mongoose.Types.ObjectId(departmentId),
        status: { $in: ['approved', 'sent_to_members', 'locked'] }
      })
        .sort({ createdAt: -1 })
        .populate({
          path: 'departmentId',
          select: 'name',
          options: { strictPopulate: false }
        })
        .populate({
          path: 'createdBy',
          select: 'fullName email',
          options: { strictPopulate: false }
        })
        .lean();
    }
    
    // If no approved/sent_to_members budget, get the latest one (any status)
    if (!budget) {
      budget = await EventBudgetPlan.findOne({
        eventId: new mongoose.Types.ObjectId(eventId),
        departmentId: new mongoose.Types.ObjectId(departmentId)
      })
        .sort({ createdAt: -1 }) // Get the latest budget
        .populate({
          path: 'departmentId',
          select: 'name',
          options: { strictPopulate: false }
        })
        .populate({
          path: 'createdBy',
          select: 'fullName email',
          options: { strictPopulate: false }
        })
        .lean();
    }

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    const membership = await loadMembership(eventId, userId, 'getDepartmentBudget');
    const membershipDeptId = getIdString(membership?.departmentId);
    const isHoOC = membership?.role === 'HoOC';
    const isSameDepartment = membershipDeptId && membershipDeptId === getIdString(departmentId);

    // HoOC không được xem draft budgets (budgets đã bị thu hồi)
    if (isHoOC && budget.status === 'draft') {
      return res.status(403).json({ message: 'Budget đã bị thu hồi và không thể xem' });
    }

    // Check if user can view this budget
    if (!isHoOC && !isSameDepartment && !budget.isPublic) {
      return res.status(403).json({ message: 'Budget is private' });
    }

    try {
      // Validate budget has _id before building
      if (!budget._id) {
        return res.status(500).json({ message: 'Invalid budget data: missing _id' });
      }

      const formattedBudget = await buildBudgetWithExpenses(budget);
      
      if (!formattedBudget) {
        return res.status(200).json({ data: budget });
      }
      
      return res.status(200).json({ data: formattedBudget });
    } catch (buildError) {
      // Return budget without expenses if buildBudgetWithExpenses fails
      // This allows the page to still load even if expense data fails
      return res.status(200).json({ 
        data: budget,
        warning: 'Could not load expense data, showing budget only',
        error: process.env.NODE_ENV === 'development' ? buildError.message : undefined
      });
    }
  } catch (error) {
    console.error('getDepartmentBudget error:', error);
    console.error('Error stack:', error.stack);
    if (error.message === 'Event not found' || error.message === 'Department not found') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ 
      message: 'Failed to get budget',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// POST /api/events/:eventId/departments/:departmentId/budget
export const createDepartmentBudget = async (req, res) => {
  try {
    const { eventId, departmentId } = req.params;
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { items, status = 'draft', name } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required and must be a non-empty array' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Tên đơn ngân sách là bắt buộc' });
    }

    // Ensure event exists
    await ensureEventExists(eventId);
    
    // Ensure department exists and belongs to event
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Allow multiple budgets per department - no need to delete existing budgets

    // Helper function để convert sang Decimal128
    const toDecimal128 = (value, defaultValue = '0') => {
      if (value === null || value === undefined) {
        return mongoose.Types.Decimal128.fromString(defaultValue);
      }
      if (typeof value === 'number') {
        return mongoose.Types.Decimal128.fromString(String(value));
      }
      if (typeof value === 'string') {
        if (!value || value.trim() === '') {
          return mongoose.Types.Decimal128.fromString(defaultValue);
        }
        return mongoose.Types.Decimal128.fromString(value);
      }
      // Nếu đã là Decimal128, giữ nguyên
      if (value && typeof value.toString === 'function') {
        try {
          if (value.constructor && (value.constructor.name === 'Decimal128' || value instanceof mongoose.Types.Decimal128)) {
            return value;
          }
          const str = value.toString();
          if (str && !isNaN(parseFloat(str))) {
            return mongoose.Types.Decimal128.fromString(str);
          }
        } catch (e) {
          // Ignore và fallback
        }
      }
      return mongoose.Types.Decimal128.fromString(defaultValue);
    };

    // Format items - ensure all numeric fields are properly formatted as Decimal128
    const formattedItems = items.map(item => {
      const qty = parseFloat(item.qty) || 1;
      const unitCost = parseFloat(item.unitCost) || 0;
      const total = item.total ? parseFloat(item.total) : (qty * unitCost);
      
      return {
        itemId: item.itemId ? new mongoose.Types.ObjectId(item.itemId) : new mongoose.Types.ObjectId(),
        category: item.category || 'general',
        name: item.name || '',
        unit: item.unit?.trim() || 'cái',
        qty: toDecimal128(qty, '1'),
        unitCost: toDecimal128(unitCost, '0'),
        total: toDecimal128(total, '0'),
        note: item.note || '',
        feedback: item.feedback || '',
        status: item.status || 'pending',
        evidence: normalizeEvidenceArray(item.evidence),
      };
    });

    // Create budget
    const budget = new EventBudgetPlan({
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId),
      status: status,
      currency: 'VND',
      items: formattedItems,
      name: name.trim(),
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    });

    await budget.save();

    return res.status(201).json({ data: budget });
  } catch (error) {
    const { eventId: eventIdParam, departmentId: departmentIdParam } = req.params || {};
    console.error('createDepartmentBudget error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      eventId: eventIdParam || eventId,
      departmentId: departmentIdParam || departmentId,
      itemsCount: items?.length,
      errorName: error.name,
      errorMessage: error.message
    });
    
    if (error.message === 'Event not found' || error.message === 'Department not found') {
      return res.status(404).json({ message: error.message });
    }
    
    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: Object.keys(error.errors || {}).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }
    
    return res.status(500).json({ 
      message: 'Failed to create budget',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// PATCH /api/events/:eventId/departments/:departmentId/budget/:budgetId
export const updateDepartmentBudget = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId } = req.params;
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { items, status, name } = req.body;

    // Ensure event exists
    await ensureEventExists(eventId);
    
    // Ensure department exists and belongs to event
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Find budget
    const budget = await EventBudgetPlan.findOne({
      _id: new mongoose.Types.ObjectId(budgetId),
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    // Cho phép update nếu status là draft, changes_requested, hoặc submitted (để chỉnh sửa và gửi lại)
    // Khi update từ submitted, sẽ tự động chuyển về draft để có thể submit lại
    if (budget.status !== 'draft' && budget.status !== 'changes_requested' && budget.status !== 'submitted') {
      return res.status(400).json({ message: 'Cannot update budget that is not in draft, changes_requested, or submitted status' });
    }
    
    // Nếu đang ở submitted và update, tự động chuyển về draft để có thể submit lại
    if (budget.status === 'submitted' && items && Array.isArray(items)) {
      budget.status = 'draft';
    }

    // Helper function để convert sang Decimal128
    const toDecimal128 = (value, defaultValue = '0') => {
      if (value === null || value === undefined) {
        return mongoose.Types.Decimal128.fromString(defaultValue);
      }
      if (typeof value === 'number') {
        return mongoose.Types.Decimal128.fromString(String(value));
      }
      if (typeof value === 'string') {
        if (!value || value.trim() === '') {
          return mongoose.Types.Decimal128.fromString(defaultValue);
        }
        return mongoose.Types.Decimal128.fromString(value);
      }
      // Nếu đã là Decimal128, giữ nguyên
      if (value && typeof value.toString === 'function') {
        try {
          if (value.constructor && (value.constructor.name === 'Decimal128' || value instanceof mongoose.Types.Decimal128)) {
            return value;
          }
          const str = value.toString();
          if (str && !isNaN(parseFloat(str))) {
            return mongoose.Types.Decimal128.fromString(str);
          }
        } catch (e) {
          // Ignore và fallback
        }
      }
      return mongoose.Types.Decimal128.fromString(defaultValue);
    };

    // Update items if provided
    if (items && Array.isArray(items)) {
      const formattedItems = items.map(item => {
        // Tìm item cũ để giữ lại feedback nếu có
        const oldItem = budget.items?.find(old => 
          old.itemId?.toString() === item.itemId?.toString() || 
          (item.itemId && old.itemId?.toString() === new mongoose.Types.ObjectId(item.itemId).toString())
        );
        
        // Nếu budget chưa được approved, không cho phép set item.status thành "approved"
        let itemStatus = item.status || oldItem?.status || 'pending';
        const currentBudgetStatus = budget.status || 'draft';
        const isBudgetApproved = currentBudgetStatus === 'approved' || currentBudgetStatus === 'sent_to_members' || currentBudgetStatus === 'locked';
        
        if (!isBudgetApproved && itemStatus === 'approved') {
          itemStatus = 'pending';
        }
        
        // Xử lý evidence - đảm bảo lấy từ item mới hoặc giữ lại từ oldItem
        const evidenceInput = item.evidence !== undefined ? item.evidence : (oldItem?.evidence || []);
        const normalizedEvidence = normalizeEvidenceArray(evidenceInput);
        
        // Log để debug (chỉ trong development)
        if (process.env.NODE_ENV === 'development' && evidenceInput && evidenceInput.length > 0) {
          console.log('Evidence processing:', {
            itemId: item.itemId,
            inputEvidence: evidenceInput,
            normalizedEvidence: normalizedEvidence,
            inputLength: evidenceInput.length,
            normalizedLength: normalizedEvidence.length
          });
        }
        
        const qty = parseFloat(item.qty) || 1;
        const unitCost = parseFloat(item.unitCost) || 0;
        const total = item.total ? parseFloat(item.total) : (qty * unitCost);
        
        return {
          itemId: item.itemId ? new mongoose.Types.ObjectId(item.itemId) : new mongoose.Types.ObjectId(),
          category: item.category || 'general',
          name: item.name,
          unit: item.unit?.trim() || 'cái',
          qty: toDecimal128(qty, '1'),
          unitCost: toDecimal128(unitCost, '0'),
          total: toDecimal128(total, '0'),
          note: item.note || '',
          feedback: item.feedback || oldItem?.feedback || '', // Giữ lại feedback cũ nếu không có feedback mới
          status: itemStatus, // Đảm bảo status hợp lệ
          evidence: normalizedEvidence
        };
      });
      budget.items = formattedItems;
    }

    if (typeof name === 'string' && name.trim()) {
      budget.name = name.trim();
    }

    // Update status if provided (chỉ khi không phải auto-change từ submitted)
    if (status && budget.status !== 'submitted') {
      budget.status = status;
    }

    await budget.save();

    return res.status(200).json({ data: budget });
  } catch (error) {
    console.error('updateDepartmentBudget error:', error);
    if (error.message === 'Event not found' || error.message === 'Department not found') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Failed to update budget' });
  }
};

// POST /api/events/:eventId/departments/:departmentId/budget/:budgetId/submit
export const submitBudget = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId } = req.params;
    const userId = req.user?.userId || req.user?._id || req.user?.id;

    console.log('submitBudget called:', { eventId, departmentId, budgetId, userId });

    // Validate budgetId
    if (!mongoose.Types.ObjectId.isValid(budgetId)) {
      return res.status(400).json({ message: 'Invalid budget ID format' });
    }

    // Ensure event exists
    await ensureEventExists(eventId);
    
    // Ensure department exists and belongs to event
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Find budget
    const budget = await EventBudgetPlan.findOne({
      _id: new mongoose.Types.ObjectId(budgetId),
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    console.log('Budget found:', { status: budget.status, itemsCount: budget.items?.length });

    // Cho phép submit từ draft, changes_requested, hoặc submitted (để gửi lại sau khi chỉnh sửa)
    // Nếu đang ở submitted, có nghĩa là đã chỉnh sửa và muốn gửi lại
    if (budget.status !== 'draft' && budget.status !== 'changes_requested' && budget.status !== 'submitted') {
      console.log('Invalid status for submit:', budget.status);
      return res.status(400).json({ 
        message: `Only draft, changes_requested, or submitted budgets can be submitted. Current status: ${budget.status}` 
      });
    }

    // Lưu status cũ để kiểm tra
    const oldStatus = budget.status;
    
    budget.status = 'submitted';
    budget.submittedAt = new Date();
    budget.version = (budget.version || 1) + 1;
    
    // Helper function để convert sang Decimal128 - đặt ngoài để dùng chung
    const toDecimal128 = (value, defaultValue = '0') => {
      if (value === null || value === undefined) {
        return mongoose.Types.Decimal128.fromString(defaultValue);
      }
      if (typeof value === 'number') {
        return mongoose.Types.Decimal128.fromString(String(value));
      }
      if (typeof value === 'string') {
        if (!value || value.trim() === '') {
          return mongoose.Types.Decimal128.fromString(defaultValue);
        }
        return mongoose.Types.Decimal128.fromString(value);
      }
      // Nếu đã là Decimal128
      if (value && typeof value.toString === 'function') {
        try {
          // Kiểm tra xem có phải Decimal128 không
          if (value.constructor && (value.constructor.name === 'Decimal128' || value instanceof mongoose.Types.Decimal128)) {
            return value;
          }
          // Nếu có thể parse, thử convert
          const str = value.toString();
          if (str && !isNaN(parseFloat(str))) {
            return mongoose.Types.Decimal128.fromString(str);
          }
        } catch (e) {
          // Ignore và fallback
        }
      }
      return mongoose.Types.Decimal128.fromString(defaultValue);
    };

    // Normalize items: đảm bảo tất cả items có đầy đủ các field cần thiết
    if (budget.items && budget.items.length > 0) {
      budget.items = budget.items
        .map(item => {
        // Nếu item là mongoose document, convert sang plain object
        let itemObj;
        if (item.toObject && typeof item.toObject === 'function') {
          itemObj = item.toObject();
        } else if (item.toJSON && typeof item.toJSON === 'function') {
          itemObj = item.toJSON();
        } else {
          itemObj = { ...item };
        }
        
        // Clear feedback và reset status khi submit lại từ changes_requested
    // GIỮ NGUYÊN status của items đã approved, chỉ reset status của items rejected/pending
        let currentStatus = itemObj.status || 'pending';
        let newStatus = currentStatus;
        let feedback = itemObj.feedback || '';
        
        if (oldStatus === 'changes_requested') {
        // Giữ nguyên status nếu đã approved, chỉ reset nếu rejected hoặc pending
          newStatus = currentStatus === 'approved' ? 'approved' : 'pending';
          // Giữ feedback nếu approved
          feedback = currentStatus === 'approved' ? (itemObj.feedback || '') : '';
        }
        
        // Đảm bảo evidence là array và các object trong array có đúng format
        let evidence = itemObj.evidence || [];
        if (!Array.isArray(evidence)) {
          evidence = [];
        } else {
          // Validate và clean evidence array
          evidence = evidence.filter(ev => {
            return ev && (ev.type || ev.url); // Chỉ giữ những evidence có type hoặc url
          }).map(ev => ({
            type: ev.type || 'link',
            url: ev.url || '',
            name: ev.name || ''
          }));
        }
        
        // Đảm bảo itemId là ObjectId
        let itemId = itemObj.itemId;
        if (!itemId) {
          itemId = new mongoose.Types.ObjectId();
        } else if (typeof itemId === 'string') {
          try {
            itemId = new mongoose.Types.ObjectId(itemId);
          } catch (e) {
            itemId = new mongoose.Types.ObjectId();
          }
        } else if (itemId && typeof itemId.toString === 'function' && !(itemId instanceof mongoose.Types.ObjectId)) {
          try {
            itemId = new mongoose.Types.ObjectId(itemId.toString());
          } catch (e) {
            itemId = new mongoose.Types.ObjectId();
          }
        }
        
        // Normalize reportedBy
        let reportedBy = itemObj.reportedBy || null;
        if (reportedBy && typeof reportedBy === 'string') {
          try {
            reportedBy = new mongoose.Types.ObjectId(reportedBy);
          } catch (e) {
            reportedBy = null;
          }
        } else if (reportedBy && !(reportedBy instanceof mongoose.Types.ObjectId)) {
          reportedBy = null;
        }
        
        // Đảm bảo category và name không rỗng (required fields)
        const category = (itemObj.category && itemObj.category.trim()) ? itemObj.category.trim() : 'general';
        const name = (itemObj.name && itemObj.name.trim()) ? itemObj.name.trim() : '';
        
        if (!name) {
          console.warn('Item missing name, skipping:', itemObj);
          return null; // Skip items without name
        }
        
        return {
          itemId: itemId,
          category: category,
          name: name,
          unit: itemObj.unit || 'cái',
          qty: toDecimal128(itemObj.qty, '1'),
          unitCost: toDecimal128(itemObj.unitCost, '0'),
          total: toDecimal128(itemObj.total, '0'),
          note: itemObj.note || '',
          feedback: feedback,
          status: newStatus,
          evidence: evidence,
          actualAmount: toDecimal128(itemObj.actualAmount, '0'),
          isPaid: itemObj.isPaid || false,
          memberNote: itemObj.memberNote || '',
          comparison: itemObj.comparison || null,
          reportedBy: reportedBy,
          reportedAt: itemObj.reportedAt || null
        };
        })
        .filter(item => item !== null); // Loại bỏ items không hợp lệ
      
      // Đảm bảo vẫn còn ít nhất 1 item sau khi filter
      if (budget.items.length === 0) {
        return res.status(400).json({ 
          message: 'Budget must have at least one valid item' 
        });
      }
    }

    // Add audit log
    budget.audit = budget.audit || [];
    budget.audit.push({
      at: new Date(),
      by: new mongoose.Types.ObjectId(userId),
      action: 'submitted',
      comment: 'Budget submitted for review'
    });

    // Validate trước khi save
    try {
      // Log để debug
      console.log('Budget before save:', {
        status: budget.status,
        itemsCount: budget.items?.length,
        firstItem: budget.items?.[0] ? {
          itemId: budget.items[0].itemId?.toString(),
          name: budget.items[0].name,
          qty: budget.items[0].qty?.toString(),
          unitCost: budget.items[0].unitCost?.toString(),
          total: budget.items[0].total?.toString(),
          actualAmount: budget.items[0].actualAmount?.toString(),
          evidence: budget.items[0].evidence
        } : null
      });
      
      await budget.save();
      console.log('Budget submitted successfully:', { budgetId: budget._id, status: budget.status });
    } catch (saveError) {
      console.error('Save error:', saveError);
      console.error('Save error name:', saveError.name);
      console.error('Save error message:', saveError.message);
      console.error('Save error stack:', saveError.stack);
      
      // Nếu là validation error, trả về thông báo chi tiết
      if (saveError.name === 'ValidationError') {
        const errorMessages = Object.keys(saveError.errors || {}).map(key => {
          return `${key}: ${saveError.errors[key].message}`;
        });
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: errorMessages.length > 0 ? errorMessages : [saveError.message],
          details: saveError.errors || {}
        });
      }
      
      // Nếu là CastError hoặc lỗi khác
      if (saveError.name === 'CastError') {
        return res.status(400).json({ 
          message: `Invalid data format: ${saveError.message}`,
          path: saveError.path,
          value: saveError.value
        });
      }
      
      return res.status(400).json({ 
        message: saveError.message || 'Failed to save budget',
        error: saveError.name || 'Unknown error'
      });
    }

    // Populate và format response
    const savedBudget = await EventBudgetPlan.findById(budget._id)
      .populate('departmentId', 'name')
      .lean();
    
    // Send notification to HoOC
    try {
      await notifyBudgetSubmitted(eventId, departmentId, budgetId);
    } catch (notifError) {
      console.error('Error sending budget submitted notification:', notifError);
      // Don't fail the request if notification fails
    }
    
    return res.status(200).json({ 
      data: savedBudget,
      message: 'Budget submitted successfully'
    });
  } catch (error) {
    console.error('submitBudget error:', error);
    console.error('Error stack:', error.stack);
    if (error.message === 'Event not found' || error.message === 'Department not found') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ 
      message: 'Failed to submit budget', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// POST /api/events/:eventId/departments/:departmentId/budget/:budgetId/recall
export const recallBudget = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId } = req.params;
    const userId = req.user?.userId || req.user?._id || req.user?.id;

    // Ensure event exists
    await ensureEventExists(eventId);
    
    // Ensure department exists and belongs to event
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Find budget
    const budget = await EventBudgetPlan.findOne({
      _id: new mongoose.Types.ObjectId(budgetId),
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    if (budget.status !== 'submitted') {
      return res.status(400).json({ message: 'Only submitted budgets can be recalled' });
    }

    budget.status = 'draft';
    
    // Add audit log
    budget.audit = budget.audit || [];
    budget.audit.push({
      at: new Date(),
      by: new mongoose.Types.ObjectId(userId),
      action: 'comment',
      comment: 'Budget recalled by department'
    });

    await budget.save();

    return res.status(200).json({ data: budget });
  } catch (error) {
    console.error('recallBudget error:', error);
    if (error.message === 'Event not found' || error.message === 'Department not found') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Failed to recall budget' });
  }
};

// DELETE /api/events/:eventId/departments/:departmentId/budget/:budgetId
export const deleteDepartmentBudget = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId } = req.params;

    // Ensure event exists
    await ensureEventExists(eventId);
    
    // Ensure department exists and belongs to event
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Find budget
    const budget = await EventBudgetPlan.findOne({
      _id: new mongoose.Types.ObjectId(budgetId),
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    // Cho phép xóa draft, không cho phép xóa submitted (chờ duyệt), approved, sent_to_members, locked
    if (budget.status === 'submitted') {
      return res.status(400).json({ message: 'Cannot delete budget that is waiting for approval (submitted)' });
    }
    if (budget.status === 'approved' || budget.status === 'sent_to_members' || budget.status === 'locked') {
      return res.status(400).json({ message: 'Cannot delete budget that is approved, sent to members, or locked' });
    }

    await EventBudgetPlan.deleteOne({ _id: budget._id });

    return res.status(200).json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('deleteDepartmentBudget error:', error);
    if (error.message === 'Event not found' || error.message === 'Department not found') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Failed to delete budget' });
  }
};

// PATCH /api/events/:eventId/departments/:departmentId/budget/:budgetId/review/draft
export const saveReviewDraft = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId } = req.params;
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { items } = req.body;

    // Ensure event exists
    await ensureEventExists(eventId);
    
    // Ensure department exists and belongs to event
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Find budget
    const budget = await EventBudgetPlan.findOne({
      _id: new mongoose.Types.ObjectId(budgetId),
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    // Update items with review status and feedback
    if (items && Array.isArray(items)) {
      const updatedItems = budget.items.map(budgetItem => {
        // Tìm review item tương ứng
        const reviewItem = items.find(item => {
          const reviewItemId = item.itemId?.toString() || item.itemId?._id?.toString() || item.itemId;
          const budgetItemId = budgetItem.itemId?.toString() || budgetItem._id?.toString() || budgetItem.itemId;
          return String(reviewItemId) === String(budgetItemId);
        });

        if (reviewItem) {
          // Cập nhật feedback và status từ review
          return {
            itemId: budgetItem.itemId,
            category: budgetItem.category || 'general',
            name: budgetItem.name,
            unit: budgetItem.unit || 'cái',
            qty: budgetItem.qty,
            unitCost: budgetItem.unitCost,
            total: budgetItem.total,
            note: budgetItem.note || '',
            feedback: reviewItem.feedback !== undefined ? reviewItem.feedback : (budgetItem.feedback || ''),
            status: reviewItem.status || budgetItem.status || 'pending'
          };
        }
        // Giữ nguyên item nếu không có review
        return {
          itemId: budgetItem.itemId,
          category: budgetItem.category || 'general',
          name: budgetItem.name,
          unit: budgetItem.unit || 'cái',
          qty: budgetItem.qty,
          unitCost: budgetItem.unitCost,
          total: budgetItem.total,
          note: budgetItem.note || '',
          feedback: budgetItem.feedback || '',
          status: budgetItem.status || 'pending'
        };
      });

      budget.items = updatedItems;
      
      // Determine overall budget status based on items
      // Nếu có ít nhất 1 item bị rejected → budget bị từ chối (changes_requested)
      // Nếu tất cả items đều approved → budget được duyệt (approved)
      // Nếu có items pending → giữ nguyên submitted (chưa duyệt hết)
      const hasRejected = budget.items.some(item => item.status === 'rejected');
      const allApproved = budget.items.every(item => item.status === 'approved');
      const hasPending = budget.items.some(item => item.status === 'pending');
      
      // Update budget status based on items
      // Priority: rejected > all approved > pending
      if (hasRejected) {
        // Có item bị từ chối → budget bị từ chối (luôn cập nhật, kể cả nếu đã approved trước đó)
        budget.status = 'changes_requested';
      } else if (allApproved) {
        // Tất cả items đều được duyệt → budget được duyệt
        budget.status = 'approved';
      } else if (hasPending) {
        // Còn items pending → set về submitted để HoOC tiếp tục duyệt
        // Chỉ set về submitted nếu budget đang ở trạng thái có thể review
        if (budget.status === 'submitted' || budget.status === 'changes_requested' || budget.status === 'draft') {
          budget.status = 'submitted';
        }
        // Nếu đã approved và có pending items, giữ nguyên approved (không downgrade)
      }
    }

    await budget.save();

    return res.status(200).json({ data: budget });
  } catch (error) {
    console.error('saveReviewDraft error:', error);
    if (error.message === 'Event not found' || error.message === 'Department not found') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Failed to save review draft' });
  }
};

// POST /api/events/:eventId/departments/:departmentId/budget/:budgetId/review/complete
export const completeReview = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId } = req.params;
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { items } = req.body;

    // Ensure event exists
    await ensureEventExists(eventId);
    
    // Ensure department exists and belongs to event
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Find budget
    const budget = await EventBudgetPlan.findOne({
      _id: new mongoose.Types.ObjectId(budgetId),
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    // Allow review for submitted budgets or changes_requested budgets (if resubmitted)
    // Note: changes_requested budgets can be reviewed again if HoD has made changes and resubmitted
    if (budget.status !== 'submitted' && budget.status !== 'changes_requested') {
      console.log('completeReview: Invalid budget status', {
        budgetId: budget._id,
        currentStatus: budget.status,
        allowedStatuses: ['submitted', 'changes_requested']
      });
      return res.status(400).json({ 
        message: `Only submitted or changes_requested budgets can be reviewed. Current status: ${budget.status}` 
      });
    }

    // Validate items array
    if (!items || !Array.isArray(items)) {
      console.log('completeReview: Invalid items format', {
        budgetId: budget._id,
        itemsType: typeof items,
        isArray: Array.isArray(items)
      });
      return res.status(400).json({ 
        message: 'Items must be an array' 
      });
    }

    // Log for debugging
    console.log('completeReview: Processing review', {
      budgetId: budget._id,
      status: budget.status,
      itemsCount: items.length,
      budgetItemsCount: budget.items?.length
    });

    // Update items with review status and feedback
    if (items && Array.isArray(items)) {
      const updatedItems = budget.items.map(budgetItem => {
        // Tìm review item tương ứng
        const reviewItem = items.find(item => {
          const reviewItemId = item.itemId?.toString() || item.itemId?._id?.toString() || item.itemId;
          const budgetItemId = budgetItem.itemId?.toString() || budgetItem._id?.toString() || budgetItem.itemId;
          return String(reviewItemId) === String(budgetItemId);
        });

        if (reviewItem) {
          // Cập nhật feedback và status từ review
          return {
            itemId: budgetItem.itemId,
            category: budgetItem.category || 'general',
            name: budgetItem.name,
            unit: budgetItem.unit || 'cái',
            qty: budgetItem.qty,
            unitCost: budgetItem.unitCost,
            total: budgetItem.total,
            note: budgetItem.note || '',
            feedback: reviewItem.feedback !== undefined ? reviewItem.feedback : '',
            status: reviewItem.status || 'pending'
          };
        }
        // Giữ nguyên item nếu không có review
        return {
          itemId: budgetItem.itemId,
          category: budgetItem.category || 'general',
          name: budgetItem.name,
          unit: budgetItem.unit || 'cái',
          qty: budgetItem.qty,
          unitCost: budgetItem.unitCost,
          total: budgetItem.total,
          note: budgetItem.note || '',
          feedback: budgetItem.feedback || '',
          status: budgetItem.status || 'pending'
        };
      });

      budget.items = updatedItems;
    }

    // Determine overall budget status based on items
    // Nếu có ít nhất 1 item bị rejected → budget bị từ chối (changes_requested)
    // Nếu tất cả items đều approved → budget được duyệt (approved)
    // Nếu có items pending → giữ nguyên submitted (chưa duyệt hết)
    const hasRejected = budget.items.some(item => item.status === 'rejected');
    const allApproved = budget.items.every(item => item.status === 'approved');
    const hasPending = budget.items.some(item => item.status === 'pending');
    
    let newStatus = budget.status; // Giữ nguyên status mặc định
    if (hasRejected) {
      // Có item bị từ chối → budget bị từ chối
      newStatus = 'changes_requested';
    } else if (allApproved) {
      // Tất cả items đều được duyệt → budget được duyệt
      newStatus = 'approved';
    } else if (hasPending) {
      // Còn items pending → giữ nguyên submitted để HoOC tiếp tục duyệt
      newStatus = 'submitted';
    } else {
      // Trường hợp khác (có thể có approved và pending) → giữ submitted
      newStatus = 'submitted';
    }

    budget.status = newStatus;

    // Add audit log
    budget.audit = budget.audit || [];
    budget.audit.push({
      at: new Date(),
      by: new mongoose.Types.ObjectId(userId),
      action: newStatus === 'approved' ? 'approved' : (newStatus === 'changes_requested' ? 'changes_requested' : 'submitted'),
      comment: `Budget review completed - ${newStatus}`
    });

    // Đảm bảo budget được lưu với status mới
    const savedBudget = await budget.save();
    
    // Log để debug
    console.log('Budget saved after review:', {
      budgetId: savedBudget._id,
      departmentId: savedBudget.departmentId,
      status: savedBudget.status,
      itemsCount: savedBudget.items?.length,
      hasRejected,
      allApproved,
      hasPending
    });

    // Send notification based on review result
    try {
      if (newStatus === 'approved') {
        await notifyBudgetApproved(eventId, departmentId, budgetId);
      } else if (newStatus === 'changes_requested') {
        await notifyBudgetRejected(eventId, departmentId, budgetId);
      }
    } catch (notifError) {
      console.error('Error sending budget review notification:', notifError);
      // Don't fail the request if notification fails
    }

    return res.status(200).json({ data: budget });
  } catch (error) {
    console.error('completeReview error:', error);
    if (error.message === 'Event not found' || error.message === 'Department not found') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Failed to complete review' });
  }
};

// GET /api/events/:eventId/departments/:departmentId/budgets - Lấy tất cả budgets của một department
export const getAllBudgetsForDepartment = async (req, res) => {
  try {
    const { eventId, departmentId } = req.params;
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    await ensureEventExists(eventId);
    await ensureDepartmentInEvent(eventId, departmentId);

    const filter = {
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    };

    // Tối ưu: Chỉ select những trường cần thiết cho danh sách
    const selectFields = '_id name status submittedAt createdAt updatedAt departmentId createdBy';
    
    const [budgets, total] = await Promise.all([
      EventBudgetPlan.find(filter)
        .select(selectFields)
        .populate('departmentId', 'name')
        .populate('createdBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EventBudgetPlan.countDocuments(filter)
    ]);

    // Load items chỉ để tính totalCost và totalItems, không cần chi tiết
    const budgetIds = budgets.map(b => b._id);
    const budgetsWithItems = await EventBudgetPlan.find({
      _id: { $in: budgetIds }
    })
      .select('_id items')
      .lean();
    
    const itemsMap = new Map();
    budgetsWithItems.forEach(budget => {
      itemsMap.set(budget._id.toString(), budget.items || []);
    });

    const formattedBudgets = budgets.map(budget => {
      const budgetItems = itemsMap.get(budget._id.toString()) || [];
      const totalCost = budgetItems.reduce(
        (sum, item) => sum + (parseFloat(item.total?.toString() || 0)),
        0
      ) || 0;

      return {
        _id: budget._id,
        id: budget._id,
        departmentId: budget.departmentId?._id || budget.departmentId,
        departmentName: budget.departmentId?.name || 'Unknown',
        name: budget.name || 'Budget Ban',
        creatorName: budget.createdBy?.fullName || budget.createdBy?.name || null,
        status: budget.status,
        totalCost: totalCost,
        totalItems: budgetItems.length,
        submittedAt: budget.submittedAt || budget.createdAt,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt,
      };
    });

    return res.status(200).json({
      data: formattedBudgets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('getAllBudgetsForDepartment error:', error);
    if (error.message === 'Event not found' || error.message === 'Department not found') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Failed to get budgets' });
  }
};

// GET /api/events/:eventId/budgets - HoOC: Lấy tất cả budgets của event
export const getAllBudgetsForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const status = req.query.status; // submitted, approved, changes_requested, sent_to_members, completed
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    // Ensure event exists
    await ensureEventExists(eventId);

    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const membership = await loadMembership(eventId, userId, 'getAllBudgetsForEvent');
    const isHoOC = membership?.role === 'HoOC';
    const membershipDeptId = getIdString(membership?.departmentId);

    // Build filter - HoOC xem tất cả budgets của tất cả departments (KHÔNG bao gồm draft - budgets đã bị thu hồi)
    const filter = {
      eventId: new mongoose.Types.ObjectId(eventId)
    };
    
    if (!isHoOC) {
      const orConditions = [];
      if (membershipDeptId && mongoose.Types.ObjectId.isValid(membershipDeptId)) {
        orConditions.push({ departmentId: new mongoose.Types.ObjectId(membershipDeptId) });
      }
      orConditions.push({ isPublic: true });
      filter.$or = orConditions;
    }
    
    // Nếu có status filter
    if (status === 'completed') {
      // Lấy budgets có status = sent_to_members và tất cả items đã submitted
      filter.status = 'sent_to_members';
    } else if (status) {
      filter.status = status;
    } else if (isHoOC) {
      // HoOC không được xem draft budgets (budgets đã bị thu hồi)
      // Nếu không có status filter, loại bỏ draft
      filter.status = { $ne: 'draft' };
    }

    // Tối ưu: Chỉ load những trường cần thiết cho danh sách, không load chi tiết items
    // Select chỉ những trường cần thiết để giảm dữ liệu transfer
    const selectFields = '_id name status submittedAt createdAt isPublic departmentId createdBy';
    
    // Find budgets with pagination - chỉ select những trường cần thiết
    const [budgets, total] = await Promise.all([
      EventBudgetPlan.find(filter)
        .select(selectFields)
        .populate('departmentId', 'name leaderId')
        .populate('createdBy', 'fullName email')
        .sort({ submittedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EventBudgetPlan.countDocuments(filter)
    ]);

    // Tối ưu: Chỉ load items và expenses khi cần tính toán submittedCount (cho completed filter)
    // Với các tab khác, chỉ cần tổng số items
    let expensesByBudget = new Map();
    let itemsData = new Map();
    
    if (status === 'completed') {
      // Chỉ load items và expenses khi filter là 'completed'
      const budgetIds = budgets.map(b => b._id);
      expensesByBudget = await fetchExpensesForBudgets(budgetIds);
      
      // Load items chỉ cho những budgets cần kiểm tra
      const budgetsWithItems = await EventBudgetPlan.find({
        _id: { $in: budgetIds }
      })
        .select('_id items')
        .lean();
      
      budgetsWithItems.forEach(budget => {
        itemsData.set(budget._id.toString(), budget.items || []);
      });
    } else {
      // Với các tab khác, chỉ cần đếm số items, không cần chi tiết
      const budgetIds = budgets.map(b => b._id);
      const budgetsWithItemCount = await EventBudgetPlan.find({
        _id: { $in: budgetIds }
      })
        .select('_id items')
        .lean();
      
      budgetsWithItemCount.forEach(budget => {
        itemsData.set(budget._id.toString(), budget.items || []);
      });
    }

    // Format budgets for frontend
    const formattedBudgets = await Promise.all(budgets.map(async (budget) => {
      const department = budget.departmentId;
      const budgetItems = itemsData.get(budget._id.toString()) || [];
      
      // Tính totalCost từ items
      const totalCost = budgetItems.reduce(
        (sum, item) => sum + (parseFloat(item.total?.toString() || 0)),
        0
      ) || 0;
      
      const totalItems = budgetItems.length;
      let submittedCount = 0;
      let allItemsSubmitted = false;

      if (status === 'completed') {
        // Chỉ tính submittedCount khi filter là 'completed'
        const planExpenses = expensesByBudget.get(budget._id.toString()) || new Map();
        const itemsWithExpenses = budgetItems.map(item => {
          const key = getItemKey(item.itemId) || getItemKey(item._id);
          const expense = key ? planExpenses.get(key) : null;
          return mergeItemWithExpense(item, expense);
        });
        submittedCount = itemsWithExpenses.filter(item => item.submittedStatus === 'submitted').length;
        allItemsSubmitted = totalItems > 0 ? submittedCount === totalItems : false;
      } else {
        // Với các tab khác, không cần tính submittedCount chi tiết
        submittedCount = 0;
        allItemsSubmitted = false;
      }

      // Get creator name from department leader
      let creatorName = budget.createdBy?.fullName || budget.createdBy?.name || '';
      if (!creatorName && department?.leaderId) {
        const leaderId = typeof department.leaderId === 'object' 
          ? department.leaderId._id || department.leaderId 
          : department.leaderId;
        if (leaderId) {
          const leader = await User.findById(leaderId).select('fullName').lean();
          creatorName = leader?.fullName || '';
        }
      }

      // Nếu filter là 'completed', chỉ trả về budgets đã hoàn thành
      if (status === 'completed' && !allItemsSubmitted) {
        return null;
      }

      const formatted = {
        _id: budget._id,
        id: budget._id,
        departmentId: budget.departmentId?._id || budget.departmentId,
        departmentName: department?.name || 'Chưa có',
        name: budget.name || 'Budget Ban',
        creatorName: creatorName,
        submittedAt: budget.submittedAt || budget.createdAt,
        createdAt: budget.createdAt,
        status: budget.status,
        totalCost: totalCost,
        allItemsSubmitted: allItemsSubmitted,
        submittedCount: submittedCount,
        totalItems: totalItems,
        // Không trả về items chi tiết cho danh sách - chỉ trả về khi xem chi tiết
        isPublic: budget.isPublic,
      };

      return formatted;
    }));

    // Filter out null values (for completed filter)
    const filteredBudgets = formattedBudgets.filter(b => b !== null);

    // Update total count for completed filter / visibility filter
    const finalTotal = status === 'completed' ? filteredBudgets.length : (isHoOC ? total : filteredBudgets.length);

    return res.status(200).json({
      data: filteredBudgets,
      pagination: {
        page,
        limit,
        total: finalTotal,
        totalPages: Math.ceil(finalTotal / limit)
      }
    });
  } catch (error) {
    console.error('getAllBudgetsForEvent error:', error);
    if (error.message === 'Event not found') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Failed to get budgets' });
  }
};

// PATCH /api/events/:eventId/departments/:departmentId/budget/:budgetId/categories
// HoD: Cập nhật danh sách categories
export const updateCategories = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId } = req.params;
    const { categories } = req.body;

    await ensureEventExists(eventId);
    await ensureDepartmentInEvent(eventId, departmentId);

    const budget = await EventBudgetPlan.findOne({
      _id: new mongoose.Types.ObjectId(budgetId),
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    if (budget.status === 'locked') {
      return res.status(400).json({ message: 'Cannot update categories for locked budgets' });
    }

    if (Array.isArray(categories)) {
      budget.categories = categories.filter(cat => cat && cat.trim());
    }

    await budget.save();

    return res.status(200).json({ data: budget });
  } catch (error) {
    console.error('updateCategories error:', error);
    return res.status(500).json({ message: 'Failed to update categories' });
  }
};

// GET /api/events/:eventId/budgets/statistics
// Lấy thống kê thu chi cho event
export const getBudgetStatistics = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { departmentId } = req.query || {};
    const userId = req.user?.userId || req.user?._id || req.user?.id;

    await ensureEventExists(eventId);

    let membership = null;
    if (userId) {
      try {
        membership = await getRequesterMembership(eventId, userId);
      } catch (error) {
        console.warn('getBudgetStatistics: unable to load membership', error?.message);
      }
    }

    let effectiveDepartmentId = departmentId;
    // membership.departmentId có thể là ObjectId hoặc object đã populate
    let membershipDeptId = null;
    if (membership?.departmentId) {
      if (typeof membership.departmentId === 'object' && membership.departmentId._id) {
        // Đã populate
        membershipDeptId = membership.departmentId._id.toString();
      } else if (typeof membership.departmentId === 'object' && membership.departmentId.toString) {
        // ObjectId chưa populate
        membershipDeptId = membership.departmentId.toString();
      } else if (typeof membership.departmentId === 'string') {
        // String
        membershipDeptId = membership.departmentId;
      }
    }
    const membershipRole = membership?.role;

    // Nếu không có membership, chỉ cho phép nếu có departmentId trong query (cho public access hoặc admin)
    if (!membership) {
      // Nếu không có departmentId trong query và không có membership, từ chối
      if (!effectiveDepartmentId) {
        return res.status(403).json({ message: 'Bạn không có quyền xem thống kê. Vui lòng đăng nhập và tham gia sự kiện.' });
      }
    } else if (membershipRole && membershipRole !== 'HoOC') {
      // Nếu không phải HoOC, phải có departmentId
      if (!membershipDeptId && !effectiveDepartmentId) {
        return res.status(403).json({ message: 'Bạn không thuộc ban nào để xem thống kê' });
      }

      // Nếu có departmentId trong query, kiểm tra xem user có quyền xem department đó không
      if (effectiveDepartmentId) {
        // Kiểm tra xem user có phải là leader của department đó không (cho HoD)
        if (membershipRole === 'HoD') {
          try {
            const dept = await Department.findOne({
              _id: new mongoose.Types.ObjectId(effectiveDepartmentId),
              eventId: new mongoose.Types.ObjectId(eventId),
              leaderId: new mongoose.Types.ObjectId(userId)
            }).lean();

            if (!dept) {
              // Nếu không phải leader, kiểm tra xem có phải departmentId của membership không
              if (membershipDeptId && membershipDeptId !== effectiveDepartmentId) {
                return res.status(403).json({ message: 'Bạn chỉ được xem thống kê của ban mình' });
              }
              // Nếu không có membershipDeptId, từ chối
              if (!membershipDeptId) {
                return res.status(403).json({ message: 'Bạn không có quyền xem thống kê của ban này' });
              }
            }
          } catch (error) {
            // Fallback: kiểm tra membershipDeptId
            if (membershipDeptId && membershipDeptId !== effectiveDepartmentId) {
              return res.status(403).json({ message: 'Bạn chỉ được xem thống kê của ban mình' });
            }
          }
        } else {
          // Nếu không phải HoD, phải khớp với membershipDeptId
          if (membershipDeptId && membershipDeptId !== effectiveDepartmentId) {
            return res.status(403).json({ message: 'Bạn chỉ được xem thống kê của ban mình' });
          }
        }
      } else {
        // Nếu không có departmentId trong query, dùng từ membership
        if (!membershipDeptId) {
          return res.status(403).json({ message: 'Bạn không thuộc ban nào để xem thống kê' });
        }
        effectiveDepartmentId = membershipDeptId;
      }
    }
    // Nếu là HoOC, không cần giới hạn departmentId (có thể xem tất cả hoặc filter theo query)

    const filter = {
      eventId: new mongoose.Types.ObjectId(eventId)
    };

    if (effectiveDepartmentId) {
      if (!mongoose.Types.ObjectId.isValid(effectiveDepartmentId)) {
        return res.status(400).json({ message: 'departmentId không hợp lệ' });
      }
      filter.departmentId = new mongoose.Types.ObjectId(effectiveDepartmentId);
    }

    // Lấy tất cả budgets (không lấy draft) để đếm số lượng
    // Nhưng chỉ tính tiền cho budgets đã được duyệt (approved, sent_to_members, locked)
    filter.status = { $in: ['submitted', 'approved', 'changes_requested', 'sent_to_members', 'locked'] };
    
    const allBudgets = await EventBudgetPlan.find(filter)
      .populate('departmentId', 'name')
      .lean();

    // Đếm số lượng budgets theo từng trạng thái
    const budgetCounts = {
      submitted: 0,
      approved: 0,
      changes_requested: 0,
      sent_to_members: 0,
      locked: 0,
      total: allBudgets.length
    };
    
    allBudgets.forEach(budget => {
      const status = budget.status || 'draft';
      if (budgetCounts.hasOwnProperty(status)) {
        budgetCounts[status]++;
      }
    });

    // Chỉ lấy budgets đã được duyệt để tính tiền
    const approvedBudgets = allBudgets.filter(b => 
      ['approved', 'sent_to_members', 'locked'].includes(b.status)
    );

    const expensesByBudget = await fetchExpensesForBudgets(approvedBudgets.map(b => b._id));

    // Tính toán thống kê - chỉ tính tiền cho budgets đã được duyệt
    let totalEstimated = 0;
    let totalActual = 0;
    const departmentStats = [];

    for (const budget of approvedBudgets) {
      const deptEstimated = budget.items?.reduce(
        (sum, item) => sum + (parseFloat(item.total?.toString() || 0)),
        0
      ) || 0;
      const planExpenses = expensesByBudget.get(budget._id.toString()) || new Map();
      const expenseValues = Array.from(planExpenses.values());

      const deptActual = expenseValues.reduce(
        (sum, expense) => sum + decimalToNumber(expense.actualAmount),
        0
      );

      totalEstimated += deptEstimated;
      totalActual += deptActual;

      departmentStats.push({
        departmentId: budget.departmentId?._id || budget.departmentId,
        departmentName: budget.departmentId?.name || 'Unknown',
        estimated: deptEstimated,
        actual: deptActual,
        difference: deptActual - deptEstimated,
        status: budget.status
      });
    }

    // Thêm thống kê cho tất cả departments (kể cả chưa duyệt/từ chối) để hiển thị số lượng
    const allDepartmentStats = [];
    const deptMap = new Map();
    
    // Nhóm budgets theo department
    allBudgets.forEach(budget => {
      const deptId = budget.departmentId?._id?.toString() || budget.departmentId?.toString() || budget.departmentId;
      const deptName = budget.departmentId?.name || 'Unknown';
      
      if (!deptMap.has(deptId)) {
        deptMap.set(deptId, {
          departmentId: budget.departmentId?._id || budget.departmentId,
          departmentName: deptName,
          budgets: [],
          approvedCount: 0,
          submittedCount: 0,
          rejectedCount: 0
        });
      }
      
      const deptStat = deptMap.get(deptId);
      deptStat.budgets.push(budget);
      
      if (['approved', 'sent_to_members', 'locked'].includes(budget.status)) {
        deptStat.approvedCount++;
      } else if (budget.status === 'submitted') {
        deptStat.submittedCount++;
      } else if (budget.status === 'changes_requested') {
        deptStat.rejectedCount++;
      }
    });

    // Tính tiền cho từng department (chỉ từ budgets đã duyệt)
    const approvedDeptMap = new Map();
    approvedBudgets.forEach(budget => {
      const deptId = budget.departmentId?._id?.toString() || budget.departmentId?.toString() || budget.departmentId;
      if (!approvedDeptMap.has(deptId)) {
        approvedDeptMap.set(deptId, {
          estimated: 0,
          actual: 0
        });
      }
      
      const deptStat = approvedDeptMap.get(deptId);
      const deptEstimated = budget.items?.reduce(
        (sum, item) => sum + (parseFloat(item.total?.toString() || 0)),
        0
      ) || 0;
      const planExpenses = expensesByBudget.get(budget._id.toString()) || new Map();
      const expenseValues = Array.from(planExpenses.values());
      const deptActual = expenseValues.reduce(
        (sum, expense) => sum + decimalToNumber(expense.actualAmount),
        0
      );
      
      deptStat.estimated += deptEstimated;
      deptStat.actual += deptActual;
    });

    // Tạo departmentStats với đầy đủ thông tin
    deptMap.forEach((deptStat, deptId) => {
      const approvedData = approvedDeptMap.get(deptId) || { estimated: 0, actual: 0 };
      allDepartmentStats.push({
        departmentId: deptStat.departmentId,
        departmentName: deptStat.departmentName,
        estimated: approvedData.estimated,
        actual: approvedData.actual,
        difference: approvedData.actual - approvedData.estimated,
        approvedCount: deptStat.approvedCount,
        submittedCount: deptStat.submittedCount,
        rejectedCount: deptStat.rejectedCount,
        totalCount: deptStat.budgets.length
      });
    });

    return res.status(200).json({
      data: {
        totalEstimated,
        totalActual,
        totalDifference: totalActual - totalEstimated,
        budgetCounts,
        departmentStats: allDepartmentStats
      }
    });
  } catch (error) {
    console.error('getBudgetStatistics error:', error);
    if (error.message === 'Event not found') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Failed to get budget statistics' });
  }
};

// POST /api/events/:eventId/departments/:departmentId/budget/:budgetId/send-to-members
export const sendBudgetToMembers = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId } = req.params;
    const userId = req.user?.userId || req.user?._id || req.user?.id;

    await ensureEventExists(eventId);
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const budget = await EventBudgetPlan.findOne({
      _id: new mongoose.Types.ObjectId(budgetId),
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    if (budget.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved budgets can be sent to members' });
    }

    // Validate: Tất cả items phải được assign trước khi gửi cho members
    const unassignedItems = budget.items.filter(item => !item.assignedTo);
    if (unassignedItems.length > 0) {
      return res.status(400).json({ 
        message: `Cannot send budget to members. ${unassignedItems.length} item(s) are not assigned yet. Please assign all items first.` 
      });
    }

    budget.status = 'sent_to_members';

    budget.audit = budget.audit || [];
    budget.audit.push({
      at: new Date(),
      by: new mongoose.Types.ObjectId(userId),
      action: 'sent_to_members',
      comment: 'Budget sent to members for expense reporting'
    });

    await budget.save();

    // Send notification to members
    try {
      await notifyBudgetSentToMembers(eventId, departmentId, budgetId);
    } catch (notifError) {
      console.error('Error sending budget sent to members notification:', notifError);
      // Don't fail the request if notification fails
    }

    return res.status(200).json({ data: budget });
  } catch (error) {
    console.error('sendBudgetToMembers error:', error);
    return res.status(500).json({ message: 'Failed to send budget to members' });
  }
};

// PATCH /api/events/:eventId/departments/:departmentId/budget/:budgetId/visibility
export const updateBudgetVisibility = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId } = req.params;
    const { isPublic } = req.body;
    const userId = req.user?.userId || req.user?._id || req.user?.id;

    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ message: 'isPublic must be a boolean' });
    }

    await ensureEventExists(eventId);
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const membership = await loadMembership(eventId, userId, 'updateBudgetVisibility');
    if (!membership || membership.role !== 'HoOC') {
      return res.status(403).json({ message: 'Chỉ Trưởng Ban Tổ Chức mới có quyền thay đổi trạng thái công khai của ngân sách.' });
    }

    let actorId;
    try {
      actorId = userId instanceof mongoose.Types.ObjectId ? userId : new mongoose.Types.ObjectId(userId);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const budget = await EventBudgetPlan.findOne({
      _id: new mongoose.Types.ObjectId(budgetId),
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    budget.isPublic = isPublic;

    budget.audit = budget.audit || [];
    budget.audit.push({
      at: new Date(),
      by: actorId,
      action: isPublic ? 'public' : 'private',
      comment: isPublic ? 'Budget made public' : 'Budget visibility set to private'
    });

    await budget.save();

    const formattedBudget = await buildBudgetWithExpenses(budget);

    return res.status(200).json({ data: formattedBudget });
  } catch (error) {
    console.error('updateBudgetVisibility error:', error);
    return res.status(500).json({ message: 'Failed to update budget visibility' });
  }
};


// PATCH /api/events/:eventId/departments/:departmentId/budget/:budgetId/items/:itemId/assign
export const assignItem = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId, itemId } = req.params;
    // Get userId from req.user (set by authMiddleware)
    const userId = req.user?.id || req.user?.userId || req.user?._id;
    const { memberId } = req.body; // EventMember ID

    // Validate userId
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate itemId
    if (!itemId) {
      return res.status(400).json({ message: 'Item ID is required' });
    }

    await ensureEventExists(eventId);
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const budget = await EventBudgetPlan.findOne({
      _id: new mongoose.Types.ObjectId(budgetId),
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    // Validate: chỉ cho phép assign khi budget đã được approved
    if (budget.status !== 'approved') {
      return res.status(400).json({ 
        message: 'Items can only be assigned when budget is approved. Current status: ' + budget.status 
      });
    }

    // Validate: chỉ HoD được assign (hoặc có quyền quản lý department)
    // Check if user is HoD of this department
    let isHoD = false;
    if (department.leaderId) {
      const leaderIdStr = department.leaderId.toString();
      const userIdStr = userId.toString();
      isHoD = leaderIdStr === userIdStr;
      
      // Also check if leaderId is an object with _id
      if (!isHoD && typeof department.leaderId === 'object' && department.leaderId._id) {
        isHoD = department.leaderId._id.toString() === userIdStr;
      }
    }

    if (!isHoD) {
      return res.status(403).json({ 
        message: 'Chỉ trưởng ban (HoD) mới có quyền phân công mục ngân sách cho thành viên. Bạn không có quyền thực hiện thao tác này.' 
      });
    }

    // Tìm item trong budget
    // PlanItemSchema có _id: false, nên chỉ dùng itemId
    let searchItemId;
    try {
      // Thử convert itemId thành ObjectId để so sánh
      const itemIdObj = new mongoose.Types.ObjectId(itemId);
      searchItemId = itemIdObj.toString();
    } catch (e) {
      searchItemId = String(itemId).trim();
    }
    
    console.log('Searching for itemId:', searchItemId);
    console.log('Budget items count:', budget.items?.length || 0);
    
    const itemIndex = budget.items.findIndex(it => {
      if (!it.itemId) return false;
      
      // Convert itemId về string để so sánh
      let itItemId = null;
      try {
        if (it.itemId instanceof mongoose.Types.ObjectId) {
          itItemId = it.itemId.toString();
        } else if (typeof it.itemId === 'object' && it.itemId.toString) {
          itItemId = it.itemId.toString();
        } else if (typeof it.itemId === 'string') {
          itItemId = it.itemId;
        } else {
          // Thử convert thành ObjectId rồi toString
          try {
            const objId = new mongoose.Types.ObjectId(it.itemId);
            itItemId = objId.toString();
          } catch (e) {
            itItemId = String(it.itemId);
          }
        }
      } catch (e) {
        console.warn('Error converting itemId:', e);
        itItemId = String(it.itemId);
      }
      
      const match = itItemId && String(itItemId).trim() === searchItemId;
      if (match) {
        console.log('Found matching item:', { itemId: itItemId, name: it.name });
      }
      return match;
    });

    if (itemIndex === -1) {
      console.error('Item not found. Searching for itemId:', searchItemId);
      console.error('Available itemIds:', budget.items.map((it, idx) => {
        let id = 'null';
        try {
          if (it.itemId instanceof mongoose.Types.ObjectId) {
            id = it.itemId.toString();
          } else if (it.itemId) {
            id = String(it.itemId);
          }
        } catch (e) {
          id = 'error';
        }
        return { index: idx, itemId: id, name: it.name };
      }));
      return res.status(404).json({ 
        message: 'Item not found in budget',
        searchedItemId: searchItemId,
        availableItemIds: budget.items.map(it => {
          try {
            if (it.itemId instanceof mongoose.Types.ObjectId) {
              return it.itemId.toString();
            }
            return String(it.itemId || 'null');
          } catch (e) {
            return 'error';
          }
        })
      });
    }

    const item = budget.items[itemIndex];
    console.log('Found item at index:', itemIndex, 'Item name:', item.name);

    // Validate memberId if provided (null/empty string is allowed to unassign)
    let memberIdObj = null;
    if (memberId && (typeof memberId === 'string' ? memberId.trim() !== '' : memberId)) {
      try {
        // Validate memberId is a valid ObjectId
        const memberIdStr = String(memberId).trim();
        if (!memberIdStr) {
          memberIdObj = null; // Empty string means unassign
        } else {
          memberIdObj = new mongoose.Types.ObjectId(memberIdStr);
          
          const EventMember = mongoose.model('EventMember');
          const member = await EventMember.findOne({
            _id: memberIdObj,
            eventId: new mongoose.Types.ObjectId(eventId),
            departmentId: new mongoose.Types.ObjectId(departmentId),
            status: { $ne: 'deactive' }
          });

          if (!member) {
            return res.status(404).json({ message: 'Member not found in this department' });
          }
        }
      } catch (memberError) {
        console.error('Error validating member:', memberError);
        return res.status(400).json({ 
          message: 'Invalid memberId format',
          error: memberError.message 
        });
      }
    }

    // Update assignment - sử dụng direct update để đảm bảo reliability
    try {
      // Convert userId to ObjectId safely
      let userIdObj;
      try {
        if (userId instanceof mongoose.Types.ObjectId) {
          userIdObj = userId;
        } else {
          userIdObj = new mongoose.Types.ObjectId(userId);
        }
      } catch (e) {
        console.error('Invalid userId format:', userId);
        return res.status(400).json({ message: 'Invalid user ID format' });
      }

      // Update the item directly
      const item = budget.items[itemIndex];
      
      // Set assignment fields
      item.assignedTo = memberIdObj; // null if unassigning, ObjectId if assigning
      item.assignedAt = new Date();
      item.assignedBy = userIdObj;
      
      // Mark items array as modified
      budget.markModified('items');
      
      console.log('Updating item:', {
        itemIndex,
        itemName: item.name,
        itemId: searchItemId,
        assignedTo: memberIdObj ? memberIdObj.toString() : 'null',
        assignedBy: userIdObj.toString()
      });

      // Save the budget
      const savedBudget = await budget.save();
      console.log('Assignment saved successfully');

      // Send notification to assigned member if memberIdObj is provided
      if (memberIdObj) {
        try {
          await notifyItemAssigned(eventId, departmentId, budgetId, searchItemId, memberIdObj);
        } catch (notifError) {
          console.error('Error sending item assigned notification:', notifError);
          // Don't fail the request if notification fails
        }
      }
      
      return res.status(200).json({ data: savedBudget });
    } catch (saveError) {
      console.error('Error saving assignment:', saveError);
      console.error('Save error details:', {
        message: saveError.message,
        name: saveError.name,
        code: saveError.code,
        errors: saveError.errors,
        stack: saveError.stack
      });
      
      // Return more detailed error information
      if (saveError.name === 'ValidationError') {
        const validationErrors = Object.keys(saveError.errors || {}).map(key => ({
          field: key,
          message: saveError.errors[key].message
        }));
        return res.status(400).json({ 
          message: 'Validation error',
          errors: validationErrors
        });
      }
      
      throw saveError;
    }
  } catch (error) {
    console.error('assignItem error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      message: 'Failed to assign item',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};


