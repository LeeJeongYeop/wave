/**
 * Created by Nayak on 2015-07-26.
 */
var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var async = require('async');
var db_config = require('./db_config');
var logger = require('../logger');
var pool = mysql.createPool(db_config);

/*************
 * Friend Add
 *************/
exports.add = function(data, done){
    async.waterfall([
            function(callback){
                var sql = "SELECT COUNT(*) cnt FROM wave_friend WHERE user_no = ? AND friend_user_no =?";
                pool.query(sql, data, function(err, rows){
                    if(err){
                        logger.error("Friend_Add_Waterfall_1");
                        callback(err);
                    }else{
                        if(rows[0].cnt == 1) done(false, "이미 친구가 되어있습니다."); // done 콜백
                        else callback(null);
                    }
                });
            },
            function(callback){
                logger.info("data : ", data);
                var sql = "INSERT INTO wave_friend(user_no, friend_user_no, friend_reg) VALUES(?,?,NOW())";
                pool.query(sql, data, function(err, rows){
                    if(err){
                        logger.error("Friend_Add_Waterfall_2");
                        callback(err);
                    }else{
                        if(rows.affectedRows == 1){
                            callback(null);
                        }else{
                            logger.error("Friend_Add_affectedRows error");
                            done(false, "Friend_Add DB error");  // error
                        }
                    }
                });
            }
        ],
        function(err){
            if(err) done(false, "Friend_Add DB error");  // error
            else done(true, "success");  // success
        }
    );
};