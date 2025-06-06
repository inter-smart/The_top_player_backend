const jwt = require("jsonwebtoken");

exports.checkUserAuthOptional = (req, res, next) => {
  let token = req.header("X-Access-Token");
  const secret = process.env.SECRET;

  console.log(token, "TOKEN");

  if (!token) {
    req.userDecodeId = null;
    req.token = null;
    req.deviceId = null;
    return next();
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      console.error(`error in verifying ${err.toString()}`);
      return res.status(401).send({
        authentication: false,
        message: err.toString(),
      });
    }
    if (!decoded) {
      return res.status(401).send({
        authentication: false,
        message: "Unauthorized!",
      });
    }

    console.log("DECODED--------->", decoded);

    req.userDecodeId = decoded.id;
    req.token = token;
    req.deviceId = decoded.deviceID;
    next();
  });
};
