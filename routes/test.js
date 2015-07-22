var express = require('express');
var router = express.Router();
var logger = require('../logger');

/* GET home page. */
router.post('/', function(req, res, next) {
  logger.info("TEST OK");
  res.json({
    status : true,
    message : "success",
    data :
    {
      name : "wave",
      test : "ok"
    }
  });
});

module.exports = router;