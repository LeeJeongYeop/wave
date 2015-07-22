/**
 * Created by Nayak on 2015-07-18.
 */
var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var async = require('async');
var db_config = require('./db_config');
var logger = require('../logger');
var pool = mysql.createPool(db_config);
var crypto = require('crypto');
var _crypto = require('./db_crypto');

/*************
 * Email Join
 *************/
exports.join = function(data, done) {
    async.waterfall([
            function(callback){   // 중복검사
                var sql = "select count(*) cnt from wave_user where user_email=? and user_joinpath=?";
                pool.query(sql, [data.user_email, data.user_joinpath], function(err, rows){
                    if(err){
                        logger.error("join_waterfall_1");
                        callback(err);
                    }else{
                        if(rows[0].cnt == 1) done(false, "email same"); // done 콜백
                        else callback(null);
                    }
                });
            },
            function(callback){  // 가입
                var sql = "INSERT INTO wave_user SET ?";
                pool.query(sql, data, function(err, rows){
                    if(err){
                        logger.error("join_waterfall_2");
                        callback(err);
                    }else{
                        if(rows.affectedRows == 1){
                            callback(null);
                        }else{
                            logger.error("affectedRows error");
                            done(false, "DB error");  // error
                        }
                    }
                });
            }
        ],
        function(err){
            if(err) done(false, "DB error");  // error
            else done(true);  // success
        }
    )   // waterfall
};