const admin = require("firebase-admin");
const firestore = require("../utils/firestore");
const badgeModel = firestore.collection("badges");
const userBadgeModel = firestore.collection("userBadges");
const { fetchUser } = require("../models/users");
const {
  convertFirebaseTimestampToDateTime,
  convertFirebaseDocumentToBadgeDocument,
  assignUnassignBadgesInBulk,
} = require("../utils/badges");
const { chunks } = require("../utils/array");
const { DOCUMENT_WRITE_SIZE } = require("../constants/badges");

// TODO: throw error
// TODO: use constants for literal/raw strings

/**
 * Fetches the data about our badges
 * @param query { Object }: Filter for badges data
 * @return {Promise<badgeModel|Array>}
 */
const fetchBadges = async ({ size = 100, page = 0 }) => {
  try {
    const snapshot = await badgeModel
      .limit(parseInt(size))
      .offset(parseInt(size) * parseInt(page))
      .get();
    // INFO: timestamp to date time logic surfaced from
    // https://stackoverflow.com/a/66292255
    return snapshot.docs.map((doc) => convertFirebaseDocumentToBadgeDocument(doc.id, doc.data()));
  } catch (err) {
    logger.error("Error retrieving badges", err);
    return err;
  }
};

/**
 * Fetches the data about user badges
 * @param username { string }: Filter for badges data
 * @return {Promise<{badges: Array}>}
 */
async function fetchUserBadges(username) {
  try {
    let badges = [];
    const result = await fetchUser({ username });
    if (!result.userExists) {
      return { userExists: false, badges };
    }
    const userId = result.user.id;
    const badgeIdsSnapshot = await userBadgeModel.where("userId", "==", userId).get();
    const badgeDocReferences = badgeIdsSnapshot.docs.map((doc) => {
      const badgeId = doc.get("badgeId");
      return firestore.doc(`badges/${badgeId}`);
    });
    // INFO: getAll accepts unpacked array
    const badgesSnapshot = await firestore.getAll(...badgeDocReferences);
    badges = badgesSnapshot.map((doc) => convertFirebaseDocumentToBadgeDocument(doc.id, doc.data()));
    return { userExists: true, badges };
  } catch (err) {
    logger.error("Error retrieving user badges", err);
    return err;
  }
}

/**
 * Add badge to firestore
 * @param  badgeInfo { Object }: has badge name, description, imageUrl and createdBy
 * @return {Promise<{id: string, createdAt: {date: string, time: string}}|Object>}
 */
async function createBadge(badgeInfo) {
  try {
    const createdAt = admin.firestore.Timestamp.now();
    // INFO: check if description is missing
    const description = badgeInfo.description ?? "";
    const docRef = await badgeModel.add({
      ...badgeInfo,
      description,
      createdAt,
    });
    const { date, time } = convertFirebaseTimestampToDateTime(createdAt);
    const snapshot = await docRef.get();
    const data = snapshot.data();
    return { id: docRef.id, ...data, createdAt: { date, time } };
  } catch (err) {
    logger.error("Error creating badge", err);
    return err;
  }
}

/**
 * assign badges to user
 * @param { Object }: userId: string and badgeIds: Array<string>
 * @return { Promise<void> }
 */
async function assignBadges({ userId, badgeIds }) {
  try {
    const badgeIdsChunks = chunks(badgeIds, DOCUMENT_WRITE_SIZE);
    const bulkWriterBatches = badgeIdsChunks.map((value) => assignUnassignBadgesInBulk({ userId, array: value }));
    return await Promise.all(bulkWriterBatches);
  } catch (err) {
    logger.error("Error assigning badges", err);
    return err;
  }
}

/**
 * unassign badges from user
 * @param { Object }: userId: string and badgeIds: Array<string>
 * @return {Promise<void>}
 */
async function unAssignBadges({ userId, badgeIds }) {
  try {
    const snapshot = await userBadgeModel.where("userId", "==", userId).where("badgeId", "in", badgeIds).get();
    // TODO: handle snapshot empty
    const documentRefferences = snapshot.docs.map((doc) => doc.ref);
    const documentsRefferencesChunks = chunks(documentRefferences, DOCUMENT_WRITE_SIZE);
    const bulkWriterBatches = documentsRefferencesChunks.map((value) =>
      assignUnassignBadgesInBulk({ userId, array: value, isUnassign: true })
    );
    return await Promise.all(bulkWriterBatches);
  } catch (err) {
    logger.error("Error un-assigning badges", err);
    return err;
  }
}

module.exports = {
  fetchBadges,
  fetchUserBadges,
  createBadge,
  assignBadges,
  unAssignBadges,
};
