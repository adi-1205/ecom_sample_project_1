const { DataTypes, ENUM } = require('sequelize');
const sequelize = require('../config/db');


const CartItem = sequelize.define('cartItem', {
    qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    }
}, {
    paranoid: true,
    timestamps: true
})

module.exports = CartItem