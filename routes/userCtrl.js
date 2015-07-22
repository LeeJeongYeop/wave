/**
 * Created by Nayak on 2015-07-18.
 */
var express = require('express');
var router = express.Router();
var logger = require('../logger');
var userModel = require('../models/userModel');
var _crypto = require('../models/db_crypto');

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
}

/*************
 * Email Join
 *************/
router.post('/join', function(req, res){
    logger.info('POST DATA: ', req.body);
    var check = [req.body.email, req.body.password, req.body.nickname];
    var data = {
        "user_email" : req.body.email,
        "user_password" : _crypto.do_ciper(req.body.password),
        "user_nickname" : req.body.nickname,
        "user_joinpath" : 0
    }
    var null_check = data_check(check);
    if(null_check == 1){
        res.json({
            "status" : false,
            "message" : "빈칸을 입력해주세요."
        });
    }else{
        userModel.join(data, function(check, msg){
            if(check){
                res.json({
                    "status" : true
                });
            }else{
                res.json({
                    "status" : false,
                    "message" : msg
                });
            }
        });
    }
});

module.exports = router;