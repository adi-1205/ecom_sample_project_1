const { DataTypes, ENUM } = require('sequelize');
const sequelize = require('../config/db'); 


const Cart = sequelize.define('cart', {}, {
    paranoid:true,
    timestamps:true
})

module.exports = Cart