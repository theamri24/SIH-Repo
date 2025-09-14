require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Basic routes for testing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'AI Timetable Server is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Server is working correctly!',
    data: {
      server: 'AI Timetable Generator',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Analytics endpoints (simplified)
app.get('/api/analytics/room-utilization', (req, res) => {
  res.json({
    success: true,
    data: {
      totalRooms: 50,
      utilizedRooms: 45,
      utilizationRate: 90,
      peakHours: ['9:00-11:00', '14:00-16:00'],
      underutilizedRooms: ['Room 101', 'Room 205']
    }
  });
});

app.get('/api/analytics/teacher-workload', (req, res) => {
  res.json({
    success: true,
    data: {
      totalTeachers: 25,
      averageHoursPerWeek: 35,
      overloadedTeachers: 3,
      underloadedTeachers: 2,
      workloadDistribution: {
        '0-20 hours': 2,
        '21-35 hours': 20,
        '36+ hours': 3
      }
    }
  });
});

app.get('/api/analytics/student-free-hours', (req, res) => {
  res.json({
    success: true,
    data: {
      totalStudents: 500,
      averageFreeHoursPerWeek: 12,
      studentsWithOptimalSchedule: 450,
      studentsWithConflicts: 5,
      freeTimeDistribution: {
        'Monday': 2.5,
        'Tuesday': 2.0,
        'Wednesday': 3.0,
        'Thursday': 2.5,
        'Friday': 2.0
      }
    }
  });
});

app.get('/api/analytics/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      totalTimetables: 150,
      activeTimetables: 145,
      conflictsResolved: 25,
      optimizationScore: 92,
      recentActivity: [
        { action: 'Timetable Generated', timestamp: '2024-01-15T10:30:00Z' },
        { action: 'Conflict Resolved', timestamp: '2024-01-15T09:15:00Z' },
        { action: 'Schedule Updated', timestamp: '2024-01-14T16:45:00Z' }
      ]
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 AI Timetable Server is running!');
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`🌐 Local access: 
  http://localhost:${PORT}`);
  console.log(`🌍 Network access: http://10.140.193.117:${PORT}`);
  console.log(`📊 API Health Check: http://localhost:${PORT}/api/health`);
  console.log('✨ Your AI Timetable website is ready!');
  console.log('');
  console.log('📱 To share with others on the same network:');
  console.log(`   http://10.140.193.117:${PORT}`);
  console.log('');
  console.log('⚠️  Make sure Windows Firewall allows connections on port', PORT);
});

module.exports = app;

