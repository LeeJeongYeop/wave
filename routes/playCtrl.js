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
        playModel.req(data, function(status, msg, res_user, req_user_nickname){
            if(status){  //TODO 아이폰, 안드로이드인지 확인해야함
                var message = req_user_nickname + " requested a music conversation to you";
                my.apns(res_user.user_regid, message);
                return res.json({
                    "status" : status,
                    "message" : msg
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
                    var message = res_user_nickname + " accepted your request";
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
                    var message = res_user_nickname + " rejected your request";
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

/*************
 * Surfing Read
 *************/
router.get('/read', function(req, res){
    if(req.session.user){
        playModel.read(req.session.user, function(status, msg, nickname, song){
            if(status){
                return res.json({
                    "status" : status,
                    "messgae" : msg,
                    "data" : {
                        "snd_user_no" : song.surfing_snd_user_no,
                        "nickname" : nickname.user_nickname,
                        "thumb_url" : song.surfing_thumb_url,
                        "title" : song.surfing_title,
                        "video" : song.surfing_video,
                        "comment" : song.surfing_comment,
                        "time" : song.surfing_last
                    }
                });
            }else{
                return res.json({
                    "status" : status,
                    "message" : msg
                })
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
 * Surfing Send
 *************/
router.post('/send', function(req, res){
    if(req.session.user){
        var data = [req.body.thumb_url, req.body.title, req.body.video, req.body.comment, req.session.user];
        playModel.send(data, function(status, msg, snd_nickname, rec_regid){
            if(status){
                var message = snd_nickname+" sent you a music conversation";
                my.apns(rec_regid, message);
            }
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

/*************
 * Surfing Out
 *************/
router.post('/out', function(req, res){
    if(req.session.user){
        playModel.out(req.session.user, function(status, msg, user_row, nickname){
            if(status){
                var message = nickname+"s got out of the surfing room";
                my.apns(user_row.user_regid, message);
            }
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