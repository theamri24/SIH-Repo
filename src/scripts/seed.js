const bcrypt = require('bcryptjs');
const db = require('../config/database');

class DatabaseSeeder {
  async seed() {
    try {
      console.log('🌱 Starting database seeding...');

      // Clear existing data
      await this.clearDatabase();

      // Seed data in order
      await this.seedUsers();
      await this.seedStudents();
      await this.seedTeachers();
      await this.seedAdmins();
      await this.seedRooms();
      await this.seedCourses();
      await this.seedEnrollments();
      await this.seedTimetables();
      await this.seedAILogs();

      console.log('✅ Database seeding completed successfully!');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  async clearDatabase() {
    console.log('🧹 Clearing existing data...');
    
    // Delete in reverse order of dependencies
    await db.getClient().aiLog.deleteMany();
    await db.getClient().notification.deleteMany();
    await db.getClient().timetable.deleteMany();
    await db.getClient().enrollment.deleteMany();
    await db.getClient().course.deleteMany();
    await db.getClient().room.deleteMany();
    await db.getClient().admin.deleteMany();
    await db.getClient().teacher.deleteMany();
    await db.getClient().student.deleteMany();
    await db.getClient().user.deleteMany();
  }

  async seedUsers() {
    console.log('👥 Seeding users...');
    
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const users = [
      // Students
      { email: 'john.doe@student.edu', firstName: 'John', lastName: 'Doe', role: 'STUDENT' },
      { email: 'jane.smith@student.edu', firstName: 'Jane', lastName: 'Smith', role: 'STUDENT' },
      { email: 'mike.johnson@student.edu', firstName: 'Mike', lastName: 'Johnson', role: 'STUDENT' },
      { email: 'sarah.wilson@student.edu', firstName: 'Sarah', lastName: 'Wilson', role: 'STUDENT' },
      { email: 'alex.brown@student.edu', firstName: 'Alex', lastName: 'Brown', role: 'STUDENT' },
      
      // Teachers
      { email: 'dr.prof@teacher.edu', firstName: 'Dr. Professor', lastName: 'Smith', role: 'TEACHER' },
      { email: 'prof.jones@teacher.edu', firstName: 'Prof. Jones', lastName: 'Williams', role: 'TEACHER' },
      { email: 'dr.davis@teacher.edu', firstName: 'Dr. Davis', lastName: 'Miller', role: 'TEACHER' },
      { email: 'prof.garcia@teacher.edu', firstName: 'Prof. Garcia', lastName: 'Rodriguez', role: 'TEACHER' },
      { email: 'dr.martinez@teacher.edu', firstName: 'Dr. Martinez', lastName: 'Hernandez', role: 'TEACHER' },
      
      // Admins
      { email: 'admin@university.edu', firstName: 'System', lastName: 'Admin', role: 'ADMIN' },
      { email: 'super.admin@university.edu', firstName: 'Super', lastName: 'Admin', role: 'ADMIN' }
    ];

    for (const userData of users) {
      await db.getClient().user.create({
        data: {
          ...userData,
          password: hashedPassword
        }
      });
    }
  }

  async seedStudents() {
    console.log('🎓 Seeding students...');
    
    const users = await db.getClient().user.findMany({
      where: { role: 'STUDENT' }
    });

    const students = [
      { studentId: 'STU001', year: 2, semester: 3, department: 'Computer Science', specialization: 'AI/ML' },
      { studentId: 'STU002', year: 1, semester: 1, department: 'Mathematics', specialization: 'Applied Mathematics' },
      { studentId: 'STU003', year: 3, semester: 5, department: 'Physics', specialization: 'Quantum Physics' },
      { studentId: 'STU004', year: 2, semester: 3, department: 'Chemistry', specialization: 'Organic Chemistry' },
      { studentId: 'STU005', year: 4, semester: 7, department: 'Biology', specialization: 'Molecular Biology' }
    ];

    for (let i = 0; i < users.length && i < students.length; i++) {
      await db.getClient().student.create({
        data: {
          ...students[i],
          userId: users[i].id,
          preferences: {
            preferredTimeSlots: ['09:00-10:30', '10:45-12:15'],
            avoidDays: [],
            maxHoursPerDay: 6
          }
        }
      });
    }
  }

  async seedTeachers() {
    console.log('👨‍🏫 Seeding teachers...');
    
    const users = await db.getClient().user.findMany({
      where: { role: 'TEACHER' }
    });

    const teachers = [
      { teacherId: 'TCH001', department: 'Computer Science', designation: 'Professor', maxWorkload: 40 },
      { teacherId: 'TCH002', department: 'Mathematics', designation: 'Associate Professor', maxWorkload: 35 },
      { teacherId: 'TCH003', department: 'Physics', designation: 'Professor', maxWorkload: 40 },
      { teacherId: 'TCH004', department: 'Chemistry', designation: 'Assistant Professor', maxWorkload: 30 },
      { teacherId: 'TCH005', department: 'Biology', designation: 'Professor', maxWorkload: 40 }
    ];

    for (let i = 0; i < users.length && i < teachers.length; i++) {
      await db.getClient().teacher.create({
        data: {
          ...teachers[i],
          userId: users[i].id,
          availability: {
            monday: { start: '09:00', end: '17:00' },
            tuesday: { start: '09:00', end: '17:00' },
            wednesday: { start: '09:00', end: '17:00' },
            thursday: { start: '09:00', end: '17:00' },
            friday: { start: '09:00', end: '17:00' }
          },
          preferences: {
            preferredTimeSlots: ['09:00-10:30', '10:45-12:15', '13:00-14:30'],
            maxConsecutiveHours: 3,
            preferredDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          }
        }
      });
    }
  }

  async seedAdmins() {
    console.log('👨‍💼 Seeding admins...');
    
    const users = await db.getClient().user.findMany({
      where: { role: 'ADMIN' }
    });

    const admins = [
      { adminId: 'ADM001', level: 'ADMIN' },
      { adminId: 'ADM002', level: 'SUPER_ADMIN' }
    ];

    for (let i = 0; i < users.length && i < admins.length; i++) {
      await db.getClient().admin.create({
        data: {
          ...admins[i],
          userId: users[i].id
        }
      });
    }
  }

  async seedRooms() {
    console.log('🏢 Seeding rooms...');
    
    const rooms = [
      { roomId: 'R001', roomName: 'Computer Lab 1', roomType: 'COMPUTER_LAB', capacity: 30, floor: 1, building: 'Tech Building', equipment: ['Computers', 'Projector', 'Whiteboard'] },
      { roomId: 'R002', roomName: 'Computer Lab 2', roomType: 'COMPUTER_LAB', capacity: 25, floor: 1, building: 'Tech Building', equipment: ['Computers', 'Projector'] },
      { roomId: 'R003', roomName: 'Physics Lab', roomType: 'SCIENCE_LAB', capacity: 20, floor: 2, building: 'Science Building', equipment: ['Physics Equipment', 'Projector'] },
      { roomId: 'R004', roomName: 'Chemistry Lab', roomType: 'SCIENCE_LAB', capacity: 18, floor: 2, building: 'Science Building', equipment: ['Chemistry Equipment', 'Safety Equipment'] },
      { roomId: 'R005', roomName: 'Biology Lab', roomType: 'SCIENCE_LAB', capacity: 22, floor: 3, building: 'Science Building', equipment: ['Microscopes', 'Lab Equipment'] },
      { roomId: 'R006', roomName: 'Classroom 101', roomType: 'CLASSROOM', capacity: 40, floor: 1, building: 'Main Building', equipment: ['Projector', 'Whiteboard'] },
      { roomId: 'R007', roomName: 'Classroom 102', roomType: 'CLASSROOM', capacity: 35, floor: 1, building: 'Main Building', equipment: ['Projector', 'Whiteboard'] },
      { roomId: 'R008', roomName: 'Classroom 201', roomType: 'CLASSROOM', capacity: 45, floor: 2, building: 'Main Building', equipment: ['Projector', 'Whiteboard'] },
      { roomId: 'R009', roomName: 'Seminar Hall', roomType: 'SEMINAR_HALL', capacity: 100, floor: 1, building: 'Main Building', equipment: ['Projector', 'Sound System', 'Stage'] },
      { roomId: 'R010', roomName: 'Auditorium', roomType: 'AUDITORIUM', capacity: 200, floor: 1, building: 'Main Building', equipment: ['Projector', 'Sound System', 'Stage', 'Lighting'] }
    ];

    for (const room of rooms) {
      await db.getClient().room.create({
        data: room
      });
    }
  }

  async seedCourses() {
    console.log('📚 Seeding courses...');
    
    const teachers = await db.getClient().teacher.findMany();
    
    const courses = [
      { courseId: 'CS101', courseName: 'Introduction to Programming', courseCode: 'CS101', creditHours: 3, department: 'Computer Science', multidisciplinaryTags: ['Programming', 'Logic', 'Problem Solving'], prerequisites: [], maxStudents: 30, minStudents: 5 },
      { courseId: 'CS201', courseName: 'Data Structures and Algorithms', courseCode: 'CS201', creditHours: 4, department: 'Computer Science', multidisciplinaryTags: ['Programming', 'Mathematics', 'Logic'], prerequisites: ['CS101'], maxStudents: 25, minStudents: 5 },
      { courseId: 'CS301', courseName: 'Machine Learning', courseCode: 'CS301', creditHours: 4, department: 'Computer Science', multidisciplinaryTags: ['AI', 'Mathematics', 'Statistics'], prerequisites: ['CS201', 'MATH201'], maxStudents: 20, minStudents: 5 },
      { courseId: 'MATH101', courseName: 'Calculus I', courseCode: 'MATH101', creditHours: 4, department: 'Mathematics', multidisciplinaryTags: ['Mathematics', 'Analysis'], prerequisites: [], maxStudents: 40, minStudents: 10 },
      { courseId: 'MATH201', courseName: 'Linear Algebra', courseCode: 'MATH201', creditHours: 3, department: 'Mathematics', multidisciplinaryTags: ['Mathematics', 'Algebra'], prerequisites: ['MATH101'], maxStudents: 35, minStudents: 10 },
      { courseId: 'PHYS101', courseName: 'General Physics I', courseCode: 'PHYS101', creditHours: 4, department: 'Physics', multidisciplinaryTags: ['Physics', 'Mathematics'], prerequisites: [], maxStudents: 30, minStudents: 10 },
      { courseId: 'CHEM101', courseName: 'General Chemistry I', courseCode: 'CHEM101', creditHours: 4, department: 'Chemistry', multidisciplinaryTags: ['Chemistry', 'Science'], prerequisites: [], maxStudents: 25, minStudents: 10 },
      { courseId: 'BIO101', courseName: 'General Biology I', courseCode: 'BIO101', creditHours: 4, department: 'Biology', multidisciplinaryTags: ['Biology', 'Science'], prerequisites: [], maxStudents: 30, minStudents: 10 },
      { courseId: 'CS401', courseName: 'Artificial Intelligence', courseCode: 'CS401', creditHours: 4, department: 'Computer Science', multidisciplinaryTags: ['AI', 'Computer Science', 'Mathematics'], prerequisites: ['CS301'], maxStudents: 15, minStudents: 5 },
      { courseId: 'MATH301', courseName: 'Statistics and Probability', courseCode: 'MATH301', creditHours: 3, department: 'Mathematics', multidisciplinaryTags: ['Mathematics', 'Statistics'], prerequisites: ['MATH201'], maxStudents: 30, minStudents: 10 }
    ];

    for (let i = 0; i < courses.length; i++) {
      const teacherIndex = i % teachers.length;
      await db.getClient().course.create({
        data: {
          ...courses[i],
          teacherId: teachers[teacherIndex].id
        }
      });
    }
  }

  async seedEnrollments() {
    console.log('📝 Seeding enrollments...');
    
    const students = await db.getClient().student.findMany();
    const courses = await db.getClient().course.findMany();

    // Enroll students in courses based on their year and department
    for (const student of students) {
      const relevantCourses = courses.filter(course => {
        // Simple logic: students take courses based on their year
        if (student.year === 1) {
          return course.courseCode.includes('101');
        } else if (student.year === 2) {
          return course.courseCode.includes('201') || course.courseCode.includes('101');
        } else if (student.year === 3) {
          return course.courseCode.includes('301') || course.courseCode.includes('201');
        } else if (student.year === 4) {
          return course.courseCode.includes('401') || course.courseCode.includes('301');
        }
        return false;
      });

      // Enroll in 3-5 courses
      const coursesToEnroll = relevantCourses.slice(0, Math.floor(Math.random() * 3) + 3);
      
      for (const course of coursesToEnroll) {
        await db.getClient().enrollment.create({
          data: {
            studentId: student.id,
            courseId: course.id,
            status: 'ACTIVE'
          }
        });
      }
    }
  }

  async seedTimetables() {
    console.log('📅 Seeding timetables...');
    
    const enrollments = await db.getClient().enrollment.findMany({
      include: {
        student: true,
        course: {
          include: {
            teacher: true
          }
        }
      }
    });

    const rooms = await db.getClient().room.findMany();
    const timeSlots = [
      { start: '09:00', end: '10:30' },
      { start: '10:45', end: '12:15' },
      { start: '13:00', end: '14:30' },
      { start: '14:45', end: '16:15' },
      { start: '16:30', end: '18:00' }
    ];

    const days = [1, 2, 3, 4, 5]; // Monday to Friday

    for (const enrollment of enrollments) {
      // Create timetable for each enrollment
      const day = days[Math.floor(Math.random() * days.length)];
      const timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
      const room = rooms[Math.floor(Math.random() * rooms.length)];

      await db.getClient().timetable.create({
        data: {
          studentId: enrollment.student.id,
          teacherId: enrollment.course.teacher.id,
          courseId: enrollment.course.id,
          roomId: room.id,
          dayOfWeek: day,
          startTime: timeSlot.start,
          endTime: timeSlot.end,
          semester: 3,
          academicYear: '2024-25'
        }
      });
    }
  }

  async seedAILogs() {
    console.log('🤖 Seeding AI logs...');
    
    const aiLogs = [
      {
        operation: 'GENERATE',
        inputData: { semester: 3, academicYear: '2024-25', studentCount: 5, teacherCount: 5 },
        outputData: { timetableGenerated: true, conflictsResolved: 2 },
        conflicts: [
          { type: 'TEACHER_CONFLICT', resolved: true },
          { type: 'ROOM_CONFLICT', resolved: true }
        ],
        suggestions: [
          { type: 'ROOM_CHANGE', message: 'Consider using larger room for CS101' },
          { type: 'TIME_CHANGE', message: 'Move MATH101 to afternoon slot' }
        ],
        executionTime: 2500,
        status: 'SUCCESS'
      },
      {
        operation: 'OPTIMIZE',
        inputData: { timetableId: 'timetable_001', optimizationType: 'WORKLOAD_BALANCE' },
        outputData: { optimizationApplied: true, improvementScore: 0.85 },
        conflicts: [],
        suggestions: [
          { type: 'WORKLOAD_REDISTRIBUTION', message: 'Redistributed teacher workload evenly' }
        ],
        executionTime: 1800,
        status: 'SUCCESS'
      }
    ];

    for (const log of aiLogs) {
      await db.getClient().aiLog.create({
        data: log
      });
    }
  }
}

// Run seeder if called directly
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  seeder.seed()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = DatabaseSeeder;



