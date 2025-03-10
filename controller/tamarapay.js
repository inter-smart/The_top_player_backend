const { TamaraClientFactory } = require("tamara-sdk");
const { v4: uuidv4 } = require("uuid"); // Import the UUID package
const db = require("../models");
const sendMail = require("../utils/mailer");
const { paymentSuccessMail } = require("../utils/mail_content");
const { where } = require("sequelize");
const calculatePaymentDetails = require("../utils/tamraBreakDown_helper");

const config = {
  //test

  // baseUrl: "https://api-sandbox.tamara.co",
  // apiToken:
  // "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhY2NvdW50SWQiOiI0ZmUxNDU1MC1jZTUzLTRhNmYtYWIyMi05MDkxOThkNmUxNmEiLCJ0eXBlIjoibWVyY2hhbnQiLCJzYWx0IjoiODcxZjY3OGM0MjAwYzg4YWQxZTM0YTIxMTExN2IyYjYiLCJyb2xlcyI6WyJST0xFX01FUkNIQU5UIl0sImlhdCI6MTcxNzY1OTc3NCwiaXNzIjoiVGFtYXJhIn0.xDxkOqZsPt65OGuy0rDfrrjKL6hWLP2EL4ynnxQynK5lr6kMQn2dUlvLACIZc1Bx4wo5vlCcqn5L4h1zQWkFTZXDkVjaiuRh6lyLZmVkGi6KfCdZLjMmve6n3tQhuJT6c4BYcS_7Y1BS4HMCOPpwPu5ZiaYNlGYVmrhM2rdtIq9gd3yWD_8oAFO9qoF0CmdA48LNHVoAXutxR-kNlVk62MQfOD4rf2yxNuzvSj9xywiaXGrleoayEJxF9uw3ANYNVE1fGBjR_uL_dR5EJI6p16oa5NBdZtX29Tn05bx4dsjH_13xSq58hGVpEHIRjZF8NLcwSxvdBeK1zuu7DDU1CA",

  //live

  // baseUrl: "https://api.tamara.co",
  // apiToken:
  // "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhY2NvdW50SWQiOiIwYmY3MDNiZi04ZTFhLTRhYzEtOWRkNi1hNDE4ODFjOTRkMGEiLCJ0eXBlIjoibWVyY2hhbnQiLCJzYWx0IjoiNjQ5YzcyMzY4OTFmYzZjNDVjYTczZDAzNTBlMjM5ZjYiLCJyb2xlcyI6WyJST0xFX01FUkNIQU5UIl0sImlhdCI6MTcxNzY1MzgwMCwiaXNzIjoiVGFtYXJhIFBQIn0.a9tojPzHIzqvWU1qfntezLkkpRaDuQnXIDGSuhwRZp9_pbIBBqmfqzDRw5VjwbLG1L1LuKLjFjXcVn3b2_idYyQ2bR-ZgKo-J0XI7YenzporatYyEkJY6kMW9dR2d_58mMBebMWv87Mq3IHSrmqpFFlGk0UZMFMRRXr77mzoDowsVq8x4ODasbTlEw23S1uMeB7WuA5c-qJlBcEsHZ4Jdaz8q_dscjBzKu-abbdLrnF-Q39s24wHTevPcFm4fsdk5xzPXXf-LVizaibObUXn0RPCFQDMH2QIiQYhlrTR5CxfqjVd_gFldMOSTq6zutAR5UE1rPjS1AcxesCdEB7fIQ",

  baseUrl: process.env.TAMARA_URL,
  apiToken: process.env.TAMARA_KEY,
  notificationPrivateKey: "280fd426-2efc-4a21-948d-37ea3690d56d",
};
const tamara = TamaraClientFactory.createApiClient(config);

