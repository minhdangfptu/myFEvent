import EventBudgetPlan from '../models/budgetPlanDep.js';
import { ensureEventExists, ensureDepartmentInEvent } from '../services/departmentService.js';
import { getRequesterMembership } from '../services/eventMemberService.js';
import Department from '../models/department.js';
import User from '../models/user.js';
import mongoose from 'mongoose';

// GET /api/events/:eventId/departments/:departmentId/budget
export const getDepartmentBudget = async (req, res) => {
  try {
    const { eventId, departmentId } = req.params;
    const userId = req.user?.userId || req.user?._id || req.user?.id;

    // Ensure event exists
    await ensureEventExists(eventId);
    
    // Ensure department exists and belongs to event
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Find budget plan
    const budget = await EventBudgetPlan.findOne({
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    })
      .populate('reviewedBy', 'fullName email')
      .populate('sentToMembersBy', 'fullName email')
      .lean();

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    // Populate assignedTo for items
    const itemsWithAssigned = await Promise.all(
      (budget.items || []).map(async (item) => {
        let assignedToInfo = null;
        if (item.assignedTo) {
          const EventMember = mongoose.model('EventMember');
          const member = await EventMember.findById(item.assignedTo)
            .populate('userId', 'fullName email')
            .lean();
          if (member) {
            assignedToInfo = {
              _id: member._id,
              userId: member.userId
            };
          }
        }
        return { ...item, assignedToInfo };
      })
    );

    // Format items
    const formattedBudget = {
      ...budget,
      categories: budget.categories || [],
      items: itemsWithAssigned.map(item => ({
        itemId: item.itemId,
        name: item.name,
        category: item.category || 'general',
        unit: item.unit || 'cái',
        unitCost: item.unitCost ? parseFloat(item.unitCost.toString()) : 0,
        qty: item.qty ? parseFloat(item.qty.toString()) : 0,
        total: item.total ? parseFloat(item.total.toString()) : 0,
        note: item.note || '',
        feedback: item.feedback || '',
        status: item.status || 'pending',
        // Expense reporting fields
        evidence: item.evidence || [],
        actualAmount: item.actualAmount ? parseFloat(item.actualAmount.toString()) : 0,
        isPaid: item.isPaid || false,
        memberNote: item.memberNote || '',
        comparison: item.comparison || null,
        reportedBy: item.reportedBy,
        reportedAt: item.reportedAt,
        // Assignment fields
        assignedTo: item.assignedTo,
        assignedAt: item.assignedAt,
        assignedBy: item.assignedBy,
        assignedToInfo: item.assignedToInfo,
        submittedStatus: item.submittedStatus || 'draft'
      }))
    };

    return res.status(200).json({ data: formattedBudget });
  } catch (error) {
    console.error('getDepartmentBudget error:', error);
    if (error.message === 'Event not found' || error.message === 'Department not found') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Failed to get budget' });
  }
};

