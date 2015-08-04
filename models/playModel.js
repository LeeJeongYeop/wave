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
                var sql =
                "SELECT user_no, user_nickname, user_comment, user_img, user_point "+
                "FROM wave_user "+
                "WHERE user_no NOT IN(?) ORDER BY RAND() LIMIT 1 ";
                pool.query(sql, data, function (err, rows) {
                    if (err) {
                        logger.error("Surfers DB error");
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
                        logger.error("Surfers DB error");
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
                        logger.error("Surfers DB error");
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
                        logger.error("Surfers DB error");
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
            if (err) done(false, "Surfers DB error");
            else{
                logger.info("result:", user, song1, song2, song3);
                done(true, "success", user, song1, song2, song3);
            }
        }
    ); // waterfall
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