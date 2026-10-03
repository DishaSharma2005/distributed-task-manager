const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: ''
    },
    completed: {
      type: Boolean,
      default: false
    }
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true
  }
);

module.exports = mongoose.model('Task', taskSchema);
