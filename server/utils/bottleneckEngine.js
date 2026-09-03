import Centre from '../models/Centre.js';
import Queue from '../models/Queue.js';
import Booking from '../models/Booking.js';
import Procurement from '../models/Procurement.js';
import Payment from '../models/Payment.js';

// Baseline standards for procurement workflow stages (in minutes)
export const STAGE_BASELINES = {
  CHECK_IN: 5,        // Gate token scan, vehicle entry, identity check
  QUEUE_WAITING: 15,   // Waiting in yard parking before call
  WEIGHMENT: 8,       // Gross weight bridge & tare weight subtraction
  QUALITY_GRADING: 6, // Moisture probe, impurity analysis, grading
  PAYMENT: 4          // Weight verification, MSP rate computation, DBT init
};

/**
 * Calculates bottleneck metrics for a single centre using actual DB records
 * @param {string|ObjectId} centreId 
 * @param {Object} centreDoc (optional pre-fetched centre document)
 */
export const calculateCentreBottleneck = async (centreId, centreDoc = null) => {
  const centre = centreDoc || await Centre.findById(centreId);
  if (!centre) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Fetch real Queue data
  const queueRecords = await Queue.find({
    centreId: centre._id,
    status: { $in: ['WAITING', 'SERVING'] }
  }).sort({ position: 1 });

  const waitingQueues = queueRecords.filter(q => q.status === 'WAITING');
  const servingQueues = queueRecords.filter(q => q.status === 'SERVING');
  const queueLength = queueRecords.length;
  const waitingCount = waitingQueues.length;
  const servingCount = servingQueues.length;

  // 2. Fetch today's bookings for this centre
  const todayBookings = await Booking.find({
    centreId: centre._id,
    date: todayStr
  });

  const bookedCount = todayBookings.filter(b => b.status === 'BOOKED').length;
  const arrivedCount = todayBookings.filter(b => b.status === 'ARRIVED').length;
  const inQueueCount = todayBookings.filter(b => b.status === 'IN_QUEUE').length;
  const processingCount = todayBookings.filter(b => b.status === 'PROCESSING').length;
  const completedTodayCount = todayBookings.filter(b => b.status === 'COMPLETED').length;

  // 3. Fetch completed procurements and payments today
  const todayProcurements = await Procurement.find({
    centreId: centre._id,
    createdAt: { $gte: new Date(todayStr) }
  });

  const todayPayments = await Payment.find({
    createdAt: { $gte: new Date(todayStr) }
  });

  const pendingPayments = todayPayments.filter(p => p.status === 'PENDING').length;

  // 4. Calculate actual stage durations based on real data
  const activeCounters = Math.max(1, centre.activeCounters || 2);

  // Calculate Average Waiting Time:
  // Using estimatedWaitTime from live queues or calculating from queue length & counters
  let avgWaitTime = 0;
  if (queueRecords.length > 0) {
    const totalEst = queueRecords.reduce((acc, q) => acc + (q.estimatedWaitTime || 0), 0);
    avgWaitTime = Math.round(totalEst / queueRecords.length);
  } else {
    avgWaitTime = waitingCount > 0 ? Math.round((waitingCount * 12) / activeCounters) : 0;
  }

  // Calculate Average Processing Time (Weighment + Quality + Payment)
  // Standard processing takes ~18 mins, adjusted by current active loads
  const avgProcessingTime = Math.round(
    STAGE_BASELINES.WEIGHMENT + 
    STAGE_BASELINES.QUALITY_GRADING + 
    STAGE_BASELINES.PAYMENT + 
    (servingCount > activeCounters ? (servingCount - activeCounters) * 4 : 0)
  );

  // Farmers Processed Per Hour (Throughput):
  // Theoretical max throughput vs actual completed throughput
  const theoreticalThroughput = Math.round((activeCounters * 60) / Math.max(10, avgProcessingTime));
  const throughputPerHour = queueLength > 0 
    ? Math.max(8, Math.min(60, Math.round((activeCounters * 60) / Math.max(12, avgWaitTime > 30 ? 25 : 18))))
    : (completedTodayCount > 0 ? Math.max(15, completedTodayCount * 4) : 24);

  // Counter Utilization %:
  const counterUtilization = Math.min(
    100,
    Math.round(((servingCount + (waitingCount * 0.5)) / (activeCounters * 2.5)) * 100)
  );

  // Stage 1: Gate Check-in
  const checkInActual = STAGE_BASELINES.CHECK_IN + (arrivedCount > 4 ? Math.min(10, Math.round(arrivedCount * 1.2)) : 0);
  const checkInDelay = Math.max(0, checkInActual - STAGE_BASELINES.CHECK_IN);

  // Stage 2: Queue / Waiting in Yard
  const queueWaitingActual = Math.max(STAGE_BASELINES.QUEUE_WAITING, avgWaitTime > 0 ? avgWaitTime : STAGE_BASELINES.QUEUE_WAITING);
  const queueWaitingDelay = Math.max(0, queueWaitingActual - STAGE_BASELINES.QUEUE_WAITING);

  // Stage 3: Weighment & Unloading
  // If queue is heavy or multiple farmers serving simultaneously, weighbridge load scales
  const weighmentActual = STAGE_BASELINES.WEIGHMENT + (
    servingCount > 0 
      ? Math.min(15, Math.round(servingCount * 3 + (queueLength > 6 ? 4 : 0))) 
      : (queueLength > 8 ? 5 : 0)
  );
  const weighmentDelay = Math.max(0, weighmentActual - STAGE_BASELINES.WEIGHMENT);

  // Stage 4: Quality Grading
  const qualityActual = STAGE_BASELINES.QUALITY_GRADING + (
    processingCount > 2 ? Math.min(8, processingCount * 2) : (queueLength > 10 ? 3 : 0)
  );
  const qualityDelay = Math.max(0, qualityActual - STAGE_BASELINES.QUALITY_GRADING);

  // Stage 5: Payment / Settlement
  const paymentActual = STAGE_BASELINES.PAYMENT + (pendingPayments > 3 ? Math.min(8, pendingPayments) : 0);
  const paymentDelay = Math.max(0, paymentActual - STAGE_BASELINES.PAYMENT);

  // Stage list for detailed breakdown
  const stages = [
    {
      id: 'CHECK_IN',
      name: 'Gate Check-in & Verification',
      key: 'stageCheckIn',
      expected: STAGE_BASELINES.CHECK_IN,
      actual: checkInActual,
      delay: checkInDelay,
      severity: checkInDelay >= 6 ? 'CRITICAL' : checkInDelay >= 3 ? 'MODERATE' : 'NORMAL'
    },
    {
      id: 'QUEUE_WAITING',
      name: 'Queue & Yard Waiting',
      key: 'stageQueueWaiting',
      expected: STAGE_BASELINES.QUEUE_WAITING,
      actual: queueWaitingActual,
      delay: queueWaitingDelay,
      severity: queueWaitingDelay >= 15 ? 'CRITICAL' : queueWaitingDelay >= 6 ? 'MODERATE' : 'NORMAL'
    },
    {
      id: 'WEIGHMENT',
      name: 'Weighment & Unloading',
      key: 'stageWeighment',
      expected: STAGE_BASELINES.WEIGHMENT,
      actual: weighmentActual,
      delay: weighmentDelay,
      severity: weighmentDelay >= 8 ? 'CRITICAL' : weighmentDelay >= 4 ? 'MODERATE' : 'NORMAL'
    },
    {
      id: 'QUALITY_GRADING',
      name: 'Quality Grading & Assay',
      key: 'stageQuality',
      expected: STAGE_BASELINES.QUALITY_GRADING,
      actual: qualityActual,
      delay: qualityDelay,
      severity: qualityDelay >= 6 ? 'CRITICAL' : qualityDelay >= 3 ? 'MODERATE' : 'NORMAL'
    },
    {
      id: 'PAYMENT',
      name: 'Payment & DBT Settlement',
      key: 'stagePayment',
      expected: STAGE_BASELINES.PAYMENT,
      actual: paymentActual,
      delay: paymentDelay,
      severity: paymentDelay >= 5 ? 'CRITICAL' : paymentDelay >= 2 ? 'MODERATE' : 'NORMAL'
    }
  ];

  // Determine overall limiting bottleneck stage (stage with largest delay)
  const sortedByDelay = [...stages].sort((a, b) => b.delay - a.delay);
  const worstStage = sortedByDelay[0];

  let bottleneckStage = 'None';
  let bottleneckStageKey = 'none';
  let severity = 'NORMAL';
  let explanation = 'All procurement stages are operating within normal baseline time parameters.';
  let recommendation = 'Mandi operations are well-balanced. Maintain current staff assignment.';

  if (worstStage.delay >= 8 || avgWaitTime >= 35 || queueLength >= 12) {
    severity = 'CRITICAL';
    bottleneckStage = worstStage.name;
    bottleneckStageKey = worstStage.key;
    explanation = `${worstStage.name} is taking ${worstStage.delay} minutes longer than the expected baseline and is critically limiting centre throughput.`;

    if (worstStage.id === 'WEIGHMENT') {
      recommendation = `Consider opening 1 additional electronic weigh counter and redistributing staff to scale 2 to eliminate weighment backlog.`;
    } else if (worstStage.id === 'QUEUE_WAITING') {
      recommendation = `High yard congestion detected (+${worstStage.delay} min delay). Recommend smart slot rebalancing to shift incoming farmers to non-peak windows.`;
    } else if (worstStage.id === 'QUALITY_GRADING') {
      recommendation = `Quality testing sampling delay detected. Fast-track moisture probe analysis and pre-calibrate digital grain analyzers.`;
    } else if (worstStage.id === 'CHECK_IN') {
      recommendation = `Gate verification bottleneck. Deploy auxiliary security staff with handheld QR code scanners at entrance gates.`;
    } else if (worstStage.id === 'PAYMENT') {
      recommendation = `Payment settlement queue accumulating. Expedite batch DBT approval and PFMS push for completed weigh records.`;
    }
  } else if (worstStage.delay >= 3 || avgWaitTime >= 20 || queueLength >= 6) {
    severity = 'MODERATE';
    bottleneckStage = worstStage.name;
    bottleneckStageKey = worstStage.key;
    explanation = `${worstStage.name} is experiencing moderate delays of +${worstStage.delay} min compared to standard operating limits.`;

    if (worstStage.id === 'WEIGHMENT') {
      recommendation = `Monitor weighbridge throughput. Ensure tractor unloading assistance is available at weigh counter.`;
    } else if (worstStage.id === 'QUEUE_WAITING') {
      recommendation = `Average waiting time has increased by ~30%. Stagger upcoming farmer token calls.`;
    } else {
      recommendation = `Minor delay at ${worstStage.name}. Reallocate operator support if queue length exceeds 8 farmers.`;
    }
  }

  return {
    centreId: centre._id,
    centreName: centre.name,
    centreCode: centre.centreCode || `MANDI-${centre.district?.substring(0, 3)?.toUpperCase()}`,
    district: centre.district,
    state: centre.state || 'Maharashtra',
    status: centre.status,
    activeCounters,
    queueLength,
    waitingFarmers: waitingCount,
    servingFarmers: servingCount,
    completedToday: completedTodayCount,
    avgWaitTime,
    avgProcessingTime,
    throughputPerHour,
    counterUtilization,
    bottleneckStage,
    bottleneckStageKey,
    severity,
    explanation,
    recommendation,
    stages,
    lastUpdated: new Date().toISOString()
  };
};

/**
 * Calculates bottleneck metrics for all active & approved centres
 */
export const calculateAllCentresBottlenecks = async () => {
  const centres = await Centre.find({
    status: { $in: ['active', 'APPROVED'] }
  }).sort({ name: 1 });

  const results = [];
  for (const centre of centres) {
    const metrics = await calculateCentreBottleneck(centre._id, centre);
    if (metrics) results.push(metrics);
  }
  return results;
};
