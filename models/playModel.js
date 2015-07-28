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