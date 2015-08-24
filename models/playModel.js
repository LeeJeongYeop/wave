/**
 * Created by Nayak on 2015-07-28.
 */
var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var async = require('async');
var db_config = require('./db_config');
var logger = require('../logger');
var pool = mysql.createPool(db_config);


/*************
 * Surfers Random
 *************/
exports.surfers = function(data, done){
    async.waterfall([
            function(callback){
                if(data.length == 0){
                    var sql =
                        "SELECT user_no, user_nickname, user_comment, user_img, user_point, user_status "+
                        "FROM wave_user "+
                        "ORDER BY RAND() LIMIT 1 ";
                }else{
                    var sql =
                        "SELECT user_no, user_nickname, user_comment, user_img, user_point, user_status "+
                        "FROM wave_user "+
                        "WHERE user_no NOT IN(?) ORDER BY RAND() LIMIT 1 ";
                }
                pool.query(sql, data, function (err, rows) {
                    if (err) {
                        logger.error("Surfers DB error_1");
                        callback(err);
                    } else {
                        logger.info('rows[0]', rows[0]);
                        if (rows[0]) callback(null, rows[0]);
                        else done(false, "Surfers DB error");  // error 없이 콜백
                    }
                });
            },
            function (user_info, callback) {
                var sql = "SELECT first_thumb_url, first_title, first_video FROM wave_song_first WHERE user_no=?";
                pool.query(sql, user_info.user_no, function(err, rows){
                    if (err) {
                        logger.error("Surfers DB error_2");
                        callback(err);
                    } else {
                        logger.info('first_rows[0]', rows[0]);
                        if (rows[0]) callback(null, user_info, rows[0]);
                        else done(false, "Surfers DB error");  // error 없이 콜백
                    }
                });
            },
            function (user_info, song1, callback) {
                var sql = "SELECT second_thumb_url, second_title, second_video FROM wave_song_second WHERE user_no=?";
                pool.query(sql, user_info.user_no, function(err, rows){
                    if (err) {
                        logger.error("Surfers DB error_3");
                        callback(err);
                    } else {
                        logger.info('second_rows[0]', rows[0]);
                        if (rows[0]) callback(null, user_info, song1, rows[0]);
                        else callback(null, user_info, song1, "NOT");
                    }
                });
            },
            function (user_info, song1, song2, callback) {
                var sql = "SELECT third_thumb_url, third_title, third_video FROM wave_song_third WHERE user_no=?";
                pool.query(sql, user_info.user_no, function (err, rows) {
                    if (err) {
                        logger.error("Surfers DB error_4");
                        callback(err);
                    } else {
                        logger.info('third_rows[0]', rows[0]);
                        if (rows[0]) callback(null, user_info, song1, song2, rows[0]);
                        else callback(null, user_info, song1, song2, "NOT");
                    }
                });
            }
        ],
        function(err, user, song1, song2, song3){
            if (err) done(false, "Surfers DB error_5");
            else{
                logger.info("result:", user, song1, song2, song3);
                done(true, "success", user, song1, song2, song3);
            }
        }
    ); // waterfall
};

/*************
 * Surfing Request
 *************/
