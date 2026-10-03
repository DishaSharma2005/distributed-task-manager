const Task = require('../models/Task');

// GET /api/tasks — Retrieve all tasks, newest first
const getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve tasks', details: err.message });
  }
};

// POST /api/tasks — Create a new task
const createTask = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const task = new Task({ title: title.trim(), description: description?.trim() || '' });
    const savedTask = await task.save();

    res.status(201).json(savedTask);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task', details: err.message });
  }
};

// PUT /api/tasks/:id — Update a task (toggle completed, or update fields)
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const task = await Task.findByIdAndUpdate(id, updates, {
      new: true,           // Return the updated document
      runValidators: true  // Run schema validators on update
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.status(200).json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task', details: err.message });
  }
};

// DELETE /api/tasks/:id — Remove a task
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByIdAndDelete(id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.status(200).json({ message: 'Task deleted successfully', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task', details: err.message });
  }
};

module.exports = { getAllTasks, createTask, updateTask, deleteTask };
