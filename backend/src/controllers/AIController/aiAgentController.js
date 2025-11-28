// src/controllers/aiAgentController.js
import axios from 'axios';

const AI_AGENT_BASE_URL =
  process.env.AI_AGENT_BASE_URL || 'http://localhost:9000';

export const runEventPlannerAgent = async (req, res) => {
  try {
    const { history_messages } = req.body || {};

    if (!Array.isArray(history_messages)) {
      return res.status(400).json({
        message: 'history_messages phải là một mảng message {role, content}',
      });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ message: 'Thiếu Authorization header (JWT)' });
    }

    const pythonRes = await axios.post(
      `${AI_AGENT_BASE_URL}/agent/event-planner/turn`,
      { history_messages },
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        timeout: 60_000,
      }
    );

    return res.status(200).json(pythonRes.data);
  } catch (err) {
    console.error('runEventPlannerAgent error:', err.response?.data || err);

    const status = err.response?.status || 500;
    const data = err.response?.data || { message: err.message };

    return res.status(status).json({
      message: 'Agent call failed',
      error: data,
    });
  }
};
