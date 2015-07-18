var express = require('express');
var router = express.Router();

/* GET home page. */
router.post('/', function(req, res, next) {
  console.log("TEST OK");
  res.json({
    status : true,
    message : "success",
    data :
    {
      name : "muf",
      test : "ok"
    }
  });
});

module.exports = router;