exports.createTamaraPayment = async (req, res) => {
  const {
    shippingAddress,
    courseId,
    lang,
    amount,
    type,
    coupon,
    coupon_code,
    currentcurrency,
  } = req.body;

  try {
    console.log("req.userDecodeId====>", req.userDecodeId);


    console.log("type ====>", type);


    const { currency_flag, currency_code, currency_rate } = currentcurrency;

    const userDB = await db.user.findByPk(req.userDecodeId);
    const courseDB = await db.course.findByPk(courseId);
    let amountToPass;

    const coupon = await db.influencer.findOne({
      where: { coupon_code: coupon_code },
    });

    console.log(currency_flag, currency_code, currency_rate);

    console.log("COUPON", coupon);
    console.log("COUPON CODE", coupon_code);

    if (coupon_code) {
      const discountpercentage = coupon.coupon_percentage;

      const discountAmount = (amount * discountpercentage) / 100;
      const finalisedDiscountAmount = Math.trunc(
        discountAmount * currency_rate
      );

      amountToPass =
        Math.ceil(amount * currency_rate) - finalisedDiscountAmount;
    } else {
      amountToPass = Math.ceil(amount * currency_rate);
    }

    console.log("AMOUNT TO PASS", amountToPass);

    const customerData = {
      email: userDB?.email,
      first_name: userDB?.username.split(" ")[0],
      last_name: userDB?.username.split(" ")[1],
      phone_number: userDB?.mobile,
    };

    const items = [
      {
        name: courseDB?.name,
        type: "camp",
        reference_id: courseDB?.id,
        sku: "1",
        quantity: 1,
        total_amount: {
          amount: amountToPass,
          currency: currency_code, //AED
        },
      },
    ];

    const shipping_amount = {
      amount: 0,
      currency: currency_code, //AED
    };

    const total_amount = {
      amount: amountToPass,
      currency: currency_code, //AED
    };

    const shipping_address = {
      city: "Riyadh",
      country_code: currency_flag,
      first_name: userDB?.username.split(" ")[0],
      last_name: userDB?.username.split(" ")[1],
      line1: "3764 Al Urubah Rd",
      line2: "string",
      phone_number: userDB?.mobile,
    };

    const referenceOrderId = uuidv4();
    const referenceId = uuidv4();

    const merchant_url = {
      cancel: `${process.env.CLIENT_HOST}/${lang}/user/${type}/details/${courseId}`,
      failure: `${process.env.CLIENT_HOST}/${lang}/user/${type}/details/${courseId}`,
      success: `${process.env.CLIENT_HOST}/${lang}/user/${type}/details/${courseId}`,
      success: `${process.env.CLIENT_HOST}/${lang}/user/payment/confirm/${type}/${courseId}`,
      notification: "https://store-demo.com/payments/tamarapay",
    };

    const checkout = await tamara.createCheckout({
      totalAmount: total_amount,
      shippingAmount: shipping_amount,
      taxAmount: shipping_amount,
      referenceOrderId: referenceOrderId,
      referenceId: referenceId,
      items: items,
      consumer: customerData,
      countryCode: currency_flag,
      description: courseDB?.description,
      paymentType: "PAY_BY_INSTALMENTS",
      instalments: 4,
      shippingAddress: shipping_address,
      merchantUrl: merchant_url,
    });

    console.log("CHECKOUT==================>", checkout);

    const paymentItem = await db.tamaraPayment.create({
      amount: total_amount.amount,
      currency_code,
      courseId: courseId,
      referenceOrderId: referenceOrderId,
      referenceId: referenceId,
      userId: userDB?.id,
      orderId: checkout?.data?.orderId,
      coupon_code: coupon_code || null,
    });

    res.status(200).send({ status: true, data: checkout.data });
  } catch (err) {
    console.error("error:", err.message);
    res.status(400).send(`Error: ${err.message}`);
  }
};

