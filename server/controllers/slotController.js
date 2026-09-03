import Slot from '../models/Slot.js';
import Centre from '../models/Centre.js';
import Queue from '../models/Queue.js';
import Booking from '../models/Booking.js';
import { getCentreDynamicPerformance } from '../utils/performanceAnalyzer.js';

// Pre-defined slot times
const defaultTimeSlots = [
  { startTime: '09:00', endTime: '09:30' },
  { startTime: '09:30', endTime: '10:00' },
  { startTime: '10:00', endTime: '10:30' },
  { startTime: '10:30', endTime: '11:00' },
  { startTime: '11:00', endTime: '11:30' },
  { startTime: '11:30', endTime: '12:00' },
  { startTime: '12:00', endTime: '12:30' },
  { startTime: '12:30', endTime: '13:00' },
  { startTime: '13:30', endTime: '14:00' },
  { startTime: '14:00', endTime: '14:30' },
  { startTime: '14:30', endTime: '15:00' },
  { startTime: '15:00', endTime: '15:30' },
  { startTime: '15:30', endTime: '16:00' },
  { startTime: '16:00', endTime: '16:30' },
  { startTime: '16:30', endTime: '17:00' }
];

// Helper to generate slots
const generateSlotsForDate = async (centreId, date) => {
  const centre = await Centre.findById(centreId);
  if (!centre) throw new Error('Centre not found');

  const slots = defaultTimeSlots.map(time => ({
    centreId,
    date,
    startTime: time.startTime,
    endTime: time.endTime,
    capacity: Math.ceil((centre.capacity || 150) / defaultTimeSlots.length), // Distribute capacity
    bookedCount: 0,
    crowdLevel: 'LOW'
  }));

  return await Slot.insertMany(slots);
};

