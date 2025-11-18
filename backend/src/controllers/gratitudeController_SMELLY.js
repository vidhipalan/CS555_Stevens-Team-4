/*
 * SMELLY CODE - CODE SMELL #1: DUPLICATE CODE
 *
 * This file contains duplicate validation logic for content and title length.
 * The validation appears in TWO places:
 * 1. createGratitudeEntry function (lines 87-95)
 * 2. updateGratitudeEntry function (lines 136-144)
 *
 * This violates the DRY (Don't Repeat Yourself) principle.
 * If the validation rules change, we need to update multiple places.
 *
 * Refactoring Method: Extract Method
 * Solution: Extract validation logic into a separate helper function
 */

const Gratitude = require('../models/Gratitude');
const mongoose = require('mongoose');

// @desc    Get all gratitude entries for a user
// @route   GET /api/gratitude
// @access  Private
const getGratitudeEntries = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, startDate, endDate, isDraft } = req.query;
    const userId = req.user.id;

    // Build query
    const query = { user: userId };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (isDraft !== undefined) {
      query.isDraft = isDraft === 'true';
    }

    // Execute query with pagination
    const entries = await Gratitude.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'email');

    const total = await Gratitude.countDocuments(query);

    res.json({
      entries,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching gratitude entries:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get single gratitude entry
// @route   GET /api/gratitude/:id
// @access  Private
const getGratitudeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid entry ID' });
    }

    const entry = await Gratitude.findOne({ _id: id, user: userId });

    if (!entry) {
      return res.status(404).json({ error: 'Gratitude entry not found' });
    }

    res.json(entry);
  } catch (error) {
    console.error('Error fetching gratitude entry:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Create new gratitude entry
// @route   POST /api/gratitude
// @access  Private
const createGratitudeEntry = async (req, res) => {
  try {
    const { title, content, tags, mood, isDraft, date } = req.body;
    const userId = req.user.id;

    // *** CODE SMELL: Duplicate validation logic - also appears in updateGratitudeEntry ***
    // Validate content length
    if (content && content.length > 2000) {
      return res.status(400).json({ error: 'Content exceeds 2000 character limit' });
    }

    // Validate title length
    if (title && title.length > 100) {
      return res.status(400).json({ error: 'Title exceeds 100 character limit' });
    }
    // *** END OF DUPLICATE CODE SMELL ***

    const entryData = {
      user: userId,
      title: title || 'Untitled Entry',
      content: content || 'No content provided',
      tags: tags || [],
      mood: mood && mood.trim() !== '' ? mood : undefined,
      isDraft: isDraft || false
    };

    if (date) {
      entryData.date = new Date(date);
    }

    const entry = new Gratitude(entryData);
    await entry.save();

    res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating gratitude entry:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Update gratitude entry
// @route   PUT /api/gratitude/:id
// @access  Private
const updateGratitudeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, tags, mood, isDraft, date } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid entry ID' });
    }

    // *** CODE SMELL: Duplicate validation logic - also appears in createGratitudeEntry ***
    // Validate content length
    if (content && content.length > 2000) {
      return res.status(400).json({ error: 'Content exceeds 2000 character limit' });
    }

    // Validate title length
    if (title && title.length > 100) {
      return res.status(400).json({ error: 'Title exceeds 100 character limit' });
    }
    // *** END OF DUPLICATE CODE SMELL ***

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = tags;
    if (mood !== undefined) updateData.mood = mood && mood.trim() !== '' ? mood : undefined;
    if (isDraft !== undefined) updateData.isDraft = isDraft;
    if (date !== undefined) updateData.date = new Date(date);

    const entry = await Gratitude.findOneAndUpdate(
      { _id: id, user: userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!entry) {
      return res.status(404).json({ error: 'Gratitude entry not found' });
    }

    res.json(entry);
  } catch (error) {
    console.error('Error updating gratitude entry:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Delete gratitude entry
// @route   DELETE /api/gratitude/:id
// @access  Private
const deleteGratitudeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid entry ID' });
    }

    const entry = await Gratitude.findOneAndDelete({ _id: id, user: userId });

    if (!entry) {
      return res.status(404).json({ error: 'Gratitude entry not found' });
    }

    res.json({ message: 'Gratitude entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting gratitude entry:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get gratitude entries by date range
// @route   GET /api/gratitude/date/:date
// @access  Private
const getGratitudeEntriesByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.id;

    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const entries = await Gratitude.find({
      user: userId,
      date: {
        $gte: startDate,
        $lt: endDate
      }
    }).sort({ createdAt: -1 });

    res.json(entries);
  } catch (error) {
    console.error('Error fetching gratitude entries by date:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get draft entries
// @route   GET /api/gratitude/drafts
// @access  Private
const getDraftEntries = async (req, res) => {
  try {
    const userId = req.user.id;
    const entries = await Gratitude.find({ user: userId, isDraft: true })
      .sort({ updatedAt: -1 });

    res.json(entries);
  } catch (error) {
    console.error('Error fetching draft entries:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get gratitude entries for all patients (clinician only)
// @route   GET /api/gratitude/all-patients
// @access  Private (Clinician only)
const getAllPatientsGratitude = async (req, res) => {
  try {
    const User = require('../models/User');

    // *** CODE SMELL #2: Duplicate clinician authorization check ***
    // This same logic appears in:
    // - authController.js (getAllPatients)
    // - moodController.js (getAllPatientsMoods)
    // - gratitudeController.js (getAllPatientsGratitude)
    // Get the requesting user
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser || requestingUser.role !== 'clinician') {
      return res.status(403).json({ error: 'Access denied. Clinicians only.' });
    }
    // *** END OF DUPLICATE CLINICIAN CHECK CODE SMELL ***

    const { userId, page = 1, limit = 50, startDate, endDate } = req.query;

    // Build query
    const query = {};
    
    if (userId) {
      query.user = userId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Execute query with pagination
    const entries = await Gratitude.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'email role');

    const total = await Gratitude.countDocuments(query);

    res.json({
      entries,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching all patients gratitude entries:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getGratitudeEntries,
  getGratitudeEntry,
  createGratitudeEntry,
  updateGratitudeEntry,
  deleteGratitudeEntry,
  getGratitudeEntriesByDate,
  getDraftEntries,
  getAllPatientsGratitude
};
