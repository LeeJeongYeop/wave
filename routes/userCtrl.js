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
            if(status){
                userModel.login([data.user_email, data.user_password, data.user_joinpath], function(login_status, login_msg, rows){
                    if(login_status) req.session.user = rows.user_no;
                    logger.info("session:", req.session.user);
                    return res.json({
                        "status" : login_status,
                        "message" : login_msg
                    });
                });
            }else{
                return res.json({
                    "status" : status,
                    "message" : msg
                });
            }
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
        var data = [req.body.email, _crypto.do_ciper(req.body.password), '0'];  // [2] = user_joinpath
        userModel.login(data, function(status, msg, rows, sub_rows) {
            if (status) {
                req.session.user = rows.user_no;
                if(rows.user_status == 0){
                    return res.json({
                        "status": status,
                        "message": msg,
                        "data": {
                            "case": rows.user_status
                        }
                    });
                }else{
                    return res.json({
                        "status": status,
                        "message": msg,
                        "data": {
                            "case": rows.user_status,
                            "user_no": sub_rows.user_no,
                            "nickname": sub_rows.user_nickname,
                            "comment": sub_rows.user_comment
                        }
                    });
                }
            } else {
                return res.json({
                    "status": status,
                    "message": msg
                })
            }
        });
    }
});

/*************
 * Facebook
 *************/
router.post("/fb", function(req, res){
    logger.info('req.body', req.body);
    if(req.body.access_token){
        userModel.fb(req.body.access_token, function(status, msg, rows, sub_rows){
            if(status){
                req.session.user = rows.user_no;  // session 저장
                if(rows.user_status == 0){
                    return res.json({
                        "status": status,
                        "message": msg,
                        "data": {
                            "case": rows.user_status
                        }
                    });
                }else{
                    return res.json({
                        "status": status,
                        "message": msg,
                        "data": {
                            "case": rows.user_status,
                            "user_no": sub_rows.user_no,
                            "nickname": sub_rows.user_nickname,
                            "comment": sub_rows.user_comment
                        }
                    });
                }
            }
            else{
                return res.json({
                    "status" : status,
                    "message" : msg
                });
            }
        });
    }else{
        return res.json({
            "status" : false,
            "message" : "No Access Token"
        });
    }
});

/*************
 * Logout
 *************/
router.get("/logout", function(req, res){
    logger.info('req.session.user', req.session.user);

    if(req.session.user){
        req.session.destroy(function(err){
            if(err){
                res.json({
                    "status" : false,
                    "message" : "Logout Fail"
                });
            }else{
                res.json({
                    "status" : true,
                    "message" : "success"
                });
            }
        });
    }else{
        res.json({
            "status" : false,
            "message" : "Logout Fail"
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
                return res.json({
                    "status" : status,
                    "message" : msg,
                    "data" : {
                        "email" : rows.data.user_email,
                        "nickname" : rows.data.user_nickname,
                        "comment" : rows.data.user_comment,
                        "profile_img" : rows.data.user_img,
                        "phone" : rows.data.user_phone,
                        "regid" : rows.data.user_regid,
                        "point" : rows.data.user_point,
                        "song1" : rows.song1,
                        "song2" : rows.song2,
                        "song3" : rows.song3
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
 * Profile Edit
 *************/
router.post('/profile', function(req, res){
    if(req.session.user){  // loginRequired
        logger.info("req.body : ", req.body);
        if(data_check([req.body.nickname]) == 1){
            return res.json({
                "status" : false,
                "message" : "닉네임을 입력해주세요."
            });
        }else{
            var data = [req.body.nickname, req.body.comment, req.body.phone, req.body.regid, req.session.user];
            var song1 = req.body.song1;
            var song2 = req.body.song2;
            var song3 = req.body.song3;
            userModel.profileEdit(data, song1, song2, song3, function(status, msg){
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