const firestore = require("../utils/firestore");
const { getBeforeHourTime } = require("../utils/time");
const logsModel = firestore.collection("logs");
const admin = require("firebase-admin");
const { logType } = require("../constants/logs");

/**
 * Adds log
 *
 * @param type { String }: Type of the log
 * @param meta { Object }: Meta data of the log
 * @param body { Object }: Body of the log
 */
const addLog = async (type, meta, body) => {
  try {
    const log = {
      type,
      timestamp: admin.firestore.Timestamp.fromDate(new Date()),
      meta,
      body,
    };
    await logsModel.add(log);
  } catch (err) {
    logger.error("Error in adding log", err);
    throw err;
  }
};

/**
 * Fetches logs
 *
 * @param query { String }: Type of the log
 * @param param { Object }: Fields to filter logs
 */
const fetchLogs = async (query, param) => {
  try {
    let call = logsModel.where("type", "==", param);
    Object.keys(query).forEach((key) => {
      // eslint-disable-next-line security/detect-object-injection
      call = call.where(key, "==", query[key]);
    });

    const snapshot = await call.get();
    const logs = [];
    snapshot.forEach((doc) => {
      logs.push({
        ...doc.data(),
      });
    });
    return logs;
  } catch (err) {
    logger.error("Error in fetching logs", err);
    throw err;
  }
};

/**
 * Fetches member cache Self logs
 *
 * @param userId { String }: Unique ID of the User
 */
const fetchCacheLogs = async (id) => {
  try {
    const logsSnapshot = await logsModel
      .where("type", "==", logType.CLOUDFLARE_CACHE_PURGED)
      .where("timestamp", ">=", getBeforeHourTime(admin.firestore.Timestamp.fromDate(new Date()), 24))
      .where("meta.userId", "==", id)
      .get();

    const logs = [];
    logsSnapshot.forEach((doc) => {
      const { timestamp } = doc.data();
      const docId = doc.id;
      if (logs.length < 3) {
        logs.push({ docId, timestamp });
      }
    });

    return logs;
  } catch (err) {
    logger.error("Error in fetching cache logs", err);
    throw err;
  }
};

/**
 * Fetches last purged cache log added
 *
 * @param userId { String }: Unique ID of the User
 */
const fetchLastAddedCacheLog = async (id) => {
  try {
    const lastLogSnapshot = await logsModel
      .where("type", "==", logType.CLOUDFLARE_CACHE_PURGED)
      .where("meta.userId", "==", id)
      .limit(1)
      .orderBy("timestamp", "desc")
      .get();

    const logs = [];
    lastLogSnapshot.forEach((doc) => {
      const { timestamp } = doc.data();
      const docId = doc.id;
      logs.push({ docId, timestamp });
    });

    return logs;
  } catch (err) {
    logger.error("Error in fetching purged cache logs", err);
    throw err;
  }
};

module.exports = {
  addLog,
  fetchLogs,
  fetchCacheLogs,
  fetchLastAddedCacheLog,
};
