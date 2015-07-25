/**
 * Created by Nayak on 2015-07-18.
 */
var express = require('express');
var router = express.Router();
var logger = require('../logger');
var userModel = require('../models/userModel');
var _crypto = require('../models/db_crypto');
var fs = require('fs');
var my = require('./my_conf');

/*************
 * parameter check
 *************/
var data_check = function(data){
    var len = data.length;
    for(var i=0; i<len; i++){
        if(data[i]===""){
            return 1;
        }
    }
};

/*************
 * Profil Image
 *************/
router.get('/img/:IMG_NAME', function (req, res) {
    var imgName = req.params.IMG_NAME;
    var img = fs.readFileSync('./public/img/' + imgName);
    res.writeHead(200, {'Content-Type': 'image/JPG'});
    res.end(img, 'binary');
});

/*************
 * Email Join
 *************/
router.post('/join', function(req, res){
    logger.info('POST DATA: ', req.body);
    var n = parseInt((Math.random()*4)+1);  // 랜덤 이미지
    var check = [req.body.email, req.body.password, req.body.nickname];
    var data = {
        "user_email" : req.body.email,
        "user_password" : _crypto.do_ciper(req.body.password),
        "user_nickname" : req.body.nickname,
        "user_img" : my.IMG(n),
        "user_joinpath" : 0
    };
    if(data_check(check) == 1){
        return res.json({
            "status" : false,
            "message" : "빈칸을 입력해주세요."
        });
    }else{
        userModel.join(data, function(status, msg){
            return res.json({
                "status" : status,
                "message" : msg
            });
        });
    }
});

/*************
 * Email Login
 *************/
router.post('/login', function(req, res){
    var check = [req.body.email, req.body.password];
    if(data_check(check) == 1){
        return res.json({
            "status" : false,
            "message" : "빈칸을 입력해주세요."
        });
    }else{
        var data = [req.body.email, _crypto.do_ciper(req.body.password), '0']  // [2] = user_joinpath
        userModel.login(data, function(status, msg, rows){
            if(status) req.session.user = rows;  // session 저장
            return res.json({
                "status" : status,
                "message" : msg
            });
        });
    }
});

/*************
 * Profile View
 *************/
router.get('/profile', function(req, res){
    if(req.session.user){  // loginRequired
        userModel.profileView(req.session.user, function(status, msg, rows){
            if(status){
                res.json({
                    "status" : status,
                    "message" : msg,
                    "data" : {
                        "email" : rows.user_email,
                        "nickname" : rows.user_nickname,
                        "comment" : rows.user_comment,
                        "profile_img" : rows.user_img,
                        "point" : rows.user_point
                    }
                });
            }else{
                res.json({
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
 * Profile Edit
 *************/
router.post('/profile', function(req, res){
    if(req.session.user){  // loginRequired
        logger.info("req.body : ", req.body);
        if(data_check([req.body.nickname, req.body.song1]) == 1){
            return res.json({
                "status" : false,
                "message" : "닉네임과 첫번째 노래를 선택해주세요."
            });
        }else{
            var data = [req.body.nickname, req.body.comment, req.body.song1, req.body.song2, req.body.song3, req.session.user];
            logger.info("data: ", data);
            userModel.profileEdit(data, function(status, msg){
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