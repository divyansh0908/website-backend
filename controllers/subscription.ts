import { CustomRequest, CustomResponse } from "../types/global";
const { addOrUpdate } = require("../models/users");
const { INTERNAL_SERVER_ERROR } = require("../constants/errorMessages");
const nodemailer = require("nodemailer");
const config = require("config");
const emailCredentials = config.get("emailCredentials");

export const subscribe = async (req: CustomRequest, res: CustomResponse) => {
  try {
    const { email, phoneNumber } = req.body;
    const userId = req.userData.id;
    await addOrUpdate(
      {
        phoneNumber,
        email,
        isSubscribed: true,
      },
      userId
    );
    return res.status(201).json({
      message: "user subscribed successfully",
    });
  } catch (error) {
    res.boom.badImplementation(INTERNAL_SERVER_ERROR);
  }
};

export const unsubscribe = async (req: CustomRequest, res: CustomResponse) => {
  try {
    const userId = req.userData.id;
    await addOrUpdate(
      {
        isSubscribed: false,
      },
      userId
    );
    return res.status(200).json({
      message: "user unsubscribed successfully",
    });
  } catch (error) {
    res.boom.badImplementation(INTERNAL_SERVER_ERROR);
  }
};

export const sendEmail = async (req: CustomRequest, res: CustomResponse) => {
  try { 
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: emailCredentials.user,
        pass: emailCredentials.pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"Real Dev Squad" <${emailCredentials.user}>`,
      to: "dgandhrav@gmail.com",
      subject: "Hello local, Testing in progress.",
      text: "working for notification feature",
      html: "<b>Hello world!</b>",
    });

    res.send({ message: "Email sent", info });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).send({ message: "Failed to send email", error });
  }
  console.log(emailCredentials);
  res.send(emailCredentials)
};