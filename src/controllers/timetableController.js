const db = require('../config/database');
const redis = require('../config/redis');
const aiTimetableService = require('../services/aiTimetableService');

class TimetableController {
  // Generate AI-powered timetable
  async generateTimetable(req, res) {
    try {
      const { semester, academicYear, studentIds, teacherIds, courseIds } = req.body;

      // Check cache first
      const cacheKey = `timetable:${semester}:${academicYear}:${JSON.stringify({ studentIds, teacherIds, courseIds })}`;
      const cachedResult = await redis.get(cacheKey);
      
      if (cachedResult) {
        return res.json({
          success: true,
          message: 'Timetable generated successfully (from cache)',
          data: cachedResult
        });
      }

      // Generate new timetable
      const result = await aiTimetableService.generateTimetable({
        semester,
        academicYear,
        studentIds,
        teacherIds,
        courseIds
      });

      // Cache the result for 1 hour
      await redis.set(cacheKey, result, 3600);

      res.json({
        success: true,
        message: 'Timetable generated successfully',
        data: result
      });
    } catch (error) {
      console.error('Generate timetable error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate timetable',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get timetable by student ID
  async getStudentTimetable(req, res) {
    try {
      const { id } = req.params;
      const { semester, academicYear } = req.query;

      // Check cache first
      const cacheKey = `student_timetable:${id}:${semester}:${academicYear}`;
      const cachedResult = await redis.get(cacheKey);
      
      if (cachedResult) {
        return res.json({
          success: true,
          data: cachedResult
        });
      }

      // Build where clause
      const where = { studentId: id };
      if (semester) where.semester = parseInt(semester);
      if (academicYear) where.academicYear = academicYear;

      const timetables = await db.getClient().timetable.findMany({
        where,
        include: {
          course: {
            select: {
              id: true,
              courseName: true,
              courseCode: true,
              creditHours: true,
              department: true,
              multidisciplinaryTags: true
            }
          },
          teacher: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          room: {
            select: {
              id: true,
              roomName: true,
              roomType: true,
              capacity: true,
              building: true,
              floor: true
            }
          }
        },
        orderBy: [
          { dayOfWeek: 'asc' },
          { startTime: 'asc' }
        ]
      });

      // Format timetable by days
      const formattedTimetable = this.formatTimetableByDays(timetables);

      // Cache the result for 30 minutes
      await redis.set(cacheKey, formattedTimetable, 1800);

      res.json({
        success: true,
        data: formattedTimetable
      });
    } catch (error) {
      console.error('Get student timetable error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get student timetable',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get timetable by teacher ID
  async getTeacherTimetable(req, res) {
    try {
      const { id } = req.params;
      const { semester, academicYear } = req.query;

      // Check cache first
      const cacheKey = `teacher_timetable:${id}:${semester}:${academicYear}`;
      const cachedResult = await redis.get(cacheKey);
      
      if (cachedResult) {
        return res.json({
          success: true,
          data: cachedResult
        });
      }

      // Build where clause
      const where = { teacherId: id };
      if (semester) where.semester = parseInt(semester);
      if (academicYear) where.academicYear = academicYear;

      const timetables = await db.getClient().timetable.findMany({
        where,
        include: {
          course: {
            select: {
              id: true,
              courseName: true,
              courseCode: true,
              creditHours: true,
              department: true,
              multidisciplinaryTags: true
            }
          },
          student: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          room: {
            select: {
              id: true,
              roomName: true,
              roomType: true,
              capacity: true,
              building: true,
              floor: true
            }
          }
        },
        orderBy: [
          { dayOfWeek: 'asc' },
          { startTime: 'asc' }
        ]
      });

      // Format timetable by days
      const formattedTimetable = this.formatTimetableByDays(timetables);

      // Cache the result for 30 minutes
      await redis.set(cacheKey, formattedTimetable, 1800);

      res.json({
        success: true,
        data: formattedTimetable
      });
    } catch (error) {
      console.error('Get teacher timetable error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get teacher timetable',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get all timetables (Admin only)
  async getAllTimetables(req, res) {
    try {
      const { page = 1, limit = 10, semester, academicYear, dayOfWeek } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause
      const where = { isActive: true };
      if (semester) where.semester = parseInt(semester);
      if (academicYear) where.academicYear = academicYear;
      if (dayOfWeek !== undefined) where.dayOfWeek = parseInt(dayOfWeek);

      // Get timetables with pagination
      const [timetables, total] = await Promise.all([
        db.getClient().timetable.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            course: {
              select: {
                courseName: true,
                courseCode: true,
                creditHours: true
              }
            },
            teacher: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            student: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            room: {
              select: {
                roomName: true,
                roomType: true,
                capacity: true
              }
            }
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { startTime: 'asc' }
          ]
        }),
        db.getClient().timetable.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          timetables,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      console.error('Get all timetables error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get timetables',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Create timetable slot
  async createTimetableSlot(req, res) {
    try {
      const { studentId, teacherId, courseId, roomId, dayOfWeek, startTime, endTime, semester, academicYear } = req.body;

      // Check for conflicts
      const conflicts = await this.checkConflicts({
        teacherId,
        roomId,
        dayOfWeek,
        startTime,
        endTime,
        semester,
        academicYear
      });

      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Conflicts detected',
          conflicts
        });
      }

      const timetable = await db.getClient().timetable.create({
        data: {
          studentId,
          teacherId,
          courseId,
          roomId,
          dayOfWeek,
          startTime,
          endTime,
          semester,
          academicYear
        },
        include: {
          course: true,
          teacher: true,
          student: true,
          room: true
        }
      });

      // Clear related caches
      await this.clearTimetableCaches(semester, academicYear);

      res.status(201).json({
        success: true,
        message: 'Timetable slot created successfully',
        data: { timetable }
      });
    } catch (error) {
      console.error('Create timetable slot error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create timetable slot',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update timetable slot
  async updateTimetableSlot(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check for conflicts if time/room/teacher is being changed
      if (updateData.teacherId || updateData.roomId || updateData.dayOfWeek || updateData.startTime || updateData.endTime) {
        const existing = await db.getClient().timetable.findUnique({
          where: { id }
        });

        if (!existing) {
          return res.status(404).json({
            success: false,
            message: 'Timetable slot not found'
          });
        }

        const conflicts = await this.checkConflicts({
          teacherId: updateData.teacherId || existing.teacherId,
          roomId: updateData.roomId || existing.roomId,
          dayOfWeek: updateData.dayOfWeek || existing.dayOfWeek,
          startTime: updateData.startTime || existing.startTime,
          endTime: updateData.endTime || existing.endTime,
          semester: existing.semester,
          academicYear: existing.academicYear,
          excludeId: id
        });

        if (conflicts.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Conflicts detected',
            conflicts
          });
        }
      }

      const timetable = await db.getClient().timetable.update({
        where: { id },
        data: updateData,
        include: {
          course: true,
          teacher: true,
          student: true,
          room: true
        }
      });

      // Clear related caches
      await this.clearTimetableCaches(timetable.semester, timetable.academicYear);

      res.json({
        success: true,
        message: 'Timetable slot updated successfully',
        data: { timetable }
      });
    } catch (error) {
      console.error('Update timetable slot error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update timetable slot',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete timetable slot
  async deleteTimetableSlot(req, res) {
    try {
      const { id } = req.params;

      const timetable = await db.getClient().timetable.findUnique({
        where: { id }
      });

      if (!timetable) {
        return res.status(404).json({
          success: false,
          message: 'Timetable slot not found'
        });
      }

      await db.getClient().timetable.delete({
        where: { id }
      });

      // Clear related caches
      await this.clearTimetableCaches(timetable.semester, timetable.academicYear);

      res.json({
        success: true,
        message: 'Timetable slot deleted successfully'
      });
    } catch (error) {
      console.error('Delete timetable slot error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete timetable slot',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Check for conflicts
  async checkConflicts({ teacherId, roomId, dayOfWeek, startTime, endTime, semester, academicYear, excludeId = null }) {
    const where = {
      dayOfWeek,
      semester,
      academicYear,
      isActive: true,
      OR: [
        {
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gt: startTime } }
          ]
        },
        {
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gte: endTime } }
          ]
        },
        {
          AND: [
            { startTime: { gte: startTime } },
            { endTime: { lte: endTime } }
          ]
        }
      ]
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const conflicts = await db.getClient().timetable.findMany({
      where: {
        ...where,
        OR: [
          { teacherId },
          { roomId }
        ]
      },
      include: {
        course: true,
        teacher: true,
        room: true
      }
    });

    return conflicts.map(conflict => ({
      type: conflict.teacherId === teacherId ? 'TEACHER_CONFLICT' : 'ROOM_CONFLICT',
      conflict,
      message: conflict.teacherId === teacherId 
        ? `Teacher has another class at this time`
        : `Room is occupied at this time`
    }));
  }

  // Format timetable by days
  formatTimetableByDays(timetables) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const formatted = {};

    days.forEach((day, index) => {
      formatted[day] = timetables
        .filter(t => t.dayOfWeek === index)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return {
      days: formatted,
      totalSlots: timetables.length,
      summary: this.generateTimetableSummary(timetables)
    };
  }

  // Generate timetable summary
  generateTimetableSummary(timetables) {
    const summary = {
      totalHours: 0,
      courses: new Set(),
      teachers: new Set(),
      rooms: new Set(),
      departments: new Set()
    };

    timetables.forEach(slot => {
      // Calculate hours
      const start = new Date(`2000-01-01T${slot.startTime}:00`);
      const end = new Date(`2000-01-01T${slot.endTime}:00`);
      const hours = (end - start) / (1000 * 60 * 60);
      summary.totalHours += hours;

      // Collect unique values
      if (slot.course) {
        summary.courses.add(slot.course.courseName);
        summary.departments.add(slot.course.department);
      }
      if (slot.teacher) {
        summary.teachers.add(`${slot.teacher.user.firstName} ${slot.teacher.user.lastName}`);
      }
      if (slot.room) {
        summary.rooms.add(slot.room.roomName);
      }
    });

    return {
      totalHours: Math.round(summary.totalHours * 100) / 100,
      totalCourses: summary.courses.size,
      totalTeachers: summary.teachers.size,
      totalRooms: summary.rooms.size,
      departments: Array.from(summary.departments)
    };
  }

  // Clear timetable caches
  async clearTimetableCaches(semester, academicYear) {
    const patterns = [
      `timetable:${semester}:${academicYear}:*`,
      `student_timetable:*:${semester}:${academicYear}`,
      `teacher_timetable:*:${semester}:${academicYear}`
    ];

    for (const pattern of patterns) {
      // Note: Redis doesn't support pattern deletion in a single command
      // In a production environment, you might want to use Redis SCAN
      // For now, we'll clear specific keys as they're accessed
    }
  }
}

module.exports = new TimetableController();

