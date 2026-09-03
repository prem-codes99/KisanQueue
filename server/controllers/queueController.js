import Queue from '../models/Queue.js';
import Booking from '../models/Booking.js';
import Centre from '../models/Centre.js';
import Notification from '../models/Notification.js';
import { getCentreDynamicPerformance } from '../utils/performanceAnalyzer.js';

// Helper to calculate queue waiting times
const updateQueueWaitingTimes = async (centreId) => {
  const perf = await getCentreDynamicPerformance(centreId);
  const activeCounters = perf.activeCounters || 1;
  const avgProcessingTime = perf.avgProcessingTime || 12;

  const waitingFarmers = await Queue.find({ centreId, status: 'WAITING' }).sort({ position: 1 });

  for (let i = 0; i < waitingFarmers.length; i++) {
    const item = waitingFarmers[i];
    item.position = i + 1;
    item.estimatedWaitTime = Math.ceil(((i + 1) * avgProcessingTime) / activeCounters);
    await item.save();

    // Trigger Turn Approaching notification if position <= 3
    if (item.position <= 3) {
      const booking = await Booking.findById(item.bookingId).populate('farmerId');
      if (booking && booking.farmerId) {
        // Find if notification already sent for this position in this session
        const title = 'Your Turn is Approaching';
        const msg = `Your token ${item.tokenNumber} is at position ${item.position} in the queue. Expected wait: ${item.estimatedWaitTime} min. Please stand by.`;
        
        await Notification.create({
          userId: booking.farmerId.userId,
          title,
          message: msg,
          type: 'TURN_APPROACHING'
        });
      }
    }
  }

  // Broadcast updated queue to centre via socket
  if (global.io) {
    const fullQueue = await Queue.find({ centreId })
      .populate({ path: 'bookingId', populate: { path: 'farmerId' } })
      .sort({ position: 1 });
    global.io.to(centreId.toString()).emit('queueUpdated', fullQueue);
    global.io.emit('bottlenecksUpdated');
  }
};

