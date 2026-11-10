import { db } from '../database/db.js';

/**
 * Standard Mortality Causes
 */
export const COMMON_CAUSES = [
  'Disease',
  'Infection',
  'Heat stress',
  'Injury',
  'Predators',
  'Feed-related problems',
  'Water-related problems',
  'Unknown cause',
  'Other',
];

/**
 * Biosecurity Disposal Methods
 */
export const DISPOSAL_METHODS = [
  'Burial',
  'Incineration',
  'Composting',
  'Rendering',
  'Deep Pit',
  'Other',
];

/**
 * Mortality Target Record Types
 */
export const RECORD_TYPES = ['BATCH', 'BIRD'];

/**
 * Local Calendar Date Helper (prevents UTC drift)
 */
export function getLocalDateString(dateInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calculate Mortality Rate safely without 0-division
 * Rate (%) = (Deaths / Population at Risk) * 100
 */
export function calculateMortalityRate(deaths, populationAtRisk) {
  const d = Number(deaths) || 0;
  const p = Number(populationAtRisk) || 0;
  if (d <= 0 || p <= 0) return 0.0;
  const rate = (d / p) * 100;
  return Number(rate.toFixed(2));
}

/**
 * FreshNest Mortality Management Service
 * Offline-first tracking for flock and individual bird mortalities with atomic
 * population synchronization, biosecurity disposal logging, and early warning alerts.
 */
export const mortalityService = {
  /**
   * Generate next sequential Mortality ID (e.g. MORT-0001)
   * High-water mark stored in farmSettings to guarantee monotonicity even after deletions
   */
  async generateNextMortalityId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_mortality_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const logs = await db.mortalityLogs.toArray();
      let maxNumber = settingSeq;

      logs.forEach((log) => {
        const code = log.mortalityId || log.logId;
        if (code) {
          const match = code.match(/MORT-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        } else if (log.id && typeof log.id === 'number' && log.id > maxNumber) {
          maxNumber = log.id;
        }
      });

      const nextNum = maxNumber + 1;
      return `MORT-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating mortality ID:', err);
      return 'MORT-0001';
    }
  },

  /**
   * Record a mortality event (for a Batch or an Individual Bird)
   * Executes atomic updates to prevent double-counting or partial writes
   */
  async recordMortality(data) {
    const recordType = data.recordType === 'BIRD' ? 'BIRD' : 'BATCH';
    const date = (data.date || data.mortalityDate || getLocalDateString()).trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid mortality date format. Expected YYYY-MM-DD.');
    }

    const cause = (data.cause || 'Unknown cause').trim();
    if (!cause) {
      throw new Error('Cause of death is required.');
    }

    const symptoms = (data.symptoms || '').trim();
    const suspectedDisease = (data.suspectedDisease || '').trim();
    const disposalMethod = (data.disposalMethod || data.disposedMethod || 'Burial').trim();
    const notes = (data.notes || '').trim();
    const recordedBy = (data.recordedBy || 'Farm Staff').trim();
    const nowIso = new Date().toISOString();

    // Rapid duplicate submission prevention (3-second window)
    const recentLogs = await db.mortalityLogs
      .filter((m) => {
        const sameType = (m.recordType || 'BATCH') === recordType;
        const sameTarget = recordType === 'BATCH'
          ? (Number(m.batchId) === Number(data.batchId))
          : (Number(m.birdId) === Number(data.birdId));
        const sameCause = m.cause === cause;
        const sameDate = (m.date === date || m.mortalityDate === date);
        return sameType && sameTarget && sameCause && sameDate;
      })
      .toArray();

    const isDuplicate = recentLogs.some((m) => {
      if (!m.createdAt) return false;
      const diff = Math.abs(new Date(nowIso).getTime() - new Date(m.createdAt).getTime());
      return diff < 3000;
    });

    if (isDuplicate) {
      throw new Error(`A duplicate mortality record for this target was just submitted. Rapid duplicate submission prevented.`);
    }

    const mortalityId = data.mortalityId && data.mortalityId.trim()
      ? data.mortalityId.trim().toUpperCase()
      : await this.generateNextMortalityId();

    let savedRecord;

    if (recordType === 'BATCH') {
      // -----------------------------------------------------------------
      // BATCH MORTALITY LOGIC
      // -----------------------------------------------------------------
      if (!data.batchId) {
        throw new Error('Batch is required for batch mortality recording.');
      }

      const batch = await db.batches
        .filter((b) => Number(b.id) === Number(data.batchId) || b.batchId === data.batchId || b.batchCode === data.batchId)
        .first();

      if (!batch) {
        throw new Error(`Batch with identifier '${data.batchId}' was not found.`);
      }

      if (batch.status === 'Archived' || batch.status === 'Completed' || batch.status === 'Closed' || batch.status === 'Sold') {
        throw new Error(`Cannot record mortality for batch ${batch.batchCode || batch.name} because it is ${batch.status}. Only active batches allow mortality recording.`);
      }

      const quantity = parseInt(data.quantity || data.count, 10);
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error('Mortality quantity must be a positive integer greater than zero.');
      }

      const livingCount = Number(batch.currentCount !== undefined ? batch.currentCount : batch.initialCount);
      if (quantity > livingCount) {
        throw new Error(
          `Mortality quantity (${quantity}) cannot exceed current living batch population (${livingCount} birds available in ${batch.batchCode || batch.name}).`
        );
      }

      // Calculate age at death if possible
      let ageAtDeathDays = data.ageAtDeathDays !== undefined && data.ageAtDeathDays !== '' ? parseInt(data.ageAtDeathDays, 10) : null;
      if (ageAtDeathDays === null || isNaN(ageAtDeathDays)) {
        if (batch.arrivalDate) {
          const arrival = new Date(batch.arrivalDate);
          const death = new Date(date);
          const diffDays = Math.floor((death - arrival) / (1000 * 60 * 60 * 24));
          if (!isNaN(diffDays) && diffDays >= 0) {
            ageAtDeathDays = diffDays;
          }
        }
      }

      const newCurrentCount = livingCount - quantity;
      const initialCountPreserved = batch.initialCount; // Strictly preserved

      // Resolve pen info
      let penId = batch.penId || batch.houseId || null;
      let penName = 'Unknown Pen';
      if (penId && db.pens) {
        const pen = await db.pens.filter((p) => Number(p.id) === Number(penId) || p.penId === penId).first();
        if (pen) penName = pen.name || pen.penId;
      }

      const logRecord = {
        mortalityId,
        logId: mortalityId, // Backward compatibility
        recordType: 'BATCH',
        batchId: batch.id,
        batchCode: batch.batchCode || batch.name,
        batchName: batch.name || batch.batchCode,
        birdId: null,
        count: quantity,
        quantity,
        date,
        mortalityDate: date,
        cause,
        symptoms,
        suspectedDisease,
        penId,
        penName,
        houseNumber: penName, // Backward compatibility
        ageAtDeathDays: isNaN(ageAtDeathDays) ? null : ageAtDeathDays,
        ageAtDeathWeeks: ageAtDeathDays !== null && !isNaN(ageAtDeathDays) ? Number((ageAtDeathDays / 7).toFixed(1)) : null,
        disposedMethod: disposalMethod,
        disposalMethod,
        notes,
        recordedBy,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // Atomic write: update batch currentCount and insert mortality log
      await db.transaction('rw', [db.mortalityLogs, db.batches, db.farmSettings], async () => {
        // Decrement batch population exactly once
        await db.batches.update(batch.id, {
          currentCount: newCurrentCount,
          initialCount: initialCountPreserved, // strictly keep unchanged
          updatedAt: nowIso,
        });

        const id = await db.mortalityLogs.add(logRecord);
        logRecord.id = id;

        // Update persistent sequence high-water mark
        const seqMatch = mortalityId.match(/MORT-(\d+)/i);
        if (seqMatch && seqMatch[1]) {
          await db.farmSettings.put({
            key: 'last_mortality_seq',
            value: parseInt(seqMatch[1], 10),
            updatedAt: nowIso,
          });
        }
      });

      savedRecord = logRecord;
    } else {
      // -----------------------------------------------------------------
      // INDIVIDUAL BIRD MORTALITY LOGIC
      // -----------------------------------------------------------------
      if (!data.birdId) {
        throw new Error('Individual bird is required for bird mortality recording.');
      }

      const bird = await db.birds
        .filter((b) => Number(b.id) === Number(data.birdId) || b.birdId === data.birdId || b.tagNumber === data.birdId)
        .first();

      if (!bird) {
        throw new Error(`Bird with identifier '${data.birdId}' was not found.`);
      }

      // Check if bird already has an active mortality record
      const existingBirdMort = await db.mortalityLogs
        .filter((m) => (m.recordType || 'BATCH') === 'BIRD' && Number(m.birdId) === Number(bird.id))
        .first();

      if (existingBirdMort) {
        throw new Error(
          `Bird ${bird.tagNumber || bird.birdId} already has an active mortality record (${existingBirdMort.mortalityId || existingBirdMort.logId}). Cannot record duplicate mortality.`
        );
      }

      if (bird.status === 'Dead') {
        throw new Error(`Bird ${bird.tagNumber || bird.birdId} is already marked as Dead. Cannot record death again.`);
      }

      if (bird.status === 'Sold') {
        throw new Error(`Bird ${bird.tagNumber || bird.birdId} is marked as Sold. Cannot record death for a bird that was sold.`);
      }

      // Preserve exact previous status (e.g. Active, Sick, Quarantined)
      const previousBirdStatus = bird.status || 'Active';

      // Quantity for individual bird is strictly 1
      const quantity = 1;

      // Calculate age if hatchDate available
      let ageAtDeathDays = data.ageAtDeathDays !== undefined && data.ageAtDeathDays !== '' ? parseInt(data.ageAtDeathDays, 10) : null;
      if (ageAtDeathDays === null || isNaN(ageAtDeathDays)) {
        if (bird.hatchDate) {
          const hatch = new Date(bird.hatchDate);
          const death = new Date(date);
          const diffDays = Math.floor((death - hatch) / (1000 * 60 * 60 * 24));
          if (!isNaN(diffDays) && diffDays >= 0) {
            ageAtDeathDays = diffDays;
          }
        }
      }

      const penName = bird.houseNumber || 'General Pen';

      const logRecord = {
        mortalityId,
        logId: mortalityId,
        recordType: 'BIRD',
        birdId: bird.id,
        birdCode: bird.birdId || `Bird #${bird.id}`,
        tagNumber: bird.tagNumber || 'Untagged',
        breed: bird.breed || 'Standard',
        batchId: bird.batchId || null,
        previousBirdStatus,
        previousStatus: previousBirdStatus,
        count: quantity,
        quantity,
        date,
        mortalityDate: date,
        cause,
        symptoms,
        suspectedDisease,
        penId: null,
        penName,
        houseNumber: penName,
        ageAtDeathDays: isNaN(ageAtDeathDays) ? null : ageAtDeathDays,
        ageAtDeathWeeks: ageAtDeathDays !== null && !isNaN(ageAtDeathDays) ? Number((ageAtDeathDays / 7).toFixed(1)) : null,
        disposedMethod: disposalMethod,
        disposalMethod,
        notes,
        recordedBy,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // Atomic write: update bird status to 'Dead' and insert mortality log
      // Note: Do not decrement batch population when recording individual bird mortality
      await db.transaction('rw', [db.mortalityLogs, db.birds, db.farmSettings], async () => {
        await db.birds.update(bird.id, {
          status: 'Dead',
          deathDate: date,
          updatedAt: nowIso,
        });

        const id = await db.mortalityLogs.add(logRecord);
        logRecord.id = id;

        const seqMatch = mortalityId.match(/MORT-(\d+)/i);
        if (seqMatch && seqMatch[1]) {
          await db.farmSettings.put({
            key: 'last_mortality_seq',
            value: parseInt(seqMatch[1], 10),
            updatedAt: nowIso,
          });
        }
      });

      savedRecord = logRecord;
    }

    return savedRecord;
  },

  /**
   * Update an existing mortality log and atomically adjust population
   */
  async updateMortality(id, updates) {
    const log = await db.mortalityLogs.get(Number(id));
    if (!log) {
      throw new Error(`Mortality log #${id} was not found.`);
    }

    const nowIso = new Date().toISOString();
    const isBatch = (log.recordType || 'BATCH') === 'BATCH';

    // Store audit trail of previous values
    const previousValues = {
      quantity: log.quantity ?? log.count,
      cause: log.cause,
      symptoms: log.symptoms,
      suspectedDisease: log.suspectedDisease,
      disposalMethod: log.disposalMethod || log.disposedMethod,
      date: log.date || log.mortalityDate,
      batchId: log.batchId,
      birdId: log.birdId,
      notes: log.notes,
      recordedBy: log.recordedBy,
    };

    if (isBatch && log.batchId) {
      const oldQty = Number(log.quantity ?? log.count ?? 0);
      const newQty = updates.quantity !== undefined ? parseInt(updates.quantity, 10) : oldQty;

      if (isNaN(newQty) || newQty <= 0) {
        throw new Error('Mortality quantity must be a positive integer greater than zero.');
      }

      // Check if batch changed
      const targetBatchId = updates.batchId ? Number(updates.batchId) : Number(log.batchId);
      const isBatchChanged = targetBatchId !== Number(log.batchId);

      if (isBatchChanged) {
        const oldBatch = await db.batches.get(Number(log.batchId));
        const newBatch = await db.batches.get(targetBatchId);

        if (!newBatch) {
          throw new Error(`New target batch #${targetBatchId} was not found.`);
        }
        if (newBatch.status === 'Archived' || newBatch.status === 'Closed' || newBatch.status === 'Sold') {
          throw new Error(`Target batch ${newBatch.batchCode || newBatch.name} is ${newBatch.status}. Only active batches can receive mortality.`);
        }

        const newLiving = Number(newBatch.currentCount !== undefined ? newBatch.currentCount : newBatch.initialCount);
        if (newQty > newLiving) {
          throw new Error(`Mortality quantity (${newQty}) exceeds living population of new batch (${newLiving} birds).`);
        }

        await db.transaction('rw', [db.mortalityLogs, db.batches], async () => {
          if (oldBatch) {
            const restoredOld = Math.min(Number(oldBatch.initialCount), Number(oldBatch.currentCount) + oldQty);
            await db.batches.update(oldBatch.id, {
              currentCount: restoredOld,
              updatedAt: nowIso,
            });
          }

          await db.batches.update(newBatch.id, {
            currentCount: newLiving - newQty,
            updatedAt: nowIso,
          });

          await db.mortalityLogs.update(Number(id), {
            batchId: newBatch.id,
            batchCode: newBatch.batchCode || newBatch.name,
            batchName: newBatch.name || newBatch.batchCode,
            penId: newBatch.penId || newBatch.houseId || null,
            count: newQty,
            quantity: newQty,
            date: updates.date || log.date,
            mortalityDate: updates.date || log.mortalityDate,
            cause: updates.cause !== undefined ? updates.cause.trim() : log.cause,
            symptoms: updates.symptoms !== undefined ? updates.symptoms.trim() : log.symptoms,
            suspectedDisease: updates.suspectedDisease !== undefined ? updates.suspectedDisease.trim() : log.suspectedDisease,
            disposalMethod: updates.disposalMethod !== undefined ? updates.disposalMethod.trim() : log.disposalMethod,
            disposedMethod: updates.disposalMethod !== undefined ? updates.disposalMethod.trim() : log.disposalMethod,
            notes: updates.notes !== undefined ? updates.notes.trim() : log.notes,
            recordedBy: updates.recordedBy !== undefined ? updates.recordedBy.trim() : log.recordedBy,
            previousValues,
            updatedAt: nowIso,
          });
        });
      } else {
        const batch = await db.batches.get(Number(log.batchId));
        if (!batch) {
          throw new Error(`Associated batch #${log.batchId} was not found.`);
        }

        // Reverse previous mortality and check available
        const restoredLiving = Number(batch.currentCount) + oldQty;
        if (newQty > restoredLiving) {
          throw new Error(
            `Updated mortality quantity (${newQty}) exceeds available living birds in batch (${restoredLiving} birds).`
          );
        }

        const newCurrentCount = restoredLiving - newQty;

        await db.transaction('rw', [db.mortalityLogs, db.batches], async () => {
          await db.batches.update(batch.id, {
            currentCount: newCurrentCount,
            initialCount: batch.initialCount, // Strictly preserved
            updatedAt: nowIso,
          });

          await db.mortalityLogs.update(Number(id), {
            count: newQty,
            quantity: newQty,
            date: updates.date || log.date,
            mortalityDate: updates.date || log.mortalityDate,
            cause: updates.cause !== undefined ? updates.cause.trim() : log.cause,
            symptoms: updates.symptoms !== undefined ? updates.symptoms.trim() : log.symptoms,
            suspectedDisease: updates.suspectedDisease !== undefined ? updates.suspectedDisease.trim() : log.suspectedDisease,
            disposalMethod: updates.disposalMethod !== undefined ? updates.disposalMethod.trim() : log.disposalMethod,
            disposedMethod: updates.disposalMethod !== undefined ? updates.disposalMethod.trim() : log.disposalMethod,
            notes: updates.notes !== undefined ? updates.notes.trim() : log.notes,
            recordedBy: updates.recordedBy !== undefined ? updates.recordedBy.trim() : log.recordedBy,
            previousValues,
            updatedAt: nowIso,
          });
        });
      }
    } else if (!isBatch && log.birdId) {
      // INDIVIDUAL BIRD EDITING
      const isBirdChanged = updates.birdId && Number(updates.birdId) !== Number(log.birdId);

      if (isBirdChanged) {
        const newBirdId = Number(updates.birdId);
        const newBird = await db.birds.get(newBirdId);

        if (!newBird) {
          throw new Error(`New bird #${newBirdId} was not found.`);
        }
        if (newBird.status === 'Dead') {
          throw new Error(`Bird ${newBird.tagNumber || newBird.birdId} is already marked as Dead. Cannot reassign mortality.`);
        }
        if (newBird.status === 'Sold') {
          throw new Error(`Bird ${newBird.tagNumber || newBird.birdId} is marked as Sold. Cannot reassign mortality to a sold bird.`);
        }

        // Check if new bird has an active mortality log
        const existingNewBirdMort = await db.mortalityLogs
          .filter((m) => (m.recordType || 'BATCH') === 'BIRD' && Number(m.birdId) === newBirdId && Number(m.id) !== Number(id))
          .first();

        if (existingNewBirdMort) {
          throw new Error(`Bird ${newBird.tagNumber || newBird.birdId} already has an active mortality record (${existingNewBirdMort.mortalityId || existingNewBirdMort.logId}).`);
        }

        const newBirdPrevStatus = newBird.status || 'Active';
        const oldBirdId = Number(log.birdId);
        const oldBird = await db.birds.get(oldBirdId);

        await db.transaction('rw', [db.mortalityLogs, db.birds], async () => {
          // 1. Restore old bird's status to its preserved prior status (Active, Sick, Quarantined)
          if (oldBird && oldBird.status === 'Dead') {
            await db.birds.update(oldBird.id, {
              status: log.previousBirdStatus || log.previousStatus || 'Active',
              deathDate: null,
              updatedAt: nowIso,
            });
          }

          // 2. Mark new bird as Dead
          await db.birds.update(newBird.id, {
            status: 'Dead',
            deathDate: updates.date || log.date,
            updatedAt: nowIso,
          });

          // 3. Update mortality log with new bird details
          await db.mortalityLogs.update(Number(id), {
            birdId: newBird.id,
            birdCode: newBird.birdId || `Bird #${newBird.id}`,
            tagNumber: newBird.tagNumber || 'Untagged',
            breed: newBird.breed || 'Standard',
            batchId: newBird.batchId || null,
            previousBirdStatus: newBirdPrevStatus,
            previousStatus: newBirdPrevStatus,
            date: updates.date || log.date,
            mortalityDate: updates.date || log.mortalityDate,
            cause: updates.cause !== undefined ? updates.cause.trim() : log.cause,
            symptoms: updates.symptoms !== undefined ? updates.symptoms.trim() : log.symptoms,
            suspectedDisease: updates.suspectedDisease !== undefined ? updates.suspectedDisease.trim() : log.suspectedDisease,
            disposalMethod: updates.disposalMethod !== undefined ? updates.disposalMethod.trim() : log.disposalMethod,
            disposedMethod: updates.disposalMethod !== undefined ? updates.disposalMethod.trim() : log.disposalMethod,
            notes: updates.notes !== undefined ? updates.notes.trim() : log.notes,
            recordedBy: updates.recordedBy !== undefined ? updates.recordedBy.trim() : log.recordedBy,
            previousValues,
            updatedAt: nowIso,
          });
        });
      } else {
        // Same bird: update details without reapplying mortality effects
        const bird = await db.birds.get(Number(log.birdId));
        await db.transaction('rw', [db.mortalityLogs, db.birds], async () => {
          if (bird && updates.date && updates.date !== log.date) {
            await db.birds.update(bird.id, {
              deathDate: updates.date,
              updatedAt: nowIso,
            });
          }

          await db.mortalityLogs.update(Number(id), {
            date: updates.date || log.date,
            mortalityDate: updates.date || log.mortalityDate,
            cause: updates.cause !== undefined ? updates.cause.trim() : log.cause,
            symptoms: updates.symptoms !== undefined ? updates.symptoms.trim() : log.symptoms,
            suspectedDisease: updates.suspectedDisease !== undefined ? updates.suspectedDisease.trim() : log.suspectedDisease,
            disposalMethod: updates.disposalMethod !== undefined ? updates.disposalMethod.trim() : log.disposalMethod,
            disposedMethod: updates.disposalMethod !== undefined ? updates.disposalMethod.trim() : log.disposalMethod,
            notes: updates.notes !== undefined ? updates.notes.trim() : log.notes,
            recordedBy: updates.recordedBy !== undefined ? updates.recordedBy.trim() : log.recordedBy,
            previousValues,
            updatedAt: nowIso,
          });
        });
      }
    }

    return await db.mortalityLogs.get(Number(id));
  },

  /**
   * Delete a mortality log and atomically restore batch or bird population
   */
  async deleteMortality(id) {
    const log = await db.mortalityLogs.get(Number(id));
    if (!log) {
      throw new Error(`Mortality log #${id} was not found.`);
    }

    const nowIso = new Date().toISOString();
    const isBatch = (log.recordType || 'BATCH') === 'BATCH';

    if (isBatch && log.batchId) {
      const batch = await db.batches.get(Number(log.batchId));
      if (batch) {
        const qty = Number(log.quantity ?? log.count ?? 0);
        const restored = Math.min(Number(batch.initialCount), Number(batch.currentCount) + qty);

        await db.transaction('rw', [db.mortalityLogs, db.batches], async () => {
          await db.batches.update(batch.id, {
            currentCount: restored,
            initialCount: batch.initialCount, // Strictly preserved
            updatedAt: nowIso,
          });
          await db.mortalityLogs.delete(Number(id));
        });

        return { success: true, restoredBatchId: batch.id, restoredCount: restored };
      }
    } else if (!isBatch && log.birdId) {
      const bird = await db.birds.get(Number(log.birdId));
      let restoredStatus = log.previousBirdStatus || log.previousStatus || 'Active';

      await db.transaction('rw', [db.mortalityLogs, db.birds], async () => {
        if (bird) {
          // Status conflict protection:
          // If the bird is still marked 'Dead', restore to its exact prior status.
          // If the bird's status was subsequently changed (e.g. manually set to Sick/Active),
          // preserve the current status safely to prevent conflict.
          if (bird.status === 'Dead') {
            await db.birds.update(bird.id, {
              status: restoredStatus,
              deathDate: null,
              updatedAt: nowIso,
            });
          } else {
            restoredStatus = bird.status; // Conflict preserved
            if (bird.deathDate === (log.date || log.mortalityDate)) {
              await db.birds.update(bird.id, {
                deathDate: null,
                updatedAt: nowIso,
              });
            }
          }
        }
        await db.mortalityLogs.delete(Number(id));
      });

      return { success: true, restoredBirdId: log.birdId, restoredStatus };
    }

    // Default delete
    await db.mortalityLogs.delete(Number(id));
    return { success: true };
  },

  /**
   * Retrieve all mortality logs with enriched batch, bird, and pen details
   */
  async getMortalityLogs(filters = {}) {
    try {
      const [rawLogs, batches, birds, pens] = await Promise.all([
        db.mortalityLogs.toArray(),
        db.batches.toArray(),
        db.birds.toArray(),
        db.pens ? db.pens.toArray() : Promise.resolve([]),
      ]);

      const batchMap = {};
      batches.forEach((b) => {
        batchMap[b.id] = b;
        if (b.batchCode) batchMap[b.batchCode] = b;
        if (b.batchId) batchMap[b.batchId] = b;
      });

      const birdMap = {};
      birds.forEach((b) => {
        birdMap[b.id] = b;
        if (b.birdId) birdMap[b.birdId] = b;
      });

      const penMap = {};
      pens.forEach((p) => {
        penMap[p.id] = p;
        if (p.penId) penMap[p.penId] = p;
      });

      let enriched = rawLogs.map((log) => {
        const isBatch = (log.recordType || 'BATCH') === 'BATCH';
        const batch = isBatch && log.batchId ? batchMap[log.batchId] : null;
        const bird = !isBatch && log.birdId ? birdMap[log.birdId] : null;

        const date = log.date || log.mortalityDate || (log.createdAt ? log.createdAt.slice(0, 10) : '');
        const quantity = Number(log.quantity ?? log.count ?? 1);

        let targetName;
        let targetCode;
        let breed;
        let penName = log.penName || log.houseNumber || 'General Pen';

        if (isBatch) {
          targetCode = batch ? (batch.batchCode || batch.name) : (log.batchCode || `Batch #${log.batchId}`);
          targetName = batch ? batch.name : targetCode;
          breed = batch ? batch.breed : 'Standard';
          if (batch && (penMap[batch.penId] || penMap[batch.houseId])) {
            penName = (penMap[batch.penId] || penMap[batch.houseId]).name;
          }
        } else {
          targetCode = bird ? (bird.tagNumber || bird.birdId) : (log.tagNumber || log.birdCode || `Bird #${log.birdId}`);
          targetName = bird ? `${bird.type} - ${bird.breed}` : 'Individual Bird';
          breed = bird ? bird.breed : (log.breed || 'Standard');
          if (bird && bird.houseNumber) {
            penName = bird.houseNumber;
          }
        }

        return {
          ...log,
          date,
          mortalityDate: date,
          quantity,
          count: quantity,
          recordType: isBatch ? 'BATCH' : 'BIRD',
          targetCode,
          targetName,
          breed,
          penName,
          batchCode: batch ? batch.batchCode : (log.batchCode || null),
          batchName: batch ? batch.name : null,
          birdTag: bird ? bird.tagNumber : (log.tagNumber || null),
        };
      });

      // Filter: Record Type
      if (filters.recordType && (filters.recordType === 'BATCH' || filters.recordType === 'BIRD')) {
        enriched = enriched.filter((l) => l.recordType === filters.recordType);
      }

      // Filter: Batch
      if (filters.batchId) {
        enriched = enriched.filter((l) => Number(l.batchId) === Number(filters.batchId) || l.batchCode === filters.batchId);
      }

      // Filter: Pen
      if (filters.penId) {
        enriched = enriched.filter((l) => String(l.penId) === String(filters.penId) || l.penName === filters.penId);
      }

      // Filter: Cause
      if (filters.cause) {
        enriched = enriched.filter((l) => l.cause && l.cause.toLowerCase() === filters.cause.toLowerCase());
      }

      // Filter: Date Range
      if (filters.startDate) {
        enriched = enriched.filter((l) => l.date >= filters.startDate);
      }
      if (filters.endDate) {
        enriched = enriched.filter((l) => l.date <= filters.endDate);
      }

      // Filter: Search Query
      if (filters.search && filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        enriched = enriched.filter((l) =>
          (l.mortalityId && l.mortalityId.toLowerCase().includes(q)) ||
          (l.targetCode && l.targetCode.toLowerCase().includes(q)) ||
          (l.targetName && l.targetName.toLowerCase().includes(q)) ||
          (l.cause && l.cause.toLowerCase().includes(q)) ||
          (l.symptoms && l.symptoms.toLowerCase().includes(q)) ||
          (l.suspectedDisease && l.suspectedDisease.toLowerCase().includes(q)) ||
          (l.penName && l.penName.toLowerCase().includes(q)) ||
          (l.recordedBy && l.recordedBy.toLowerCase().includes(q)) ||
          (l.notes && l.notes.toLowerCase().includes(q))
        );
      }

      // Sort by date DESC, id DESC
      enriched.sort((a, b) => {
        const dateDiff = b.date.localeCompare(a.date);
        if (dateDiff !== 0) return dateDiff;
        return (b.id || 0) - (a.id || 0);
      });

      return enriched;
    } catch (err) {
      console.error('Error fetching mortality logs:', err);
      return [];
    }
  },

  /**
   * Retrieve single mortality log by ID
   */
  async getMortalityById(id) {
    const log = await db.mortalityLogs.get(Number(id));
    if (!log) return null;

    let targetDetails = null;
    if (log.recordType === 'BATCH' && log.batchId) {
      targetDetails = await db.batches.get(Number(log.batchId));
    } else if (log.birdId) {
      targetDetails = await db.birds.get(Number(log.birdId));
    }

    return {
      ...log,
      targetDetails,
    };
  },

  /**
   * Calculate mortality statistics and rates
   * Supports all-time summaries or period-accurate rates with opening population at risk
   */
  async getMortalityStats(periodInput = 30) {
    try {
      const todayStr = getLocalDateString();
      const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM
      const currentYearStr = todayStr.slice(0, 4);  // YYYY

      let options = {};
      if (typeof periodInput === 'number') {
        options = { periodDays: periodInput };
      } else if (periodInput && typeof periodInput === 'object') {
        options = periodInput;
      }

      const hasCustomPeriod = Boolean(options.startDate || options.endDate || (typeof periodInput === 'object' && options.periodDays && !options.allTime));
      let startDate = options.startDate || null;
      let endDate = options.endDate || todayStr;
      const periodDays = options.periodDays || 30;

      if (hasCustomPeriod && !startDate && periodDays) {
        const d = new Date();
        d.setDate(d.getDate() - (periodDays - 1));
        startDate = getLocalDateString(d);
      }

      const [logs, batches] = await Promise.all([
        db.mortalityLogs.toArray(),
        db.batches.toArray(),
      ]);

      let todayDeaths = 0;
      let thisMonthDeaths = 0;
      let thisYearDeaths = 0;
      let allTimeDeaths = 0;
      let periodTotalDeaths = 0;

      const causeCounts = {};
      const batchDeathsMap = {};
      const batchPriorDeathsMap = {};
      const batchPeriodDeathsMap = {};

      logs.forEach((log) => {
        const d = log.date || log.mortalityDate || (log.createdAt ? log.createdAt.slice(0, 10) : '');
        const qty = Number(log.quantity ?? log.count ?? 1);

        allTimeDeaths += qty;

        if (d === todayStr) {
          todayDeaths += qty;
        }
        if (d.startsWith(currentMonthStr)) {
          thisMonthDeaths += qty;
        }
        if (d.startsWith(currentYearStr)) {
          thisYearDeaths += qty;
        }

        const cause = log.cause || 'Unknown cause';
        causeCounts[cause] = (causeCounts[cause] || 0) + qty;

        if (log.batchId) {
          const bId = Number(log.batchId);
          batchDeathsMap[bId] = (batchDeathsMap[bId] || 0) + qty;

          if (hasCustomPeriod && startDate && d < startDate) {
            batchPriorDeathsMap[bId] = (batchPriorDeathsMap[bId] || 0) + qty;
          }

          const inPeriod = !hasCustomPeriod || ((!startDate || d >= startDate) && (!endDate || d <= endDate));
          if (inPeriod) {
            batchPeriodDeathsMap[bId] = (batchPeriodDeathsMap[bId] || 0) + qty;
            periodTotalDeaths += qty;
          }
        }
      });

      let totalOpeningPopulationFlock = 0;

      // Calculate mortality rate per batch
      const batchStats = batches.map((b) => {
        const allTimeDeathsForBatch = batchDeathsMap[b.id] || 0;
        const initial = Number(b.initialCount) || 0;
        const current = Number(b.currentCount !== undefined ? b.currentCount : initial);

        let deaths = allTimeDeathsForBatch;
        let openingPopulation = initial;
        let priorDeaths = 0;
        let rateLimitation = null;

        if (hasCustomPeriod) {
          deaths = batchPeriodDeathsMap[b.id] || 0;
          priorDeaths = batchPriorDeathsMap[b.id] || 0;

          // Period opening population at risk:
          // If batch arrived before startDate, opening = initialCount - priorDeaths
          // If batch arrived on or after startDate, opening = initialCount
          if (startDate && b.arrivalDate && b.arrivalDate < startDate) {
            openingPopulation = Math.max(0, initial - priorDeaths);
          } else if (startDate && !b.arrivalDate) {
            openingPopulation = Math.max(0, initial - priorDeaths);
          } else {
            openingPopulation = initial;
          }

          if (openingPopulation <= 0) {
            rateLimitation = 'Opening population at risk is zero or depleted';
          }
        }

        totalOpeningPopulationFlock += openingPopulation;

        const rate = calculateMortalityRate(deaths, openingPopulation);
        const allTimeRate = calculateMortalityRate(allTimeDeathsForBatch, initial);
        const survivalRate = Number((Math.max(0, 100 - rate)).toFixed(2));

        return {
          id: b.id,
          batchCode: b.batchCode || b.name,
          name: b.name || b.batchCode,
          birdType: b.birdType,
          breed: b.breed,
          initialCount: initial,
          currentCount: current,
          openingPopulation,
          deaths,
          allTimeDeaths: allTimeDeathsForBatch,
          priorDeaths,
          mortalityRate: rate,
          allTimeMortalityRate: allTimeRate,
          survivalRate,
          status: b.status,
          rateLimitation,
        };
      });

      // Highest mortality batch
      let highestMortalityBatch = null;
      let maxRate = -1;
      batchStats.forEach((b) => {
        if (b.deaths > 0 && b.mortalityRate > maxRate) {
          maxRate = b.mortalityRate;
          highestMortalityBatch = b;
        }
      });

      // Mortality by cause with percentages
      const mortalityByCause = Object.entries(causeCounts).map(([cause, count]) => {
        const pct = allTimeDeaths > 0 ? Number(((count / allTimeDeaths) * 100).toFixed(1)) : 0;
        return { cause, count, percentage: pct };
      }).sort((a, b) => b.count - a.count);

      // Trend: daily bins for the last 7 days
      const trendDays = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = getLocalDateString(d);
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

        const count = logs
          .filter((l) => (l.date === dateStr || l.mortalityDate === dateStr))
          .reduce((sum, l) => sum + Number(l.quantity ?? l.count ?? 1), 0);

        trendDays.push({ date: dateStr, label: dayLabel, count });
      }

      // Calculate 7-day average for spike detection
      const total7Day = trendDays.reduce((acc, t) => acc + t.count, 0);
      const sevenDayDailyAvg = Number((total7Day / 7).toFixed(1));

      // Overall flock mortality rate across all batches
      const totalFlockInitial = batches.reduce((sum, b) => sum + (Number(b.initialCount) || 0), 0);
      const overallMortalityRate = hasCustomPeriod && totalOpeningPopulationFlock > 0
        ? calculateMortalityRate(periodTotalDeaths, totalOpeningPopulationFlock)
        : calculateMortalityRate(allTimeDeaths, totalFlockInitial);

      return {
        todayDeaths,
        thisMonthDeaths,
        thisYearDeaths,
        allTimeDeaths,
        periodTotalDeaths,
        totalOpeningPopulationFlock,
        overallMortalityRate,
        sevenDayDailyAvg,
        batchStats,
        highestMortalityBatch,
        mortalityByCause,
        trendDays,
        periodDays,
        startDate,
        endDate,
        hasCustomPeriod,
      };
    } catch (err) {
      console.error('Error fetching mortality stats:', err);
      return {
        todayDeaths: 0,
        thisMonthDeaths: 0,
        thisYearDeaths: 0,
        allTimeDeaths: 0,
        periodTotalDeaths: 0,
        totalOpeningPopulationFlock: 0,
        overallMortalityRate: 0,
        sevenDayDailyAvg: 0,
        batchStats: [],
        highestMortalityBatch: null,
        mortalityByCause: [],
        trendDays: [],
        periodDays: 30,
        startDate: null,
        endDate: null,
        hasCustomPeriod: false,
      };
    }
  },

  /**
   * Generate biosecurity alerts based on mortality patterns
   */
  async getMortalityAlerts() {
    try {
      const alerts = [];
      const stats = await this.getMortalityStats();
      const logs = await db.mortalityLogs.toArray();
      const todayStr = getLocalDateString();

      // 1. Alert on high batch mortality rate (> 5% warning, > 10% critical)
      stats.batchStats.forEach((batch) => {
        if (batch.status === 'Active' && batch.mortalityRate >= 5.0) {
          const isCritical = batch.mortalityRate >= 10.0;
          alerts.push({
            id: `alert-batch-${batch.id}`,
            type: 'high_batch_mortality',
            severity: isCritical ? 'danger' : 'warning',
            title: isCritical ? `Critical Mortality: ${batch.batchCode}` : `Elevated Mortality: ${batch.batchCode}`,
            message: `Batch ${batch.batchCode} has recorded ${batch.deaths} deaths (${batch.mortalityRate}% cumulative mortality rate). Inspect pen environment and consult veterinarian.`,
            batchId: batch.id,
            module: 'mortality',
          });
        }
      });

      // 2. Alert on unusual daily spike (today > 2x 7-day daily average, min 3 deaths)
      if (stats.todayDeaths >= 3 && stats.todayDeaths > (stats.sevenDayDailyAvg * 2)) {
        alerts.push({
          id: `alert-spike-${todayStr}`,
          type: 'mortality_spike',
          severity: 'danger',
          title: 'Unusual Daily Mortality Increase',
          message: `${stats.todayDeaths} birds died today, significantly exceeding the 7-day average of ${stats.sevenDayDailyAvg} deaths/day. Immediate flock inspection recommended.`,
          module: 'mortality',
        });
      }

      // 3. Repeated deaths with the same reported cause in the last 14 days (>= 3 records)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const cutoffStr = getLocalDateString(fourteenDaysAgo);

      const recentCauseMap = {};
      logs
        .filter((l) => (l.date || l.mortalityDate || '') >= cutoffStr && l.cause && l.cause !== 'Unknown cause')
        .forEach((l) => {
          recentCauseMap[l.cause] = (recentCauseMap[l.cause] || 0) + 1;
        });

      Object.entries(recentCauseMap).forEach(([causeName, frequency]) => {
        if (frequency >= 3) {
          alerts.push({
            id: `alert-cause-${causeName.toLowerCase().replace(/\s+/g, '-')}`,
            type: 'repeated_cause',
            severity: 'warning',
            title: `Repeated Cause: ${causeName}`,
            message: `"${causeName}" reported ${frequency} times in the past 14 days. Consider reviewing housing ventilation, water quality, or flock biosecurity.`,
            module: 'mortality',
          });
        }
      });

      return alerts;
    } catch (err) {
      console.error('Error calculating mortality alerts:', err);
      return [];
    }
  },

  /**
   * Export mortality history to CSV format
   */
  async exportMortalityCSV() {
    const logs = await this.getMortalityLogs();
    const headers = [
      'Mortality ID',
      'Date',
      'Target Type',
      'Target Code',
      'Target Name',
      'Quantity',
      'Cause of Death',
      'Symptoms',
      'Suspected Disease',
      'Pen / House',
      'Age at Death (Days)',
      'Disposal Method',
      'Recorded By',
      'Notes',
    ];

    const rows = logs.map((l) => [
      l.mortalityId || l.logId || `MORT-${l.id}`,
      l.date || l.mortalityDate || '',
      l.recordType || 'BATCH',
      l.targetCode || '',
      `"${(l.targetName || '').replace(/"/g, '""')}"`,
      l.quantity || l.count || 1,
      `"${(l.cause || '').replace(/"/g, '""')}"`,
      `"${(l.symptoms || '').replace(/"/g, '""')}"`,
      `"${(l.suspectedDisease || '').replace(/"/g, '""')}"`,
      `"${(l.penName || '').replace(/"/g, '""')}"`,
      l.ageAtDeathDays ?? '',
      `"${(l.disposalMethod || l.disposedMethod || '').replace(/"/g, '""')}"`,
      `"${(l.recordedBy || '').replace(/"/g, '""')}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  /**
   * Seed baseline demo mortality records if table is empty
   */
  async seedInitialMortalityData() {
    try {
      const count = await db.mortalityLogs.count();
      if (count > 0) return;

      const batches = await db.batches.toArray();
      if (batches.length === 0) return;

      const layerBatch = batches.find((b) => b.birdType === 'Layer') || batches[0];
      const today = new Date();

      const seedRecords = [
        {
          date: getLocalDateString(new Date(today.getTime() - 10 * 86400000)),
          batchId: layerBatch.id,
          quantity: 2,
          cause: 'Heat stress',
          symptoms: 'Lethargy, panting observed during midday heat wave',
          suspectedDisease: 'Heat exhaustion',
          disposalMethod: 'Burial',
          recordedBy: 'Farm Manager',
          notes: 'Added extra shade netting and misting nozzles',
        },
        {
          date: getLocalDateString(new Date(today.getTime() - 4 * 86400000)),
          batchId: layerBatch.id,
          quantity: 1,
          cause: 'Injury',
          symptoms: 'Leg fracture trapped in feeding trough',
          suspectedDisease: 'Trauma',
          disposalMethod: 'Incineration',
          recordedBy: 'Supervisor Amina',
          notes: 'Trough rail repaired',
        },
      ];

      for (const rec of seedRecords) {
        try {
          await this.recordMortality(rec);
        } catch {
          // Ignore if batch count insufficient
        }
      }
    } catch (err) {
      console.warn('Could not seed initial mortality data:', err);
    }
  },
};