// Get slots for centre on a specific date with dynamic real queue predictions
export const getSlotsByCentreAndDate = async (req, res) => {
  try {
    const { centreId, date } = req.query; // YYYY-MM-DD
    if (!centreId || !date) {
      return res.status(400).json({ success: false, message: 'Please provide centreId and date' });
    }

    let slots = await Slot.find({ centreId, date }).sort({ startTime: 1 });

    if (slots.length === 0) {
      // Auto generate slots for this date to make testing flawless
      slots = await generateSlotsForDate(centreId, date);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = date === todayStr;
    const currentQueueCount = isToday ? await Queue.countDocuments({ centreId, status: 'WAITING' }) : 0;

    // Calculate real dynamic performance predictions for each slot
    const enrichedSlots = await Promise.all(slots.map(async (s, idx) => {
      const booked = s.bookedCount || 0;
      const cap = s.capacity || 10;
      const isAvailable = booked < cap;

      // Real centre dynamic performance (with morning vs afternoon time-of-day differentiation)
      const perf = await getCentreDynamicPerformance(centreId, s.startTime);
      const avgProcessingTime = perf.avgProcessingTime;
      const activeCounters = perf.activeCounters;

      // Realistic queue estimate using real booked count, live waiting farmers, and active counters
      const queueEstimate = Math.max(1, booked + (isToday && idx === 0 ? currentQueueCount : 0));
      const predictedWaitTime = Math.max(8, Math.ceil((queueEstimate * avgProcessingTime) / Math.max(1, activeCounters)));

      const util = booked / Math.max(1, cap);
      let congestion = 'LOW';
      if (util >= 0.70 || predictedWaitTime > 35) {
        congestion = 'HIGH';
      } else if (util >= 0.35 || predictedWaitTime > 18) {
        congestion = 'MODERATE';
      } else {
        congestion = 'LOW';
      }

      return {
        _id: s._id,
        centreId: s.centreId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: cap,
        bookedCount: booked,
        isAvailable,
        predictedWaitTime,
        congestion, // 'LOW' | 'MODERATE' | 'HIGH'
        crowdLevel: congestion,
        dynamicProcessingTime: avgProcessingTime,
        isFallback: perf.isFallback
      };
    }));

    // Best recommended slot (available slot with lowest predicted wait time; if similar, prefer earlier slot)
    const availableSlots = enrichedSlots.filter(s => s.isAvailable);
    const recommendedSlot = availableSlots.length > 0
      ? [...availableSlots].sort((a, b) => {
          if (a.predictedWaitTime !== b.predictedWaitTime) {
            return a.predictedWaitTime - b.predictedWaitTime;
          }
          const score = { 'LOW': 1, 'MODERATE': 2, 'HIGH': 3 };
          if (score[a.congestion] !== score[b.congestion]) {
            return score[a.congestion] - score[b.congestion];
          }
          return a.startTime.localeCompare(b.startTime);
        })[0]
      : null;

    res.status(200).json({
      success: true,
      recommendedSlot,
      bestTimeToVisit: recommendedSlot,
      data: enrichedSlots
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Smart Queue Advisor endpoint for Farmer Dashboard & Planning
export const getSmartQueueAdvisor = async (req, res) => {
  try {
    let { centreId, date } = req.query;
    if (!date) {
      date = new Date().toISOString().split('T')[0];
    }

    if (!centreId) {
      const firstCentre = await Centre.findOne({ approvalStatus: { $ne: 'REJECTED' } });
      if (!firstCentre) {
        return res.status(404).json({ success: false, message: 'No active centre found' });
      }
      centreId = firstCentre._id;
    }

    const centre = await Centre.findById(centreId);
    if (!centre) {
      return res.status(404).json({ success: false, message: 'Centre not found' });
    }

    const centrePerf = await getCentreDynamicPerformance(centre._id);
    const activeCounters = centrePerf.activeCounters;

    let slots = await Slot.find({ centreId, date }).sort({ startTime: 1 });
    if (slots.length === 0) {
      slots = await generateSlotsForDate(centreId, date);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = date === todayStr;
    const currentQueue = isToday ? await Queue.countDocuments({ centreId, status: 'WAITING' }) : 0;

    const enrichedSlots = await Promise.all(slots.map(async (s, idx) => {
      const booked = s.bookedCount || 0;
      const cap = s.capacity || 10;
      const isAvailable = booked < cap;

      const slotPerf = await getCentreDynamicPerformance(centreId, s.startTime);
      const avgProcessingTime = slotPerf.avgProcessingTime;

      const queueEstimate = Math.max(1, booked + (isToday && idx === 0 ? currentQueue : 0));
      const predictedWaitTime = Math.max(8, Math.ceil((queueEstimate * avgProcessingTime) / Math.max(1, activeCounters)));
      const util = booked / Math.max(1, cap);

      let congestion = 'LOW';
      if (util >= 0.70 || predictedWaitTime > 35) congestion = 'HIGH';
      else if (util >= 0.35 || predictedWaitTime > 18) congestion = 'MODERATE';
      else congestion = 'LOW';

      return {
        _id: s._id,
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: cap,
        bookedCount: booked,
        isAvailable,
        predictedWaitTime,
        congestion,
        crowdLevel: congestion,
        dynamicProcessingTime: avgProcessingTime,
        isFallback: slotPerf.isFallback
      };
    }));

    const available = enrichedSlots.filter(s => s.isAvailable);
    const recommendedSlot = available.length > 0
      ? [...available].sort((a, b) => {
          if (a.predictedWaitTime !== b.predictedWaitTime) {
            return a.predictedWaitTime - b.predictedWaitTime;
          }
          const score = { 'LOW': 1, 'MODERATE': 2, 'HIGH': 3 };
          if (score[a.congestion] !== score[b.congestion]) {
            return score[a.congestion] - score[b.congestion];
          }
          return a.startTime.localeCompare(b.startTime);
        })[0]
      : null;

    // Peak period calculation
    const sortedByWait = [...enrichedSlots].sort((a, b) => b.predictedWaitTime - a.predictedWaitTime);
    const peakSlot = sortedByWait[0];
    const predictedPeakPeriod = peakSlot ? `${peakSlot.startTime} - ${peakSlot.endTime}` : '11:00 - 13:00';

    // Overall congestion
    const totalBooked = enrichedSlots.reduce((sum, s) => sum + s.bookedCount, 0);
    const totalCapacity = enrichedSlots.reduce((sum, s) => sum + s.capacity, 0);
    const overallUtil = totalCapacity > 0 ? (totalBooked / totalCapacity) : 0;
    const congestionLevel = (overallUtil >= 0.70 || currentQueue >= 6) ? 'HIGH' : (overallUtil >= 0.35 || currentQueue >= 3) ? 'MODERATE' : 'LOW';

    const expectedWaitTime = recommendedSlot ? recommendedSlot.predictedWaitTime : 12;

    res.status(200).json({
      success: true,
      data: {
        centreId: centre._id,
        centreName: centre.name,
        currentQueue,
        activeCounters,
        congestionLevel,
        predictedPeakPeriod,
        recommendedSlot,
        bestTimeToVisit: recommendedSlot,
        expectedWaitTime,
        dynamicPerformance: {
          isFallback: centrePerf.isFallback,
          avgProcessingTime: centrePerf.avgProcessingTime,
          farmersPerHour: centrePerf.farmersPerHour,
          dataPointsCount: centrePerf.dataPointsCount,
          bottleneckStage: centrePerf.bottleneckStage
        },
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Force batch generate slots (Admin only)
export const batchGenerateSlots = async (req, res) => {
  try {
    const { centreId, startDate, endDate } = req.body;
    if (!centreId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const created = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const existing = await Slot.find({ centreId, date: dateStr });
      if (existing.length === 0) {
        const generated = await generateSlotsForDate(centreId, dateStr);
        created.push(...generated);
      }
    }

    res.status(201).json({ success: true, message: `Successfully generated slots`, count: created.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
