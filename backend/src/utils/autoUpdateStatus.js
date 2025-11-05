// utils/autoStatus.js
import Event from '../models/event.js';

// Chỉ tính trong 3 trạng thái thời gian; KHÔNG động vào 'cancelled'
export const calculateEventStatus = (eventStartDate, eventEndDate) => {
  if (!eventStartDate || !eventEndDate) return 'scheduled';
  const now = new Date();
  const start = new Date(eventStartDate);
  const end = new Date(eventEndDate);
  if (now > end) return 'completed';
  if (now >= start && now <= end) return 'ongoing';
  return 'scheduled';
};

// Trả về doc với status đã “sửa” nếu cần; không ghi đè 'cancelled'
export const ensureAutoStatusForDoc = async (doc, { persist = true } = {}) => {
  if (!doc) return doc;

  // Nếu đã hủy thì trả nguyên trạng
  if (doc.status === 'cancelled') return doc;

  const computed = calculateEventStatus(doc.eventStartDate, doc.eventEndDate);
  if (doc.status !== computed) {
    doc.status = computed; // sửa trong payload trả về
    if (persist && doc._id) {
      // cập nhật ngầm, không làm chậm response
      Event.updateOne({ _id: doc._id, status: { $ne: 'cancelled' } }, { $set: { status: computed } })
        .catch(err => console.error('autoStatus persist error:', err));
    }
  }
  return doc;
};

export const ensureAutoStatusForDocs = async (docs, opts) =>
  Array.isArray(docs) ? Promise.all(docs.map(d => ensureAutoStatusForDoc(d, opts))) : [];
