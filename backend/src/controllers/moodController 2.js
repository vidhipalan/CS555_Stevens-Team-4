const Mood = require('../models/Mood');

function toUtcDateOnlyFromInput(input) {
  if (!input) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  // Expect YYYY-MM-DD
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  return new Date(Date.UTC(y, m, d));
}

exports.getByDate = async (req, res) => {
  try {
    const dateOnly = toUtcDateOnlyFromInput(req.query.date);
    if (req.query.date && !dateOnly) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    const mood = await Mood.findOne({ userId: req.userId, date: dateOnly });
    return res.json(mood || null);
  } catch (err) {
    console.error('getByDate error:', err);
    return res.status(500).json({ error: 'Failed to fetch mood' });
  }
};

exports.createOrUpdateByDate = async (req, res) => {
  try {
    const { mood, note, date } = req.body;
    if (!mood || typeof mood !== 'string') {
      return res.status(400).json({ error: 'Mood is required' });
    }
    const dateOnly = toUtcDateOnlyFromInput(date);
    if (date && !dateOnly) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const existing = await Mood.findOne({ userId: req.userId, date: dateOnly });
    if (existing) {
      return res.status(409).json({ error: 'Mood already logged for this date' });
    }

    const created = await Mood.create({ userId: req.userId, date: dateOnly, mood, note: note || '' });
    return res.status(201).json(created);
  } catch (err) {
    console.error('createOrUpdateByDate error:', err);
    return res.status(500).json({ error: 'Failed to save mood' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(365, parseInt(req.query.limit, 10) || 60));
    const history = await Mood.find({ userId: req.userId })
      .sort({ date: -1 })
      .limit(limit);
    return res.json(history);
  } catch (err) {
    console.error('getHistory error:', err);
    return res.status(500).json({ error: 'Failed to fetch mood history' });
  }
};


