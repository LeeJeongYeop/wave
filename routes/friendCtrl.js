/**
 * Created by Nayak on 2015-07-26.
 */
var express = require('express');
var router = express.Router();
var logger = require('../logger');
var friendModel = require('../models/friendModel');

/*************
 * Friend Add
 *************/
router.post('/add', function(req, res){
    if(req.session.user){  // loginRequired
        var data = [req.session.user.user_no, req.body.friend_no];
        friendModel.add(data, function(status, msg){
            return res.json({
                "status" : status,
                "message" : msg
            });
        });
    }else{
        return res.json({
            "status" : false,
            "message" : "not log-in"
        });
    }
});

module.exports = router;