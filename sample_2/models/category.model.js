const { DataTypes, ENUM } = require('sequelize');
const sequelize = require('../config/db');


const Category = sequelize.define('category', {
    category: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    paranoid: true,
    timestamps: true,
})


module.exports = Category