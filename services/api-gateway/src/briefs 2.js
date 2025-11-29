const { pool } = require('./auth');

async function saveBrief(req, res) {
  try {
    const { symbol, payload } = req.body;
    const userId = req.user.userId;

    if (!symbol || !payload) {
      return res.status(400).json({ error: 'Symbol and payload required' });
    }

    const result = await pool.query(
      'INSERT INTO briefs (user_id, symbol, payload) VALUES ($1, $2, $3) RETURNING id, created_at',
      [userId, symbol, JSON.stringify(payload)]
    );

    res.status(201).json({
      success: true,
      brief: {
        id: result.rows[0].id,
        symbol,
        payload,
        created_at: result.rows[0].created_at
      }
    });
  } catch (error) {
    console.error('Save brief error:', error);
    res.status(500).json({ error: 'Failed to save brief' });
  }
}

async function listBriefs(req, res) {
  try {
    const userId = req.user.userId;
    const limit = Math.min(parseInt(req.query.limit || '50'), 100);

    const result = await pool.query(
      'SELECT id, symbol, payload, created_at FROM briefs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );

    res.json({
      success: true,
      briefs: result.rows.map(row => ({
        id: row.id,
        symbol: row.symbol,
        payload: row.payload,
        created_at: row.created_at
      }))
    });
  } catch (error) {
    console.error('List briefs error:', error);
    res.status(500).json({ error: 'Failed to list briefs' });
  }
}

async function getBrief(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT id, symbol, payload, created_at FROM briefs WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Brief not found' });
    }

    res.json({
      success: true,
      brief: {
        id: result.rows[0].id,
        symbol: result.rows[0].symbol,
        payload: result.rows[0].payload,
        created_at: result.rows[0].created_at
      }
    });
  } catch (error) {
    console.error('Get brief error:', error);
    res.status(500).json({ error: 'Failed to get brief' });
  }
}

module.exports = { saveBrief, listBriefs, getBrief };
