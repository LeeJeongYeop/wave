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
                            logger.error("Join_affectedRows_1 error");
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
    var sql = "SELECT user_no, user_status, user_surfing_no FROM wave_user WHERE user_email=? AND user_password=? AND user_joinpath=?";
    pool.query(sql, data, function(err, rows){
        if(err){
            logger.error("Login_DB error_1");
            done(false, "Login_DB error");
        }else{
            logger.info('rows[0]:', rows[0]);
            if(rows[0]){
                if(rows[0].user_status == 0){
                    done(true, "success", rows[0]);  // success
                }else{
                    var sub_sql = "SELECT user_no, user_nickname, user_comment FROM wave_user WHERE user_no = ?";
                    pool.query(sub_sql, rows[0].user_surfing_no, function(err, sub_rows){
                        if(err){
                            logger.error("Login_DB error_2");
                            done(false, "Login_DB error");
                        }else{
                            if(sub_rows[0]) done(true, "success", rows[0], sub_rows[0]);  // sub_rows는 대상 유저의 정보
                            else done(false, "대상 유저 정보 DB 에러");
                        }
                    });
                }
            }
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
                    conn.release();
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
                                var sql = "SELECT user_no, user_status, user_surfing_no FROM wave_user WHERE user_email=? AND user_joinpath=?";
                                conn.query(sql, data, function(err, rows){
                                    if(err){
                                        logger.error("Facebook_Waterfall_4");
                                        callback(err);
                                    }else{
                                        logger.info('rows[0]:', rows[0]);
                                        if(rows[0]){
                                            if(rows[0].user_status == 0){
                                                callback(null, rows[0]);  // success
                                            }else{
                                                var sub_sql = "SELECT user_no, user_nickname, user_comment FROM wave_user WHERE user_no = ?";
                                                conn.query(sub_sql, rows[0].user_surfing_no, function(err, sub_rows){
                                                    if(err){
                                                        logger.error("Facebook_Waterfall_5");
                                                        callback(err);
                                                    }else{
                                                        if(sub_rows[0]) callback(null, rows[0], sub_rows[0]);  // sub_rows는 대상 유저의 정보
                                                        else{
                                                            done(false, "대상 유저 정보 DB 에러");  // error 없이 콜백
                                                            conn.release();
                                                        }
                                                    }
                                                });
                                            }
                                        }else{
                                            done(false, "로그인 실패 다시 시도해주세요.");  // error 없이 콜백
                                            conn.release();
                                        }
                                    }
                                });
                            }
                        ],
                        function(err, rows, sub_rows){  // rows: 기본정보, sub_rows: 대상 정보
                            if(err){
                                done(false, "Facebook DB error");
                                conn.release();
                            }else{
                                if(sub_rows){
                                    done(true, "success", rows, sub_rows);
                                    conn.release();
                                }else{
                                    done(true, "success", rows);
                                    conn.release();
                                }
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
    async.parallel({
            data: function(callback){
                var sql = "SELECT user_email, user_nickname, user_comment, user_img, user_point, user_phone, user_regid FROM wave_user WHERE user_no = ?";
                pool.query(sql, data, function (err, rows) {
                    if (err) {
                        logger.error("Profile View DB error");
                        callback(err);
                    } else {
                        logger.info('rows[0]', rows[0]);
                        if (rows[0]) callback(null, rows[0]);
                        else done(false, "Profile View DB error");  // error 없이 콜백
                    }
                });
            },
            song1: function (callback) {
                var sql = "SELECT first_thumb_url, first_title, first_video FROM wave_song_first WHERE user_no=?";
                pool.query(sql, data, function(err, rows){
                    if (err) {
                        logger.error("Profile View DB error");
                        callback(err);
                    } else {
                        logger.info('rows[0]', rows[0]);
                        if (rows[0]) callback(null, rows[0]);
                        else callback(null, "NOT");  // error 없이 콜백
                    }
                });
            },
            song2: function (callback) {
                var sql = "SELECT second_thumb_url, second_title, second_video FROM wave_song_second WHERE user_no=?";
                pool.query(sql, data, function(err, rows){
                    if (err) {
                        logger.error("Profile View DB error");
                        callback(err);
                    } else {
                        logger.info('rows[0]', rows[0]);
                        if (rows[0]) callback(null, rows[0]);
                        else callback(null, "NOT");
                    }
                });
            },
            song3: function (callback) {
                var sql = "SELECT third_thumb_url, third_title, third_video FROM wave_song_third WHERE user_no=?";
                pool.query(sql, data, function(err, rows){
                    if (err) {
                        logger.error("Profile View DB error");
                        callback(err);
                    } else {
                        logger.info('rows[0]', rows[0]);
                        if (rows[0]) callback(null, rows[0]);
                        else callback(null, "NOT");
                    }
                });
            }
        },
        function(err, result){
            if (err) done(false, "Profile View DB error");
            else{
                logger.info("result:", result);
                done(true, "success", result);
            }
        }
    ); // parallel
};

/*************
 * Profile Edit
 *************/
exports.profileEdit = function(data, song1, song2, song3, done){
    pool.getConnection(function(err, conn){
        if(err){
            logger.error("Profile_Edit_getConnection error");
            done(false, "Profile_Edit DB error");
            conn.release();
        }else{
            conn.beginTransaction(function(err) {
                if(err){
                    logger.error("Profile_Edit_beginTransaction error");
                    done(false, "Profile_Edit DB error");
                    conn.release();
                }else{
                    async.waterfall([
                            function(callback){
                                var sql = "UPDATE wave_user SET user_nickname = ?, user_comment = ?, user_phone = ?, user_regid = ? WHERE user_no = ?";
                                conn.query(sql, data, function(err, rows){
                                    if(err){
                                        logger.error("Profile_Edit_Waterfall_1 error");
                                        callback(err);
                                    }else{
                                        if(rows.affectedRows == 1) callback(null);
                                        else{
                                            logger.error("Profile_Edit_affectedRows_1 error");
                                            conn.rollback(function(){
                                                done(false, "Profile_Edit DB error");  // error
                                                conn.release();
                                            });
                                        }
                                    }
                                });
                            },
                            function(callback){   // First Song
                                var sql = "SELECT COUNT(*) cnt FROM wave_song_first WHERE user_no = ?";
                                conn.query(sql, data[4], function(err, rows){   // song1 데이터 유무 검사
                                    if(err){
                                        logger.error("Profile_Edit_Waterfall_2 error");
                                        callback(err);
                                    }else{
                                        if(rows[0].cnt == 1){
                                            var sql = "UPDATE wave_song_first SET first_thumb_url=?, first_title=?, first_video=? WHERE user_no = ?";
                                            song1.push(data[4]);  // data[4] -> user_no
                                            conn.query(sql, song1, function(err, rows){
                                                if(err){
                                                    logger.error("Profile_Edit_Waterfall_3 error");
                                                    callback(err);
                                                }else{
                                                    if(rows.affectedRows == 1) callback(null);
                                                    else{
                                                        logger.error("Profile_Edit_affectedRows_2 error");
                                                        conn.rollback(function(){
                                                            done(false, "Profile_Edit DB error");  // error
                                                            conn.release();
                                                        });
                                                    }
                                                }
                                            });
                                        }else{
                                            var sql = "INSERT INTO wave_song_first(user_no, first_thumb_url, first_title, first_video) VALUES(?,?,?,?)";
                                            song1.unshift(data[4]);  // data[4] -> user_no
                                            conn.query(sql, song1, function(err, rows){
                                                if(err){
                                                    logger.error("Profile_Edit_Waterfall_4 error");
                                                    callback(err);
                                                }else{
                                                    if(rows.affectedRows == 1) callback(null);
                                                    else{
                                                        logger.error("Profile_Edit_affectedRows_3 error");
                                                        conn.rollback(function(){
                                                            done(false, "Profile_Edit DB error");  // error
                                                            conn.release();
                                                        });
                                                    }
                                                }
                                            });
                                        }
                                    }
                                });
                            },
                            function(callback){  //  Second Song
                                var sql = "SELECT COUNT(*) cnt FROM wave_song_second WHERE user_no = ?";
                                conn.query(sql, data[4], function(err, rows){   // song2 데이터 유무 검사
                                    if(err){
                                        logger.error("Profile_Edit_Waterfall_5 error");
                                        callback(err);
                                    }else{
                                        if(rows[0].cnt == 1){
                                            if(song2 instanceof Array){
                                                var sql = "UPDATE wave_song_second SET second_thumb_url=?, second_title=?, second_video=? WHERE user_no = ?";
                                                song2.push(data[4]);  // data[4] -> user_no
                                                conn.query(sql, song2, function(err, rows){
                                                    if(err){
                                                        logger.error("Profile_Edit_Waterfall_6 error");
                                                        callback(err);
                                                    }else{
                                                        if(rows.affectedRows == 1) callback(null);
                                                        else{
                                                            logger.error("Profile_Edit_affectedRows_4 error");
                                                            conn.rollback(function(){
                                                                done(false, "Profile_Edit DB error");  // error
                                                                conn.release();
                                                            });
                                                        }
                                                    }
                                                });
                                            }else{
                                                var sql = "DELETE FROM wave_song_second WHERE user_no=?";
                                                conn.query(sql, data[4], function(err, rows){  // data[4] -> user_no
                                                    if(err){
                                                        logger.error("Profile_Edit_Waterfall_7 error");
                                                        callback(err);
                                                    }else{
                                                        if(rows.affectedRows == 1) callback(null);
                                                        else{
                                                            logger.error("Profile_Edit_affectedRows_5 error");
                                                            conn.rollback(function(){
                                                                done(false, "Profile_Edit DB error");  // error
                                                                conn.release();
                                                            });
                                                        }
                                                    }
                                                });
                                            }
                                        }else{
                                            if(song2 instanceof Array) {
                                                var sql = "INSERT INTO wave_song_second(user_no, second_thumb_url, second_title, second_video) VALUES(?,?,?,?)";
                                                song2.unshift(data[4]);  // data[4] -> user_no
                                                conn.query(sql, song2, function (err, rows) {
                                                    if (err) {
                                                        logger.error("Profile_Edit_Waterfall_8 error");
                                                        callback(err);
                                                    } else {
                                                        if (rows.affectedRows == 1) callback(null);
                                                        else {
                                                            logger.error("Profile_Edit_affectedRows_6 error");
                                                            conn.rollback(function () {
                                                                done(false, "Profile_Edit DB error");  // error
                                                                conn.release();
                                                            });
                                                        }
                                                    }
                                                });
                                            }else callback(null);
                                        }
                                    }
                                });
                            },
                            function(callback){  //  Third Song
                                var sql = "SELECT COUNT(*) cnt FROM wave_song_third WHERE user_no = ?";
                                conn.query(sql, data[4], function(err, rows){   // song3 데이터 유무 검사
                                    if(err){
                                        logger.error("Profile_Edit_Waterfall_9 error");
                                        callback(err);
                                    }else{
                                        if(rows[0].cnt == 1){
                                            if(song3 instanceof Array){
                                                var sql = "UPDATE wave_song_third SET third_thumb_url=?, third_title=?, third_video=? WHERE user_no = ?";
                                                song3.push(data[4]);  // data[4] -> user_no
                                                conn.query(sql, song3, function(err, rows){
                                                    if(err){
                                                        logger.error("Profile_Edit_Waterfall_10 error");
                                                        callback(err);
                                                    }else{
                                                        if(rows.affectedRows == 1) callback(null);
                                                        else{
                                                            logger.error("Profile_Edit_affectedRows_7 error");
                                                            conn.rollback(function(){
                                                                done(false, "Profile_Edit DB error");  // error
                                                                conn.release();
                                                            });
                                                        }
                                                    }
                                                });
                                            }else{
                                                var sql = "DELETE FROM wave_song_third WHERE user_no=?";
                                                conn.query(sql, data[4], function(err, rows){  // data[4] -> user_no
                                                    if(err){
                                                        logger.error("Profile_Edit_Waterfall_11 error");
                                                        callback(err);
                                                    }else{
                                                        if(rows.affectedRows == 1) callback(null);
                                                        else{
                                                            logger.error("Profile_Edit_affectedRows_8 error");
                                                            conn.rollback(function(){
                                                                done(false, "Profile_Edit DB error");  // error
                                                                conn.release();
                                                            });
                                                        }
                                                    }
                                                });
                                            }
                                        }else{
                                            if(song3 instanceof Array) {
                                                var sql = "INSERT INTO wave_song_third(user_no, third_thumb_url, third_title, third_video) VALUES(?,?,?,?)";
                                                song3.unshift(data[4]);  // data[4] -> user_no
                                                conn.query(sql, song3, function (err, rows) {
                                                    if (err) {
                                                        logger.error("Profile_Edit_Waterfall_12 error");
                                                        callback(err);
                                                    } else {
                                                        if (rows.affectedRows == 1) callback(null);
                                                        else {
                                                            logger.error("Profile_Edit_affectedRows_9 error");
                                                            conn.rollback(function () {
                                                                done(false, "Profile_Edit DB error");  // error
                                                                conn.release();
                                                            });
                                                        }
                                                    }
                                                });
                                            }else callback(null);
                                        }
                                    }
                                });
                            }
                        ],
                        function(err){
                            if(err){
                                conn.rollback(function(){
                                    done(false, "Profile_Edit DB error");  // error
                                    conn.release();
                                });
                            }else{
                                conn.commit(function(err){
                                    if(err){
                                        logger.error("Profile_Edit Commit error");
                                        done(false, "Profile_Edit DB error");
                                        conn.release();
                                    }else{
                                        done(true, "success");  // success
                                        conn.release();
                                    }
                                });
                            }
                        }
                    );  // waterfall
                }
            });  // beginTransaction
        }
    });
};