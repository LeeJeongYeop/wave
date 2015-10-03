var express = require('express');
var router = express.Router();
var logger = require('../logger');
var my = require('./my_conf');

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

router.post('/apns', function(req, res){
  my.apns(req.body.token, "안녕하세요 이정엽입니다.");
  res.json({
    status : true,
    message : "success"
  });
});

module.exports = router;