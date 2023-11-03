import { Sequelize } from "sequelize";

const db = new Sequelize('db_rdd','root','',{
    host: 'localhost',
    dialect: 'mysql',
    port: 3306,
})

export default db;
