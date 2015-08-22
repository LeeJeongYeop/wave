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
        playModel.surfers(req.session.user, function(status, msg, user, song1, song2, song3){
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

/*************
 * Surfing Request
 *************/
router.post('/req', function(req, res) {
    if(req.session.user){  // loginRequired
        var data = [req.body.user_no, req.session.user];  // data[0] == 1은 요청상태인 case 1을 의미
        playModel.req(data, function(status, msg){
            if(status){
                playModel.req_info(req.body.user_no, function(status, msg, rows){
                    if(status){
                        return res.json({  // 임시
                            "row" : rows
                        });
                        // TODO push
                    }else{
                        return res.json({
                            "status" : status,
                            "message" : msg
                        });
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

/*************
 * Surfing Response
 *************/
router.post('/res', function(req, res){
    if(req.session.user){  // loginRequired
        if(req.body.res == 0){  // 수락
            var data = [req.body.user_no, req.session.user];
            playModel.res_ok(data, function(status,msg){

            });
        }else{  // 서핑 거절
            var data = [req.body.user_no, req.session.user];
            playModel.res_no(data, function(status, msg){
                if(status){
                    return res.json({  // 임시
                        "status" : status
                    });
                    // TODO push
                }else{
                    return res.json({
                        "status" : status,
                        "message" : msg
                    });
                }
            });
        }
    }else{
        return res.json({
            "status" : false,
            "message" : "not log-in"
        });
    }
});

module.exports = router;