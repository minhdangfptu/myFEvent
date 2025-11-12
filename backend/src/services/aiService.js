import axios from 'axios';

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8000';

/**
 * Generate WBS using FastAPI AI service
 * @param {Object} eventData - Event information
 * @returns {Promise<Object>} WBS data with epics, tasks, and risks
 */
export async function generateWBS(eventData) {
  try {
    const response = await axios.post(`${FASTAPI_BASE_URL}/api/wbs/generate`, {
      event_name: eventData.eventName,
      event_type: eventData.eventType,
      event_date: eventData.eventDate,
      start_date: eventData.startDate,
      venue: eventData.venue,
      headcount_total: eventData.headcountTotal,
      departments: eventData.departments,
    }, {
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      // FastAPI returned an error response
      throw new Error(`AI service error: ${error.response.data?.detail || error.response.statusText}`);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('AI service is not available. Please check if the service is running.');
    } else {
      // Error setting up the request
      throw new Error(`Failed to call AI service: ${error.message}`);
    }
  }
}

/**
 * Generate WBS using chat interface
 * @param {string} message - User message
 * @param {string} sessionId - Session ID (optional)
 * @returns {Promise<Object>} Chat response with WBS data
 */
export async function generateWBSViaChat(message, sessionId = null) {
  try {
    const response = await axios.post(`${FASTAPI_BASE_URL}/api/chat/message`, {
      message,
      session_id: sessionId,
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      // FastAPI returned an error response
      const errorDetail = error.response.data?.detail || error.response.data?.message || error.response.statusText;
      throw new Error(`AI chat service error: ${errorDetail}`);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('AI chat service is not available. Vui lòng kiểm tra xem FastAPI service có đang chạy không.');
    } else if (error.code === 'ECONNREFUSED') {
      // Connection refused
      throw new Error(`Không thể kết nối đến AI service tại ${FASTAPI_BASE_URL}. Vui lòng kiểm tra xem service có đang chạy không.`);
    } else {
      // Error setting up the request
      throw new Error(`Lỗi khi gọi AI chat service: ${error.message}`);
    }
  }
}



