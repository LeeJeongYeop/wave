/**
 * Created by Nayak on 2015-07-28.
 */
var express = require('express');
var router = express.Router();
var logger = require('../logger');
var playModel = require('../models/playModel');
var my = require('./my_conf');

/*************
 * Surfers Random
 *************/
router.get('/surfers', function(req, res){
    var data = [];
    if(req.session.user) data.push(req.session.user);  // 로그인 한 유저의 경우 data의 세션정보를 담음
    playModel.surfers(data, function(status, msg, user, song1, song2, song3){
        if(status){
            return res.json({
                "status" : status,
                "message" : msg,
                "data" : {
                    "user_no" : user.user_no,
                    "nickname" : user.user_nickname,
                    "comment" : user.user_comment,
                    "status" : user.user_status,
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
                    if(status) {  //TODO 아이폰, 안드로이드인지 확인해야함
                        var message = rows.user_nickname + "님께서 서핑을 신청했습니다.";
                        my.apns(rows.user_regid, message);
                    }
                    return res.json({
                        "status" : status,
                        "message" : msg
                    });
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
            playModel.res_ok(req.session.user, function(status,msg, res_user_nickname, req_user_regid, req_user_song){
                if(status) {  //TODO 아이폰, 안드로이드인지 확인해야함
                    var message = res_user_nickname + "께서 서핑을 수락하였습니다.";
                    my.apns(req_user_regid, message);
                }
                return res.json({
                    "status" : status,
                    "message" : msg
                });
            });
        }else{  // 서핑 거절
            playModel.res_no(req.session.user, function(status, msg, res_user_nickname, req_user_regid){
                if(status) {  //TODO 아이폰, 안드로이드인지 확인해야함
                    var message = res_user_nickname + "께서 서핑을 거절하였습니다.";
                    my.apns(req_user_regid, message);
                }
                return res.json({
                    "status" : status,
                    "message" : msg
                });
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