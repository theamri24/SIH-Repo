const aiTimetableService = require('../src/services/aiTimetableService');

// Mock database
jest.mock('../src/config/database', () => ({
  getClient: () => ({
    student: {
      findMany: jest.fn()
    },
    teacher: {
      findMany: jest.fn()
    },
    course: {
      findMany: jest.fn()
    },
    room: {
      findMany: jest.fn()
    },
    timetable: {
      findMany: jest.fn()
    },
    aiLog: {
      create: jest.fn()
    }
  })
}));

// Mock Redis
jest.mock('../src/config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn()
}));

describe('AI Timetable Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTimetable', () => {
    it('should generate a timetable successfully', async () => {
      // Mock data
      const mockStudents = [
        { id: '1', studentId: 'STU001', year: 2, semester: 3, department: 'CS' }
      ];
      
      const mockTeachers = [
        { id: '1', teacherId: 'TCH001', department: 'CS', maxWorkload: 40 }
      ];
      
      const mockCourses = [
        { id: '1', courseId: 'CS101', courseName: 'Programming', creditHours: 3, teacherId: '1' }
      ];
      
      const mockRooms = [
        { id: '1', roomId: 'R001', roomName: 'Lab 1', capacity: 30, roomType: 'COMPUTER_LAB' }
      ];
      
      const mockExistingTimetables = [];

      // Mock database calls
      const db = require('../src/config/database').getClient();
      db.student.findMany.mockResolvedValue(mockStudents);
      db.teacher.findMany.mockResolvedValue(mockTeachers);
      db.course.findMany.mockResolvedValue(mockCourses);
      db.room.findMany.mockResolvedValue(mockRooms);
      db.timetable.findMany.mockResolvedValue(mockExistingTimetables);
      db.aiLog.create.mockResolvedValue({});

      const params = {
        semester: 3,
        academicYear: '2024-25',
        studentIds: ['1'],
        teacherIds: ['1'],
        courseIds: ['1']
      };

      const result = await aiTimetableService.generateTimetable(params);

      expect(result.success).toBe(true);
      expect(result.timetable).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
      expect(db.aiLog.create).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const db = require('../src/config/database').getClient();
      db.student.findMany.mockRejectedValue(new Error('Database error'));

      const params = {
        semester: 3,
        academicYear: '2024-25',
        studentIds: ['1'],
        teacherIds: ['1'],
        courseIds: ['1']
      };

      await expect(aiTimetableService.generateTimetable(params)).rejects.toThrow('Database error');
    });
  });

  describe('geneticAlgorithm', () => {
    it('should run genetic algorithm with proper parameters', async () => {
      const mockData = {
        students: [{ id: '1', studentId: 'STU001' }],
        teachers: [{ id: '1', teacherId: 'TCH001', maxWorkload: 40 }],
        courses: [{ id: '1', courseId: 'CS101', teacherId: '1', creditHours: 3 }],
        rooms: [{ id: '1', roomId: 'R001', capacity: 30 }],
        existingTimetables: []
      };

      const result = await aiTimetableService.geneticAlgorithm({
        ...mockData,
        semester: 3,
        academicYear: '2024-25'
      });

      expect(result).toBeDefined();
      expect(result.semester).toBe(3);
      expect(result.academicYear).toBe('2024-25');
      expect(result.slots).toBeDefined();
      expect(Array.isArray(result.slots)).toBe(true);
    });
  });

  describe('calculateFitness', () => {
    it('should calculate fitness correctly for conflict-free timetable', async () => {
      const mockData = {
        students: [{ id: '1' }],
        teachers: [{ id: '1', maxWorkload: 40 }],
        courses: [{ id: '1', teacherId: '1', maxStudents: 25 }],
        rooms: [{ id: '1', capacity: 30 }],
        existingTimetables: []
      };

      const individual = {
        slots: [
          {
            courseId: '1',
            teacherId: '1',
            roomId: '1',
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '10:30',
            creditHours: 3
          }
        ],
        conflicts: [],
        fitness: 0
      };

      const fitness = await aiTimetableService.calculateFitness(individual, mockData);

      expect(fitness).toBeGreaterThan(0);
      expect(fitness).toBeLessThanOrEqual(1);
    });

    it('should reduce fitness for conflicts', async () => {
      const mockData = {
        students: [{ id: '1' }],
        teachers: [{ id: '1', maxWorkload: 40 }],
        courses: [{ id: '1', teacherId: '1', maxStudents: 25 }],
        rooms: [{ id: '1', capacity: 30 }],
        existingTimetables: []
      };

      const individual = {
        slots: [
          {
            courseId: '1',
            teacherId: '1',
            roomId: '1',
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '10:30',
            creditHours: 3
          },
          {
            courseId: '2',
            teacherId: '1', // Same teacher
            roomId: '1', // Same room
            dayOfWeek: 1, // Same day
            startTime: '09:00', // Same time - CONFLICT!
            endTime: '10:30',
            creditHours: 3
          }
        ],
        conflicts: [],
        fitness: 0
      };

      const fitness = await aiTimetableService.calculateFitness(individual, mockData);

      expect(fitness).toBeLessThan(1);
      expect(individual.conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('timeOverlap', () => {
    it('should detect overlapping times correctly', () => {
      // Overlapping times
      expect(aiTimetableService.timeOverlap('09:00', '10:30', '10:00', '11:30')).toBe(true);
      expect(aiTimetableService.timeOverlap('09:00', '10:30', '09:30', '10:00')).toBe(true);
      expect(aiTimetableService.timeOverlap('09:00', '10:30', '08:30', '09:30')).toBe(true);
      
      // Non-overlapping times
      expect(aiTimetableService.timeOverlap('09:00', '10:30', '11:00', '12:30')).toBe(false);
      expect(aiTimetableService.timeOverlap('09:00', '10:30', '08:00', '09:00')).toBe(false);
    });
  });

  describe('calculateTeacherWorkloads', () => {
    it('should calculate teacher workloads correctly', () => {
      const teachers = [
        { id: '1', maxWorkload: 40 },
        { id: '2', maxWorkload: 35 }
      ];

      const slots = [
        {
          teacherId: '1',
          startTime: '09:00',
          endTime: '10:30' // 1.5 hours
        },
        {
          teacherId: '1',
          startTime: '11:00',
          endTime: '12:30' // 1.5 hours
        },
        {
          teacherId: '2',
          startTime: '09:00',
          endTime: '10:30' // 1.5 hours
        }
      ];

      const workloads = aiTimetableService.calculateTeacherWorkloads(slots, teachers);

      expect(workloads['1']).toBe(3); // 1.5 + 1.5 = 3 hours
      expect(workloads['2']).toBe(1.5); // 1.5 hours
    });
  });
});



