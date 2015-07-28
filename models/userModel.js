/**
 * Created by Nayak on 2015-07-18.
 */
var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var async = require('async');
var graph = require('fbgraph');
var my = require('../routes/my_conf');
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
    var sql = "SELECT user_no FROM wave_user WHERE user_email=? AND user_password=? AND user_joinpath=?";
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
 * Facebook
 *************/
exports.fb = function(access_token, done){
    logger.info('AT : ', access_token);
    graph.setAccessToken(access_token);

    graph.get("me", function(err, res){
        if(err) done(false, 'FB Graph error');
        else{
            var data = [res.email, '1'];  // [1] = user_joinpath
            logger.info('data : ', data);
            pool.getConnection(function(err, conn){
                if(err){
                    logger.error("Facebook_getConnection error");
                    done(false, "Facebook DB error");
                }else{
                    async.waterfall([
                            function(callback){  // 가입여부 확인
                                var sql = "SELECT COUNT(*) cnt FROM wave_user WHERE user_email=? AND user_joinpath=?";
                                conn.query(sql, data, function(err, rows){
                                    if(err){
                                        logger.error("Facebook_Waterfall_1");
                                        callback(err);
                                    }else{
                                        logger.info('rows[0] : ', rows[0]);
                                        callback(null, rows[0].cnt);
                                    }
                                });
                            },
                            function(cnt, callback){  // 회원가입
                                logger.info('cnt : ', cnt);
                                if(cnt == 1) callback(null);
                                else{
                                    var n = parseInt((Math.random()*4)+1);  // 랜덤 이미지
                                    var insert_data = [data[0], data[1], my.IMG(n)];  // data[0]-> email, data[1]-> joinpath
                                    var sql = "INSERT INTO wave_user(user_email, user_joinpath, user_img) VALUES(?,?,?)";
                                    conn.query(sql, insert_data, function(err, rows){
                                        if(err){
                                            logger.error("Facebook_Waterfall_2");
                                            callback(err);
                                        }else{
                                            if(rows.affectedRows == 1) callback(null);
                                            else{
                                                logger.error("Facebook_Waterfall_3");
                                                done(false, "Facebook DB error");  // error 없이 콜백
                                                conn.release();
                                            }
                                        }
                                    });
                                }
                            },
                            function(callback){  // 로그인
                                var sql = "SELECT user_no FROM wave_user WHERE user_email=? AND user_joinpath=?";
                                conn.query(sql, data, function(err, rows){
                                    if(err){
                                        logger.error("Facebook_Waterfall_4");
                                        callback(err);
                                    }else{
                                        logger.info('rows[0]:', rows[0]);
                                        if(rows[0]){
                                            callback(null, rows[0]);
                                        }else{
                                            done(false, "로그인 실패 다시 시도해주세요.");  // error 없이 콜백
                                            conn.release();
                                        }
                                    }
                                });
                            }
                        ],
                        function(err, result){  // result = rows[0]
                            if(err){
                                done(false, "Facebook DB error");
                                conn.release();
                            }else{
                                done(true, "success", result);
                                conn.release();
                            }
                        }
                    );  // waterfall
                }
            });  // getConnection
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
            if(rows[0]) done(true, "success", rows[0]);
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