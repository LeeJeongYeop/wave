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

/*************
 * Email Join
 *************/
exports.join = function(data, done) {
    async.waterfall([
            function(callback){   // 중복검사
                var sql = "SELECT COUNT(*) cnt FROM wave_user WHERE user_email=? AND user_joinpath=?";
                pool.query(sql, [data.user_email, data.user_joinpath], function(err, rows){
                    if(err){
                        logger.error("Join_Waterfall_1");
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
                        logger.error("Join_Waterfall_2");
                        callback(err);
                    }else{
                        if(rows.affectedRows == 1){
                            callback(null);
                        }else{
                            logger.error("Join_affectedRows error");
                            done(false, "Join_DB error");  // error
                        }
                    }
                });
            }
        ],
        function(err){
            if(err) done(false, "Join_DB error");  // error
            else done(true, "success");  // success
        }
    );  // waterfall
};

/*************
 * Email Login
 *************/
exports.login = function(data, done){
    var sql = "SELECT user_no FROM wave_user WHERE user_email=? and user_password=? and user_joinpath=?";
    pool.query(sql, data, function(err, rows){
        if(err){
            logger.error("Login_DB error");
            done(false, "Login_DB error");
        }else{
            logger.info('rows[0]:', rows[0]);
            if(rows[0]) done(true, "success", rows[0]);  // success
            else done(false, "아이디와 비밀번호가 일치하지 않습니다.");
        }
    });
};

/*************
 * Profile View
 *************/
exports.profileView = function(data, done){
    var sql = "SELECT user_email, user_nickname, user_comment, user_img, user_point, user_song_1, user_song_2, user_song_3 FROM wave_user WHERE user_no = ?";
    pool.query(sql, data, function(err, rows){
        if(err){
            logger.error("Profile View DB error");
            done(false, "Profile View DB error");
        }else{
            logger.info('rows[0]', rows[0]);
            if(rows[0]) done(true, "success", rows[0])
            else done(false, "Profile View DB error");
        }
    });
};

/*************
 * Profile Edit
 *************/
exports.profileEdit = function(data, done){
    var sql = "UPDATE wave_user SET user_nickname = ?, user_comment = ?, user_song_1 = ?, user_song_2 = ?, user_song_3 = ? WHERE user_no = ?";
    pool.query(sql, data, function(err, rows){
        if(err){
            logger.error("Profile Edit DB error");
            done(false, "Profile Edit DB error");
        }else{
            if(rows.affectedRows == 1) done(true, "success");
             else done(false, "Profile Edit DB error");
        }
    });
};