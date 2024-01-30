const { DataTypes, ENUM } = require('sequelize');
const sequelize = require('../config/db');


const OrderItem = sequelize.define('orderItem', {
    qty: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    paranoid: true,
    timestamps: true
})

module.exports = OrderItem