// Get live queue for a centre
export const getCentreQueue = async (req, res) => {
  try {
    const { centreId } = req.params;
    const queue = await Queue.find({ centreId })
      .populate({ path: 'bookingId', populate: { path: 'farmerId' } })
      .sort({ position: 1 });

    res.status(200).json({ success: true, data: queue });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get current queue state for a farmer's active booking
export const getFarmerLiveQueue = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const queueItem = await Queue.findOne({ bookingId });
    
    if (!queueItem) {
      const booking = await Booking.findById(bookingId).populate('centreId');
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      const centre = booking.centreId;
      const perf = await getCentreDynamicPerformance(centre?._id || booking.centreId);
      const activeCounters = perf.activeCounters;
      const avgProcessingTime = perf.avgProcessingTime;

      const waitingCount = await Queue.countDocuments({ 
        centreId: centre?._id || booking.centreId, 
        status: 'WAITING' 
      });
      const currentServing = await Queue.findOne({ 
        centreId: centre?._id || booking.centreId, 
        status: 'SERVING' 
      });

      // Calculate estimate using real queue data and active counters / dynamic processing time
      const estimatedWaitTime = Math.ceil(((waitingCount + 1) * avgProcessingTime) / Math.max(1, activeCounters));
      let queueStatus = 'NORMAL';
      if (estimatedWaitTime > 35) queueStatus = 'CRITICAL';
      else if (estimatedWaitTime > 15) queueStatus = 'MODERATE';

      return res.status(200).json({
        success: true,
        data: {
          tokenNumber: booking.tokenNumber,
          position: waitingCount + 1,
          farmersAhead: waitingCount,
          activeCounters,
          estimatedWaitTime,
          status: booking.status,
          queueStatus,
          currentServingToken: currentServing ? currentServing.tokenNumber : 'None',
          lastUpdated: new Date().toISOString(),
          dynamicProcessingTime: avgProcessingTime,
          isFallback: perf.isFallback
        }
      });
    }

    const perf = await getCentreDynamicPerformance(queueItem.centreId);
    const activeCounters = perf.activeCounters;
    const avgProcessingTime = perf.avgProcessingTime;
    const currentServing = await Queue.findOne({ centreId: queueItem.centreId, status: 'SERVING' });

    let farmersAhead = 0;
    let position = queueItem.position || 1;
    let estimatedWaitTime = 0;
    let queueStatus = 'NORMAL';

    if (queueItem.status === 'SERVING') {
      farmersAhead = 0;
      position = 1;
      estimatedWaitTime = 0;
      queueStatus = 'SERVING';
    } else if (queueItem.status === 'WAITING') {
      farmersAhead = await Queue.countDocuments({
        centreId: queueItem.centreId,
        status: 'WAITING',
        position: { $lt: queueItem.position }
      });
      position = queueItem.position;
      estimatedWaitTime = Math.ceil(((farmersAhead + 1) * avgProcessingTime) / Math.max(1, activeCounters));
      
      if (estimatedWaitTime > 35) queueStatus = 'CRITICAL';
      else if (estimatedWaitTime > 15) queueStatus = 'MODERATE';
      else queueStatus = 'NORMAL';
    } else if (queueItem.status === 'COMPLETED') {
      farmersAhead = 0;
      position = 0;
      estimatedWaitTime = 0;
      queueStatus = 'COMPLETED';
    }

    res.status(200).json({
      success: true,
      data: {
        tokenNumber: queueItem.tokenNumber,
        position,
        farmersAhead,
        activeCounters,
        estimatedWaitTime,
        status: queueItem.status,
        queueStatus,
        currentServingToken: currentServing ? currentServing.tokenNumber : 'None',
        lastUpdated: new Date().toISOString(),
        dynamicProcessingTime: avgProcessingTime,
        isFallback: perf.isFallback
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Mark farmer as arrived (add to live queue)
export const markArrived = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId).populate('farmerId');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status !== 'BOOKED') {
      return res.status(400).json({ success: false, message: `Booking status is already ${booking.status}` });
    }

    // Update booking status
    booking.status = 'ARRIVED';
    await booking.save();

    // Check existing queue size
    const waitingCount = await Queue.countDocuments({ centreId: booking.centreId, status: 'WAITING' });
    const position = waitingCount + 1;

    const centre = await Centre.findById(booking.centreId);
    const activeCounters = centre ? centre.activeCounters : 1;
    const estWait = Math.ceil((position * 15) / activeCounters);

    // Create Queue Entry
    const queueItem = await Queue.create({
      centreId: booking.centreId,
      bookingId: booking._id,
      tokenNumber: booking.tokenNumber,
      position,
      status: 'WAITING',
      estimatedWaitTime: estWait
    });

    // Notify farmer
    await Notification.create({
      userId: booking.farmerId.userId,
      title: 'Arrived at Centre',
      message: `Welcome! You have been checked in. Your token is ${booking.tokenNumber}. Queue position: ${position}. Estimated wait: ${estWait} min.`,
      type: 'TURN_APPROACHING'
    });

    // Update wait times for all waiting items and broadcast
    await updateQueueWaitingTimes(booking.centreId);

    res.status(200).json({ success: true, data: queueItem });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Call next farmer in queue
export const callNext = async (req, res) => {
  try {
    const { centreId } = req.body;

    // Complete any currently serving tokens for this centre
    await Queue.updateMany({ centreId, status: 'SERVING' }, { status: 'COMPLETED', position: 0, estimatedWaitTime: 0 });

    // Find next waiting farmer
    const nextInLine = await Queue.findOne({ centreId, status: 'WAITING' }).sort({ position: 1 });
    if (!nextInLine) {
      return res.status(200).json({ success: true, message: 'No farmers waiting in queue' });
    }

    nextInLine.status = 'SERVING';
    nextInLine.position = 0;
    nextInLine.estimatedWaitTime = 0;
    await nextInLine.save();

    // Update booking status
    const booking = await Booking.findById(nextInLine.bookingId).populate('farmerId');
    if (booking) {
      booking.status = 'PROCESSING';
      await booking.save();

      // Notify the farmer
      await Notification.create({
        userId: booking.farmerId.userId,
        title: 'Token Called!',
        message: `Your token ${booking.tokenNumber} is now being served. Please proceed to the counter immediately.`,
        type: 'CALLED'
      });
    }

    // Refresh remaining queue wait times and positions
    await updateQueueWaitingTimes(centreId);

    res.status(200).json({ success: true, message: `Called token ${nextInLine.tokenNumber}`, data: nextInLine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Mark token as No-Show
export const markNoShow = async (req, res) => {
  try {
    const { queueId } = req.body;
    const queueItem = await Queue.findById(queueId);
    if (!queueItem) {
      return res.status(404).json({ success: false, message: 'Queue item not found' });
    }

    queueItem.status = 'NOSHOW';
    queueItem.position = 0;
    queueItem.estimatedWaitTime = 0;
    await queueItem.save();

    const booking = await Booking.findById(queueItem.bookingId).populate('farmerId');
    if (booking) {
      booking.status = 'NOSHOW';
      await booking.save();

      // Notify farmer
      await Notification.create({
        userId: booking.farmerId.userId,
        title: 'Marked as No-Show',
        message: `You were called but did not report at the counter. Your token ${booking.tokenNumber} is marked as No-Show.`,
        type: 'ALERT'
      });
    }

    await updateQueueWaitingTimes(queueItem.centreId);

    res.status(200).json({ success: true, message: 'Farmer marked as no-show successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
