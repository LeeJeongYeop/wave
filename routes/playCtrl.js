/**
 * Created by Nayak on 2015-07-28.
 */
var express = require('express');
var router = express.Router();
var logger = require('../logger');
var playModel = require('../models/playModel');

/*************
 * Surfers Random
 *************/
router.get('/surfers', function(req, res){
    if(req.session.user){  // loginRequired
        playModel.surfers(req.session.user.user_no, function(status, msg, user, song1, song2, song3){
            if(status){
                return res.json({
                    "status" : status,
                    "message" : msg,
                    "data" : {
                        "user_no" : user.user_no,
                        "nickname" : user.user_nickname,
                        "comment" : user.user_comment,
                        "img" : user.user_img,
                        "point" : user.user_point,
                        "song1" : song1,
                        "song2" : song2,
                        "song3" : song3
                    }
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