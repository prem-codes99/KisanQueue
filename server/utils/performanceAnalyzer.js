import Procurement from '../models/Procurement.js';
import Queue from '../models/Queue.js';
import Centre from '../models/Centre.js';
import { calculateCentreBottleneck } from './bottleneckEngine.js';

export const FALLBACK_PROCESSING_TIME = 12; // 12 mins default baseline fallback
export const MIN_SAMPLES_FOR_REAL_DATA = 3;  // Minimum completed procurements/queues required

/**
 * Calculates dynamic real performance metrics for a procurement centre
 * @param {string|Object} centreId - Centre ID
 * @param {string|Date} [targetTime] - Optional slot time (e.g. "09:30" or "14:00") to evaluate time-of-day dynamics
 * @returns {Promise<Object>} Performance metrics and processing time
 */
export const getCentreDynamicPerformance = async (centreId, targetTime = null) => {
  const centre = typeof centreId === 'object' && centreId._id ? centreId : await Centre.findById(centreId);
  const activeCounters = Math.max(1, centre ? (centre.activeCounters || 2) : 2);
  const actualCentreId = centre ? centre._id : centreId;

  // 1. Fetch recent completed procurements (most recent first)
  const recentProcurements = await Procurement.find({ centreId: actualCentreId })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  // 2. Fetch completed queue records (most recent first)
  const recentCompletedQueues = await Queue.find({ centreId: actualCentreId, status: 'COMPLETED' })
    .sort({ updatedAt: -1 })
    .limit(30)
    .lean();

  // Total real data samples available
  const sampleCount = Math.max(recentProcurements.length, recentCompletedQueues.length);

  // Fallback check: If insufficient records, use existing 12-minute fallback calculation
  if (sampleCount < MIN_SAMPLES_FOR_REAL_DATA) {
    return {
      isFallback: true,
      dataPointsCount: sampleCount,
      avgProcessingTime: FALLBACK_PROCESSING_TIME,
      farmersPerHour: Math.round((activeCounters * 60) / FALLBACK_PROCESSING_TIME),
      activeCounters,
      bottleneckStage: 'None',
      reason: 'Insufficient historical procurement data; using standard 12-minute baseline fallback.'
    };
  }

  // 3. Real Centre Data Analysis:
  let weightedDurationSum = 0;
  let totalWeights = 0;
  let morningDurations = [];
  let afternoonDurations = [];

  // Group by time-of-day and calculate intervals between completions
  for (let i = 0; i < recentProcurements.length - 1; i++) {
    const tCurrent = new Date(recentProcurements[i].createdAt).getTime();
    const tPrev = new Date(recentProcurements[i + 1].createdAt).getTime();
    const diffMins = (tCurrent - tPrev) / (1000 * 60);

    // Only consider valid operational intervals (between 3 mins and 60 mins)
    if (diffMins >= 3 && diffMins <= 60) {
      const effectiveDuration = Math.round(diffMins * activeCounters);
      const clampedDuration = Math.max(5, Math.min(45, effectiveDuration));

      // Exponential recency weight (more recent data has more importance)
      const weight = Math.pow(0.9, i);
      weightedDurationSum += clampedDuration * weight;
      totalWeights += weight;

      // Classify morning vs afternoon (based on hour of completion)
      const hour = new Date(recentProcurements[i].createdAt).getHours();
      if (hour < 12) {
        morningDurations.push(clampedDuration);
      } else {
        afternoonDurations.push(clampedDuration);
      }
    }
  }

  // Also include turnaround times from completed queue records
  for (let i = 0; i < recentCompletedQueues.length; i++) {
    const q = recentCompletedQueues[i];
    if (q.arrivalTime && q.updatedAt) {
      const turnaroundMins = (new Date(q.updatedAt).getTime() - new Date(q.arrivalTime).getTime()) / (1000 * 60);
      if (turnaroundMins >= 5 && turnaroundMins <= 60) {
        const weight = Math.pow(0.9, i) * 0.5;
        weightedDurationSum += turnaroundMins * weight;
        totalWeights += weight;
      }
    }
  }

  // Dynamic average calculation
  let dynamicAvgTime = totalWeights > 0 
    ? Math.round(weightedDurationSum / totalWeights)
    : FALLBACK_PROCESSING_TIME;

  // Clamping to physical bounds (5 mins to 40 mins)
  dynamicAvgTime = Math.max(5, Math.min(40, dynamicAvgTime));

  // Time-of-day segmentation (morning vs afternoon)
  if (targetTime) {
    let targetHour = 10;
    if (typeof targetTime === 'string') {
      const match = targetTime.match(/^(\d{1,2})/);
      if (match) targetHour = parseInt(match[1], 10);
    } else if (targetTime instanceof Date) {
      targetHour = targetTime.getHours();
    }

    if (targetHour < 12 && morningDurations.length >= 2) {
      const avgMorning = Math.round(morningDurations.reduce((a, b) => a + b, 0) / morningDurations.length);
      dynamicAvgTime = Math.round(dynamicAvgTime * 0.4 + avgMorning * 0.6);
    } else if (targetHour >= 12 && afternoonDurations.length >= 2) {
      const avgAfternoon = Math.round(afternoonDurations.reduce((a, b) => a + b, 0) / afternoonDurations.length);
      dynamicAvgTime = Math.round(dynamicAvgTime * 0.4 + avgAfternoon * 0.6);
    }
  }

  // Incorporate active bottleneck stage delay if present
  let bottleneckStageName = 'None';
  try {
    const bottleneckData = await calculateCentreBottleneck(actualCentreId, centre);
    if (bottleneckData && bottleneckData.limitingStage && bottleneckData.limitingStage.severity !== 'NORMAL') {
      bottleneckStageName = bottleneckData.limitingStage.stage;
      const stageDelay = bottleneckData.limitingStage.delay || 0;
      if (stageDelay > 0) {
        dynamicAvgTime = Math.min(45, dynamicAvgTime + Math.round(stageDelay * 0.5));
      }
    }
  } catch (e) {
    // Continue gracefully
  }

  // Farmers processed per hour (throughput)
  const farmersPerHour = Math.max(1, Math.round((activeCounters * 60) / dynamicAvgTime));

  return {
    isFallback: false,
    dataPointsCount: sampleCount,
    avgProcessingTime: dynamicAvgTime,
    farmersPerHour,
    activeCounters,
    bottleneckStage: bottleneckStageName,
    reason: `Calculated from ${sampleCount} real completed records with exponential recency weighting.`
  };
};
