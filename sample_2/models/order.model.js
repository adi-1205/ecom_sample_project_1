const { DataTypes, ENUM } = require('sequelize');
const sequelize = require('../config/db');


const Order = sequelize.define('order', {
    subtotal: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    paranoid: true,
    timestamps: true
})

module.exports = Order