const chai = require("chai");
const { expect } = chai;
const app = require("../../server");
const cleanDb = require("../utils/cleanDb");
const addUser = require("../utils/addUser");
const userData = require("../fixtures/user/user")();

const userData0 = userData[0];
const authService = require("../../services/authService");

const cookieName = config.get("userToken.cookieName");

describe("Notify Test", function () {
  let userId0, userIdToken0;

  beforeEach(async function () {
    userId0 = await addUser(userData0);
    userIdToken0 = authService.generateAuthToken({ userId: userId0 });
  });
  afterEach(async function () {
    await cleanDb();
  });

  describe("POST call to notify", function () {
    it.skip("should send message to specified users", async function () {
      const notifyData = { title: "some title", body: "some body", userId: userId0 };

      const fcmTokenData = { fcmToken: "iedsijdsdj" };

      await chai
        .request(app)
        .post("/fcm-token")
        .set("cookie", `${cookieName}=${userIdToken0}`)
        .send({
          ...fcmTokenData,
        });

      const response = await chai
        .request(app)
        .post("/notify")
        .set("cookie", `${cookieName}=${userIdToken0}`)
        .send({
          ...notifyData,
        });
      expect(response).to.have.status(200);
      expect(response.body.message).equals("User notified successfully");
    });

    it("should have title in body ", async function () {
      const notifyData = { body: "some body", userId: userId0 };

      const fcmTokenData = { fcmToken: "iedsijdsdj" };

      await chai
        .request(app)
        .post("/fcm-token")
        .set("cookie", `${cookieName}=${userIdToken0}`)
        .send({
          ...fcmTokenData,
        });

      const response = await chai
        .request(app)
        .post("/notify")
        .set("cookie", `${cookieName}=${userIdToken0}`)
        .send({
          ...notifyData,
        });

      expect(response).to.have.status(400);
      expect(response.body.message).equals('"title" is required');
    });

    it("should have message in body ", async function () {
      const notifyData = { title: "some title", userId: userId0 };

      const fcmTokenData = { fcmToken: "iedsijdsdj" };

      await chai
        .request(app)
        .post("/fcm-token")
        .set("cookie", `${cookieName}=${userIdToken0}`)
        .send({
          ...fcmTokenData,
        });

      const response = await chai
        .request(app)
        .post("/notify")
        .set("cookie", `${cookieName}=${userIdToken0}`)
        .send({
          ...notifyData,
        });

      expect(response).to.have.status(400);
      expect(response.body.message).equals('"body" is required');
    });

    it("should user token exist ", async function () {
      const notifyData = { title: "some title", body: "some body" };

      const fcmTokenData = { fcmToken: "iedsijdsdj" };

      await chai
        .request(app)
        .post("/fcm-token")
        .send({
          ...fcmTokenData,
        });

      const response = await chai
        .request(app)
        .post("/notify")
        .send({
          ...notifyData,
        });

      expect(response).to.have.status(400);
      expect(response.body.message).equals('"value" must contain at least one of [userId, groupRoleId]');
    });
  });
});