exports.req = function(data, done){
    pool.getConnection(function(err, conn) {
        if(err) {
            logger.error("Surfing_Request_getConnection error");
            done(false, "Surfing_Request DB error");
            conn.release();
        }else {
            conn.beginTransaction(function (err) {
                if (err) {
                    logger.error("Surfing_Request_beginTransaction error");
                    done(false, "Surfing_Request DB error");
                    conn.release();
                } else {
                    async.waterfall([
                            function (callback) {
                                var sql = "UPDATE wave_user SET user_status = 1, user_surfing_no = ? WHERE user_no = ?";  // user_status=1 -> 신청한 사람의 표시
                                conn.query(sql, data, function(err, rows){
                                    if(err){
                                        logger.error("Request DB waterfall_1");
                                        callback(err);
                                    }else{
                                        if(rows.affectedRows == 1) callback(null);
                                        else{
                                            logger.error("Request DB waterfall_2");
                                            conn.rollback(function(){  // error 없이 rollback
                                                done(false, "Request DB error");
                                                conn.release();
                                            });
                                        }
                                    }
                                });
                            },
                            function (callback) {
                                var sql = "UPDATE wave_user SET user_status = 2, user_surfing_no = ? WHERE user_no = ?";  // user_status=2 -> 신청 받은 사람의 표시
                                conn.query(sql, [data[1], data[0]], function(err, rows){  // SWAP
                                    if(err){
                                        logger.error("Request DB waterfall_3");
                                        callback(err);
                                    }else{
                                        if(rows.affectedRows == 1) callback(null);
                                        else{
                                            logger.error("Request DB waterfall_4");
                                            conn.rollback(function(){  // error 없이 rollback
                                                done(false, "Request DB error");
                                                conn.release();
                                            });
                                        }
                                    }
                                });
                            }
                        ],
                        function (err) {
                            if (err) {
                                conn.rollback(function () {
                                    done(false, "Request DB error");  // error
                                    conn.release();
                                });
                            } else {
                                conn.commit(function (err) {
                                    if (err) {
                                        logger.error("Request DB Commit error");
                                        done(false, "Request DB error");
                                        conn.release();
                                    } else {
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

exports.req_info = function(data, done){
    var sql = "SELECT user_nickname, user_phone, user_regid FROM wave_user WHERE user_no = ?";
    pool.query(sql, data, function(err, rows){
        if(err) done(false, "Req_info DB error");
        else done(true, "success", rows[0]);
    });
};

/*************
 * Surfing Response
 *************/
exports.res_ok = function(data, done){  // 수락
    pool.getConnection(function(err, conn) {
        if(err) {
            logger.error("Surfing_Response_ok_getConnection error");
            done(false, "Surfing_Response_ok DB error");
            conn.release();
        }else {
            conn.beginTransaction(function (err) {
                if (err) {
                    logger.error("Surfing_Response_ok_beginTransaction error");
                    done(false, "Surfing_Response_ok DB error");
                    conn.release();
                } else {
                    async.waterfall([
                            function (callback) {
                                var sql = "SELECT user_surfing_no, user_nickname FROM wave_user WHERE user_no = ?";  // 신청한 사람의 정보를 얻기위해 user_surfing_no 를 구함
                                conn.query(sql, data, function(err, rows){
                                    if(err){
                                        logger.error("Response_ok DB waterfall_1");
                                        callback(err);
                                    }else{
                                        if(rows[0]) callback(null, rows[0]);
                                        else{
                                            logger.error("Response_ok DB waterfall_2");
                                            conn.rollback(function(){  // error 없이 rollback
                                                done(false, "Response_ok DB error");
                                                conn.release();
                                            });
                                        }
                                    }
                                });
                            },
                            function (user_row, callback) {
                                var sql = "UPDATE wave_user SET user_status = 3 WHERE user_no = ? OR user_no = ?";  // user_status=2, user_surfing_no=0 -> 거절로 둘다 case 0
                                conn.query(sql, [data, user_row.user_surfing_no], function(err, rows){
                                    if(err){
                                        logger.error("Response_ok DB waterfall_3");
                                        callback(err);
                                    }else{
                                        if(rows.affectedRows == 2) callback(null, user_row);
                                        else{
                                            logger.error("Response_ok DB waterfall_4");
                                            conn.rollback(function(){  // error 없이 rollback
                                                done(false, "Response_ok DB error");
                                                conn.release();
                                            });
                                        }
                                    }
                                });
                            },
                            function (user_row, callback) {
                                var sql = "SELECT user_regid FROM wave_user WHERE user_no = ?";  // 신청한 사람의 regid
                                logger.info(user_row.user_surfing_no);
                                conn.query(sql, user_row.user_surfing_no, function(err, rows){
                                    if(err){
                                        logger.error("Response_ok DB waterfall_5");
                                        callback(err);
                                    }else{
                                        if(rows[0]) callback(null, user_row, rows[0]); // rows[0] = 신청한 사람의 regid
                                        else{
                                            logger.error("Response_ok DB waterfall_6");
                                            conn.rollback(function(){  // error 없이 rollback
                                                done(false, "Response_no DB error");
                                                conn.release();
                                            });
                                        }
                                    }
                                });
                            },
                            function(user_row, req_user_regid, callback){
                                var sql =
                                    "SELECT f.first_thumb_url, f.first_title, f.first_video, u.user_comment "+
                                    "FROM wave_song_first f, wave_user u "+
                                    "WHERE f.user_no = u.user_no AND u.user_no = ?";
                                conn.query(sql, user_row.user_surfing_no, function(err, rows){
                                    if(err){
                                        logger.error("Response_ok DB waterfall_7");
                                        callback(err);
                                    }else{
                                        if(rows[0]) callback(null, user_row, req_user_regid, rows[0]);
                                        else {
                                            logger.error("Response_ok DB waterfall_8");
                                            conn.rollback(function () {  // error 없이 rollback
                                                done(false, "Response_ok DB error");
                                                conn.release();
                                            });
                                        }
                                    }
                                });
                            },
                            function(user_row, req_user_regid, req_user_song, callback){
                                var sql = "INSERT INTO wave_surfing(surfing_req_user_no, surfing_res_user_no, surfing_snd_user_no, surfing_thumb_url, surfing_title, surfing_video, surfing_comment) VALUES (?,?,?,?,?,?,?)";
                                conn.query(sql, [user_row.user_surfing_no, data, user_row.user_surfing_no, req_user_song.first_thumb_url, req_user_song.first_title, req_user_song.first_video, req_user_song.comment], function(err, rows){
                                    // [] = 1.신청한사람 2.수락한사람 3.추천한사람(신청한사람) 4~6.곡정보
                                    if(err){
                                        logger.error("Response_ok DB waterfall_9");
                                        callback(err);
                                    }else{
                                        if(rows.affectedRows == 1) callback(null, user_row.user_nickname, req_user_regid, req_user_song);
                                        else{
                                            logger.error("Response_ok DB waterfall_10");
                                            conn.rollback(function () {  // error 없이 rollback
                                                done(false, "Response_ok DB error");
                                                conn.release();
                                            });
                                        }
                                    }
                                });
                            }
                        ],
                        function (err, res_user_nickname, req_user_regid, req_user_song) {
                            if (err) {
                                conn.rollback(function () {
                                    done(false, "Response_ok DB error");  // error
                                    conn.release();
                                });
                            } else {
                                conn.commit(function (err) {
                                    if (err) {
                                        logger.error("Response_ok DB Commit error");
                                        done(false, "Response_ok DB error");
                                        conn.release();
                                    } else {
                                        done(true, "success", res_user_nickname, req_user_regid, req_user_song);  // success
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

exports.res_no = function(data, done){  // 거절
    pool.getConnection(function(err, conn) {
        if(err) {
            logger.error("Surfing_Response_no_getConnection error");
            done(false, "Surfing_Response_no DB error");
            conn.release();
        }else {
            conn.beginTransaction(function (err) {
                if (err) {
                    logger.error("Surfing_Response_no_beginTransaction error");
                    done(false, "Surfing_Response_no DB error");
                    conn.release();
                } else {
                    async.waterfall([
                            function (callback) {
                                var sql = "SELECT user_surfing_no, user_nickname FROM wave_user WHERE user_no = ?";  // 신청한 사람의 정보를 얻기위해 user_surfing_no 를 구함
                                conn.query(sql, data, function(err, rows){
                                    if(err){
                                        logger.error("Response_no DB waterfall_1");
                                        callback(err);
                                    }else{
                                        if(rows[0]) callback(null, rows[0]);  // rows[0] => 신청한 사람
                                        else{
                                            logger.error("Response_no DB waterfall_2");
                                            conn.rollback(function(){  // error 없이 rollback
                                                done(false, "Response_no DB error");
                                                conn.release();
                                            });
                                        }
                                    }
                                });
                            },
                            function (user_row, callback){  // user_row.user_surfing_no = 신청한 사람
                                var sql = "UPDATE wave_user SET user_status = 0, user_surfing_no = 0 WHERE user_no = ? OR user_no = ?";  // user_status=0, user_surfing_no=0 -> 거절로 둘다 case 0
                                conn.query(sql, [data, user_row.user_surfing_no], function(err, rows){
                                    if(err){
                                        logger.error("Response_no DB waterfall_3");
                                        callback(err);
                                    }else{
                                        if(rows.affectedRows == 2) callback(null, user_row);
                                        else{
                                            logger.error("Response_no DB waterfall_4");
                                            conn.rollback(function(){  // error 없이 rollback
                                                done(false, "Response_no DB error");
                                                conn.release();
                                            });
                                        }
                                    }
                                });
                            },
                            function (user_row, callback) {
                                var sql = "SELECT user_regid FROM wave_user WHERE user_no = ?";  // 신청한 사람의 regid
                                conn.query(sql, user_row.user_surfing_no, function(err, rows){
                                    if(err){
                                        logger.error("Response_no DB waterfall_5");
                                        callback(err);
                                    }else{
                                        if(rows[0]) callback(null, user_row.user_nickname, rows[0]); // rows[0] = 신청한 사람의 regid
                                        else{
                                            logger.error("Response_no DB waterfall_6");
                                            conn.rollback(function(){  // error 없이 rollback
                                                done(false, "Response_no DB error");
                                                conn.release();
                                            });
                                        }
                                    }
                                });
                            }
                        ],
                        function (err, res_user_nickname, req_user_regid) {
                            if (err) {
                                conn.rollback(function () {
                                    done(false, "Response_no DB error");  // error
                                    conn.release();
                                });
                            } else {
                                conn.commit(function (err) {
                                    if (err) {
                                        logger.error("Response_no DB Commit error");
                                        done(false, "Response_no DB error");
                                        conn.release();
                                    } else {
                                        done(true, "success", res_user_nickname, req_user_regid);  // success
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

/*************
 * Surfing Read
 *************/
exports.read = function(data, done){
    async.waterfall([
            function(callback){
                var sql =
                    "SELECT surfing_snd_user_no, surfing_thumb_url, surfing_title, surfing_video, surfing_comment, UNIX_TIMESTAMP(surfing_last) surfing_last "+
                    "FROM wave_surfing "+
                    "WHERE surfing_res_user_no = ? OR surfing_req_user_no = ?";
                pool.query(sql, [data, data], function(err, rows){
                    if(err){
                        logger.error("Surfing Read Waterfall_1");
                        callback(err);
                    }else{
                        if(rows[0]) callback(null, rows[0]);
                        else{
                            logger.error("Surfing Read Waterfall_2");
                            done(false, "Surfing_Read_DB error");  // error 없이 done 콜백
                        }
                    }
                });
            },
            function(song, callback){
                if(song.surfing_snd_user_no == data){
                    callback(null, song);
                }else{
                    var sql =
                        "UPDATE wave_surfing "+
                        "SET surfing_thumb_url = NULL, surfing_title = NULL, surfing_video = NULL, surfing_comment = NULL "+
                        "WHERE surfing_res_user_no = ? OR surfing_req_user_no = ?";
                    pool.query(sql, [data, data], function(err, rows){
                        if(err){
                            logger.error("Surfing Read Waterfall_3");
                            callback(err);
                        }else{
                            if(rows.affectedRows == 1) callback(null, song);
                            else{
                                logger.error("Surfing Read Waterfall_4");
                                done(false, "Surfing_Read_DB error");  // error 없이 done 콜백
                            }
                        }
                    });
                }
            }
        ],
        function(err, song){
            if(err) done(false, "Surfing_Read_DB error");  // error
            else done(true, "success", song);  // success
        }
    );  // waterfall
};

/*************
 * Surfing Send
 *************/
exports.send = function(data, done){
    async.waterfall([
            function(callback){
                var sql =
                    "SELECT user_regid FROM wave_user WHERE user_no "+
                    "IN (SELECT user_surfing_no FROM wave_user WHERE user_no = ?)";  // 수신하는 사람의 regid
                pool.query(sql, data[4], function(err, rows){  // data[4] -> 보낸 사람의 user_no
                    if(err){
                        logger.error("Surfing Send Waterfall_1");
                        callback(err);
                    }else{
                        if(rows[0]) callback(null, rows[0]);
                        else {
                            logger.error("Surfing Send Waterfall_2");
                            done(false, "Surfing_Send_DB error");  // error 없이 done 콜백
                        }
                    }
                });
            },
            function(rec_regid, callback){
                var sql = "SELECT user_nickname FROM wave_user WHERE user_no = ?";
                pool.query(sql, data[4], function(err, rows){
                    if(err){
                        logger.error("Surfing Send Waterfall_3");
                        callback(err);
                    }else{
                        if(rows[0]) callback(null, rows[0], rec_regid);
                        else {
                            logger.error("Surfing Send Waterfall_4");
                            done(false, "Surfing_Send_DB error");  // error 없이 done 콜백
                        }
                    }
                });
            },
            function(snd_nickname, rec_regid, callback){  // 송신자의 user_nickname, 수신자의 user_regid
                var sql =
                    "UPDATE wave_surfing "+
                    "SET surfing_thumb_url = ?, surfing_title = ?, surfing_video = ?, surfing_comment = ?, surfing_snd_user_no = ? "+
                    "WHERE surfing_res_user_no = ? OR surfing_req_user_no = ?";
                data.push(data[4]);  // surfing_snd_user_no를 업데이트 하기위해
                data.push(data[4]);  // res와 req 모두 검사하기위해
                pool.query(sql, data, function(err, rows){
                    if(err){
                        logger.error("Surfing Send Waterfall_5");
                        callback(err);
                    }else{
                        if(rows.affectedRows == 1) callback(null, snd_nickname, rec_regid);
                        else {
                            logger.error("Surfing Send Waterfall_6");
                            done(false, "Surfing_Send_DB error");  // error 없이 done 콜백
                        }
                    }
                });
            }
        ],
        function(err, snd_nickname, rec_regid){
            if(err) done(false, "Surfing_Read_DB error");  // error
            else done(true, "success", snd_nickname, rec_regid);  // success
        }
    );  // waterfall
};

/*************
 * Surfers Random
 *************/
/*
 exports.surfers = function(data, done){
 var sql =
 "SELECT user_no, user_nickname, user_comment, user_img, user_point, user_song_1, user_song_2, user_song_3 "+
 "FROM wave_user "+
 "WHERE user_no NOT IN(?) ORDER BY RAND() LIMIT 5 ";
 pool.query(sql, data, function(err, rows){
 if(err){
 logger.error("Surfers DB error");
 done(false, "Surfers DB error");
 }else{
 logger.info('rows', rows);
 if(rows[0]) done(true, "success", rows);
 else done(false, "Surfers DB error");
 }
 });
 };
 */