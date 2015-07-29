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
 * Friend List
 *************/
exports.list = function(data, done){
    async.parallel({
            num: function(callback){
                var sql = "SELECT user_friend_num FROM wave_user WHERE user_no = ?";
                pool.query(sql, data, function(err, rows){
                    if(err){
                        logger.error("Friend_List_Waterfall_1");
                        callback(err, "Friend_List_DB error");
                    }else{
                        callback(null, rows[0].user_friend_num)
                    }
                });
            },
            list: function(callback){
                var sql = "SELECT u.user_no, u.user_nickname " +
                    "FROM wave_user u, wave_friend f " +
                    "WHERE u.user_no = f.friend_user_no AND f.user_no = ?";
                pool.query(sql, data, function(err, rows){
                    if(err){
                        logger.error("Friend_List_Waterfall_2");
                        callback(err);
                    }else{
                        callback(null, rows)
                    }
                });
            }
        },
        function(err, result){
            if(err) done(false,"Friend_List_DB error");
            else done(true, "success",result);
        }
    );  // parallel
};

/*************
 * Friend Add
 *************/
exports.add = function(data, done){
    pool.getConnection(function(err, conn){
        if(err){
            logger.error("Friend_Add_getConnection error");
            done(false, "Friend_Add DB error");
            conn.release();
        }else{
            conn.beginTransaction(function(err){
                if(err){
                    logger.error("Friend_Add_Transaction error");
                    done(false, "Friend_Add DB error");
                    conn.release();
                }else{
                    async.waterfall([
                            function(callback){
                                var sql = "SELECT COUNT(*) cnt FROM wave_friend WHERE user_no = ? AND friend_user_no =?";
                                conn.query(sql, data, function(err, rows){
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
                                var sql = "INSERT INTO wave_friend(user_no, friend_user_no, friend_reg) VALUES(?,?,NOW())";
                                conn.query(sql, data, function(err, rows){
                                    if(err){
                                        logger.error("Friend_Add_Waterfall_2");
                                        callback(err);
                                    }else{
                                        if(rows.affectedRows == 1){
                                            callback(null);
                                        }else{
                                            logger.error("Friend_Add_affectedRows_1 error");
                                            conn.rollback(function(){  // error 없이 rollback
                                                done(false, "Friend_Add DB error");
                                                conn.release();
                                            });
                                        }
                                    }
                                });
                            },
                            function(callback){
                                var sql = "UPDATE wave_user SET user_friend_num=user_friend_num+1 WHERE user_no=?";
                                conn.query(sql, data, function(err, rows){
                                    if(err){
                                        logger.error("Friend_Add_Waterfall_3");
                                        callback(err);
                                    }else{
                                        if(rows.affectedRows == 1){
                                            callback(null);
                                        }else{
                                            logger.error("Friend_Add_affectedRows_2 error");
                                            conn.rollback(function(){  // error 없이 rollback
                                                done(false, "Friend_Add DB error");
                                                conn.release();
                                            });
                                        }
                                    }
                                });
                            }
                        ],
                        function(err){
                            if(err) {
                                conn.rollback(function(){
                                    done(false, "Friend_Add DB error");  // error
                                    conn.release();
                                });
                            }else{
                                conn.commit(function(err){
                                    if(err){
                                        logger.error("Friend_Add Commit error");
                                        done(false, "Friend_Add DB error");
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

/*************
 * Friend Delete
 *************/
exports.delete = function(data, done){
    pool.getConnection(function(err, conn){
        if(err){
            logger.error("Friend_Delete_getConnection error");
            done(false, "Friend_Delete_DB error");
            conn.release();
        }else{
            conn.beginTransaction(function(err){
                if(err){
                    logger.error("Friend_Delete_Transaction error");
                    done(false, "Friend_Delete DB error");
                    conn.release();
                }else{
                    async.waterfall([
                            function(callback){
                                var sql = "DELETE FROM wave_friend WHERE user_no = ? AND friend_user_no = ?";
                                conn.query(sql, data, function(err, rows){
                                    if(err){
                                        logger.error("Friend_Delete_Waterfall_1");
                                        callback(err);
                                    }else{
                                        if(rows.affectedRows == 1){
                                            callback(null);
                                        }else{
                                            logger.error("Friend_Delete_affectedRows_1 error");
                                            conn.rollback(function(){  // error 없이 rollback
                                                done(false, "Friend_Delete DB error");
                                                conn.release();
                                            });
                                        }
                                    }
                                });
                            },
                            function(callback){
                                var sql = "UPDATE wave_user SET user_friend_num=user_friend_num-1 WHERE user_no=?";
                                conn.query(sql, data, function(err, rows){
                                    if(err){
                                        logger.error("Friend_Delete_Waterfall_2");
                                        callback(err);
                                    }else{
                                        if(rows.affectedRows == 1){
                                            callback(null);
                                        }else{
                                            logger.error("Friend_Delete_affectedRows_2 error");
                                            conn.rollback(function(){  // error 없이 rollback
                                                done(false, "Friend_Delete DB error");
                                                conn.release();
                                            });
                                        }
                                    }
                                });
                            }
                        ],
                        function(err){
                            if(err){
                                conn.rollback(function(){
                                    done(false, "Friend_Delete DB error");  // error
                                    conn.release();
                                });
                            }else{
                                conn.commit(function(err){
                                    if(err){
                                        logger.error("Friend_Delete Commit error");
                                        done(false, "Friend_Delete DB error");
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