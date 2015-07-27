/**
 * Created by Nayak on 2015-07-28.
 */
var express = require('express');
var router = express.Router();
var logger = require('../logger');
var playModel = require('../models/playModel');

/*************
 * Friend List
 *************/
router.get('/surfers', function(req, res){
    if(req.session.user){  // loginRequired
        playModel.surfers(req.session.user.user_no, function(status, msg, rows){
            if(status){
                return res.json({
                    "status" : status,
                    "message" : msg,
                    "data" : rows
                });
            }else{
                return res.json({
                    "status" : status,
                    "message" : msg
                });
            }
        });
    }else{
        return res.json({
            "status" : false,
            "message" : "not log-in"
        });
    }
});

module.exports = router;