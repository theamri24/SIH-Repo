const db = require('../config/database');
const redis = require('../config/redis');
const moment = require('moment');

class AITimetableService {
  constructor() {
    this.maxIterations = parseInt(process.env.AI_MAX_ITERATIONS) || 1000;
    this.conflictThreshold = parseFloat(process.env.AI_CONFLICT_THRESHOLD) || 0.8;
    this.optimizationWeight = parseFloat(process.env.AI_OPTIMIZATION_WEIGHT) || 0.5;
  }

  // Main AI timetable generation method
  async generateTimetable(params) {
    const startTime = Date.now();
    const { semester, academicYear, studentIds, teacherIds, courseIds } = params;

    try {
      // Get all required data
      const [students, teachers, courses, rooms, existingTimetables] = await Promise.all([
        this.getStudents(studentIds),
        this.getTeachers(teacherIds),
        this.getCourses(courseIds),
        this.getAvailableRooms(),
        this.getExistingTimetables(semester, academicYear)
      ]);

      // Validate inputs
      this.validateInputs(students, teachers, courses, rooms);

      // Generate timetable using genetic algorithm
      const timetable = await this.geneticAlgorithm({
        students,
        teachers,
        courses,
        rooms,
        existingTimetables,
        semester,
        academicYear
      });

      // Log AI operation
      await this.logAIOperation('GENERATE', params, timetable, startTime);

      return {
        success: true,
        timetable,
        conflicts: timetable.conflicts || [],
        suggestions: timetable.suggestions || [],
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('AI Timetable Generation Error:', error);
      await this.logAIOperation('GENERATE', params, null, startTime, error.message);
      throw error;
    }
  }

  // Genetic Algorithm for timetable optimization
  async geneticAlgorithm({ students, teachers, courses, rooms, existingTimetables, semester, academicYear }) {
    const populationSize = 50;
    const generations = 100;
    let population = this.initializePopulation(populationSize, { students, teachers, courses, rooms });

    for (let generation = 0; generation < generations; generation++) {
      // Evaluate fitness
      population = await Promise.all(population.map(async (individual) => {
        const fitness = await this.calculateFitness(individual, { students, teachers, courses, rooms, existingTimetables });
        return { ...individual, fitness };
      }));

      // Sort by fitness
      population.sort((a, b) => b.fitness - a.fitness);

      // Check for convergence
      if (population[0].fitness >= this.conflictThreshold) {
        break;
      }

      // Create next generation
      const newPopulation = [];
      
      // Keep top 20% (elitism)
      const eliteCount = Math.floor(populationSize * 0.2);
      newPopulation.push(...population.slice(0, eliteCount));

      // Generate offspring through crossover and mutation
      while (newPopulation.length < populationSize) {
        const parent1 = this.tournamentSelection(population);
        const parent2 = this.tournamentSelection(population);
        const offspring = this.crossover(parent1, parent2);
        const mutatedOffspring = this.mutate(offspring, { students, teachers, courses, rooms });
        newPopulation.push(mutatedOffspring);
      }

      population = newPopulation;
    }

    // Return best solution
    const bestSolution = population[0];
    return this.formatTimetable(bestSolution, { students, teachers, courses, rooms, semester, academicYear });
  }

  // Initialize random population
  initializePopulation(size, { students, teachers, courses, rooms }) {
    const population = [];
    
    for (let i = 0; i < size; i++) {
      const individual = {
        slots: [],
        conflicts: [],
        fitness: 0
      };

      // Generate random timetable slots
      for (const course of courses) {
        const teacher = teachers.find(t => t.id === course.teacherId);
        if (!teacher) continue;

        const slot = this.generateRandomSlot(course, teacher, rooms);
        individual.slots.push(slot);
      }

      population.push(individual);
    }

    return population;
  }

  // Generate random slot for a course
  generateRandomSlot(course, teacher, rooms) {
    const days = [1, 2, 3, 4, 5]; // Monday to Friday
    const timeSlots = [
      { start: '09:00', end: '10:30' },
      { start: '10:45', end: '12:15' },
      { start: '13:00', end: '14:30' },
      { start: '14:45', end: '16:15' },
      { start: '16:30', end: '18:00' }
    ];

    const day = days[Math.floor(Math.random() * days.length)];
    const timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
    const room = rooms[Math.floor(Math.random() * rooms.length)];

    return {
      courseId: course.id,
      teacherId: teacher.id,
      roomId: room.id,
      dayOfWeek: day,
      startTime: timeSlot.start,
      endTime: timeSlot.end,
      creditHours: course.creditHours
    };
  }

  // Calculate fitness score for an individual
  async calculateFitness(individual, { students, teachers, courses, rooms, existingTimetables }) {
    let fitness = 1.0;
    const conflicts = [];

    // Check for conflicts
    for (let i = 0; i < individual.slots.length; i++) {
      for (let j = i + 1; j < individual.slots.length; j++) {
        const slot1 = individual.slots[i];
        const slot2 = individual.slots[j];

        // Teacher conflict
        if (slot1.teacherId === slot2.teacherId && 
            slot1.dayOfWeek === slot2.dayOfWeek &&
            this.timeOverlap(slot1.startTime, slot1.endTime, slot2.startTime, slot2.endTime)) {
          conflicts.push({
            type: 'TEACHER_CONFLICT',
            slot1,
            slot2,
            severity: 0.8
          });
          fitness -= 0.3;
        }

        // Room conflict
        if (slot1.roomId === slot2.roomId && 
            slot1.dayOfWeek === slot2.dayOfWeek &&
            this.timeOverlap(slot1.startTime, slot1.endTime, slot2.startTime, slot2.endTime)) {
          conflicts.push({
            type: 'ROOM_CONFLICT',
            slot1,
            slot2,
            severity: 0.9
          });
          fitness -= 0.4;
        }
      }

      // Check against existing timetables
      for (const existing of existingTimetables) {
        const slot = individual.slots[i];
        if (slot.teacherId === existing.teacherId && 
            slot.dayOfWeek === existing.dayOfWeek &&
            this.timeOverlap(slot.startTime, slot.endTime, existing.startTime, existing.endTime)) {
          conflicts.push({
            type: 'EXISTING_CONFLICT',
            slot,
            existing,
            severity: 0.7
          });
          fitness -= 0.2;
        }
      }
    }

    // Check teacher workload
    const teacherWorkloads = this.calculateTeacherWorkloads(individual.slots, teachers);
    for (const [teacherId, workload] of Object.entries(teacherWorkloads)) {
      const teacher = teachers.find(t => t.id === teacherId);
      if (teacher && workload > teacher.maxWorkload) {
        conflicts.push({
          type: 'WORKLOAD_EXCEEDED',
          teacherId,
          current: workload,
          max: teacher.maxWorkload,
          severity: 0.6
        });
        fitness -= 0.1 * (workload - teacher.maxWorkload);
      }
    }

    // Check room capacity
    for (const slot of individual.slots) {
      const course = courses.find(c => c.id === slot.courseId);
      const room = rooms.find(r => r.id === slot.roomId);
      if (course && room && course.maxStudents && course.maxStudents > room.capacity) {
        conflicts.push({
          type: 'CAPACITY_EXCEEDED',
          slot,
          course,
          room,
          severity: 0.5
        });
        fitness -= 0.1;
      }
    }

    individual.conflicts = conflicts;
    return Math.max(0, fitness);
  }

  // Tournament selection
  tournamentSelection(population, tournamentSize = 3) {
    const tournament = [];
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * population.length);
      tournament.push(population[randomIndex]);
    }
    return tournament.reduce((best, current) => current.fitness > best.fitness ? current : best);
  }

  // Crossover operation
  crossover(parent1, parent2) {
    const child = {
      slots: [],
      conflicts: [],
      fitness: 0
    };

    // Uniform crossover
    for (let i = 0; i < Math.max(parent1.slots.length, parent2.slots.length); i++) {
      const slot1 = parent1.slots[i];
      const slot2 = parent2.slots[i];
      
      if (slot1 && slot2) {
        // Randomly choose from either parent
        child.slots.push(Math.random() < 0.5 ? slot1 : slot2);
      } else if (slot1) {
        child.slots.push(slot1);
      } else if (slot2) {
        child.slots.push(slot2);
      }
    }

    return child;
  }

  // Mutation operation
  mutate(individual, { students, teachers, courses, rooms }) {
    const mutated = JSON.parse(JSON.stringify(individual));
    const mutationRate = 0.1;

    for (let i = 0; i < mutated.slots.length; i++) {
      if (Math.random() < mutationRate) {
        const course = courses.find(c => c.id === mutated.slots[i].courseId);
        const teacher = teachers.find(t => t.id === course.teacherId);
        if (course && teacher) {
          mutated.slots[i] = this.generateRandomSlot(course, teacher, rooms);
        }
      }
    }

    return mutated;
  }

  // Helper methods
  timeOverlap(start1, end1, start2, end2) {
    const time1Start = moment(start1, 'HH:mm');
    const time1End = moment(end1, 'HH:mm');
    const time2Start = moment(start2, 'HH:mm');
    const time2End = moment(end2, 'HH:mm');

    return time1Start.isBefore(time2End) && time2Start.isBefore(time1End);
  }

  calculateTeacherWorkloads(slots, teachers) {
    const workloads = {};
    
    for (const teacher of teachers) {
      workloads[teacher.id] = 0;
    }

    for (const slot of slots) {
      if (workloads[slot.teacherId] !== undefined) {
        const duration = moment(slot.endTime, 'HH:mm').diff(moment(slot.startTime, 'HH:mm'), 'hours', true);
        workloads[slot.teacherId] += duration;
      }
    }

    return workloads;
  }

  formatTimetable(individual, { students, teachers, courses, rooms, semester, academicYear }) {
    const timetable = {
      semester,
      academicYear,
      slots: individual.slots.map(slot => ({
        courseId: slot.courseId,
        teacherId: slot.teacherId,
        roomId: slot.roomId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        course: courses.find(c => c.id === slot.courseId),
        teacher: teachers.find(t => t.id === slot.teacherId),
        room: rooms.find(r => r.id === slot.roomId)
      })),
      conflicts: individual.conflicts,
      suggestions: this.generateSuggestions(individual, { students, teachers, courses, rooms }),
      fitness: individual.fitness
    };

    return timetable;
  }

  generateSuggestions(individual, { students, teachers, courses, rooms }) {
    const suggestions = [];

    // Suggest room changes for capacity issues
    for (const conflict of individual.conflicts) {
      if (conflict.type === 'CAPACITY_EXCEEDED') {
        const suitableRooms = rooms.filter(r => 
          r.capacity >= conflict.course.maxStudents && 
          r.roomType === 'CLASSROOM'
        );
        if (suitableRooms.length > 0) {
          suggestions.push({
            type: 'ROOM_CHANGE',
            slot: conflict.slot,
            suggestedRoom: suitableRooms[0],
            reason: 'Capacity exceeded'
          });
        }
      }
    }

    // Suggest time changes for conflicts
    for (const conflict of individual.conflicts) {
      if (conflict.type === 'TEACHER_CONFLICT' || conflict.type === 'ROOM_CONFLICT') {
        suggestions.push({
          type: 'TIME_CHANGE',
          slot: conflict.slot1,
          reason: 'Conflict with another class',
          alternatives: this.findAlternativeTimes(conflict.slot1, individual.slots)
        });
      }
    }

    return suggestions;
  }

  findAlternativeTimes(slot, allSlots) {
    const days = [1, 2, 3, 4, 5];
    const timeSlots = [
      { start: '09:00', end: '10:30' },
      { start: '10:45', end: '12:15' },
      { start: '13:00', end: '14:30' },
      { start: '14:45', end: '16:15' },
      { start: '16:30', end: '18:00' }
    ];

    const alternatives = [];
    
    for (const day of days) {
      for (const timeSlot of timeSlots) {
        const hasConflict = allSlots.some(s => 
          s.teacherId === slot.teacherId && 
          s.dayOfWeek === day &&
          this.timeOverlap(s.startTime, s.endTime, timeSlot.start, timeSlot.end)
        );
        
        if (!hasConflict) {
          alternatives.push({
            dayOfWeek: day,
            startTime: timeSlot.start,
            endTime: timeSlot.end
          });
        }
      }
    }

    return alternatives.slice(0, 3); // Return top 3 alternatives
  }

  // Data retrieval methods
  async getStudents(studentIds) {
    const where = studentIds ? { id: { in: studentIds } } : {};
    return await db.getClient().student.findMany({
      where,
      include: {
        user: true,
        enrollments: {
          include: { course: true }
        }
      }
    });
  }

  async getTeachers(teacherIds) {
    const where = teacherIds ? { id: { in: teacherIds } } : {};
    return await db.getClient().teacher.findMany({
      where,
      include: {
        user: true,
        courses: true
      }
    });
  }

  async getCourses(courseIds) {
    const where = courseIds ? { id: { in: courseIds } } : { isActive: true };
    return await db.getClient().course.findMany({
      where,
      include: {
        teacher: true,
        enrollments: true
      }
    });
  }

  async getAvailableRooms() {
    return await db.getClient().room.findMany({
      where: { isActive: true }
    });
  }

  async getExistingTimetables(semester, academicYear) {
    return await db.getClient().timetable.findMany({
      where: {
        semester,
        academicYear,
        isActive: true
      }
    });
  }

  validateInputs(students, teachers, courses, rooms) {
    if (students.length === 0) throw new Error('No students found');
    if (teachers.length === 0) throw new Error('No teachers found');
    if (courses.length === 0) throw new Error('No courses found');
    if (rooms.length === 0) throw new Error('No rooms found');
  }

  async logAIOperation(operation, inputData, outputData, startTime, error = null) {
    try {
      await db.getClient().aiLog.create({
        data: {
          operation,
          inputData,
          outputData,
          conflicts: outputData?.conflicts || [],
          suggestions: outputData?.suggestions || [],
          executionTime: Date.now() - startTime,
          status: error ? 'FAILED' : 'SUCCESS'
        }
      });
    } catch (logError) {
      console.error('Failed to log AI operation:', logError);
    }
  }
}

module.exports = new AITimetableService();