// POST /api/events/:eventId/departments/:departmentId/budget
export const createDepartmentBudget = async (req, res) => {
  try {
    const { eventId, departmentId } = req.params;
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { items, status = 'draft' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required and must be a non-empty array' });
    }

    // Ensure event exists
    await ensureEventExists(eventId);
    
    // Ensure department exists and belongs to event
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if budget already exists - if exists, delete it to create new one
    const existingBudget = await EventBudgetPlan.findOne({
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (existingBudget) {
      // Xóa budget cũ để tạo budget mới
      await EventBudgetPlan.deleteOne({ _id: existingBudget._id });
    }

    // Format items
    const formattedItems = items.map(item => ({
      itemId: item.itemId ? new mongoose.Types.ObjectId(item.itemId) : new mongoose.Types.ObjectId(),
      category: item.category || 'general',
      name: item.name,
      unit: item.unit || 'cái',
      qty: parseFloat(item.qty) || 1,
      unitCost: parseFloat(item.unitCost) || 0,
      total: parseFloat(item.total) || (parseFloat(item.qty) || 1) * (parseFloat(item.unitCost) || 0),
      note: item.note || '',
      feedback: item.feedback || '',
      status: item.status || 'pending'
    }));

    // Create budget
    const budget = new EventBudgetPlan({
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId),
      status: status,
      currency: 'VND',
      items: formattedItems
    });

    await budget.save();

    return res.status(201).json({ data: budget });
  } catch (error) {
    console.error('createDepartmentBudget error:', error);
    if (error.message === 'Event not found' || error.message === 'Department not found') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Failed to create budget' });
  }
};

// PATCH /api/events/:eventId/departments/:departmentId/budget/:budgetId
export const updateDepartmentBudget = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId } = req.params;
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { items, status } = req.body;

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

    // Update items if provided
    if (items && Array.isArray(items)) {
      const formattedItems = items.map(item => {
        // Tìm item cũ để giữ lại feedback nếu có
        const oldItem = budget.items?.find(old => 
          old.itemId?.toString() === item.itemId?.toString() || 
          (item.itemId && old.itemId?.toString() === new mongoose.Types.ObjectId(item.itemId).toString())
        );
        
        return {
          itemId: item.itemId ? new mongoose.Types.ObjectId(item.itemId) : new mongoose.Types.ObjectId(),
          category: item.category || 'general',
          name: item.name,
          unit: item.unit || 'cái',
          qty: parseFloat(item.qty) || 1,
          unitCost: parseFloat(item.unitCost) || 0,
          total: parseFloat(item.total) || (parseFloat(item.qty) || 1) * (parseFloat(item.unitCost) || 0),
          note: item.note || '',
          feedback: item.feedback || oldItem?.feedback || '' // Giữ lại feedback cũ nếu không có feedback mới
        };
      });
      budget.items = formattedItems;
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
      console.log('Budget submitted successfully');
    } catch (saveError) {
      console.error('Save error:', saveError);
      console.error('Save error name:', saveError.name);
      console.error('Save error message:', saveError.message);
      
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

    return res.status(200).json({ data: budget });
  } catch (error) {
    console.error('submitBudget error:', error);
    if (error.message === 'Event not found' || error.message === 'Department not found') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Failed to submit budget', error: error.message });
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

    // Only allow delete if status is draft
    if (budget.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft budgets can be deleted' });
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

    if (budget.status !== 'submitted') {
      return res.status(400).json({ message: 'Only submitted budgets can be reviewed' });
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
    budget.reviewedBy = new mongoose.Types.ObjectId(userId);
    budget.reviewedAt = new Date();

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

    return res.status(200).json({ data: budget });
  } catch (error) {
    console.error('completeReview error:', error);
    if (error.message === 'Event not found' || error.message === 'Department not found') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Failed to complete review' });
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

    // Build filter
    const filter = {
      eventId: new mongoose.Types.ObjectId(eventId)
    };
    
    // Nếu có status filter
    if (status === 'completed') {
      // Lấy budgets có status = sent_to_members và tất cả items đã submitted
      filter.status = 'sent_to_members';
    } else if (status) {
      filter.status = status;
    } else {
      // Nếu không có status filter, lấy tất cả budgets trừ draft
      filter.status = { $ne: 'draft' };
    }
    
    // Log để debug
    console.log('getAllBudgetsForEvent filter:', {
      eventId,
      status,
      filter
    });

    // Find budgets with pagination
    const [budgets, total] = await Promise.all([
      EventBudgetPlan.find(filter)
        .populate('departmentId', 'name description leaderId')
        .populate('reviewedBy', 'fullName email')
        .sort({ submittedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EventBudgetPlan.countDocuments(filter)
    ]);

    // Format budgets for frontend
    const formattedBudgets = await Promise.all(budgets.map(async (budget) => {
      const department = budget.departmentId;
      const totalCost = budget.items?.reduce(
        (sum, item) => sum + (parseFloat(item.total?.toString() || 0)),
        0
      ) || 0;

      // Kiểm tra xem tất cả items đã submitted chưa
      const allItemsSubmitted = budget.items?.every(item => item.submittedStatus === 'submitted') || false;
      const submittedCount = budget.items?.filter(item => item.submittedStatus === 'submitted').length || 0;
      const totalItems = budget.items?.length || 0;

      // Get creator name from department leader
      let creatorName = 'Chưa có';
      if (department?.leaderId) {
        const leaderId = typeof department.leaderId === 'object' 
          ? department.leaderId._id || department.leaderId 
          : department.leaderId;
        if (leaderId) {
          const leader = await User.findById(leaderId).select('fullName').lean();
          creatorName = leader?.fullName || 'Chưa có';
        }
      }

      // Nếu filter là 'completed', chỉ trả về budgets đã hoàn thành
      if (status === 'completed' && !allItemsSubmitted) {
        return null;
      }

      return {
        _id: budget._id,
        id: budget._id,
        departmentId: budget.departmentId?._id || budget.departmentId,
        departmentName: department?.name || 'Chưa có',
        creatorName: creatorName,
        submittedAt: budget.submittedAt || budget.createdAt,
        createdAt: budget.createdAt,
        status: budget.status,
        totalCost: totalCost,
        allItemsSubmitted: allItemsSubmitted,
        submittedCount: submittedCount,
        totalItems: totalItems,
        items: budget.items?.map(item => ({
          itemId: item.itemId,
          name: item.name,
          category: item.category || 'general',
          unit: item.unit || 'cái',
          unitCost: item.unitCost ? parseFloat(item.unitCost.toString()) : 0,
          qty: item.qty ? parseFloat(item.qty.toString()) : 0,
          total: item.total ? parseFloat(item.total.toString()) : 0,
          note: item.note || '',
          feedback: item.feedback || '',
          status: item.status || 'pending',
          submittedStatus: item.submittedStatus || 'draft',
          actualAmount: item.actualAmount ? parseFloat(item.actualAmount.toString()) : 0,
          assignedTo: item.assignedTo,
        })) || []
      };
    }));

    // Filter out null values (for completed filter)
    const filteredBudgets = formattedBudgets.filter(b => b !== null);

    // Update total count for completed filter
    const finalTotal = status === 'completed' ? filteredBudgets.length : total;

    // Log để debug
    console.log('getAllBudgetsForEvent result:', {
      eventId,
      status,
      total: finalTotal,
      budgetsCount: filteredBudgets.length,
      budgets: filteredBudgets.map(b => ({ id: b._id, departmentName: b.departmentName, status: b.status, allItemsSubmitted: b.allItemsSubmitted }))
    });

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

    await ensureEventExists(eventId);

    const budgets = await EventBudgetPlan.find({
      eventId: new mongoose.Types.ObjectId(eventId)
    })
      .populate('departmentId', 'name')
      .lean();

    // Tính toán thống kê
    let totalEstimated = 0;
    let totalActual = 0;
    let totalPaid = 0;
    const departmentStats = [];

    for (const budget of budgets) {
      const deptEstimated = budget.items?.reduce(
        (sum, item) => sum + (parseFloat(item.total?.toString() || 0)),
        0
      ) || 0;

      const deptActual = budget.items?.reduce(
        (sum, item) => sum + (parseFloat(item.actualAmount?.toString() || 0)),
        0
      ) || 0;

      const deptPaid = budget.items?.reduce(
        (sum, item) => {
          if (item.isPaid) {
            return sum + (parseFloat(item.actualAmount?.toString() || 0));
          }
          return sum;
        },
        0
      ) || 0;

      totalEstimated += deptEstimated;
      totalActual += deptActual;
      totalPaid += deptPaid;

      departmentStats.push({
        departmentId: budget.departmentId?._id || budget.departmentId,
        departmentName: budget.departmentId?.name || 'Unknown',
        estimated: deptEstimated,
        actual: deptActual,
        paid: deptPaid,
        difference: deptActual - deptEstimated,
        status: budget.status
      });
    }

    return res.status(200).json({
      data: {
        totalEstimated,
        totalActual,
        totalPaid,
        totalDifference: totalActual - totalEstimated,
        departmentStats
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
    budget.sentToMembersAt = new Date();
    budget.sentToMembersBy = new mongoose.Types.ObjectId(userId);

    budget.audit = budget.audit || [];
    budget.audit.push({
      at: new Date(),
      by: new mongoose.Types.ObjectId(userId),
      action: 'sent_to_members',
      comment: 'Budget sent to members for expense reporting'
    });

    await budget.save();

    return res.status(200).json({ data: budget });
  } catch (error) {
    console.error('sendBudgetToMembers error:', error);
    return res.status(500).json({ message: 'Failed to send budget to members' });
  }
};

// POST /api/events/:eventId/departments/:departmentId/budget/:budgetId/items/:itemId/report-expense
export const reportExpense = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId, itemId } = req.params;
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { actualAmount, evidence, memberNote, isPaid } = req.body;

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

    // Cho phép report khi:
    // 1. Budget đã được approved VÀ item đã được assign cho member này
    // 2. Hoặc budget đã được gửi xuống members (sent_to_members)
    if (budget.status !== 'sent_to_members' && budget.status !== 'approved') {
      return res.status(400).json({ message: 'Budget must be approved or sent to members first' });
    }

    const item = budget.items.find(it => 
      it.itemId?.toString() === itemId || it._id?.toString() === itemId
    );

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Kiểm tra xem user có phải là member được assign cho item này không
    // Get user's EventMember - sử dụng getRequesterMembership để đảm bảo tìm đúng
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Convert userId sang ObjectId nếu cần
    const userIdObj = userId instanceof mongoose.Types.ObjectId 
      ? userId 
      : new mongoose.Types.ObjectId(userId);

    const userMember = await getRequesterMembership(eventId, userIdObj);

    if (!userMember) {
      console.error('EventMember not found:', { eventId, userId: userIdObj.toString(), userIdType: typeof userId });
      return res.status(403).json({ message: 'You are not a member of this event' });
    }

    // Nếu budget chỉ mới approved (chưa gửi xuống), kiểm tra xem item có được assign cho user này không
    if (budget.status === 'approved') {
      if (!item.assignedTo) {
        return res.status(400).json({ message: 'Item is not assigned to anyone. Please wait for HoD to assign it.' });
      }

      // Kiểm tra xem member có thuộc department này không
      // departmentId có thể là null hoặc không khớp, nên cần kiểm tra linh hoạt
      const userDeptId = userMember.departmentId ? userMember.departmentId.toString() : null;
      const reqDeptId = departmentId.toString();
      
      if (userDeptId && userDeptId !== reqDeptId) {
        return res.status(403).json({ message: 'You are not a member of this department' });
      }

      if (item.assignedTo.toString() !== userMember._id.toString()) {
        return res.status(403).json({ message: 'You are not assigned to this item' });
      }
    } else if (budget.status === 'sent_to_members') {
      // Khi budget đã được gửi xuống, vẫn cần kiểm tra xem item có được assign cho user này không
      // (trừ khi item chưa được assign cho ai)
      if (item.assignedTo && item.assignedTo.toString() !== userMember._id.toString()) {
        return res.status(403).json({ message: 'You are not assigned to this item' });
      }
    }

    // Update item expense data
    if (actualAmount !== undefined) {
      item.actualAmount = parseFloat(actualAmount) || 0;
    }
    if (evidence !== undefined && Array.isArray(evidence)) {
      item.evidence = evidence;
    }
    if (memberNote !== undefined) {
      item.memberNote = memberNote;
    }
    if (isPaid !== undefined) {
      item.isPaid = isPaid;
    }
    
    item.reportedBy = new mongoose.Types.ObjectId(userId);
    item.reportedAt = new Date();

    // Auto calculate comparison will be done in pre-save hook
    await budget.save();

    return res.status(200).json({ data: budget });
  } catch (error) {
    console.error('reportExpense error:', error);
    return res.status(500).json({ message: 'Failed to report expense' });
  }
};

// PATCH /api/events/:eventId/departments/:departmentId/budget/:budgetId/items/:itemId/toggle-paid
export const togglePaidStatus = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId, itemId } = req.params;

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

    const item = budget.items.find(it => 
      it.itemId?.toString() === itemId || it._id?.toString() === itemId
    );

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    item.isPaid = !item.isPaid;
    await budget.save();

    return res.status(200).json({ data: budget });
  } catch (error) {
    console.error('togglePaidStatus error:', error);
    return res.status(500).json({ message: 'Failed to toggle paid status' });
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

// POST /api/events/:eventId/departments/:departmentId/budget/:budgetId/items/:itemId/submit-expense
export const submitExpense = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId, itemId } = req.params;
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

    // Cho phép submit khi:
    // 1. Budget đã được approved VÀ item đã được assign cho member này
    // 2. Hoặc budget đã được gửi xuống members (sent_to_members)
    if (budget.status !== 'sent_to_members' && budget.status !== 'approved') {
      return res.status(400).json({ message: 'Budget must be approved or sent to members first' });
    }

    const item = budget.items.find(it => 
      it.itemId?.toString() === itemId || it._id?.toString() === itemId
    );

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Validate: chỉ member được assign mới nộp được
    if (!item.assignedTo) {
      return res.status(400).json({ message: 'Item is not assigned to anyone' });
    }

    // Get user's EventMember - sử dụng getRequesterMembership để đảm bảo tìm đúng
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Convert userId sang ObjectId nếu cần
    const userIdObj = userId instanceof mongoose.Types.ObjectId 
      ? userId 
      : new mongoose.Types.ObjectId(userId);

    const userMember = await getRequesterMembership(eventId, userIdObj);

    if (!userMember) {
      console.error('EventMember not found:', { eventId, userId: userIdObj.toString(), userIdType: typeof userId });
      return res.status(403).json({ message: 'You are not a member of this event' });
    }

    // Kiểm tra xem member có thuộc department này không (nếu có departmentId)
    const userDeptId = userMember.departmentId ? userMember.departmentId.toString() : null;
    const reqDeptId = departmentId.toString();
    
    // Nếu userMember có departmentId và không khớp với departmentId của request, báo lỗi
    if (userDeptId && userDeptId !== reqDeptId) {
      return res.status(403).json({ message: 'You are not a member of this department' });
    }

    if (item.assignedTo.toString() !== userMember._id.toString()) {
      return res.status(403).json({ message: 'You are not assigned to this item' });
    }

    // Validate: phải có actualAmount hoặc evidence
    const hasActualAmount = item.actualAmount && parseFloat(item.actualAmount.toString()) > 0;
    const hasEvidence = item.evidence && item.evidence.length > 0;

    if (!hasActualAmount && !hasEvidence) {
      return res.status(400).json({ message: 'Please provide actual amount or evidence before submitting' });
    }

    // Update submittedStatus
    item.submittedStatus = 'submitted';

    await budget.save();

    // Kiểm tra xem tất cả items đã được submitted chưa
    const allItemsSubmitted = budget.items.every(item => item.submittedStatus === 'submitted');
    if (allItemsSubmitted) {
      // Tất cả items đã hoàn thành → có thể thông báo cho HoOC
      // Có thể thêm notification hoặc status mới ở đây
      console.log('All items have been submitted for budget:', budgetId);
      // TODO: Có thể thêm notification service để thông báo cho HoOC
    }

    return res.status(200).json({ 
      data: budget,
      allItemsSubmitted: allItemsSubmitted 
    });
  } catch (error) {
    console.error('submitExpense error:', error);
    return res.status(500).json({ message: 'Failed to submit expense' });
  }
};

// POST /api/events/:eventId/departments/:departmentId/budget/:budgetId/items/:itemId/undo-submit
export const undoSubmitExpense = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId, itemId } = req.params;
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

    const item = budget.items.find(it => 
      it.itemId?.toString() === itemId || it._id?.toString() === itemId
    );

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Validate: chỉ member đã nộp mới hoàn tác được
    if (item.submittedStatus !== 'submitted') {
      return res.status(400).json({ message: 'Item is not submitted' });
    }

    // Get user's EventMember
    const EventMember = mongoose.model('EventMember');
    const userMember = await EventMember.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId),
      status: { $ne: 'deactive' }
    });

    if (!userMember) {
      return res.status(403).json({ message: 'You are not a member of this department' });
    }

    if (item.assignedTo && item.assignedTo.toString() !== userMember._id.toString()) {
      return res.status(403).json({ message: 'You are not assigned to this item' });
    }

    // Update submittedStatus
    item.submittedStatus = 'draft';

    await budget.save();

    return res.status(200).json({ data: budget });
  } catch (error) {
    console.error('undoSubmitExpense error:', error);
    return res.status(500).json({ message: 'Failed to undo submit expense' });
  }
};

