const { DataTypes, ENUM } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('user', {
    username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    forgetPasswordToken: {
        type: DataTypes.STRING
    },
    role: {
        type: ENUM('admin', 'user'),
        defaultValue: 'user',
    }
}, {
    paranoid: true,
    timestamps: true,
})

module.exports = User