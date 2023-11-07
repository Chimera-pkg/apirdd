import { Sequelize } from "sequelize";
import db from "../config/Database.js";

const { DataTypes } = Sequelize;

const Connection = db.define('connection',{
    id_conn: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    qgmr: {
        type: DataTypes.STRING(500)
    },
    qeng_servingcell: {
        type: DataTypes.STRING(500)
    },
    qrsrp: {
        type: DataTypes.STRING(500)
    },
    qcainfo: {
        type: DataTypes.STRING(500)
    },
    internet: {
        type: DataTypes.INTEGER
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
},{
    freezeTableName:true,
    timestamps: false
});

export default Connection;