exports.tamaraWebHook = async (req, res) => {
  try {
    console.log("req body=============>:", req.body); // Log only the request body

    const referenceOrderId = req.body.order_reference_id;
    console.log("referenceOrderId ==>", referenceOrderId);
    const orderDetails = await db.tamaraPayment.findOne({
      where: {
        referenceId: referenceOrderId,
      },
    });

    console.log("orderDetails=====>", orderDetails);
    console.log("orderDetails referenceId=====>", orderDetails.referenceId);

    const courseId = orderDetails.courseId;
    const userId = orderDetails.userId;
    const amount = orderDetails.amount;
    const order_id = orderDetails.orderId;
    const coupon_code = orderDetails.coupon_code;
    const currency_code = orderDetails.currency_code || null;

    console.log("ORDER ID ==========>", order_id);

    const course = await db.course.findByPk(courseId);

    // Process notification data based on notification type
    switch (req.body.event_type) {
      case "order_approved":
        console.log("ORDER ID ==========>", order_id);
        const authorised_data = await tamara.authoriseOrder(order_id);

        console.log("AUTHORISED DATA ============= >", authorised_data);

        const captured_data = await tamara.capture({
          items: [
            {
              name: course?.name,
              type: "Digital",
              reference_id: course?.id,
              sku: "SA-12436",
              quantity: 1,
              total_amount: { amount, currency: currency_code },
            },
          ],
          order_id: order_id,
          shipping_info: {
            shipped_at: new Date().toISOString(),
            shipping_company: "DHL",
          },
          total_amount: { amount, currency: currency_code },
        });

        console.log("CAPTURED DATA ===========>", captured_data);
        // Handle order creation notification
        const existingData = await db.registeredCourse.findOne({
          where: {
            userId,
            courseId,
          },
        });

        if (existingData) {
          console.log("EXISTING DATA");
          await db.registeredCourse.update(
            {
              createdAt: new Date(), // Set the createdAt field to the current time
            },
            {
              where: {
                userId, // Match the userId from the request
                courseId, // Match the provided courseId
              },
            }
          );
        } else {
          console.log("NEW DATA");
          await db.registeredCourse.create({
            userId,
            courseId,
          });
        }

        const amounts = calculatePaymentDetails(amount, currency_code);

        const { totalAmountAfterDeductions, totalDeductedAmount } = amounts;

        const paymentData = await db.payment.create({
          courseId: courseId,
          userId: userId,
          amount: amount,
          net_amount: totalAmountAfterDeductions || amount,
          stripe_fee: totalDeductedAmount || 0,
          fromTamara: true,
        });

        if (coupon_code) {
          console.log("COUPON FOUND IN TAMARA", coupon_code);

          const coupon = await db.influencer.findOne({
            where: {
              coupon_code: coupon_code,
            },
          });

          if (coupon) {
            await db.paymentWithCoupon.create({
              paymentId: paymentData?.id,
              influencerId: coupon?.id,
            });
            console.log("COUPON FOUND IN TAMARA AND SAVED", coupon_code);
          }
        }

        const userDB = await db.user.findByPk(userId);

        console.log("userDB===>", userDB);
        console.log("Order created: ==>", referenceOrderId);

        const subject = "TheTopPlayer Payment";
        const text = "payment successful"; // plain text body
        const html = paymentSuccessMail(
          userDB.username,
          amount,
          orderDetails.referenceId
        );

        const isMailsend = await sendMail(userDB.email, subject, text, html);

        if (isMailsend) {
          console.log("Email sent:");
        } else {
          console.error("Error sending email in payment:", error);
        }

        // Update your application data (e.g., mark order as created)
        break;
      case "ORDER_CONFIRMED":
        // Handle order confirmation notification
        console.log("Order confirmed:", order.referenceOrderId);
        // Update your application data (e.g., mark order as confirmed)
        break;
      case "order_declined":
        // Handle order confirmation notification
        console.log("Order declined:", order.referenceOrderId);

        if (orderDetails) {
          await orderDetails.destroy();
          console.log("Order data removed from Db as the order is declined");
        }
        // Update your application data (e.g., mark order as confirmed)
        break;
      case "ORDER_PAYMENT_CAPTURED":
        // Handle successful payment notification
        console.log("Payment captured:", order.referenceOrderId);
        // Update your application data (e.g., mark order as paid)
        // You can access payment details from the order object
        break;
      case "ORDER_CANCELLED":
        // Handle order cancellation notification
        console.log("Order cancelled:", order.referenceOrderId);
        // Update your application data (e.g., mark order as cancelled)

        if (orderDetails) {
          await orderDetails.destroy();
          console.log("Order data removed from Db as the order is cancelled");
        }

        break;
      // Handle other notification types as needed
    }

    res.sendStatus(200); // Acknowledge receipt of the webhook
  } catch (err) {
    console.error("error:", err.message);
    res.status(400).send(`Error processing webhook: ${err.message}`);
  }
};
